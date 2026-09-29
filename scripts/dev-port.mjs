// Shared by vite.config.ts and playwright.config.ts so the dev server and browser tests agree on one port.

/** Return the dev-server port from ZP_PORT (default 5174), rejecting values outside the unprivileged TCP range. */
export function devPort(value = process.env.ZP_PORT) {
  if (value === undefined || value === '') return 5174;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`ZP_PORT must be an integer from 1024 to 65535, got "${value}".`);
  return port;
}
