import React, { useState } from 'react';
import { Location } from '../types';
import { searchLocation } from '../services/locationService';

interface ManualLocationPromptProps {
  onLocationSelect: (location: Location) => void;
}

const ManualLocationPrompt: React.FC<ManualLocationPromptProps> = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const location = await searchLocation(query);
      if (location) {
        onLocationSelect(location);
      } else {
        setError('No se pudo encontrar la ubicación. Intenta con otra ciudad o código postal.');
      }
    } catch (err) {
      setError('Ocurrió un error al buscar la ubicación. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <i className="fas fa-location-dot text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Ubicación Necesaria</h2>
          <p className="text-blue-100 mt-2 text-sm font-medium">
            Necesitamos saber dónde estás para encontrar farmacias cercanas con stock.
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="location-input" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Ciudad o Código Postal
              </label>
              <div className="relative">
                <input
                  id="location-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej: Madrid, 28001..."
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-4 pl-12 font-bold text-gray-800 focus:border-blue-500 focus:ring-0 transition-colors outline-none"
                  autoFocus
                />
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              </div>
              {error && (
                <p className="text-red-500 text-xs font-bold mt-2 ml-1 flex items-center gap-1 animate-pulse">
                  <i className="fas fa-exclamation-circle"></i> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full bg-blue-600 text-white font-black uppercase tracking-wider py-4 rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Buscando...
                </>
              ) : (
                <>
                  Confirmar Ubicación <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 font-medium">
              Si prefieres usar GPS, asegúrate de permitir el acceso a tu ubicación en el navegador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualLocationPrompt;
