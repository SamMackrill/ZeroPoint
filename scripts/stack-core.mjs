// Pure helpers for the stacked-PR babysitter. No I/O here, so the scheduling rules stay unit-testable.

/** CodeRabbit's free tier allows one manually triggered review per hour; the buffer absorbs clock skew. */
export const GATE_MS = 60 * 60 * 1000;
export const BUFFER_MS = 3 * 60 * 1000;
export const REVIEWER = 'coderabbitai[bot]';
export const NAV_START = '<!-- stack-nav -->';
export const NAV_END = '<!-- /stack-nav -->';

/** Parse a stack branch such as `ui/09b-electron-spin` into a sortable position, or null for other branches. */
export function parseStackBranch(name) {
  const match = /^ui\/(\d{2})([a-z]?)-([a-z0-9][a-z0-9-]*)$/.exec(name);
  return match ? { layer: Number(match[1]), part: match[2], slug: match[3], order: Number(match[1]) * 100 + (match[2] ? match[2].charCodeAt(0) - 96 : 0) } : null;
}

/** Return the dev/e2e port reserved for a stack branch's worktree (5200 + layer number, +50 for split parts). */
export function stackPort(name) {
  const branch = parseStackBranch(name);
  if (!branch) return null;
  return 5200 + branch.layer + (branch.part ? 50 * (branch.part.charCodeAt(0) - 96) : 0);
}

/** Sort stack items bottom-first by their branch position. */
export function sortStack(items) {
  return [...items].sort((a, b) => parseStackBranch(a.branch).order - parseStackBranch(b.branch).order);
}

/** Recognise a manual CodeRabbit review request comment. */
export function isTriggerComment(body) {
  return /^\s*@coderabbitai\s+(full\s+)?review\b/i.test(body ?? '');
}

/** Extract the wait in milliseconds from a CodeRabbit rate-limit notice, or null if the comment is not one. */
export function parseRateLimitWait(body) {
  if (!/rate limit/i.test(body ?? '')) return null;
  const wait = /wait\s*\**\s*(?:(\d+)\s*hours?)?[\s,]*(?:(\d+)\s*minutes?)?[\s,]*(?:and\s*)?(?:(\d+)\s*seconds?)?/i.exec(body);
  if (!wait || (wait[1] === undefined && wait[2] === undefined && wait[3] === undefined)) return null;
  return ((Number(wait[1] ?? 0) * 60 + Number(wait[2] ?? 0)) * 60 + Number(wait[3] ?? 0)) * 1000;
}

/** Return the earliest time (epoch ms) at which another review may be triggered. */
export function nextSlot({ lastTriggerAt = 0, rateLimitUntil = 0 }) {
  return Math.max(lastTriggerAt ? lastTriggerAt + GATE_MS + BUFFER_MS : 0, rateLimitUntil);
}

/**
 * Classify one PR for the review queue.
 * `reviewed`: CodeRabbit reviewed this head, or an identical diff (same patch id) after a restack.
 * `triggered`: a review was requested after the head commit and has not landed yet.
 */
export function reviewState(pr) {
  if (pr.draft) return 'draft';
  if (pr.checks === 'fail') return 'failing';
  const reviewed = pr.reviewedShas?.includes(pr.head) || (pr.patchId && pr.reviewedPatchId === pr.patchId);
  if (reviewed) return pr.openThreads > 0 ? 'reviewed' : 'clean';
  if (pr.lastTriggerAt && pr.lastTriggerAt > (pr.headCommittedAt ?? 0)) return 'triggered';
  if (pr.checks === 'pending') return 'waiting-ci';
  return 'queued';
}

/** A PR may be squash-merged by the babysitter once it is the bottom layer, CodeRabbit-clean and green in CI. */
export function mergeReady(pr) {
  return pr.base === 'main' && !pr.draft && pr.checks === 'pass' && reviewState(pr) === 'clean';
}

/** Choose the PR to review next: the lowest queued layer, because merges and fixes flow bottom-up. */
export function pickNext(prs) {
  return sortStack(prs).find(pr => reviewState(pr) === 'queued') ?? null;
}

/** Render the stack navigator block placed in every PR body. */
export function renderNav(stack, current) {
  const items = sortStack(stack).map(pr => pr.number === current ? `**#${pr.number}**` : `#${pr.number}`);
  return `${NAV_START}\n**Stack** (bottom → top): main ← ${items.join(' ← ')}\n${NAV_END}`;
}

/** Insert or replace the stack navigator in a PR body. */
export function replaceNav(body, nav) {
  const text = body ?? '';
  const start = text.indexOf(NAV_START), end = text.indexOf(NAV_END);
  if (start !== -1 && end > start) return text.slice(0, start) + nav + text.slice(end + NAV_END.length);
  return `${nav}\n\n${text}`.trimEnd();
}
