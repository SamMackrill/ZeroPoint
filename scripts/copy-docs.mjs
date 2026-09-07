import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist/docs', { recursive: true });
await cp('docs', 'dist/docs', { recursive: true });
await cp('images', 'dist/images', { recursive: true });
