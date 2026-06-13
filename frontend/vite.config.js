import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'ore_module',
      filename: 'remoteEntry.js',
      exposes: {
        './InserimentoOre': './src/pages/InserimentoOre.vue',
        './GestioneCommesse': './src/pages/GestioneCommesse.vue',
      },
      shared: ['vue', 'axios'],
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:8002', changeOrigin: true },
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
