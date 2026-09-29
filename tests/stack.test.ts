import { describe, expect, it } from 'vitest';
import { BUFFER_MS, GATE_MS, NAV_END, NAV_START, isTriggerComment, isTrustedTrigger, mergeReady, rateLimitDeadline, nextSlot, parseRateLimitWait, parseStackBranch, pickNext, renderNav, replaceNav, reviewState, sortStack, stackPort } from '../scripts/stack-core.mjs';

/** Build a queued-by-default PR fixture for scheduling tests. */
const pr = (branch: string, extra: Record<string, unknown> = {}) => ({ number: Number(branch.slice(3, 5)) + 100, branch, head: `sha-${branch}`, draft: false, checks: 'pass', openThreads: 0, reviewedShas: [] as string[], lastTriggerAt: 0, headCommittedAt: 1000, ...extra });

describe('stack branches', () => {
  it('parses and orders layers, including split parts', () => {
    expect(parseStackBranch('ui/09b-electron-spin')).toMatchObject({ layer: 9, part: 'b', slug: 'electron-spin' });
    expect(parseStackBranch('feature/addPapers')).toBeNull();
    expect(parseStackBranch('ui/9-short')).toBeNull();
    const sorted = sortStack([{ branch: 'ui/10-casimir' }, { branch: 'ui/09b-electron-spin' }, { branch: 'ui/09a-electron-core' }, { branch: 'ui/00-delivery' }]);
    expect(sorted.map(s => s.branch)).toEqual(['ui/00-delivery', 'ui/09a-electron-core', 'ui/09b-electron-spin', 'ui/10-casimir']);
  });
  it('reserves a distinct dev port per layer', () => {
    expect(stackPort('ui/07-medium')).toBe(5207);
    expect(new Set(['ui/09-electron', 'ui/09a-electron-core', 'ui/09b-electron-spin'].map(stackPort)).size).toBe(3);
    expect(stackPort('main')).toBeNull();
  });
});

describe('review gate', () => {
  it('recognises manual review requests only', () => {
    expect(isTriggerComment('@coderabbitai review')).toBe(true);
    expect(isTriggerComment('  @CodeRabbitAI full review please')).toBe(true);
    expect(isTriggerComment('@coderabbitai resolve')).toBe(false);
    expect(isTriggerComment('Thanks @coderabbitai review looks good')).toBe(false);
  });
  it('only lets people with write access move the gate', () => {
    expect(isTrustedTrigger({ body: '@coderabbitai review', author_association: 'OWNER' })).toBe(true);
    expect(isTrustedTrigger({ body: '@coderabbitai review', author_association: 'COLLABORATOR' })).toBe(true);
    expect(isTrustedTrigger({ body: '@coderabbitai review', author_association: 'NONE' })).toBe(false);
    expect(isTrustedTrigger({ body: '@coderabbitai review', author_association: 'CONTRIBUTOR' })).toBe(false);
  });
  it('dates rate-limit notices from their last edit, and only CodeRabbit\'s', () => {
    const notice = { user: { login: 'coderabbitai[bot]' }, body: 'Rate limit exceeded. Please wait **10 minutes** before requesting another review.', created_at: '2026-09-29T09:00:00Z', updated_at: '2026-09-29T10:00:00Z' };
    expect(rateLimitDeadline(notice)).toBe(Date.parse('2026-09-29T10:10:00Z'));
    expect(rateLimitDeadline({ ...notice, updated_at: undefined })).toBe(Date.parse('2026-09-29T09:10:00Z'));
    expect(rateLimitDeadline({ ...notice, user: { login: 'someone' } })).toBeNull();
  });
  it('parses CodeRabbit rate-limit waits', () => {
    expect(parseRateLimitWait('Rate limit exceeded. Please wait **12 minutes and 30 seconds** before requesting another review.')).toBe(750_000);
    expect(parseRateLimitWait('Rate limit exceeded: wait 1 hour, 5 minutes')).toBe(3_900_000);
    expect(parseRateLimitWait('Please wait 5 minutes')).toBeNull();
    expect(parseRateLimitWait('One edge case: the tool could request a review before a rate limit ends; wait 5 minutes.')).toBeNull();
    expect(parseRateLimitWait('Rate limit notice without a duration')).toBeNull();
  });
  it('opens the slot one hour plus buffer after a trigger, or later if rate limited', () => {
    expect(nextSlot({})).toBe(0);
    expect(nextSlot({ lastTriggerAt: 1_000 })).toBe(1_000 + GATE_MS + BUFFER_MS);
    expect(nextSlot({ lastTriggerAt: 1_000, rateLimitUntil: 99_999_999 })).toBe(99_999_999);
  });
});

describe('review queue', () => {
  it('classifies review state from head, patch id, threads, triggers and CI', () => {
    expect(reviewState(pr('ui/01-tokens'))).toBe('queued');
    expect(reviewState(pr('ui/01-tokens', { draft: true }))).toBe('draft');
    expect(reviewState(pr('ui/01-tokens', { checks: 'fail' }))).toBe('failing');
    expect(reviewState(pr('ui/01-tokens', { checks: 'pending' }))).toBe('waiting-ci');
    expect(reviewState(pr('ui/01-tokens', { lastTriggerAt: 2000 }))).toBe('triggered');
    expect(reviewState(pr('ui/01-tokens', { lastTriggerAt: 500 }))).toBe('queued');
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'], openThreads: 2 }))).toBe('reviewed');
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'] }))).toBe('clean');
    expect(reviewState(pr('ui/01-tokens', { patchId: 'p1', reviewedPatchId: 'p1' }))).toBe('clean');
    // A reviewed head whose diff changed (e.g. retargeted without a rebase) must be reviewed again.
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'], patchId: 'p2', reviewedPatchId: 'p1' }))).toBe('queued');
  });
  it('picks the lowest queued layer first', () => {
    const prs = [pr('ui/03-plot'), pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'] }), pr('ui/02-primitives', { checks: 'fail' }), pr('ui/04-runtime')];
    expect(pickNext(prs)?.branch).toBe('ui/03-plot');
    expect(pickNext([pr('ui/01-tokens', { draft: true })])).toBeNull();
  });
});

describe('merge readiness', () => {
  const clean = { base: 'main', reviewedShas: ['sha-ui/00-delivery'] };
  it('merges only the bottom layer once clean and green', () => {
    expect(mergeReady(pr('ui/00-delivery', clean))).toBe(true);
    expect(mergeReady(pr('ui/00-delivery', { ...clean, base: 'ui/99-other' }))).toBe(false);
    expect(mergeReady(pr('ui/00-delivery', { ...clean, checks: 'pending' }))).toBe(false);
    expect(mergeReady(pr('ui/00-delivery', { ...clean, checks: 'none' }))).toBe(false);
    expect(mergeReady(pr('ui/00-delivery', { ...clean, openThreads: 1 }))).toBe(false);
    expect(mergeReady(pr('ui/00-delivery', { base: 'main' }))).toBe(false);
  });
});

describe('stack navigator', () => {
  const stack = [{ number: 12, branch: 'ui/01-tokens' }, { number: 11, branch: 'ui/00-delivery' }];
  it('renders bottom-first with the current PR in bold', () => {
    expect(renderNav(stack, 12)).toContain('main ← #11 ← **#12**');
  });
  it('replaces an existing block and prepends when missing', () => {
    const nav = renderNav(stack, 11);
    expect(replaceNav('Body text', nav)).toBe(`${nav}\n\nBody text`);
    const replaced = replaceNav(`${NAV_START}\nold\n${NAV_END}\n\nBody`, nav);
    expect(replaced).toBe(`${nav}\n\nBody`);
    expect(replaceNav(replaced, nav)).toBe(replaced);
  });
});
