// Update the reserved site using the public here.now API. Node 22.12+; no shell dependencies.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(root, 'here-now.json'), 'utf8'));
if (!/^[a-z0-9-]+$/.test(config.slug) || config.outputDirectory !== 'dist') throw new Error('Invalid here-now.json deployment target.');
const api = `https://here.now/api/v1/publish/${config.slug}`;
const credentials = process.env.HERENOW_API_KEY?.trim() || await readFile(join(homedir(), '.herenow', 'credentials'), 'utf8').then(s => s.trim()).catch(() => '');
if (!credentials) throw new Error('Set HERENOW_API_KEY or save the account key in ~/.herenow/credentials.');
const headers = { Authorization: `Bearer ${credentials}`, 'Content-Type': 'application/json', 'X-HereNow-Client': 'codex/repo-publish' };
const cachePath = join(root, '.herenow', 'state.json');
const cache = JSON.parse(await readFile(cachePath, 'utf8').catch(() => '{"publishes":{}}'));

/** Send an authenticated request to the configured here.now API origin. */
async function request(url, method = 'GET', body) {
  // Credentials only go to the known API host; upload targets receive file bytes alone.
  if (new URL(url).origin !== 'https://here.now') throw new Error('Unexpected API destination.');
  const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  if (!response.ok) throw new Error(`here.now ${response.status}: ${result.code ?? ''} ${result.message ?? result.error ?? 'Request failed'}`);
  return result;
}

const live = await request(api);
const previous = cache.publishes?.[config.slug]?.versionId;
if (previous && previous !== live.currentVersionId) throw new Error(`The live site changed since this checkout last published (${live.currentVersionId}, source ${live.currentVersionSource}). Read and reconcile the live files before updating the local deployment cache.`);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const files = new Map();
/** Recursively collect publishable files under the production output directory. */
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = prefix + entry.name;
    if (entry.isDirectory()) await collect(join(directory, entry.name), path + '/');
    else if (entry.isFile()) files.set(path, await readFile(join(directory, entry.name)));
  }
}
await collect(join(root, config.outputDirectory));
if (!files.has('index.html') || !files.has('docs/light-model.md')) throw new Error('Build the complete application before publishing.');
const manifest = [...files].map(([path, bytes]) => ({ path, size: bytes.length, contentType: types[extname(path).toLowerCase()] ?? 'application/octet-stream', hash: createHash('sha256').update(bytes).digest('hex') }));
console.log(`Updating ${config.slug}: ${files.size} production files (${Math.round(manifest.reduce((n, f) => n + f.size, 0) / 1024)} KB).`);
const staged = await request(api, 'PUT', { files: manifest, baseVersionId: live.currentVersionId });
if (staged.slug !== config.slug) throw new Error('Unexpected publish slug.');
const targets = staged.upload.uploads;
let next = 0;
await Promise.all(Array.from({ length: Math.min(4, targets.length) }, async () => {
  while (next < targets.length) {
    const target = targets[next++], bytes = files.get(target.path), url = new URL(target.url);
    if (!bytes || url.protocol !== 'https:' || !url.hostname.endsWith('.r2.cloudflarestorage.com')) throw new Error(`Unexpected upload target for ${target.path}.`);
    let uploaded = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, { method: 'PUT', headers: target.headers, body: bytes, redirect: 'error', signal: AbortSignal.timeout(60000) });
        if (response.ok) { uploaded = true; break; }
      } catch { /* Retry the same idempotent file upload without logging its signed URL. */ }
    }
    if (!uploaded) throw new Error(`File upload failed: ${target.path}. Live content has not been finalized.`);
  }
}));
const finalized = await request(staged.upload.finalizeUrl, 'POST', { versionId: staged.upload.versionId });
if (!finalized.success || finalized.slug !== config.slug) throw new Error('here.now did not confirm publication.');
cache.publishes ??= {};
cache.publishes[config.slug] = { siteUrl: finalized.siteUrl, versionId: finalized.currentVersionId, publishedAt: new Date().toISOString() };
await mkdir(dirname(cachePath), { recursive: true }); await writeFile(cachePath, JSON.stringify(cache, null, 2) + '\n');
console.log(finalized.siteUrl);
console.log(`publish_result.auth_mode=${finalized.publishStatus?.requestAuth === 'api_key' ? 'authenticated' : finalized.publishStatus?.requestAuth ?? 'unknown'}`);
console.log(`publish_result.persistence=${finalized.publishStatus?.persistence ?? 'unknown'}`);
console.log(`publish_result.state=${finalized.publishStatus?.state ?? 'unknown'}`);
console.log(`publish_result.version=${finalized.currentVersionId}`);
if (finalized.warnings?.length) console.log('Publish warnings:', JSON.stringify(finalized.warnings));
