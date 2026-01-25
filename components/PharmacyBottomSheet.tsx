
import React from 'react';
import { Pharmacy } from '../types';

interface PharmacyBottomSheetProps {
  pharmacy: Pharmacy | null;
  onClose: () => void;
  onOpenGps: (pharmacy: Pharmacy) => void;
}

const PharmacyBottomSheet: React.FC<PharmacyBottomSheetProps> = ({ pharmacy, onClose, onOpenGps }) => {
  if (!pharmacy) return null;

  const stockColors = {
    available: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: '✓ DISPONIBLE' },
    low: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', label: '⚠ ÚLTIMAS UNIDADES' },
    out: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: '✗ AGOTADO' },
  };

  const currentStock = stockColors[pharmacy.stockStatus];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col pointer-events-none">
      <div 
        className="pointer-events-auto bg-white rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.15)] bottom-sheet max-h-[85vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3" onClick={onClose} />
        
        <div className="px-6 pb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-800">{pharmacy.name}</h2>
                {pharmacy.is24h && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">24H</span>
                )}
              </div>
              <div
                className="flex items-center gap-1 text-yellow-500 mb-1"
                role="img"
                aria-label={`Calificación: ${pharmacy.rating.toFixed(1)} de 5 estrellas`}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <i
                    key={i}
                    className={`fas fa-star ${i < Math.floor(pharmacy.rating) ? '' : 'text-gray-200'}`}
                    aria-hidden="true"
                  />
                ))}
                <span className="text-gray-500 text-sm ml-1" aria-hidden="true">{pharmacy.rating.toFixed(1)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
              aria-label="Cerrar detalles"
            >
              <i className="fas fa-times text-xl" aria-hidden="true"></i>
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
            <span className="flex items-center gap-1">
              <i className="fas fa-person-walking text-blue-500"></i> {pharmacy.distance}
            </span>
            <span className="flex items-center gap-1 font-bold text-green-600">
              <i className="fas fa-clock"></i> {pharmacy.isOpen ? 'ABIERTO AHORA' : 'CERRADO'}
            </span>
          </div>

          <div className={`${currentStock.bg} ${currentStock.text} px-4 py-3 rounded-xl flex items-center justify-between mb-6 border border-current opacity-80`}>
            <div className="flex items-center gap-2 font-bold">
              <div className={`w-3 h-3 rounded-full ${currentStock.dot} animate-pulse`} />
              STOCK ESTIMADO: {currentStock.label}
            </div>
            <i className="fas fa-circle-info"></i>
          </div>

          <div className="grid gap-3">
            <a 
              href={`https://wa.me/${pharmacy.whatsapp}?text=Hola, ¿tienen stock de este medicamento?`}
              target="_blank"
              className="bg-[#25D366] text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg shadow-lg active:scale-[0.98] transition-all"
            >
              <i className="fab fa-whatsapp text-2xl"></i>
              RESERVAR POR WHATSAPP
            </a>

            <div className="grid grid-cols-2 gap-3">
              <a 
                href={`tel:${pharmacy.phone}`}
                className="bg-gray-100 text-gray-800 py-4 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold active:bg-gray-200 transition-all border border-gray-200"
              >
                <i className="fas fa-phone"></i>
                LLAMAR AHORA
              </a>
              <button 
                onClick={() => onOpenGps(pharmacy)}
                className="bg-blue-600 text-white py-4 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-md active:bg-blue-700 transition-all"
              >
                <i className="fas fa-location-arrow"></i>
                CÓMO LLEGAR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyBottomSheet;
