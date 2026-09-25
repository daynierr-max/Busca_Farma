# Guía de demo — FarmaSearch

## 1. Preparación (el día antes)

| # | Paso | Comando / acción | Resultado esperado |
|---|------|------------------|--------------------|
| 1 | Instalar dependencias | `npm ci` | Sin errores |
| 2 | Configurar la clave | Crear `.env.local` con `GEMINI_API_KEY=tu_clave` | — |
| 3 | Verificar Gemini | `npm run check:gemini` | `🎉 Todo listo para la demo.` |
| 4 | Tests automáticos | `npm test` y `npm run test:e2e` | Todo en verde |
| 5 | Compilar y probar | `npm run build && npm run preview` | App en http://localhost:4173 |
| 6 | Ensayo completo | Seguir el guion de la sección 3 | Todo funciona |

> **Node.js 22.6 o superior** es necesario para `npm run check:gemini`.
> La primera vez que ejecutes los tests E2E en tu máquina: `npx playwright install chromium`.

### Si `check:gemini` falla

| Mensaje | Qué hacer |
|---------|-----------|
| `API key not valid` | Crea una clave nueva en https://aistudio.google.com/apikey |
| `Modelo "..." ... not found` | Google retiró ese modelo. Cambia el nombre en `config/models.ts` por uno vigente |
| `sin farmacias de Google Maps` | La clave no tiene acceso a Grounding con Google Maps. La app funcionará con **datos de ejemplo** (se ve la etiqueta «Ejemplo») |
| `FarmaVoz` falla | Todo lo demás funciona; evita el botón del ojo en la demo |

## 2. El día de la demo

- Usa **Chrome** (la búsqueda por voz y FarmaVoz no funcionan en Firefox).
- Abre la app por **http://localhost** o **https**: cámara, micrófono y ubicación no funcionan en `http://` con otra IP.
- Acepta los permisos de **ubicación, cámara y micrófono** antes de empezar (haz un ensayo en el mismo navegador).
- Ten a mano una **caja de medicamento** con el nombre bien visible.
- Si el Wi‑Fi falla: la app sigue funcionando con **farmacias de ejemplo** (etiqueta «Ejemplo»); el mapa de fondo necesita internet.

## 3. Guion sugerido (5 minutos)

1. **Inicio** — Presenta la pantalla: buscador, escanear caja, búsqueda por voz, recientes y botón rojo de guardia.
2. **Búsqueda escrita** — Escribe `Ibuprofeno` y pulsa Enter. Aparecen marcadores ordenados por distancia real.
3. **Detalle** — Toca un marcador: nombre, distancia, stock estimado, WhatsApp, llamar y «Cómo llegar» (abre Google Maps).
4. **Volver** — Flecha atrás; la búsqueda aparece en «Búsquedas recientes».
5. **Escanear caja** — Enfoca la caja y pulsa el disparador. Se muestra «Analizando la caja...» y se busca el medicamento detectado.
6. **Búsqueda por voz** — Pulsa «Búsqueda Voz» y di «Paracetamol».
7. **Farmacias de guardia** — Botón rojo: búsqueda inmediata sin escribir.
8. **FarmaVoz** (opcional) — Botón del ojo: asistente por voz para personas con visión reducida.

## 4. Limitaciones conocidas (dilo si preguntan)

- **Stock, valoración, horario, teléfono y WhatsApp son simulados.** Solo el nombre, la dirección y la ubicación vienen de Google Maps.
- FarmaVoz conversa por voz, pero todavía no lanza búsquedas en la app por sí mismo.
- Los botones de menú y perfil aún no tienen función.
- La clave de Gemini va dentro del JavaScript del navegador. **Para una demo pública**, restringe la clave por dominio (HTTP referrer) y ponle cuota en Google Cloud Console.

## 5. Qué cubren los tests

- **Unitarios** (`npm test`): cálculo de distancias, lectura de respuestas de Gemini, deduplicado, enlaces solo `https`, datos de ejemplo si Gemini falla, limpieza del nombre escaneado.
- **E2E** (`npm run test:e2e`, móvil y escritorio, con Gemini, GPS y cámara simulados): carga sin errores, búsqueda y detalle, enlaces de WhatsApp/llamar/cómo llegar, segunda búsqueda, fallo de Gemini, recientes persistentes, ubicación denegada, escaneo con cámara (y que la cámara se apaga), voz no soportada y error de FarmaVoz.
