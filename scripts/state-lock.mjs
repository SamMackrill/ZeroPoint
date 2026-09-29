// Ownership-aware cross-process lock for the stack tool's shared state file (scripts/stack.mjs).
import { randomUUID } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

/** Whether a process is still running: signal 0 probes without signalling (EPERM means it exists but is not ours). */
export function processAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

/** Read a lock file's owner record ({ pid, token }), or null if it is missing, empty or being written. */
export function lockOwner(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

/** Create a lock file exclusively, recording this process as owner; false if the lock already exists. */
function tryCreate(path, token) {
  try { writeFileSync(path, JSON.stringify({ pid: process.pid, token }), { flag: 'wx' }); return true; } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
}

/** Remove a lock file only if it still carries the given token. */
function releaseIf(path, token) {
  if (lockOwner(path)?.token === token) rmSync(path, { force: true });
}

/**
 * Remove `path` only if its owner process has died. Recovery holds an exclusive breaker lock and re-checks that the
 * lock still carries the dead owner's token, so two recovering processes can never both remove it, and a live
 * replacement lock is never removed. A lock is never judged stale by age: a live owner keeps it however long it takes.
 */
export function breakStaleLock(path, alive = processAlive) {
  const seen = lockOwner(path);
  if (!seen || alive(seen.pid)) return false;
  const breakPath = `${path}.break`, breaker = randomUUID();
  if (!tryCreate(breakPath, breaker)) return false;
  try {
    if (lockOwner(path)?.token !== seen.token) return false;
    rmSync(path, { force: true });
    return true;
  } finally { releaseIf(breakPath, breaker); }
}

/**
 * Run fn while holding the lock at `path`. Waits up to timeoutMs, breaking the lock only if its owner has died. The
 * lock is released only if it still carries this call's token. Only a live owner can hold a lock, and only a dead
 * owner's lock is broken, so a lock is never released by anyone else.
 */
export function withLock(path, fn, { timeoutMs = 10_000, alive = processAlive } = {}) {
  const token = randomUUID(), deadline = Date.now() + timeoutMs;
  while (!tryCreate(path, token)) {
    breakStaleLock(path, alive);
    if (Date.now() > deadline) throw new Error(`Lock ${path} is held by a running process (or ${path}.break was left by one that died); remove them only if no stack command is running.`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  try { return fn(); } finally { releaseIf(path, token); }
}
