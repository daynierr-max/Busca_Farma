# FarmaSearch · Localizador de medicamentos

Aplicación web para encontrar farmacias cercanas que puedan tener un medicamento, con mapa, **búsqueda por voz** para personas con baja visión y **escaneo de la caja** del medicamento con la cámara.

**Stack:** React 19 · TypeScript · Vite · Gemini API (grounding con Google Maps, visión y Live API de voz) · Cloudflare Pages Functions

## Funcionalidades

| Función | Cómo funciona |
|---|---|
| Búsqueda de farmacias | Gemini con la herramienta de Google Maps y la ubicación del usuario (`/api/pharmacies`) |
| Escaneo de la caja | Foto con la cámara → Gemini identifica el nombre del fármaco (`/api/scan`) |
| FarmaVoz (accesibilidad) | Asistente de voz en tiempo real con la Live API de Gemini, pensado para quien no puede leer la pantalla |

## Arquitectura y seguridad

```
Navegador (React + Vite)  ──fetch /api/*──►  Cloudflare Pages Functions  ──►  API de Gemini
       sin clave                              GEMINI_API_KEY (variable de entorno)
```

- La clave de Gemini **nunca llega al navegador**. La primera versión, generada con Google AI Studio, la incrustaba en el JavaScript público mediante `define` en `vite.config.ts`. La he movido a funciones de servidor.
- Cada endpoint hace **una sola tarea**, con un prompt fijo y entradas validadas (tipo, longitud, rangos). No es un proxy abierto a Gemini.
- Límite de tamaño en las peticiones y errores genéricos hacia el cliente (el detalle queda en los logs del servidor).
- **Asistente de voz:** la Live API se conecta directamente desde el navegador, así que el servidor emite un **token efímero** (`/api/live-token`) de un solo uso, 30 minutos de vida y restringido al modelo de voz, en lugar de exponer la clave real.

> Limitación conocida: la disponibilidad de stock que se muestra es simulada. La búsqueda de farmacias es real, pero no hay una API pública de inventario de farmacias en España.

## Ejecutar en local

```bash
npm install
echo "GEMINI_API_KEY=tu_clave" > .dev.vars      # no se sube al repo (.gitignore)
npm run build && npx wrangler pages dev dist     # app + funciones en :8788
# o, para desarrollo con recarga: `npx wrangler pages dev` en una terminal y `npm run dev` en otra
```

## Despliegue

Cloudflare Pages: comando de build `npm run build`, directorio de salida `dist`, y `GEMINI_API_KEY` como variable de entorno **cifrada** del proyecto.
