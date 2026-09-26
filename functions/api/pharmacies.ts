import { type Env, generateContent, isShortText, json, readJson } from "../../server/gemini";

// POST /api/pharmacies  { medication, lat, lng }  →  { chunks }
export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  const body = await readJson(request);
  const { medication, lat, lng } = body ?? {};
  const validCoords =
    typeof lat === "number" && typeof lng === "number" &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  if (!isShortText(medication, 100) || !validCoords) {
    return json({ error: "Parámetros no válidos" }, 400);
  }

  try {
    const response = await generateContent(env, "gemini-2.5-flash", {
      contents: [{
        parts: [{
          text: `Busca farmacias cerca de mi ubicación actual que puedan tener stock de ${medication}.
                 Mi ubicación es: ${lat}, ${lng}.
                 Devuelve una lista de farmacias reales con sus nombres y direcciones.`,
        }],
      }],
      tools: [{ googleMaps: {} }],
      toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } },
    });
    return json({ chunks: response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [] });
  } catch (error) {
    console.error("pharmacies:", error);
    return json({ error: "Servicio no disponible" }, 502);
  }
}
