import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, '../../src/dist'),
    emptyOutDir: true,
    target: 'esnext',
  },
  resolve: {
    alias: {
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'diff': path.resolve(__dirname, '../../node_modules/diff'),
    },
  },
  server: {
    port: 5173,
  },
});
