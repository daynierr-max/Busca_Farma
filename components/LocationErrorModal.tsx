import React, { useState } from 'react';
import { Location } from '../types';

interface LocationErrorModalProps {
  onRetry: () => void;
  onManualLocation: (location: Location) => void;
  onUseDemoLocation: () => void;
}

const LocationErrorModal: React.FC<LocationErrorModalProps> = ({ onRetry, onManualLocation, onUseDemoLocation }) => {
  const [cityQuery, setCityQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleManualSubmit = async () => {
    if (!cityQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        onManualLocation({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
      } else {
        setError('No se encontró la ubicación. Intenta con otra ciudad.');
      }
    } catch (err) {
      setError('Error al buscar la ubicación. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-location-slash text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">
            Ubicación Necesaria
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Necesitamos tu ubicación para mostrarte farmacias cercanas y su stock.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <i className="fas fa-location-crosshairs"></i>
            Habilitar Ubicación
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">O ingresa tu ciudad</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: Madrid, Barcelona..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <button
                onClick={handleManualSubmit}
                disabled={isLoading || !cityQuery.trim()}
                className="bg-gray-800 text-white w-12 rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
                aria-label="Buscar ubicación"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <i className="fas fa-arrow-right"></i>
                )}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs font-medium ml-1">{error}</p>}
          </div>

          <button
            onClick={onUseDemoLocation}
            className="w-full py-2 text-gray-400 text-xs font-bold uppercase hover:text-gray-600 transition-colors"
          >
            Usar ubicación de prueba (Madrid)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationErrorModal;
