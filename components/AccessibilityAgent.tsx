
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Pharmacy } from '../types';

interface AccessibilityAgentProps {
  onSearch: (query: string) => void;
  pharmacies: Pharmacy[];
  isSearching: boolean;
}

const AccessibilityAgent: React.FC<AccessibilityAgentProps> = ({ onSearch, pharmacies, isSearching }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

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

  const stopAllAudio = () => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const toggleAssistant = async () => {
    if (isActive) {
      if (sessionRef.current) sessionRef.current.close();
      setIsActive(false);
      stopAllAudio();
      return;
    }

    setIsConnecting(true);

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    try {
      // Token efímero emitido por el servidor (functions/api/live-token.ts):
      // la clave real de Gemini nunca llega al navegador.
      const tokenRes = await fetch('/api/live-token', { method: 'POST' });
      if (!tokenRes.ok) throw new Error(`/api/live-token respondió ${tokenRes.status}`);
      const { token } = await tokenRes.json();
      const ai = new GoogleGenAI({ apiKey: token });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
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
          onclose: () => setIsActive(false),
          onerror: (e) => {
            console.error(e);
            setIsActive(false);
          }
        }
      });

      sessionRef.current = await sessionPromise;
      
      // Setup Mic streaming
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (!isActive) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16[i] = inputData[i] * 32768;
        }
        const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
        sessionRef.current.sendRealtimeInput({
          media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

    } catch (err) {
      console.error(err);
      setIsConnecting(false);
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
