
import React, { useRef, useEffect, useState } from 'react';

interface ScannerViewProps {
  onScan: (base64Image: string) => void;
  onClose: () => void;
}

const ScannerView: React.FC<ScannerViewProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("No se pudo acceder a la cámara. Por favor, revisa los permisos.");
      }
    }
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      const base64 = dataUrl.split(',')[1];
      onScan(base64);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <button onClick={onClose} aria-label="Cerrar escáner" className="p-2"><i className="fas fa-xmark text-xl"></i></button>
        <span className="font-medium text-lg">Escanear Caja</span>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {error ? (
          <div className="text-white p-8 text-center">{error}</div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-12">
              <div className="w-full aspect-[4/3] border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
                <div className="text-white/30 text-xs font-bold uppercase tracking-widest">Alinea la caja aquí</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-black p-8 flex justify-center">
        <button 
          onClick={captureImage}
          aria-label="Capturar foto"
          className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <div className="w-full h-full bg-white rounded-full"></div>
        </button>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerView;
