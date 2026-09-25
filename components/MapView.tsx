
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Location, Pharmacy } from '../types';

interface MapViewProps {
  userLocation: Location | null;
  pharmacies: Pharmacy[];
  onPharmacySelect: (pharmacy: Pharmacy) => void;
  selectedPharmacyId?: string;
}

const MapView: React.FC<MapViewProps> = ({ userLocation, pharmacies, onPharmacySelect, selectedPharmacyId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialPos: L.LatLngTuple = userLocation ? [userLocation.lat, userLocation.lng] : [40.4168, -3.7038];
    
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(initialPos, 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      // Markers belonged to the removed map; forget them so they're recreated on remount
      markersRef.current.clear();
      userMarkerRef.current = null;
    };
  }, []);

  // Handle User Location Updates
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    const pos: L.LatLngTuple = [userLocation.lat, userLocation.lng];
    
    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative w-8 h-8 flex items-center justify-center">
            <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30"></div>
            <div class="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center z-10">
              <div class="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      userMarkerRef.current = L.marker(pos, { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng(pos);
    }

    if (pharmacies.length === 0 && !selectedPharmacyId) {
      mapRef.current.panTo(pos);
    }
  }, [userLocation, pharmacies.length, selectedPharmacyId]);

  // Handle Pharmacy Selection (Pan & Zoom)
  useEffect(() => {
    if (!mapRef.current || !selectedPharmacyId) return;

    const selectedPharmacy = pharmacies.find(p => p.id === selectedPharmacyId);
    if (selectedPharmacy) {
      const map = mapRef.current;
      const zoom = 17;
      // Centre below the marker so it stays visible above the details sheet
      const markerPoint = map.project([selectedPharmacy.lat, selectedPharmacy.lng], zoom);
      const center = map.unproject(markerPoint.add([0, map.getSize().y * 0.1]), zoom);
      map.flyTo(center, zoom, {
        animate: true,
        duration: 0.8
      });
    }
  }, [selectedPharmacyId, pharmacies]);

  // Handle Pharmacy Markers
  useEffect(() => {
    if (!mapRef.current) return;

    const currentIds = new Set(pharmacies.map(p => p.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    pharmacies.forEach((pharmacy) => {
      const isSelected = selectedPharmacyId === pharmacy.id;
      const pos: L.LatLngTuple = [pharmacy.lat, pharmacy.lng];

      const statusColors = {
        available: { border: 'border-green-500', text: 'text-green-700', pin: 'text-green-500', label: '✓ Stock' },
        low: { border: 'border-orange-500', text: 'text-orange-700', pin: 'text-orange-500', label: '⚠ Bajo' },
        out: { border: 'border-red-500', text: 'text-red-700', pin: 'text-red-500', label: '✗ Agotado' }
      };

      const config = statusColors[pharmacy.stockStatus] || statusColors.available;
      
      // Animation logic
      const selectionClass = isSelected ? 'marker-selected' : 'scale-100';

      const iconHtml = `
        <div class="flex flex-col items-center transition-all duration-300 ${selectionClass}">
          <div class="flex items-center space-x-1 mb-1 px-2 py-0.5 rounded-full text-[10px] font-black shadow-md whitespace-nowrap bg-white border-2 ${config.border} ${config.text}">
            ${pharmacy.is24h ? '<span class="bg-red-500 text-white px-1 rounded-sm text-[8px] font-bold">24H</span>' : ''}
            <span>${config.label}</span>
          </div>
          <div class="relative ${isSelected ? 'text-blue-700' : config.pin}">
            <i class="fas fa-location-dot text-4xl drop-shadow-lg"></i>
            <div class="absolute top-[25%] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-inner opacity-80"></div>
          </div>
          ${isSelected ? '<div class="w-2 h-1 bg-black/10 rounded-full blur-[2px] mt-[-2px]"></div>' : ''}
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: iconHtml,
        iconSize: [80, 75],
        iconAnchor: [40, 75]
      });

      const existing = markersRef.current.get(pharmacy.id);
      if (existing) {
        existing.setLatLng(pos);
        existing.setIcon(icon);
        existing.setZIndexOffset(isSelected ? 500 : 0);
        // Rebind so the click selects this search's pharmacy, not one from a previous search with the same id
        existing.off('click').on('click', () => onPharmacySelect(pharmacy));
      } else {
        const marker = L.marker(pos, { icon, keyboard: true, title: pharmacy.name, alt: pharmacy.name })
          .addTo(mapRef.current!)
          .on('click', () => onPharmacySelect(pharmacy));
        markersRef.current.set(pharmacy.id, marker);
      }
    });

    // Fit bounds considering both pharmacies AND user location
    if (pharmacies.length > 0 && !selectedPharmacyId) {
      const bounds = L.latLngBounds(pharmacies.map((p): L.LatLngTuple => [p.lat, p.lng]));
      
      if (userLocation) {
        bounds.extend([userLocation.lat, userLocation.lng]);
      }

      mapRef.current.fitBounds(bounds, {
        // Keep markers (75px tall) clear of the results header on top and the SOS button below
        paddingTopLeft: [60, 250],
        paddingBottomRight: [60, 150],
        maxZoom: 16,        // Avoid excessive zoom-in if markers are very close to each other
        animate: true,
        duration: 1
      } as L.FitBoundsOptions);
    }
  }, [pharmacies, selectedPharmacyId, onPharmacySelect, userLocation]);

  return (
    <div className="absolute inset-0 bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default MapView;
