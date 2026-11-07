import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' faz o build funcionar quando aberto via file:// pelo Electron
// e também quando hospedado como site/PWA.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
