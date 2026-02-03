
import { GoogleGenAI, Type } from "@google/genai";
import { Location, Pharmacy } from "../types";

const getAi = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || "dummy_key" });
};

export const findPharmaciesNearby = async (medication: string, location: Location): Promise<Pharmacy[]> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find pharmacies near me that might have ${medication}. 
                 My location is: ${location.lat}, ${location.lng}. 
                 Provide a list of pharmacies with their names, approximate address, rating, and if they are open.`,
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
    
    // Map grounding chunks to our internal Pharmacy objects
    const pharmacies: Pharmacy[] = chunks.map((chunk: any, index: number) => {
      const mapsInfo = chunk.maps || {};
      const stockLevels: ('available' | 'low' | 'out')[] = ['available', 'low', 'available', 'available'];
      
      return {
        id: `ph-${index}`,
        name: mapsInfo.title || "Farmacia Cercana",
        address: mapsInfo.address || "Dirección no disponible",
        distance: `${(Math.random() * 2 + 0.1).toFixed(1)} km`,
        rating: 4 + Math.random(),
        isOpen: true,
        is24h: Math.random() > 0.8,
        stockStatus: stockLevels[Math.floor(Math.random() * stockLevels.length)],
        phone: "+34900000000",
        whatsapp: "34600000000",
        googleMapsUri: mapsInfo.uri || "https://maps.google.com",
        lat: location.lat + (Math.random() - 0.5) * 0.01,
        lng: location.lng + (Math.random() - 0.5) * 0.01
      };
    });

    return pharmacies.length > 0 ? pharmacies : getMockPharmacies(location);
  } catch (error) {
    console.error("Error finding pharmacies:", error);
    return getMockPharmacies(location);
  }
};

const getMockPharmacies = (location: Location): Pharmacy[] => {
  return [
    {
      id: "1",
      name: "Farmacia Central",
      address: "Calle Mayor, 1",
      distance: "300m (4 min a pie)",
      rating: 4.8,
      isOpen: true,
      is24h: true,
      stockStatus: 'available',
      phone: "+34912345678",
      whatsapp: "34600112233",
      googleMapsUri: "https://maps.google.com",
      lat: location.lat + 0.002,
      lng: location.lng + 0.002
    },
    {
      id: "2",
      name: "Farmacia del Sol",
      address: "Plaza del Sol, 5",
      distance: "850m (10 min)",
      rating: 4.5,
      isOpen: true,
      is24h: false,
      stockStatus: 'low',
      phone: "+34912345679",
      whatsapp: "34600112244",
      googleMapsUri: "https://maps.google.com",
      lat: location.lat - 0.003,
      lng: location.lng + 0.004
    }
  ];
};

export const scanMedicationBox = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Identify the name of the medication in this image. Return ONLY the name of the drug, no extra text." },
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error scanning box:", error);
    return "";
  }
};
