import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@reports': path.resolve(__dirname, '../../reports'),
      '@data': path.resolve(__dirname, '../../data'),
    },
  },
});
