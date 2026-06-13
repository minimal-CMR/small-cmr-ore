import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'ore_module',
      filename: 'remoteEntry.js',
      exposes: {
        './InserimentoOre': './src/pages/InserimentoOre.jsx',
        './GestioneCommesse': './src/pages/GestioneCommesse.jsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom', 'axios'],
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});
