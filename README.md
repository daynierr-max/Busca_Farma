<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1qShHQavdrufL-lM3bRrWUeu3EdaOlRnf

## Ejecutar en local

**Requisitos:** Node.js 22.6 o superior

1. Instalar dependencias: `npm ci`
2. Crear `.env.local` con `GEMINI_API_KEY=tu_clave` ([obtener clave](https://aistudio.google.com/apikey))
3. Comprobar la clave y los modelos: `npm run check:gemini`
4. Arrancar: `npm run dev` (o `npm run build && npm run preview`)

Sin clave, la app funciona con farmacias de ejemplo.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` | Compila para producción en `dist/` |
| `npm run typecheck` | Comprueba tipos de TypeScript |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright; la primera vez: `npx playwright install chromium`) |
| `npm run check:gemini` | Verifica la clave de Gemini y los modelos antes de una demo |

📋 **Preparar una demo:** ver [docs/DEMO.md](docs/DEMO.md).
