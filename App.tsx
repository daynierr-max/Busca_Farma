
import React, { useState, useEffect, useRef } from 'react';
import { AppView, Location, Pharmacy } from './types';
import MapView from './components/MapView';
import PharmacyBottomSheet from './components/PharmacyBottomSheet';
import ScannerView from './components/ScannerView';
import AccessibilityAgent from './components/AccessibilityAgent';
import { findPharmaciesNearby, scanMedicationBox } from './services/geminiService';

const RECENT_SEARCHES_KEY = 'farmaSearch_recent_v1';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  
  // Initialize recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return ['Ibuprofeno', 'Insulina', 'Paracetamol', 'Nolotil', 'Omeprazol'];
      }
    }
    return ['Ibuprofeno', 'Insulina', 'Paracetamol', 'Nolotil', 'Omeprazol'];
  });

  // Initialize geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Fallback to Madrid if location denied for demo purposes
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
        }
      );
    }
  }, []);

  const saveSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setRecentSearches(prev => {
      // Remove the term if it already exists to move it to the front
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = async (query: string) => {
    if (!query.trim() || !userLocation) return;
    
    saveSearch(query);
    setSearchQuery(query);
    setIsSearching(true);
    setView(AppView.SEARCH_RESULTS);
    
    const results = await findPharmaciesNearby(query, userLocation);
    setPharmacies(results);
    setIsSearching(false);
  };

  const handleVoiceSearch = () => {
    setIsVoiceActive(true);
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onresult = (event: any) => {
      const voiceQuery = event.results[0][0].transcript;
      setSearchQuery(voiceQuery);
      handleSearch(voiceQuery);
      setIsVoiceActive(false);
    };
    recognition.onend = () => setIsVoiceActive(false);
    recognition.start();
  };

  const handleScannerResult = async (base64: string) => {
    setView(AppView.HOME);
    setIsSearching(true);
    const result = await scanMedicationBox(base64);
    if (result) {
      setSearchQuery(result);
      handleSearch(result);
    } else {
      setIsSearching(false);
      alert("No se pudo identificar el medicamento. Por favor, intenta de nuevo o escribe el nombre.");
    }
  };

  return (
    <div className="relative h-full flex flex-col bg-white overflow-hidden">
      {/* HEADER */}
      <header className="absolute top-0 inset-x-0 z-30 p-4 flex justify-between items-center pointer-events-none">
        <button aria-label="Menú principal" className="bg-white/90 backdrop-blur w-12 h-12 rounded-full flex items-center justify-center shadow-md border-2 border-gray-100 pointer-events-auto active:scale-95 transition-transform">
          <i aria-hidden="true" className="fas fa-bars text-gray-700 text-xl"></i>
        </button>
        <button aria-label="Perfil de usuario" className="bg-white/90 backdrop-blur w-12 h-12 rounded-full flex items-center justify-center shadow-md border-2 border-gray-100 pointer-events-auto active:scale-95 transition-transform">
          <i aria-hidden="true" className="fas fa-user text-gray-700 text-xl"></i>
        </button>
      </header>

      {/* ACCESSIBILITY AGENT (FarmaVoz) */}
      <AccessibilityAgent 
        onSearch={handleSearch} 
        pharmacies={pharmacies} 
        isSearching={isSearching} 
      />

      {/* MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <MapView 
          userLocation={userLocation} 
          pharmacies={pharmacies} 
          onPharmacySelect={setSelectedPharmacy} 
          selectedPharmacyId={selectedPharmacy?.id}
        />
      </div>

      {/* MAIN SEARCH INTERFACE */}
      <main className={`relative z-10 flex flex-col pt-20 px-4 transition-all duration-500 ${view === AppView.SEARCH_RESULTS ? 'pointer-events-none opacity-0 translate-y-[-20px]' : 'opacity-100'}`}>
        <div className="bg-white rounded-[2rem] shadow-2xl border-2 border-blue-50 p-6 mt-4">
          <h1 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4 ml-1">¿Qué medicamento buscas?</h1>
          <div className="relative mb-6">
            <input 
              type="text"
              aria-label="Buscar medicamento"
              placeholder="Ej: Ibuprofeno..."
              className="w-full pl-14 pr-4 py-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-400 focus:bg-white focus:ring-0 text-xl font-medium placeholder:text-gray-300 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            />
            <i aria-hidden="true" className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-blue-500 text-2xl"></i>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setView(AppView.SCAN)}
              className="flex flex-col items-center justify-center gap-2 bg-blue-50 text-blue-700 font-black py-4 rounded-2xl active:bg-blue-100 transition-all border-b-4 border-blue-200"
            >
              <i className="fas fa-expand text-2xl"></i>
              <span className="text-xs">ESCANEAR CAJA</span>
            </button>
            <button 
              onClick={handleVoiceSearch}
              className={`flex flex-col items-center justify-center gap-2 font-black py-4 rounded-2xl transition-all border-b-4 ${
                isVoiceActive 
                ? 'bg-red-500 text-white animate-pulse border-red-700' 
                : 'bg-gray-100 text-gray-700 active:bg-gray-200 border-gray-300'
              }`}
            >
              <i className={`fas ${isVoiceActive ? 'fa-waveform' : 'fa-microphone'} text-2xl`}></i>
              <span className="text-xs uppercase">{isVoiceActive ? 'Escuchando...' : 'Búsqueda Voz'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* SEARCH RESULTS HEADER */}
      {view === AppView.SEARCH_RESULTS && (
        <div className="absolute top-20 inset-x-0 z-30 px-4 flex flex-col items-center">
          <div className="bg-white/95 backdrop-blur-md rounded-[1.5rem] shadow-2xl border-2 border-blue-100 py-4 px-6 flex items-center gap-4 w-full max-w-md">
            <button 
              aria-label="Volver a la búsqueda"
              onClick={() => { setView(AppView.HOME); setPharmacies([]); setSelectedPharmacy(null); }}
              className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <i aria-hidden="true" className="fas fa-arrow-left text-lg"></i>
            </button>
            <div className="flex-1">
              <span className="text-[10px] text-blue-500 block uppercase font-black tracking-tighter">Buscando stock de</span>
              <span className="text-xl font-black text-gray-800 line-clamp-1 uppercase italic">{searchQuery}</span>
            </div>
            {isSearching && (
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        </div>
      )}

      {/* RECENT SEARCHES (Now persistent) */}
      {view === AppView.HOME && (
        <div className="absolute bottom-28 inset-x-0 z-10 px-4">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
            <span className="w-4 h-[2px] bg-blue-200"></span> Búsquedas Recientes
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar">
            {recentSearches.map((term, i) => (
              <button 
                key={`${term}-${i}`}
                onClick={() => handleSearch(term)}
                className="whitespace-nowrap bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-gray-100 text-gray-800 font-bold active:scale-95 transition-all flex items-center gap-2"
              >
                <span className="text-blue-500 text-xs">●</span> {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SOS BUTTON */}
      <div className="absolute bottom-8 left-4 right-4 z-20 pointer-events-none">
        <button 
          onClick={() => {
            handleSearch("farmacia de guardia");
          }}
          className="pointer-events-auto w-full bg-red-600 text-white flex items-center justify-center gap-4 px-8 py-5 rounded-[2rem] shadow-[0_15px_30px_rgba(220,38,38,0.4)] active:scale-95 active:shadow-none transition-all font-black text-xl uppercase tracking-tighter border-b-8 border-red-800"
        >
          <div className="bg-white text-red-600 w-10 h-10 rounded-full flex items-center justify-center animate-pulse">
            <i className="fas fa-heart-pulse"></i>
          </div>
          Farmacias de Guardia
        </button>
      </div>

      {/* OVERLAYS */}
      {view === AppView.SCAN && (
        <ScannerView 
          onScan={handleScannerResult} 
          onClose={() => setView(AppView.HOME)} 
        />
      )}

      <PharmacyBottomSheet 
        pharmacy={selectedPharmacy} 
        onClose={() => setSelectedPharmacy(null)} 
        onOpenGps={(p) => window.open(p.googleMapsUri, '_blank')}
      />

      {/* Loading overlay */}
      {isSearching && view === AppView.SEARCH_RESULTS && pharmacies.length === 0 && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 p-10 text-center">
            <div className="relative">
              <div className="w-24 h-24 border-8 border-blue-100 rounded-full"></div>
              <div className="absolute top-0 w-24 h-24 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <i className="fas fa-pills absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-blue-500"></i>
            </div>
            <div>
              <p className="text-blue-900 font-black text-2xl uppercase tracking-tighter italic">Localizando Medicamento</p>
              <p className="text-gray-500 font-medium">Conectando con bases de datos de stock real...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
