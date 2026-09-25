import { test as base, expect, Page, Route } from '@playwright/test';

export const HOME = { lat: 40.4168, lng: -3.7038 };

type Place = { title: string; address: string; lat: number; lng: number };

export const PLACES: Record<string, Place[]> = {
  default: [
    { title: 'Farmacia Gran Vía', address: 'Gran Vía, 10', lat: 40.4200, lng: -3.7020 },
    { title: 'Farmacia Sol 24h', address: 'Puerta del Sol, 2', lat: 40.4170, lng: -3.7035 },
    { title: 'Farmacia Retiro', address: 'Calle Alcalá, 90', lat: 40.4230, lng: -3.6880 },
  ],
  insulina: [
    { title: 'Farmacia Lavapiés', address: 'Calle Argumosa, 5', lat: 40.4090, lng: -3.6990 },
  ],
};

export const SCANNED_NAME = 'Paracetamol 1g';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const mapsResponse = (places: Place[]) => ({
  candidates: [{
    content: { role: 'model', parts: [{ text: 'Estas son algunas farmacias cercanas.' }] },
    groundingMetadata: {
      groundingChunks: places.map(p => ({
        maps: {
          title: p.title,
          address: p.address,
          uri: `https://www.google.com/maps/place/x/@${p.lat},${p.lng},17z`,
        },
      })),
    },
  }],
});

const textResponse = (text: string) => ({
  candidates: [{ content: { role: 'model', parts: [{ text }] } }],
});

export type GeminiMode = 'ok' | 'error';

/** Simulates the Gemini REST API, map tiles and external links. */
export async function mockNetwork(page: Page, mode: GeminiMode = 'ok') {
  await page.route(/generativelanguage\.googleapis\.com/, async (route: Route) => {
    if (mode === 'error') {
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":500}}' });
    }
    const body = route.request().postData() ?? '';
    if (body.includes('inlineData') || body.includes('inline_data')) {
      return route.fulfill({ json: textResponse(SCANNED_NAME) });
    }
    const places = /insulina/i.test(body) ? PLACES.insulina : PLACES.default;
    return route.fulfill({ json: mapsResponse(places) });
  });
  await page.route(/basemaps\.cartocdn\.com/, route =>
    route.fulfill({ contentType: 'image/png', body: tinyPng }),
  );
  // Context-level so it also covers the "Cómo llegar" popup
  await page.context().route(/^https:\/\/(www\.)?google\.com\/maps/, route =>
    route.fulfill({ contentType: 'text/html', body: '<title>Google Maps</title>' }),
  );
}

export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      // The app logs handled Gemini failures on purpose; anything else is unexpected
      if (msg.type() === 'error' && !/Error finding pharmacies|Error scanning box|Failed to load resource/.test(msg.text())) {
        errors.push(msg.text());
      }
    });
    await use(errors);
  },
});

export { expect };

export const markers = (page: Page) => page.locator('.leaflet-marker-icon[title]');
