import { Location } from '../types';

export const searchLocation = async (query: string): Promise<Location | null> => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`);

    if (!response.ok) {
      throw new Error(`Failed to fetch location: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      return { lat, lng };
    }

    return null;
  } catch (error) {
    console.error('Error searching location:', error);
    return null;
  }
};
