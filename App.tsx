
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppView, Location, Pharmacy } from './types';
import MapView from './components/MapView';
import PharmacyBottomSheet from './components/PharmacyBottomSheet';
import ScannerView from './components/ScannerView';
import AccessibilityAgent from './components/AccessibilityAgent';
import { findPharmaciesNearby, scanMedicationBox } from './services/geminiService';
import { DEFAULT_LOCATION } from './utils/geo';

const RECENT_SEARCHES_KEY = 'farmaSearch_recent_v1';
const DEFAULT_RECENT_SEARCHES = ['Ibuprofeno', 'Insulina', 'Paracetamol', 'Nolotil', 'Omeprazol'];
const ON_DUTY_QUERY = 'farmacia de guardia';

const loadRecentSearches = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? 'null');
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed.slice(0, 5);
    }
  } catch {
    // Corrupt value or storage blocked (e.g. private mode): fall back to defaults
  }
  return DEFAULT_RECENT_SEARCHES;
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isDemoData, setIsDemoData] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  // Identifies the latest search so a slow, older response can't overwrite newer results
  const searchIdRef = useRef(0);

  // Initialize geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        // Fallback to Madrid if location denied or unavailable
        setUserLocation(DEFAULT_LOCATION);
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const saveSearch = (query: string) => {
    setRecentSearches(prev => {
      // Remove the term if it already exists to move it to the front
      const filtered = prev.filter(item => item.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Storage unavailable: keep the list in memory only
      }
      return updated;
    });
  };

  const handleSearch = useCallback(async (query: string, { remember = true } = {}) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const searchId = ++searchIdRef.current;
    if (remember) saveSearch(trimmed);
    setSearchQuery(trimmed);
    setSelectedPharmacy(null);
    setPharmacies([]);
    setIsDemoData(false);
    setIsSearching(true);
    setView(AppView.SEARCH_RESULTS);

    // Search right away even if the location hasn't resolved yet
    const { pharmacies: results, isDemoData: demo } = await findPharmaciesNearby(trimmed, userLocation ?? DEFAULT_LOCATION);
    if (searchId !== searchIdRef.current) return;
    setPharmacies(results);
    setIsDemoData(demo);
    setIsSearching(false);
  }, [userLocation]);

  const goHome = () => {
    searchIdRef.current++;
    setView(AppView.HOME);
    setPharmacies([]);
    setSelectedPharmacy(null);
    setIsSearching(false);
    setIsDemoData(false);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("Tu navegador no soporta búsqueda por voz. Escribe el nombre del medicamento.");
      return;
    }
    setIsVoiceActive(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onresult = (event: any) => {
      const voiceQuery = event.results[0][0].transcript;
      setIsVoiceActive(false);
      handleSearch(voiceQuery);
    };
    recognition.onend = () => setIsVoiceActive(false);
    recognition.onerror = (event: any) => {
      setIsVoiceActive(false);
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        setNotice("Permite el acceso al micrófono para buscar por voz.");
      }
    };
    try {
      recognition.start();
    } catch {
      setIsVoiceActive(false);
    }
  };

  const handleScannerResult = async (base64: string) => {
    setView(AppView.HOME);
    setIsScanning(true);
    const result = await scanMedicationBox(base64);
    setIsScanning(false);
    if (result) {
      handleSearch(result);
    } else {
      setNotice("No se pudo identificar el medicamento. Intenta de nuevo o escribe el nombre.");
    }
  };

  return (
    <div className="relative h-full flex flex-col bg-white overflow-hidden">
      {/* HEADER */}
      <header className="absolute top-0 inset-x-0 z-30 p-4 flex justify-between items-center pointer-events-none">
        <button aria-label="Menú" className="bg-white/90 backdrop-blur w-12 h-12 rounded-full flex items-center justify-center shadow-md border-2 border-gray-100 pointer-events-auto active:scale-95 transition-transform">
          <i className="fas fa-bars text-gray-700 text-xl" aria-hidden="true"></i>
        </button>
        <button aria-label="Mi perfil" className="bg-white/90 backdrop-blur w-12 h-12 rounded-full flex items-center justify-center shadow-md border-2 border-gray-100 pointer-events-auto active:scale-95 transition-transform">
          <i className="fas fa-user text-gray-700 text-xl" aria-hidden="true"></i>
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
          <form
            role="search"
            className="relative mb-6"
            onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }}
          >
            <input 
              type="search"
              enterKeyHint="search"
              aria-label="Nombre del medicamento"
              placeholder="Ej: Ibuprofeno..."
              className="w-full pl-14 pr-4 py-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-400 focus:bg-white focus:ring-0 text-xl font-medium text-gray-900 placeholder:text-gray-300 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-blue-500 text-2xl"
            >
              <i className="fas fa-search" aria-hidden="true"></i>
            </button>
          </form>
          
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
              <i className={`fas ${isVoiceActive ? 'fa-microphone-lines' : 'fa-microphone'} text-2xl`}></i>
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
              onClick={goHome}
              aria-label="Volver"
              className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <i className="fas fa-arrow-left text-lg"></i>
            </button>
            <div className="flex-1">
              <span className="text-[10px] text-blue-500 block uppercase font-black tracking-tighter">Buscando stock de</span>
              <span className="text-xl font-black text-gray-800 line-clamp-1 uppercase italic">{searchQuery}</span>
              {!isSearching && pharmacies.length > 0 && (
                <span className="text-xs text-gray-500 font-medium block" aria-live="polite">
                  {pharmacies.length} {pharmacies.length === 1 ? 'farmacia' : 'farmacias'} · toca un marcador
                </span>
              )}
            </div>
            {!isSearching && isDemoData && (
              <span
                className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-1 rounded-lg"
                title="No se pudo consultar Gemini; se muestran farmacias de ejemplo"
              >
                Ejemplo
              </span>
            )}
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
            handleSearch(ON_DUTY_QUERY, { remember: false });
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
        onOpenGps={(p) => {
          // Only open https links: the URI comes from model output and must not run scripts
          if (/^https:\/\//i.test(p.googleMapsUri)) {
            window.open(p.googleMapsUri, '_blank', 'noopener,noreferrer');
          }
        }}
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
              <p className="text-gray-500 font-medium">Buscando farmacias cercanas...</p>
            </div>
          </div>
        </div>
      )}

      {/* Scanning overlay */}
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center" role="status">
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="w-16 h-16 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-900 font-black text-xl uppercase tracking-tighter italic">Analizando la caja...</p>
          </div>
        </div>
      )}

      {/* Notices (replace blocking alert() dialogs) */}
      {notice && (
        <div className="absolute top-4 inset-x-4 z-[60] flex justify-center pointer-events-none">
          <div role="alert" className="pointer-events-auto max-w-md w-full bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3">
            <i className="fas fa-circle-info mt-1" aria-hidden="true"></i>
            <p className="flex-1 font-medium">{notice}</p>
            <button onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="text-white/70 hover:text-white">
              <i className="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
