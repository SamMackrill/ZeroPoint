// Before/after screenshots of real screens for any visible change, for review and approval (the owner asks for these
// on every visual change). "Before" is another worktree (usually the layer below); "after" is this one. Both run their
// own dev server, and the same screens are captured in each.
// Usage: node scripts/compare-screens.mjs --before ../01f-remedial-tooling --out docs/ui-previews/type-scale --title "Type scale"
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { SCREENS } from './tokens-preview.mjs';

/**
 * Close-ups of one part of each lab, for layers that change something below the fold (`--set plots`). `focus` is a
 * Playwright selector matching the same section before and after; `steps` advances the lab first so it has data.
 */
export const PLOT_SCREENS = [
  { name: 'medium-plot', title: 'Medium · Population plot', steps: 40, focus: '.diagnostics-panel' },
  { name: 'light-plots', title: 'Light · Spatial profile and probe trace', lab: 'lab-light', steps: 12, focus: '.light-plots' },
  { name: 'electron-plot', title: 'Electron · Fixed probe field history', lab: 'lab-electron', scenario: 'scenario-spin', steps: 30, focus: 'section.light-card:has-text("Fixed probe · field history")' },
  { name: 'casimir-plot', title: 'Extended Casimir · Pressure history', lab: 'lab-casimir', steps: 40, focus: '.casimir-chart' },
  { name: 'vdw-plot', title: 'Van der Waals · Pressure versus gap', lab: 'lab-vdw', scenario: 'scenario-pressure', focus: '.vdw-plot' },
];
/**
 * The split view (`--set split`): each lab with its second pane open. `prepare` runs on both sides; before the split view
 * exists, its \ key does nothing, so "before" shows the layer below's layout for the same state.
 */
const selectFirstDipole = async page => {
  await page.getByRole('tab', { name: 'Selection', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Select first active dipole' }).filter({ visible: true }).click();
};
export const SPLIT_SCREENS = [
  { name: 'medium-split', title: 'Medium · Dipole close-up', steps: 40, prepare: async page => { await selectFirstDipole(page); await page.keyboard.press('Backslash'); } },
  { name: 'light-split', title: 'Light · Pair close-up', lab: 'lab-light', steps: 12, prepare: page => page.keyboard.press('Backslash') },
  { name: 'electron-spin', title: 'Electron · Spin: equatorial section (opens 2-up)', lab: 'lab-electron', scenario: 'scenario-spin', steps: 6 },
  { name: 'casimir', title: 'Extended Casimir · Lifetime loupe (opens 2-up)', lab: 'lab-casimir', steps: 40 },
  { name: 'electron-spin-phone', title: 'Electron · Spin on a phone (390 px): the second pane stacks below', lab: 'lab-electron', scenario: 'scenario-spin', viewport: { width: 390, height: 844 }, fullPage: true },
  { name: 'vdw-pressure-split', title: 'Van der Waals · Plate pressure beside Fig. 3-3', lab: 'lab-vdw', scenario: 'scenario-pressure', prepare: page => page.keyboard.press('Backslash') },
];
/**
 * The About sheet (`--set about`). Each screen opens it the way a user would — the header chip, else the ? button — and
 * may then pick a tab by the first visible test id in `tab`. Before the sheet existed, the same clicks show where that
 * content lived: Medium's model dialog, Casimir's Notes and van der Waals' Chapter 3 dock tabs, Electron's Sources tab.
 */
const openAbout = tab => async page => {
  const chip = page.getByRole('button', { name: 'Illustrative model' }).filter({ visible: true });
  const help = page.getByRole('button', { name: /^(About the model|About this scenario|Help)$/ }).filter({ visible: true });
  if (await chip.count()) await chip.click(); else if (await help.count()) await help.click();
  for (const id of tab ?? []) { const target = page.getByTestId(id).filter({ visible: true }); if (await target.count()) { await target.click(); break; } }
};
export const ABOUT_SCREENS = [
  { name: 'medium-about', title: 'Medium · About › This scenario (was the model dialog)', prepare: openAbout() },
  { name: 'light-about', title: 'Light · About › This scenario (was a note at the foot of Setup)', lab: 'lab-light', prepare: openAbout() },
  { name: 'electron-about-units', title: 'Electron · About › Units & constants (was in the Sources dock tab)', lab: 'lab-electron', scenario: 'scenario-spin', prepare: openAbout(['about-units', 'dock-sources']) },
  { name: 'casimir-about', title: 'Extended Casimir · About › This scenario (was the Notes dock tab)', lab: 'lab-casimir', prepare: openAbout() },
  { name: 'vdw-about-sources', title: 'Van der Waals · About › Sources (was the Chapter 3 dock tab)', lab: 'lab-vdw', prepare: openAbout(['about-sources']) },
];
/**
 * InfoTips (`--set info`): Setup with one ⓘ opened, named by its accessible name. Before the tips existed the button is
 * missing, so "before" shows the inline paragraph the tip replaced.
 */
const openTip = name => async page => {
  const tip = page.getByRole('button', { name, exact: true }).filter({ visible: true });
  if (await tip.count()) await tip.first().click();
};
export const INFO_SCREENS = [
  { name: 'light-tip', title: 'Light · Wavelength ⓘ (was a note under Setup)', lab: 'lab-light', prepare: openTip('About Wavelength') },
  { name: 'electron-tip', title: 'Electron · Spin: Adjacent shells ⓘ', lab: 'lab-electron', scenario: 'scenario-spin', prepare: openTip('About Adjacent shells') },
  { name: 'casimir-tip', title: 'Extended Casimir · Charges ⓘ (was two lines under Charges)', lab: 'lab-casimir', prepare: openTip('About Charges') },
  { name: 'vdw-tip', title: 'Van der Waals · Plate gap ⓘ, with the stage heading in the card label (the equation box, note and explanation moved to About)', lab: 'lab-vdw', scenario: 'scenario-pressure', prepare: openTip('About Plate gap') },
];
/**
 * Global Settings (`--set settings`): the header's Settings popover with telemetry on. Before it existed, reduced motion
 * was a per-lab checkbox in View, so "before" opens View instead.
 */
const openSettings = async page => {
  const gear = page.getByTestId('settings').filter({ visible: true });
  if (await gear.count()) { await gear.click(); await page.getByTestId('setting-telemetry').click(); }
  else await page.getByRole('tab', { name: 'View', exact: true }).filter({ visible: true }).click();
};
export const SETTINGS_SCREENS = [
  { name: 'medium-settings', title: 'Medium · Settings (header), with debug telemetry in the status bar', prepare: openSettings },
  { name: 'electron-settings', title: 'Electron · Spin: Settings replaces the per-lab reduced-motion checkbox', lab: 'lab-electron', scenario: 'scenario-spin', prepare: openSettings },
];
/** Help › Shortcuts (`--set shortcuts`): ? opens Help at its Shortcuts tab; before the tab existed, About shows. */
const openShortcuts = async page => {
  await page.keyboard.press('Shift+Slash');
  const tab = page.getByTestId('about-shortcuts');
  if (await tab.count()) await tab.click();
};
export const SHORTCUT_SCREENS = [
  { name: 'medium-shortcuts', title: 'Medium · Help › Shortcuts', prepare: openShortcuts },
  { name: 'electron-shortcuts', title: 'Electron · Spin: Help › Shortcuts', lab: 'lab-electron', scenario: 'scenario-spin', prepare: openShortcuts },
];
/** The command palette (`--set palette`): Ctrl K, optionally searching. Before the palette existed, Ctrl K does nothing. */
const openPalette = search => async page => {
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Command palette' });
  if (search && await input.count()) await input.fill(search);
};
export const PALETTE_SCREENS = [
  { name: 'medium-palette', title: 'Medium · Ctrl K: every scenario and the lab’s actions, each with its shortcut', prepare: openPalette('') },
  { name: 'electron-palette-search', title: 'Electron · Spin: Ctrl K, searching “shell”', lab: 'lab-electron', scenario: 'scenario-spin', prepare: openPalette('shell') },
];
/** Links (`--set links`): each screen opens a URL-state link. Before links existed, the app ignored the hash. */
export const LINK_SCREENS = [
  { name: 'electron-link', title: 'Electron · #/electron/spin?axis=x&cam=orbit&t=120&L=+radius', hash: '#/electron/spin?axis=x&cam=orbit&t=120&L=%2Bradius' },
  { name: 'vdw-link', title: 'Van der Waals · #/vdw/pressure?area=4&gap=500&split=fig-3-4', hash: '#/vdw/pressure?area=4&gap=500&split=fig-3-4' },
  { name: 'light-link-invalid', title: 'Light · #/light?wavelength=9&bogus=1 (settings that don’t apply are dropped, with a notice)', hash: '#/light?wavelength=9&bogus=1' },
];
const SETS = { screens: SCREENS, plots: PLOT_SCREENS, split: SPLIT_SCREENS, about: ABOUT_SCREENS, info: INFO_SCREENS, settings: SETTINGS_SCREENS, shortcuts: SHORTCUT_SCREENS, palette: PALETTE_SCREENS, links: LINK_SCREENS };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), option = name => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; };

/** Start a dev server for a worktree on a free port chosen from a range, returning its URL and server. */
async function serve(worktree, port) {
  const server = await createServer({ root: worktree, configFile: join(worktree, 'vite.config.ts'), logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  return { server, url: `http://127.0.0.1:${port}/` };
}

/** Open one screen (lab and scenario by test id), optionally step it, and capture the viewport or its focus section. */
async function capture(browser, url, screen, path) {
  const viewport = screen.viewport ?? { width: 1440, height: 900 }, narrow = viewport.width <= 850;
  const page = await browser.newPage({ viewport });
  await page.goto(screen.hash ? `${url}${screen.hash}` : url);
  // Every lab has a status bar; static stages (van der Waals' plates) have no Run button to wait for.
  await page.locator('.workbench-status').filter({ visible: true }).first().waitFor();
  // Narrow layouts keep the rail in a drawer, opened before each rail choice.
  const rail = async id => { if (narrow) await page.getByTestId('nav-open').filter({ visible: true }).click(); await page.getByTestId(id).filter({ visible: true }).click(); };
  if (screen.lab) await rail(screen.lab);
  if (screen.scenario) await rail(screen.scenario);
  for (let i = 0; i < (screen.steps ?? 0); i++) await page.getByTestId('transport-step').filter({ visible: true }).first().click();
  if (screen.prepare) await screen.prepare(page);
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.fonts.ready);
  if (screen.focus) {
    const section = page.locator(screen.focus).filter({ visible: true }).first();
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({ path, type: 'jpeg', quality: 82 });
  } else await page.screenshot({ path, type: 'jpeg', quality: 82, fullPage: !!screen.fullPage });
  await page.close();
}

/** HTML-escape text for the page (the description is already HTML). */
const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Render the review page: each screen before and after, side by side, and the command that regenerates it. */
export function reviewPage(title, description, screens, command = 'node scripts/compare-screens.mjs') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZeroPoint · ${title}: before and after</title>
<style>body{margin:0;background:#0c131b;color:#e3ebf1;font:14px/1.55 'DM Sans',system-ui,'Segoe UI',sans-serif}main{max-width:1400px;margin:auto;padding:36px 28px 70px}h1{font-size:30px;letter-spacing:-.8px;margin:0 0 8px}h2{font-size:16px;margin:26px 0 8px}p{color:#aebfcc;max-width:900px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{width:100%;display:block;border:1px solid #34495b;border-radius:8px}figcaption{font:600 11px ui-monospace,Consolas,monospace;letter-spacing:1px;text-transform:uppercase;color:#8397a8;margin-top:6px}</style></head>
<body><main><h1>${title}: before and after</h1><p>${description}</p><p>Real screens: "before" runs the layer below, and "after" runs this layer. Click an image to open it at full size. Regenerate with <code>${escapeHtml(command)}</code>.</p>
${screens.map(s => { const fit = s.viewport && s.viewport.width < 700 ? ` style="max-width:${s.viewport.width}px"` : ''; return `<h2>${s.title}</h2><div class="pair"><figure><a href="${s.name}-before.jpg"><img src="${s.name}-before.jpg" alt="${s.title}, before" loading="lazy"${fit}></a><figcaption>Before</figcaption></figure><figure><a href="${s.name}-after.jpg"><img src="${s.name}-after.jpg" alt="${s.title}, after" loading="lazy"${fit}></a><figcaption>After</figcaption></figure></div>`; }).join('\n')}
</main></body></html>
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const before = option('--before'), out = option('--out'), title = option('--title') ?? 'Change', description = option('--description') ?? '';
  const screens = SETS[option('--set') ?? 'screens'];
  if (!screens) throw new Error(`--set must be one of: ${Object.keys(SETS).join(', ')}`);
  if (!before || !out) throw new Error('Usage: compare-screens.mjs --before <worktree> --out <dir> [--set screens|plots|split|about|info|settings|shortcuts] [--title T] [--description D]');
  const target = resolve(root, out), port = 5700 + Math.floor(Math.random() * 200);
  mkdirSync(target, { recursive: true });
  // Each resource starts inside the cleanup scope of the ones before it, so any failed start still stops them.
  const a = await serve(resolve(root, before), port);
  try {
    const b = await serve(root, port + 1);
    try {
      const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
      try {
        for (const screen of screens) {
          await capture(browser, a.url, screen, join(target, `${screen.name}-before.jpg`));
          await capture(browser, b.url, screen, join(target, `${screen.name}-after.jpg`));
          console.log(`compared: ${screen.name}`);
        }
      } finally { await browser.close(); }
    } finally { await b.server.close(); }
  } finally { await a.server.close(); }
  // The command that regenerates this page, quoted for a POSIX shell (Git Bash on Windows).
  const quote = text => `'${text.replace(/'/g, `'\\''`)}'`;
  const word = text => (/^[\w./:@-]+$/.test(text) ? text : quote(text)); // paths stay bare unless they need quoting
  const command = ['node scripts/compare-screens.mjs', '--before', word(before), '--out', word(out), '--set', option('--set') ?? 'screens', '--title', quote(title), '--description', quote(description)].join(' ');
  writeFileSync(join(target, 'index.html'), reviewPage(title, description, screens, command));
  console.log(`Review page: ${relative(root, join(target, 'index.html'))}`);
}
