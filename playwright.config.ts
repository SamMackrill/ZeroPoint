import { defineConfig } from '@playwright/test';
import { devPort } from './scripts/dev-port.mjs';
// Each worktree sets ZP_PORT so parallel checkouts never test each other's dev server. Set ZP_REUSE=1 to reuse a server you started yourself.
const url = `http://127.0.0.1:${devPort()}`;
export default defineConfig({
  timeout: 30000,
  use: { baseURL: url, headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npm run dev', url, reuseExistingServer: process.env.ZP_REUSE === '1' },
  workers: 1,
  projects: [
    { name: 'functional', testDir: './tests/browser' },
    // Screenshot baselines are recorded on Linux CI only (font rendering differs by OS); see tests/visual/labs.spec.ts.
    { name: 'visual', testDir: './tests/visual', snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}', expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' } } },
  ],
});
