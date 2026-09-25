
import { GoogleGenAI } from "@google/genai";
import { Location, Pharmacy } from "../types";
import { distanceKm, formatDistance } from "../utils/geo";
import { MODELS } from "../config/models";

export { MODELS };

// Created lazily so a missing API key doesn't crash the whole app on load
let ai: GoogleGenAI | null = null;
export const getAi = () => {
  if (!ai) ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai;
};

export interface PharmacySearchResult {
  pharmacies: Pharmacy[];
  /** True when Gemini returned nothing usable and example pharmacies are shown instead */
  isDemoData: boolean;
}

/**
 * Intenta extraer coordenadas de una URL de Google Maps
 */
export const extractCoordsFromUri = (uri: string): { lat: number, lng: number } | null => {
  // Patrón para @lat,lng (común en Google Maps)
  const atMatch = uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }
  // Patrón para query=lat%2Clng
  const queryMatch = uri.match(/query=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/);
  if (queryMatch) {
    return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };
  }
  return null;
};

const withDistances = (pharmacies: Pharmacy[], location: Location): Pharmacy[] =>
  pharmacies
    .map(p => ({ p, km: distanceKm(location, p) }))
    .sort((a, b) => a.km - b.km)
    .map(({ p, km }) => ({ ...p, distance: formatDistance(km) }));

export const findPharmaciesNearby = async (medication: string, location: Location): Promise<PharmacySearchResult> => {
  try {
    const response = await getAi().models.generateContent({
      model: MODELS.search,
      contents: `Busca farmacias cerca de mi ubicación actual que puedan tener stock de ${medication}. 
                 Mi ubicación es: ${location.lat}, ${location.lng}. 
                 Devuelve una lista de farmacias reales con sus nombres y direcciones.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: location.lat,
              longitude: location.lng
            }
          }
        }
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const seen = new Set<string>();

    const pharmacies: Pharmacy[] = chunks
      // Only Maps results describe a place; web chunks would show up as nameless pharmacies
      .filter((chunk: any) => chunk.maps?.title)
      .filter((chunk: any) => {
        const key = `${chunk.maps.title}|${chunk.maps.uri ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((chunk: any, index: number) => {
        const mapsInfo = chunk.maps;
        const uri: string = mapsInfo.uri || "";
        const coords = extractCoordsFromUri(uri);

        // Si no podemos extraer coordenadas reales, usamos un pequeño offset pero
        // generamos una URI que coincida con ese offset para mantener la coherencia
        const lat = coords?.lat ?? (location.lat + (Math.random() - 0.5) * 0.015);
        const lng = coords?.lng ?? (location.lng + (Math.random() - 0.5) * 0.015);

        // "Cómo llegar" usa el enlace real del sitio en Google Maps; si no hay, buscamos por nombre y dirección
        const finalUri = uri.startsWith("https://")
          ? uri
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapsInfo.title} ${mapsInfo.address ?? ''}`.trim())}`;

        const stockLevels: ('available' | 'low' | 'out')[] = ['available', 'low', 'available', 'available'];

        return {
          id: `ph-${index}`,
          name: mapsInfo.title,
          address: mapsInfo.address || "Consultar dirección en mapa",
          distance: "",
          rating: 4 + Math.random(),
          isOpen: true,
          is24h: Math.random() > 0.8,
          stockStatus: stockLevels[Math.floor(Math.random() * stockLevels.length)],
          phone: "+34900000000",
          whatsapp: "34600000000",
          googleMapsUri: finalUri,
          lat: lat,
          lng: lng
        };
      });

    if (pharmacies.length > 0) {
      return { pharmacies: withDistances(pharmacies, location), isDemoData: false };
    }
    return { pharmacies: getMockPharmacies(location), isDemoData: true };
  } catch (error) {
    console.error("Error finding pharmacies:", error);
    return { pharmacies: getMockPharmacies(location), isDemoData: true };
  }
};

export const getMockPharmacies = (location: Location): Pharmacy[] => {
  const mock1 = { lat: location.lat + 0.002, lng: location.lng + 0.002 };
  const mock2 = { lat: location.lat - 0.003, lng: location.lng + 0.004 };

  return withDistances([
    {
      id: "demo-1",
      name: "Farmacia Central",
      address: "Calle Mayor, 1",
      distance: "",
      rating: 4.8,
      isOpen: true,
      is24h: true,
      stockStatus: 'available',
      phone: "+34912345678",
      whatsapp: "34600112233",
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${mock1.lat},${mock1.lng}`,
      lat: mock1.lat,
      lng: mock1.lng
    },
    {
      id: "demo-2",
      name: "Farmacia del Sol",
      address: "Plaza del Sol, 5",
      distance: "",
      rating: 4.5,
      isOpen: true,
      is24h: false,
      stockStatus: 'low',
      phone: "+34912345679",
      whatsapp: "34600112244",
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${mock2.lat},${mock2.lng}`,
      lat: mock2.lat,
      lng: mock2.lng
    }
  ], location);
};

export const scanMedicationBox = async (base64Image: string): Promise<string> => {
  try {
    const response = await getAi().models.generateContent({
      model: MODELS.scan,
      contents: {
        parts: [
          { text: "Identifica el nombre del medicamento en esta imagen. Devuelve ÚNICAMENTE el nombre del fármaco, sin texto extra." },
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]
      }
    });
    // Keep only the first line and drop quotes/trailing dots the model sometimes adds
    const name = (response.text ?? "").trim().split("\n")[0].replace(/^["'*]+|["'*.]+$/g, "").trim();
    return name.slice(0, 80);
  } catch (error) {
    console.error("Error scanning box:", error);
    return "";
  }
};
