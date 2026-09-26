/**
 * Cliente mínimo de la API REST de Gemini para Cloudflare Pages Functions.
 * La clave vive solo en el servidor (variable de entorno GEMINI_API_KEY);
 * el navegador nunca la recibe.
 */
export interface Env {
  GEMINI_API_KEY: string;
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function generateContent(env: Env, model: string, body: unknown): Promise<any> {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada en el servidor");
  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}`);
  return res.json();
}

/** Concatena las partes de texto de la primera respuesta candidata. */
export function textOf(response: any): string {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p.text ?? "").join("").trim();
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Lee el cuerpo JSON limitando su tamaño para evitar abusos. */
export async function readJson(request: Request, maxBytes = 10_000): Promise<any | null> {
  const raw = await request.text();
  if (raw.length > maxBytes) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isShortText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
