import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], base: './', build: { chunkSizeWarningLimit: 700 }, server: { strictPort: true }, test: { include: ['tests/**/*.test.ts'] } });
