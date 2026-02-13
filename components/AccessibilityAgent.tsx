import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Pharmacy } from '../types';

interface AccessibilityAgentProps {
  onSearch: (query: string) => void;
  pharmacies: Pharmacy[];
  isSearching: boolean;
}

const AUDIO_WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const float32 = input[0];
      // Buffer the input data (blocks of 128 frames)
      // 4096 is a multiple of 128 (32 blocks), so we don't need complex ring buffering
      if (this.bytesWritten + float32.length <= this.bufferSize) {
        this.buffer.set(float32, this.bytesWritten);
        this.bytesWritten += float32.length;
      }

      // If buffer is full, process and send
      if (this.bytesWritten >= this.bufferSize) {
        const int16 = new Int16Array(this.bufferSize);
        for (let i = 0; i < this.bufferSize; i++) {
          int16[i] = this.buffer[i] * 32768;
        }

        // Post message with transferable ownership
        this.port.postMessage(int16.buffer, [int16.buffer]);

        // Reset buffer index
        this.bytesWritten = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

const AccessibilityAgent: React.FC<AccessibilityAgentProps> = ({ onSearch, pharmacies, isSearching }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null); // For playback
  const micContextRef = useRef<AudioContext | null>(null);   // For microphone
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Keep track of active state in ref for callbacks
  const isActiveRef = useRef(false);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // Helpers for audio processing
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as any);
    }
    return btoa(binary);
  };

  const stopAllAudio = () => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const cleanupMic = () => {
     if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
     }
     if (micContextRef.current) {
        micContextRef.current.close();
        micContextRef.current = null;
     }
  };

  const toggleAssistant = async () => {
    if (isActive) {
      if (sessionRef.current) sessionRef.current.close();
      setIsActive(false);
      stopAllAudio();
      cleanupMic();
      return;
    }

    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    try {
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `Eres FarmaVoz, un asistente para personas que no ven bien o han perdido sus gafas. 
          Tu tono es calmado, claro y servicial. 
          1. Saluda y pregunta qué medicamento necesitan.
          2. Si el usuario te da un nombre, dile que vas a buscarlo.
          3. Cuando haya resultados, léelos en voz alta indicando nombre, si está abierta y a qué distancia está.
          4. Ofrece llamar a la farmacia por ellos.
          Importante: No asumas que pueden leer la pantalla. Describe todo auditivamente.`
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            console.log("Conectado a FarmaVoz");
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const buffer = await decodeAudioData(decode(audioData), audioContextRef.current);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              
              const now = audioContextRef.current.currentTime;
              const start = Math.max(now, nextStartTimeRef.current);
              source.start(start);
              nextStartTimeRef.current = start + buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            
            if (message.serverContent?.interrupted) {
              stopAllAudio();
            }
          },
          onclose: () => {
             setIsActive(false);
             cleanupMic();
          },
          onerror: (e) => {
            console.error(e);
            setIsActive(false);
            cleanupMic();
          }
        }
      });

      sessionRef.current = await sessionPromise;
      
      // Setup Mic streaming
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = micContextRef.current.createMediaStreamSource(stream);
      
      const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      await micContextRef.current.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl); // Clean up the URL

      const workletNode = new AudioWorkletNode(micContextRef.current, 'pcm-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        if (!isActiveRef.current || !sessionRef.current) return;

        const int16Buffer = event.data;
        const base64 = arrayBufferToBase64(int16Buffer);

        sessionRef.current.sendRealtimeInput({
          media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(workletNode);
      workletNode.connect(micContextRef.current.destination);

    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      cleanupMic();
    }
  };

  // Effect to announce pharmacies when they change
  useEffect(() => {
    if (isActive && pharmacies.length > 0 && !isSearching) {
      const text = `He encontrado ${pharmacies.length} farmacias. La más cercana es ${pharmacies[0].name}, está a ${pharmacies[0].distance} y el stock está ${pharmacies[0].stockStatus === 'available' ? 'disponible' : 'bajo'}. ¿Quieres que te guíe o prefieres llamar?`;
      // In a real Live API scenario, we could send this text to be spoken
      // For this demo, we assume the model handles the conversation via the audio stream
    }
  }, [pharmacies, isActive, isSearching]);

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col items-end gap-3">
      <button
        onClick={toggleAssistant}
        className={`group relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-500 border-4 ${
          isActive 
            ? 'bg-yellow-400 border-black scale-110' 
            : 'bg-white border-blue-500 hover:scale-105'
        }`}
        aria-label="Asistente de voz para personas con visión reducida"
      >
        {isConnecting ? (
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <i className={`fas ${isActive ? 'fa-ear-listen text-black' : 'fa-eye-low-vision text-blue-600'} text-2xl`}></i>
        )}
        
        {isActive && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500"></span>
          </span>
        )}
      </button>
      
      {isActive && (
        <div className="bg-black text-yellow-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter shadow-lg animate-bounce">
          FarmaVoz Activo: Habla ahora
        </div>
      )}
    </div>
  );
};

export default AccessibilityAgent;
