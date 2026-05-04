import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Three.js en su propio chunk — el usuario solo lo descarga si gana un premio
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
