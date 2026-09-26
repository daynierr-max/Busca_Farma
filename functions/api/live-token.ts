import { type Env, json } from "../../server/gemini";

const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// POST /api/live-token  →  { token }
// Emite un token efímero (1 uso, 30 min, restringido al modelo de voz) para que
// el navegador abra la sesión de la Live API sin conocer la clave real.
export async function onRequestPost({ env }: { env: Env }) {
  if (!env.GEMINI_API_KEY) return json({ error: "Servicio no disponible" }, 502);
  const now = Date.now();
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 60_000).toISOString(),
      liveConnectConstraints: { model: LIVE_MODEL },
    }),
  });
  if (!res.ok) {
    console.error("live-token: Gemini respondió", res.status);
    return json({ error: "Servicio no disponible" }, 502);
  }
  const { name } = await res.json() as { name: string };
  return json({ token: name });
}
