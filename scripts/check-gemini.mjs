// Pre-demo check: verifies the Gemini API key and every model the app uses.
// Usage: npm run check:gemini   (reads GEMINI_API_KEY from the environment or .env.local)
import { readFileSync, existsSync } from 'node:fs';
import { GoogleGenAI, Modality } from '@google/genai';
import { MODELS } from '../config/models.ts';

const readKey = () => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    const match = readFileSync(file, 'utf8').match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m);
    if (match) return match[1].trim();
  }
  return '';
};

// API errors arrive as a JSON string; keep only the human-readable message
const describe = (err) => {
  const text = err?.message ?? String(err);
  try {
    return JSON.parse(text).error?.message ?? text;
  } catch {
    return text;
  }
};

const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ ok: true, name, detail });
    console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    const message = describe(err);
    results.push({ ok: false, name });
    console.log(`❌ ${name} — ${message}`);
    if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED.*key/i.test(message)) {
      console.log('\n⚠️  La clave GEMINI_API_KEY no es válida. Crea una en https://aistudio.google.com/apikey');
      process.exit(1);
    }
  }
};
const withTimeout = (promise, ms, label) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: sin respuesta en ${ms / 1000}s`)), ms))]);

const apiKey = readKey();
if (!apiKey) {
  console.log('❌ No se encontró GEMINI_API_KEY (ni en el entorno ni en .env.local).');
  console.log('   Crea .env.local con: GEMINI_API_KEY=tu_clave');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

for (const [use, model] of Object.entries(MODELS)) {
  await check(`Modelo "${model}" (${use}) disponible`, async () => {
    await withTimeout(ai.models.get({ model }), 15000, model);
  });
}

await check('Búsqueda de farmacias con Google Maps', async () => {
  const response = await withTimeout(ai.models.generateContent({
    model: MODELS.search,
    contents: 'Busca farmacias cerca de la Puerta del Sol, Madrid.',
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: { retrievalConfig: { latLng: { latitude: 40.4168, longitude: -3.7038 } } },
    },
  }), 60000, 'búsqueda');
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const places = chunks.filter(c => c.maps?.title).length;
  if (places === 0) throw new Error('Gemini respondió pero sin farmacias de Google Maps (la app mostraría datos de ejemplo)');
  return `${places} farmacias encontradas`;
});

await check('Lectura de cajas (modelo de visión)', async () => {
  const response = await withTimeout(ai.models.generateContent({
    model: MODELS.scan,
    contents: 'Responde solo con la palabra OK.',
  }), 30000, 'visión');
  return `respuesta: ${(response.text ?? '').trim().slice(0, 20)}`;
});

await check('FarmaVoz (conexión de voz en directo)', async () => {
  let session;
  await withTimeout(new Promise((resolve, reject) => {
    ai.live.connect({
      model: MODELS.live,
      config: { responseModalities: [Modality.AUDIO] },
      callbacks: {
        onopen: () => {},
        onmessage: (msg) => { if (msg.setupComplete) resolve(); },
        onerror: (e) => reject(new Error(e?.message ?? 'error de conexión')),
        onclose: (e) => reject(new Error(`conexión cerrada${e?.reason ? `: ${e.reason}` : ''}`)),
      },
    }).then(s => { session = s; }, reject);
  }), 20000, 'FarmaVoz');
  session?.close();
});

const failed = results.filter(r => !r.ok).length;
console.log(failed === 0 ? '\n🎉 Todo listo para la demo.' : `\n⚠️  ${failed} comprobación(es) fallaron. Revisa docs/DEMO.md.`);
process.exit(failed === 0 ? 0 : 1);
