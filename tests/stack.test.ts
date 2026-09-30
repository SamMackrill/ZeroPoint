import { describe, expect, it } from 'vitest';
import { BUFFER_MS, GATE_MS, NAV_END, NAV_START, diffSnapshots, isReviewBody, reviewInProgress, mergeState, outsideDiffFindings, reviewedHeadsInSummary, isTriggerComment, isTrustedTrigger, mergeReady, rateLimitDeadline, nextSlot, parseRateLimitWait, parseStackBranch, pickNext, renderNav, replaceNav, reviewState, sortStack, stackPort, summariseChecks } from '../scripts/stack-core.mjs';

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
  it('counts completed reviews but not review-thread replies', () => {
    expect(isReviewBody('**Actionable comments posted: 1**')).toBe(true);
    expect(isReviewBody('No actionable comments were generated in the recent review. 🎉')).toBe(true);
    expect(isReviewBody('')).toBe(false);
    expect(isReviewBody(null)).toBe(false);
  });
  it('counts findings CodeRabbit could only post outside the diff', () => {
    const body = '> [!CAUTION]\n> Some comments are outside the diff and can’t be posted inline due to GitHub limitations.\n> **⚠️ Outside diff range comments (1)**';
    expect(isReviewBody(body)).toBe(true);
    expect(outsideDiffFindings(body)).toBe(1);
    expect(outsideDiffFindings('**Actionable comments posted: 0**')).toBe(0);
    // A reviewed diff with an unanswered outside-diff finding is not clean, even with no open threads.
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'], outsideFindings: 1 }))).toBe('reviewed');
    expect(mergeReady(pr('ui/00-delivery', { base: 'main', reviewedShas: ['sha-ui/00-delivery'], outsideFindings: 1 }))).toBe(false);
  });
  it('treats a review as running until CodeRabbit reports it finished', () => {
    const reply = (body: string, created_at: string) => ({ user: { login: 'coderabbitai[bot]' }, body, created_at });
    expect(reviewInProgress([reply('Action performed: Review triggered.', '2026-09-29T19:26:59Z')])).toBe(true);
    expect(reviewInProgress([reply('Action performed: Review finished.', '2026-09-29T15:42:30Z')])).toBe(false);
    expect(reviewInProgress([reply('Action performed: Review finished.', '2026-09-29T15:42:30Z'), reply('Action performed: Review triggered.', '2026-09-29T19:26:59Z')])).toBe(true);
    expect(reviewInProgress([])).toBe(false);
    // A review with findings leaves the reply as "Review triggered"; its completed review object marks it finished.
    const triggered = [reply('Action performed: Review triggered.', '2026-09-29T19:26:59Z')];
    const review = (submitted_at: string) => ({ user: { login: 'coderabbitai[bot]' }, body: '**Actionable comments posted: 3**', submitted_at });
    expect(reviewInProgress(triggered, [review('2026-09-29T19:32:11Z')])).toBe(false);
    expect(reviewInProgress(triggered, [review('2026-09-29T15:47:37Z')])).toBe(true);
    // Even with earlier review evidence, a PR under review is neither clean nor mergeable.
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'], reviewInProgress: true }))).toBe('triggered');
    expect(mergeReady(pr('ui/00-delivery', { base: 'main', reviewedShas: ['sha-ui/00-delivery'], reviewInProgress: true }))).toBe(false);
  });
  it('reads reviewed heads from the summary when a clean review posts no review object', () => {
    const summary = ['No actionable comments were generated in the recent review.', 'Commits', 'Reviewing files that changed from the base of the PR and between 5d31e8f42651739eb0d30b89b6be2f45ef842f13 and 29bafa0855d2fe55f6cf8cdae5ab736f07d4b4f6.'].join(String.fromCharCode(10));
    expect(reviewedHeadsInSummary(summary)).toEqual(['29bafa0855d2fe55f6cf8cdae5ab736f07d4b4f6']);
    expect(reviewedHeadsInSummary('Walkthrough only')).toEqual([]);
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
    expect(reviewState(pr('ui/01-tokens', { checks: 'none' }))).toBe('waiting-ci');
    expect(reviewState(pr('ui/01-tokens', { lastTriggerAt: 2000 }))).toBe('triggered');
    expect(reviewState(pr('ui/01-tokens', { lastTriggerAt: 500 }))).toBe('queued');
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'], openThreads: 2 }))).toBe('reviewed');
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'] }))).toBe('clean');
    expect(reviewState(pr('ui/01-tokens', { patchId: 'p1', reviewedPatchIds: ['p1'] }))).toBe('clean');
    // A review of an older head with the same diff (restacked mid-review) still counts.
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['older-head'], patchId: 'p1', reviewedPatchIds: ['p0', 'p1'] }))).toBe('clean');
    // A reviewed head whose diff changed (e.g. retargeted without a rebase) must be reviewed again.
    expect(reviewState(pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'], patchId: 'p2', reviewedPatchIds: ['p1'] }))).toBe('queued');
  });
  it('picks the lowest queued layer first', () => {
    const prs = [pr('ui/03-plot'), pr('ui/01-tokens', { reviewedShas: ['sha-ui/01-tokens'] }), pr('ui/02-primitives', { checks: 'fail' }), pr('ui/04-runtime')];
    expect(pickNext(prs)?.branch).toBe('ui/03-plot');
    expect(pickNext([pr('ui/01-tokens', { draft: true })])).toBeNull();
  });
  it('waits for a lower layer whose CI is still running rather than skipping ahead', () => {
    expect(pickNext([pr('ui/01-tokens', { checks: 'pending' }), pr('ui/02-primitives')])).toBeNull();
    expect(pickNext([pr('ui/01-tokens', { checks: 'none' }), pr('ui/02-primitives')])).toBeNull();
    expect(pickNext([pr('ui/01-tokens', { checks: 'fail' }), pr('ui/02-primitives')])?.branch).toBe('ui/02-primitives');
  });
  it('treats a head with only CodeRabbit status as not yet having CI', () => {
    const coderabbit = { name: 'CodeRabbit', bucket: 'pass' };
    expect(summariseChecks([])).toBe('none');
    expect(summariseChecks([coderabbit])).toBe('none');
    expect(summariseChecks([coderabbit, { name: 'test', bucket: 'pending' }])).toBe('pending');
    expect(summariseChecks([coderabbit, { name: 'test', bucket: 'pass' }])).toBe('pass');
    expect(summariseChecks([{ name: 'CodeRabbit', bucket: 'fail' }, { name: 'test', bucket: 'pass' }])).toBe('fail');
    expect(summariseChecks([coderabbit, { name: 'test', bucket: 'cancel' }])).toBe('fail');
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
    // A visual layer held for the owner's approval never merges, however clean.
    expect(mergeReady(pr('ui/00-delivery', { ...clean, hold: 'awaiting owner approval of before/after page' }))).toBe(false);
  });
});

describe('shared state merge', () => {
  it('keeps a waiver written by another process while the watcher saves its snapshot', () => {
    const base = { lastTriggerAt: 1, layers: { 'ui/00-delivery': { base: 'origin/main' } } };
    const ours = { ...structuredClone(base), watch: { last: 'snapshot' } };
    const theirs = { lastTriggerAt: 1, layers: { 'ui/00-delivery': { base: 'origin/main', waived: [42] } } };
    expect(mergeState(base, ours, theirs)).toEqual({ lastTriggerAt: 1, watch: { last: 'snapshot' }, layers: { 'ui/00-delivery': { base: 'origin/main', waived: [42] } } });
  });
  it('applies only what this process changed: fields, deletions, later gate times and unioned evidence', () => {
    const base = { lastTriggerAt: 5, layers: { a: { baseSha: 's1' }, b: { baseSha: 's2' }, c: { review: { pr: 7, patches: { h1: 'p1' } } } } };
    const ours = { lastTriggerAt: 9, layers: { a: { baseSha: 's3' }, c: { review: { pr: 7, patches: { h1: 'p1', h2: 'p2' } } } } };
    const theirs = { lastTriggerAt: 12, layers: { a: { baseSha: 's1', merged: true }, b: { baseSha: 's2' }, c: { review: { pr: 7, patches: { h1: 'p1', h3: 'p3' } } }, d: { baseSha: 's4' } } };
    expect(mergeState(base, ours, theirs)).toEqual({ lastTriggerAt: 12, layers: { a: { baseSha: 's3', merged: true }, c: { review: { pr: 7, patches: { h1: 'p1', h2: 'p2', h3: 'p3' } } }, d: { baseSha: 's4' } } });
  });
});

describe('watch snapshots', () => {
  const base = { branch: 'ui/00-delivery', head: 'aaaaaaa', state: 'queued', checks: 'pending', threads: 0, outside: 0, activity: '1@t1' };
  const snap = (prs: Record<string, typeof base>, extra: Record<string, unknown> = {}) => ({ prs, gate: { open: false, next: null }, main: { sha: 'm1', subject: 'x' }, ...extra });
  it('reports the whole picture when there is no previous snapshot', () => {
    expect(diffSnapshots(undefined, snap({ 7: base }))).toEqual(['#7 ui/00-delivery: queued, CI pending']);
  });
  it('reports every kind of change, including ones nobody waited for', () => {
    const next = snap({ 7: { ...base, head: 'bbbbbbb', checks: 'fail', state: 'reviewed', outside: 1, activity: '2@t2' }, 9: { ...base, branch: 'ui/01b-baselines' } }, { main: { sha: 'm2', subject: 'Other work' } });
    expect(diffSnapshots(snap({ 7: base, 8: { ...base, branch: 'ui/01a-css-format' } }), next)).toEqual([
      '#7 new head bbbbbbb', '#7 CI pending → fail', '#7 review queued → reviewed', '#7 open findings: threads 0 → 0, outside-diff 0 → 1',
      '#7 new CodeRabbit activity', '#9 opened (ui/01b-baselines): queued, CI pending', '#8 closed or merged (ui/01a-css-format)', 'main moved to m2: Other work',
    ]);
  });
  it('announces the review gate opening once per queued PR', () => {
    const open = snap({ 7: base }, { gate: { open: true, next: 7 } });
    expect(diffSnapshots(snap({ 7: base }), open)).toEqual(['review gate open; next in queue #7']);
    expect(diffSnapshots(open, open)).toEqual([]);
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
