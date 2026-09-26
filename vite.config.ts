import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // En desarrollo, /api/* se sirve con `npx wrangler pages dev` (puerto 8788),
        // que ejecuta las funciones de servidor con la clave de .dev.vars.
        proxy: { '/api': 'http://localhost:8788' },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
