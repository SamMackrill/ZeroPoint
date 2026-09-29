import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { breakStaleLock, lockOwner, withLock } from '../scripts/state-lock.mjs';

const dirs: string[] = [];
/** Create a fresh lock path in a temporary directory. */
function lockPath() {
  const dir = mkdtempSync(join(tmpdir(), 'state-lock-'));
  dirs.push(dir);
  return join(dir, 'state.json.lock');
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('ownership-aware state lock', () => {
  it('holds the lock during fn and releases only its own', () => {
    const path = lockPath();
    const result = withLock(path, () => { expect(lockOwner(path)?.pid).toBe(process.pid); return 42; });
    expect(result).toBe(42);
    expect(existsSync(path)).toBe(false);
  });
  it('breaks a lock only when its owner has died', () => {
    const path = lockPath();
    writeFileSync(path, JSON.stringify({ pid: 999_999, token: 'dead' }));
    expect(breakStaleLock(path, () => true)).toBe(false);
    expect(existsSync(path)).toBe(true);
    expect(breakStaleLock(path, () => false)).toBe(true);
    expect(existsSync(path)).toBe(false);
  });
  it('never removes a replacement lock, and never a lock being written', () => {
    const path = lockPath();
    writeFileSync(path, JSON.stringify({ pid: 999_999, token: 'replacement' }));
    writeFileSync(`${path}.break`, JSON.stringify({ pid: process.pid, token: 'another recovery' }));
    expect(breakStaleLock(path, () => false)).toBe(false);
    expect(lockOwner(path)?.token).toBe('replacement');
    rmSync(`${path}.break`);
    writeFileSync(path, '');
    expect(breakStaleLock(path, () => false)).toBe(false);
    expect(existsSync(path)).toBe(true);
  });
  it('waits for a live owner rather than taking over, then gives up clearly', () => {
    const path = lockPath();
    writeFileSync(path, JSON.stringify({ pid: process.pid, token: 'live' }));
    expect(() => withLock(path, () => 1, { timeoutMs: 120 })).toThrow(/held by a running process/);
    expect(JSON.parse(readFileSync(path, 'utf8')).token).toBe('live');
  });
  it('recovers from a dead owner and releases without touching a lock it does not own', () => {
    const path = lockPath();
    writeFileSync(path, JSON.stringify({ pid: 999_999, token: 'dead' }));
    withLock(path, () => { writeFileSync(path, JSON.stringify({ pid: process.pid, token: 'someone else' })); }, { alive: () => false });
    expect(lockOwner(path)?.token).toBe('someone else');
  });
});
