import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { devPort } from './scripts/dev-port.mjs';
export default defineConfig({ plugins: [react()], base: './', build: { chunkSizeWarningLimit: 700 }, server: { host: '127.0.0.1', port: devPort(), strictPort: true }, test: { include: ['tests/**/*.test.{ts,tsx}'], setupFiles: ['tests/ui/setup.ts'] } });
