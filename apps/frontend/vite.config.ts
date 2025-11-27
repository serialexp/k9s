import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: {
    port: 3131,
    proxy: {
      '/api': {
        target: 'http://localhost:3130',
        changeOrigin: true
      },
      '/events': {
        target: 'http://localhost:3130',
        changeOrigin: true,
        ws: false
      }
    }
  },
  build: {
    target: 'esnext'
  }
});
