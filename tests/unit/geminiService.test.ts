import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { extractCoordsFromUri, findPharmaciesNearby, scanMedicationBox } = await import('../../services/geminiService');

const here = { lat: 40.4168, lng: -3.7038 };
const mapsChunk = (title: string, lat: number, lng: number, address = 'Calle 1') => ({
  maps: { title, address, uri: `https://www.google.com/maps/place/x/@${lat},${lng},17z` },
});
const responseWith = (chunks: unknown[]) => ({
  candidates: [{ groundingMetadata: { groundingChunks: chunks } }],
});

beforeEach(() => {
  generateContent.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('extractCoordsFromUri', () => {
  it('reads @lat,lng URLs', () => {
    expect(extractCoordsFromUri('https://maps.google.com/@40.1,-3.2,15z')).toEqual({ lat: 40.1, lng: -3.2 });
  });

  it('reads query=lat%2Clng and query=lat,lng URLs', () => {
    expect(extractCoordsFromUri('https://x/?query=40.5%2C-3.5')).toEqual({ lat: 40.5, lng: -3.5 });
    expect(extractCoordsFromUri('https://x/?query=40.5,-3.5')).toEqual({ lat: 40.5, lng: -3.5 });
  });

  it('returns null when there are no coordinates', () => {
    expect(extractCoordsFromUri('https://maps.google.com/?cid=123')).toBeNull();
  });
});

describe('findPharmaciesNearby', () => {
  it('maps Maps grounding chunks to pharmacies sorted by real distance', async () => {
    generateContent.mockResolvedValue(responseWith([
      mapsChunk('Lejana', 40.43, -3.70),
      mapsChunk('Cercana', 40.417, -3.704),
    ]));

    const { pharmacies, isDemoData } = await findPharmaciesNearby('Ibuprofeno', here);

    expect(isDemoData).toBe(false);
    expect(pharmacies.map(p => p.name)).toEqual(['Cercana', 'Lejana']);
    expect(pharmacies[0].distance).toMatch(/^\d+ m$/);
    expect(pharmacies[1].distance).toBe('1.5 km');
    expect(pharmacies[0].googleMapsUri).toMatch(/^https:\/\/www\.google\.com\/maps\/place/);
  });

  it('ignores web chunks and duplicates', async () => {
    generateContent.mockResolvedValue(responseWith([
      { web: { uri: 'https://example.com', title: 'Blog' } },
      mapsChunk('Farmacia A', 40.42, -3.70),
      mapsChunk('Farmacia A', 40.42, -3.70),
    ]));

    const { pharmacies } = await findPharmaciesNearby('Ibuprofeno', here);
    expect(pharmacies.map(p => p.name)).toEqual(['Farmacia A']);
  });

  it('never uses a non-https URI for directions', async () => {
    generateContent.mockResolvedValue(responseWith([
      { maps: { title: 'Rara', address: 'Calle 2', uri: 'javascript:alert(1)' } },
    ]));

    const { pharmacies } = await findPharmaciesNearby('Ibuprofeno', here);
    expect(pharmacies[0].googleMapsUri).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Rara/);
  });

  it('falls back to example pharmacies when Gemini fails', async () => {
    generateContent.mockRejectedValue(new Error('network'));

    const { pharmacies, isDemoData } = await findPharmaciesNearby('Ibuprofeno', here);
    expect(isDemoData).toBe(true);
    expect(pharmacies).toHaveLength(2);
    expect(pharmacies.every(p => p.distance.length > 0)).toBe(true);
  });

  it('falls back to example pharmacies when there are no Maps results', async () => {
    generateContent.mockResolvedValue(responseWith([]));
    const { isDemoData } = await findPharmaciesNearby('Ibuprofeno', here);
    expect(isDemoData).toBe(true);
  });
});

describe('scanMedicationBox', () => {
  it('returns a clean single-line name', async () => {
    generateContent.mockResolvedValue({ text: '"Ibuprofeno 600 mg".\nOtra línea' });
    expect(await scanMedicationBox('abc')).toBe('Ibuprofeno 600 mg');
  });

  it('returns an empty string on failure or empty text', async () => {
    generateContent.mockRejectedValueOnce(new Error('boom'));
    expect(await scanMedicationBox('abc')).toBe('');
    generateContent.mockResolvedValueOnce({ text: undefined });
    expect(await scanMedicationBox('abc')).toBe('');
  });
});
