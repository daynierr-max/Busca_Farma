
export interface Location {
  lat: number;
  lng: number;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  isOpen: boolean;
  is24h: boolean;
  stockStatus: 'available' | 'low' | 'out';
  phone: string;
  whatsapp: string;
  googleMapsUri: string;
  lat: number;
  lng: number;
}

export enum AppView {
  HOME = 'home',
  SCAN = 'scan',
  SEARCH_RESULTS = 'results'
}
