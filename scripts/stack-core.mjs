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

/**
 * Recognise a completed CodeRabbit review from its body ("Actionable comments posted: N" or "No actionable comments…").
 * Replies in a review thread are also stored as review objects on the current head, with an empty body; they must not
 * count as a review of that head.
 */
export function isReviewBody(body) {
  return /actionable comments|outside diff range comments|review info/i.test(body ?? '');
}

/**
 * Count findings CodeRabbit could not post inline ("Outside diff range comments (N)"). They live only in the review
 * body, never as review threads, so they cannot be resolved; they stay open until a newer head is reviewed or the
 * finding is explicitly waived.
 */
export function outsideDiffFindings(body) {
  const match = /outside diff range comments \((\d+)\)/i.exec(body ?? '');
  return match ? Number(match[1]) : 0;
}

/**
 * Extract the heads CodeRabbit reports having reviewed from its summary comment ("Reviewing files that changed from
 * the base of the PR and between <base> and <head>"). A review with no findings may post no review object at all —
 * only this line and an edited "Review finished" reply — so the summary is evidence too.
 */
export function reviewedHeadsInSummary(body) {
  return [...(body ?? '').matchAll(/Reviewing files that changed from the base of the PR and between [0-9a-f]{7,40} and ([0-9a-f]{7,40})/gi)].map(match => match[1]);
}

/** Recognise a manual CodeRabbit review request comment. */
export function isTriggerComment(body) {
  return /^\s*@coderabbitai\s+(full\s+)?review\b/i.test(body ?? '');
}

/** Only people with write access may move the shared review gate; an outsider's comment must not mark a PR triggered. */
const TRUSTED = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

/** Recognise a review request from an owner, member or collaborator (a GitHub issue-comment object). */
export function isTrustedTrigger(comment) {
  return isTriggerComment(comment?.body) && TRUSTED.has(comment?.author_association);
}

/** Return when a CodeRabbit rate-limit notice expires (epoch ms), or null. CodeRabbit edits notices in place, so the wait runs from `updated_at`. */
export function rateLimitDeadline(comment) {
  if (comment?.user?.login !== REVIEWER) return null;
  const wait = parseRateLimitWait(comment.body);
  return wait === null ? null : Date.parse(comment.updated_at ?? comment.created_at) + wait;
}

/** Extract the wait in milliseconds from a CodeRabbit rate-limit notice, or null if the comment is not one. */
export function parseRateLimitWait(body) {
  if (!/rate limit exceeded/i.test(body ?? '')) return null;
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
 * `reviewed`: CodeRabbit reviewed this diff. Evidence is the patch id of each reviewed head, recorded when the review
 *   is first seen, so a review of an older head with an identical diff (a restack mid-review) still counts, while a
 *   reviewed head whose base-relative diff has since changed (e.g. retargeted without a rebase) does not.
 *   Without patch evidence, fall back to "this exact head was reviewed".
 * `triggered`: a review was requested after the head commit and has not landed yet.
 */
export function reviewState(pr) {
  if (pr.draft) return 'draft';
  if (pr.checks === 'fail') return 'failing';
  const evidence = pr.reviewedPatchIds ?? [];
  const reviewed = pr.patchId && evidence.length ? evidence.includes(pr.patchId) : Boolean(pr.reviewedShas?.includes(pr.head));
  if (reviewed) return pr.openThreads > 0 || pr.outsideFindings > 0 ? 'reviewed' : 'clean';
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

/**
 * Describe what changed between two watch snapshots, one line per event. Snapshots hold, per open stack PR, its
 * branch, head, review state, CI, open threads, outside-diff findings and a CodeRabbit activity key, plus the review
 * gate and origin/main. Comparing whole snapshots (not waiting for one expected signal) is what makes the watcher
 * catch events nobody anticipated; with no previous snapshot it reports the current picture.
 */
export function diffSnapshots(prev, next) {
  const lines = [], before = prev?.prs ?? {}, after = next.prs ?? {};
  const label = pr => `${pr.state}, CI ${pr.checks}${pr.threads ? `, ${pr.threads} open thread(s)` : ''}${pr.outside ? `, ${pr.outside} outside-diff finding(s)` : ''}`;
  if (!prev) {
    for (const [number, pr] of Object.entries(after)) lines.push(`#${number} ${pr.branch}: ${label(pr)}`);
  } else {
    for (const [number, pr] of Object.entries(after)) {
      const old = before[number];
      if (!old) { lines.push(`#${number} opened (${pr.branch}): ${label(pr)}`); continue; }
      if (old.head !== pr.head) lines.push(`#${number} new head ${pr.head}`);
      if (old.checks !== pr.checks) lines.push(`#${number} CI ${old.checks} → ${pr.checks}`);
      if (old.state !== pr.state) lines.push(`#${number} review ${old.state} → ${pr.state}`);
      if (old.threads !== pr.threads || old.outside !== pr.outside) lines.push(`#${number} open findings: threads ${old.threads} → ${pr.threads}, outside-diff ${old.outside} → ${pr.outside}`);
      if (old.activity !== pr.activity) lines.push(`#${number} new CodeRabbit activity`);
    }
    for (const [number, old] of Object.entries(before)) if (!after[number]) lines.push(`#${number} closed or merged (${old.branch})`);
    if (prev.main?.sha && next.main?.sha && prev.main.sha !== next.main.sha) lines.push(`main moved to ${next.main.sha.slice(0, 7)}: ${next.main.subject}`);
  }
  const gateOpened = next.gate?.open && next.gate.next && (!prev || !prev.gate?.open || prev.gate.next !== next.gate.next);
  if (gateOpened) lines.push(`review gate open; next in queue #${next.gate.next}`);
  return lines;
}

/**
 * Three-way merge for the shared state file: apply to `theirs` (the file as it is now) only what this process changed
 * between `base` (what it loaded) and `ours` (what it holds now), so concurrent commands never drop each other's
 * writes. Layers merge field by field; gate times take the later value; review evidence for the same PR is unioned.
 */
export function mergeState(base = {}, ours = {}, theirs = {}) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const out = structuredClone(theirs);
  out.layers ??= {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(ours)])) {
    if (key === 'layers' || same(base[key], ours[key])) continue;
    if (key === 'lastTriggerAt' || key === 'rateLimitUntil') out[key] = Math.max(out[key] ?? 0, ours[key] ?? 0);
    else if (ours[key] === undefined) delete out[key];
    else out[key] = structuredClone(ours[key]);
  }
  const baseLayers = base.layers ?? {}, ourLayers = ours.layers ?? {};
  for (const branch of new Set([...Object.keys(baseLayers), ...Object.keys(ourLayers)])) {
    const before = baseLayers[branch], now = ourLayers[branch];
    if (same(before, now)) continue;
    if (now === undefined) { delete out.layers[branch]; continue; }
    const target = (out.layers[branch] ??= {});
    for (const field of new Set([...Object.keys(before ?? {}), ...Object.keys(now)])) {
      if (same(before?.[field], now[field])) continue;
      if (now[field] === undefined) delete target[field];
      else if (field === 'review' && target.review?.pr === now.review.pr) target.review = { pr: now.review.pr, patches: { ...target.review.patches, ...now.review.patches } };
      else target[field] = structuredClone(now[field]);
    }
  }
  return out;
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
