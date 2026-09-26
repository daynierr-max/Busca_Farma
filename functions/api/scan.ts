import { type Env, generateContent, json, readJson, textOf } from "../../server/gemini";

const MAX_IMAGE_BYTES = 4_000_000; // ~3 MB de imagen en base64

// POST /api/scan  { image: <base64 JPEG> }  →  { name }
export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  const body = await readJson(request, MAX_IMAGE_BYTES + 100);
  const image = body?.image;
  if (typeof image !== "string" || image.length === 0 || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return json({ error: "Imagen no válida" }, 400);
  }

  try {
    const response = await generateContent(env, "gemini-3-flash-preview", {
      contents: [{
        parts: [
          { text: "Identifica el nombre del medicamento en esta imagen. Devuelve ÚNICAMENTE el nombre del fármaco, sin texto extra." },
          { inlineData: { data: image, mimeType: "image/jpeg" } },
        ],
      }],
    });
    return json({ name: textOf(response) });
  } catch (error) {
    console.error("scan:", error);
    return json({ error: "Servicio no disponible" }, 502);
  }
}
