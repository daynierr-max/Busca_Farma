
import React, { useRef, useEffect, useState } from 'react';

interface ScannerViewProps {
  onScan: (base64Image: string) => void;
  onClose: () => void;
}

// Enough resolution to read a box label while keeping the upload small
const MAX_CAPTURE_WIDTH = 1280;

const ScannerView: React.FC<ScannerViewProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Keep the stream in the closure: videoRef is already null when the cleanup runs on unmount
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (cancelled) {
          media.getTracks().forEach(track => track.stop());
          return;
        }
        stream = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }
      } catch (err) {
        if (!cancelled) {
          setError("No se pudo acceder a la cámara. Por favor, revisa los permisos.");
        }
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    const scale = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    if (base64) onScan(base64);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" role="dialog" aria-modal="true" aria-label="Escanear caja de medicamento">
      <div className="flex items-center justify-between p-4 text-white">
        <button onClick={onClose} className="p-2" aria-label="Cerrar escáner"><i className="fas fa-xmark text-xl" aria-hidden="true"></i></button>
        <span className="font-medium text-lg">Escanear Caja</span>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white p-8 text-center" role="alert">{error}</div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedData={() => setIsReady(true)}
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
              <div className="w-full aspect-[4/3] border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
                <div className="text-white/30 text-xs font-bold uppercase tracking-widest">Alinea la caja aquí</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-black p-8 flex justify-center">
        {error ? (
          <button onClick={onClose} className="bg-white text-black font-bold px-8 py-4 rounded-2xl">
            Volver
          </button>
        ) : (
          <button 
            onClick={captureImage}
            disabled={!isReady}
            aria-label="Hacer foto"
            className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
          >
            <div className="w-full h-full bg-white rounded-full"></div>
          </button>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerView;
