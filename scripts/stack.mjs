// Stacked-PR helper for the UI redesign: status, CodeRabbit review gate, worktrees, restack, retarget, push and navigator.
// Usage: node scripts/stack.mjs <status|trigger|watch|new|restack|retarget|merge|waive|push|nav|snapshots|port> [options]. See docs/ui-redesign-plan.html §16.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { withLock } from './state-lock.mjs';
import { REVIEWER, diffSnapshots, mergeState, isReviewBody, isTrustedTrigger, outsideDiffFindings, reviewedHeadsInSummary, mergeReady, nextSlot, rateLimitDeadline, parseStackBranch, pickNext, renderNav, replaceNav, reviewState, sortStack, stackPort, reviewInProgress } from './stack-core.mjs';

const args = process.argv.slice(2), command = args[0], flags = new Set(args.filter(a => a.startsWith('--')));
const option = name => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; };
const dryRun = flags.has('--dry-run');

/** Run a command without a shell and return trimmed stdout; throws with stderr unless `allowFail` is set. */
function run(cmd, cmdArgs, { cwd, input, allowFail = false } = {}) {
  const result = spawnSync(cmd, cmdArgs, { cwd, input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) throw new Error(`${cmd} ${cmdArgs.join(' ')} failed (${result.status}):\n${result.stderr || result.stdout}`);
  return allowFail ? { ok: result.status === 0, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() } : (result.stdout ?? '').trim();
}
/** Run git in the given worktree (default: current directory). */
const git = (gitArgs, cwd) => run('git', gitArgs, { cwd });
/** Run gh and parse its JSON output. */
const ghJson = ghArgs => JSON.parse(run('gh', ghArgs) || 'null');
/** Resolve a ref to a full SHA, or null when it does not exist. */
const sha = (ref, cwd) => { const r = run('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd, allowFail: true }); return r.ok ? r.out : null; };
/** Print a line unless running with --json. */
const say = (...text) => { if (!flags.has('--json')) console.log(...text); };

const statePath = join(git(['rev-parse', '--path-format=absolute', '--git-common-dir']), 'ui-stack', 'state.json');
const lockPath = `${statePath}.lock`, loaded = new WeakMap();

/** Read the state file; a missing file is a fresh state, but an unreadable one is an error (never silently reset). */
function readState() {
  let text;
  try { text = readFileSync(statePath, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return { lastTriggerAt: 0, rateLimitUntil: 0, layers: {} }; throw error; }
  return JSON.parse(text);
}
/** Load babysitter state shared by every worktree (never committed), remembering it as the base for a later merge. */
function loadState() {
  const state = readState();
  loaded.set(state, structuredClone(state));
  return state;
}
/** Run fn while holding the ownership-aware cross-process state lock (see state-lock.mjs). */
function withStateLock(fn) {
  mkdirSync(dirname(statePath), { recursive: true });
  return withLock(lockPath, fn);
}
/**
 * Persist this process's changes unless this is a dry run. Under the lock, merge only what changed since this state was
 * loaded (or last saved) into the file as it is now, then replace it atomically (temp file + rename), so concurrent
 * commands such as `watch` and `waive` never overwrite each other and readers never see a partial write.
 */
function saveState(state) {
  if (dryRun) return;
  withStateLock(() => {
    const merged = mergeState(loaded.get(state) ?? {}, state, readState()), temp = `${statePath}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(merged, null, 2) + '\n');
    renameSync(temp, statePath);
    loaded.set(state, structuredClone(state));
  });
}
/** Save what gather() observed (review evidence, gate times, the watch snapshot); saveState's merge keeps other fields. */
const saveObservations = saveState;
/** Return the layer record for a branch, creating it if needed. */
const layer = (state, branch) => (state.layers[branch] ??= {});

/** Map checked-out branches to worktree paths and return the primary worktree root. */
function worktrees() {
  const map = new Map(); let root = null, path = null;
  for (const line of git(['worktree', 'list', '--porcelain']).split('\n')) {
    if (line.startsWith('worktree ')) { path = line.slice(9); root ??= path; }
    if (line.startsWith('branch refs/heads/')) map.set(line.slice(18), path);
  }
  return { root, map };
}

/** Compute a stable id of a branch's own diff so a pure restack keeps its review. */
function patchId(base, branch) {
  if (!sha(base) || !sha(branch)) return null;
  const diff = run('git', ['diff', '--no-color', `${base}...${branch}`]);
  return diff ? run('git', ['patch-id', '--stable'], { input: diff }).split(' ')[0] || null : null;
}

/** Summarise CI buckets from `gh pr checks` as pass | fail | pending | none. */
function checksFor(number) {
  const result = run('gh', ['pr', 'checks', String(number), '--json', 'bucket'], { allowFail: true });
  let buckets = [];
  try { buckets = JSON.parse(result.out || '[]').map(c => c.bucket); } catch { return 'none'; }
  if (!buckets.length) return 'none';
  if (buckets.some(b => b === 'fail' || b === 'cancel')) return 'fail';
  return buckets.some(b => b === 'pending') ? 'pending' : 'pass';
}

/** Count unresolved review threads opened by CodeRabbit, across every page (an unseen page must never read as clean). */
function openThreads(repo, number) {
  const [owner, name] = repo.split('/');
  const query = 'query($owner:String!,$name:String!,$number:Int!,$after:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100,after:$after){nodes{isResolved comments(first:1){nodes{author{login}}}} pageInfo{hasNextPage endCursor}}}}}';
  let after = null, count = 0;
  do {
    const data = ghJson(['api', 'graphql', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`, '-F', `number=${number}`, '-F', `after=${after ?? 'null'}`]);
    const threads = data.data.repository.pullRequest.reviewThreads;
    count += threads.nodes.filter(t => !t.isResolved && t.comments.nodes[0]?.author?.login === 'coderabbitai').length;
    // A page that claims more but gives no new cursor would loop forever or undercount; refuse to report a count.
    if (threads.pageInfo.hasNextPage && (!threads.pageInfo.endCursor || threads.pageInfo.endCursor === after)) throw new Error(`GitHub returned a non-advancing reviewThreads cursor for #${number}.`);
    after = threads.pageInfo.hasNextPage ? threads.pageInfo.endCursor : null;
  } while (after);
  return count;
}

/** List open stack PRs from this repository only; a fork's same-named branch is never treated as a stack layer. */
function openStackPrs(fields) {
  return ghJson(['pr', 'list', '--state', 'open', '--limit', '100', '--json', `${fields},isCrossRepository`]).filter(p => !p.isCrossRepository && parseStackBranch(p.headRefName));
}

/** Gather every open stack PR with review, trigger, rate-limit and CI information, updating shared state. */
function gather(state) {
  const repo = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
  const prs = [];
  for (const pr of openStackPrs('number,title,headRefName,baseRefName,headRefOid,isDraft,body')) {
    const reviews = ghJson(['api', `repos/${repo}/pulls/${pr.number}/reviews`, '--paginate', '--slurp']).flat();
    const comments = ghJson(['api', `repos/${repo}/issues/${pr.number}/comments`, '--paginate', '--slurp']).flat();
    const triggers = comments.filter(isTrustedTrigger).map(c => Date.parse(c.created_at));
    for (const c of comments) {
      const deadline = rateLimitDeadline(c);
      if (deadline !== null) state.rateLimitUntil = Math.max(state.rateLimitUntil ?? 0, deadline);
    }
    const item = {
      number: pr.number, title: pr.title, branch: pr.headRefName, base: pr.baseRefName, head: pr.headRefOid, draft: pr.isDraft, body: pr.body,
      // Committer date moves on every rebase, so a trigger older than the head never counts for it.
      headCommittedAt: Date.parse(run('gh', ['api', `repos/${repo}/commits/${pr.headRefOid}`, '--jq', '.commit.committer.date'])),
      reviewedShas: [
        ...reviews.filter(r => r.user?.login === REVIEWER && isReviewBody(r.body)).map(r => r.commit_id),
        // The summary names its range when a review starts, so it only counts once the review has finished.
        ...(reviewInProgress(comments) ? [] : comments.filter(c => c.user?.login === REVIEWER).flatMap(c => reviewedHeadsInSummary(c.body)).map(head => sha(head) ?? head)),
      ],
      lastTriggerAt: triggers.length ? Math.max(...triggers) : 0,
      checks: checksFor(pr.number), openThreads: openThreads(repo, pr.number), reviewInProgress: reviewInProgress(comments),
      // Changes whenever CodeRabbit posts or edits a comment or review, so the watcher can report activity of any kind.
      activity: (items => `${items.length}@${items.map(x => x.updated_at ?? x.submitted_at ?? '').sort().pop() ?? ''}`)([...reviews, ...comments].filter(x => x.user?.login === REVIEWER)),
      // The PR's own head commit, not whatever a same-named ref resolves to.
      patchId: patchId(`origin/${pr.baseRefName}`, pr.headRefOid),
    };
    // Bind review evidence to this PR and to the diff each reviewed head had when the review was first seen.
    const stored = state.layers[item.branch]?.review, evidence = stored?.pr === item.number ? stored : { pr: item.number, patches: {} };
    for (const reviewed of new Set(item.reviewedShas)) {
      if (evidence.patches[reviewed]) continue;
      const id = patchId(`origin/${pr.baseRefName}`, reviewed);
      if (id) evidence.patches[reviewed] = id;
    }
    if (Object.keys(evidence.patches).length) layer(state, item.branch).review = evidence;
    item.reviewedPatchIds = Object.values(evidence.patches);
    // Findings posted outside the diff exist only in review bodies: count those from reviews of the current diff,
    // unless waived with `stack.mjs waive`.
    const waived = new Set(state.layers[item.branch]?.waived ?? []);
    item.outsideFindings = reviews
      .filter(r => r.user?.login === REVIEWER && !waived.has(r.id) && (r.commit_id === item.head || (item.patchId && evidence.patches[r.commit_id] === item.patchId)))
      .reduce((sum, r) => sum + outsideDiffFindings(r.body), 0);
    item.state = reviewState(item);
    state.lastTriggerAt = Math.max(state.lastTriggerAt ?? 0, item.lastTriggerAt);
    prs.push(item);
  }
  return { repo, prs: sortStack(prs) };
}

/** Print or emit the stack status and the next review slot. */
function status() {
  const state = loadState(), { prs } = gather(state), slot = nextSlot(state);
  saveObservations(state);
  const summary = { now: new Date().toISOString(), nextSlot: new Date(slot).toISOString(), gateOpen: Date.now() >= slot, next: pickNext(prs)?.number ?? null,
    prs: prs.map(({ body, reviewedShas, ...rest }) => ({ ...rest, head: rest.head.slice(0, 7) })) };
  if (flags.has('--json')) { console.log(JSON.stringify(summary, null, 2)); return; }
  for (const pr of prs) say(`#${pr.number}`.padEnd(6), pr.branch.padEnd(26), `← ${pr.base}`.padEnd(24), pr.head.slice(0, 7), `ci:${pr.checks}`.padEnd(12), pr.state.padEnd(11), `threads:${pr.openThreads}`, pr.outsideFindings ? `outside-diff:${pr.outsideFindings}` : '');
  const until = new Date(slot).toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  say(`Review gate ${summary.gateOpen ? 'OPEN' : `closed until ${until}`}; next in queue: ${summary.next ? `#${summary.next}` : 'none'}`);
}

/** Request a CodeRabbit review for the highest-priority queued PR if the hourly gate is open. */
function trigger() {
  const state = loadState(), { prs } = gather(state), slot = nextSlot(state);
  if (Date.now() < slot && !flags.has('--force')) { saveObservations(state); say(`Gate closed until ${new Date(slot).toISOString()}.`); return; }
  const requested = option('--pr'), pr = requested ? prs.find(p => p.number === Number(requested)) : pickNext(prs);
  if (!pr) { saveObservations(state); say('Nothing is queued for review.'); return; }
  const body = flags.has('--full') ? '@coderabbitai full review' : '@coderabbitai review';
  say(`${dryRun ? '[dry run] ' : ''}Requesting review on #${pr.number} (${pr.branch}) at ${pr.head.slice(0, 7)}.`);
  if (!dryRun) { run('gh', ['pr', 'comment', String(pr.number), '--body', body]); state.lastTriggerAt = Date.now(); }
  saveObservations(state);
}

/** Create the next layer's branch and worktree from its base and record the base SHA for exact restacks. */
function newLayer() {
  const name = args[1], branch = `ui/${name}`;
  if (!parseStackBranch(branch)) throw new Error('Usage: stack.mjs new NN-slug [--base <ref>]  (e.g. 07-medium)');
  const { root } = worktrees(), state = loadState();
  const base = option('--base') ?? sortStack(localLayers(state).map(b => ({ branch: b }))).at(-1)?.branch ?? 'origin/main';
  const path = join(dirname(root), `${root.split(/[\\/]/).pop()}-wt`, name), baseSha = sha(base);
  if (!baseSha) throw new Error(`Base ${base} does not exist.`);
  say(`${dryRun ? '[dry run] ' : ''}Creating ${branch} from ${base} (${baseSha.slice(0, 7)}) at ${path}; ZP_PORT=${stackPort(branch)}.`);
  if (!dryRun) git(['worktree', 'add', '--no-track', '-b', branch, path, base]);
  Object.assign(layer(state, branch), { base, baseSha }); saveState(state);
  say('Next: run `npm ci` in the new worktree.');
}

/** Rebase one layer onto its base inside its own worktree, using the recorded base SHA as the cut point. */
function rebaseLayer(state, branch, base, newBaseRef, path) {
  const newBase = sha(newBaseRef), recorded = state.layers[branch]?.baseSha ?? run('git', ['merge-base', base, branch]);
  if (!newBase || recorded === newBase) return false;
  if (!path) throw new Error(`${branch} has no worktree; create one before restacking.`);
  if (run('git', ['status', '--porcelain'], { cwd: path })) throw new Error(`${branch} worktree has uncommitted changes (${path}).`);
  say(`${dryRun ? '[dry run] ' : ''}Rebasing ${branch} onto ${newBaseRef} (${recorded.slice(0, 7)} → ${newBase.slice(0, 7)}).`);
  if (dryRun) return true;
  const result = run('git', ['rebase', '--onto', newBase, recorded], { cwd: path, allowFail: true });
  if (!result.ok) { run('git', ['rebase', '--abort'], { cwd: path, allowFail: true }); throw new Error(`Rebase of ${branch} conflicted; aborted. Resolve manually in ${path}.\n${result.err}`); }
  layer(state, branch).baseSha = newBase;
  return true;
}

/** Local stack branches that are still live (merged layers whose cleanup failed are excluded). */
function localLayers(state) {
  return run('git', ['branch', '--list', 'ui/*', '--format=%(refname:short)']).split('\n').filter(b => parseStackBranch(b) && !state.layers[b]?.merged);
}

/** Restack every non-bottom local layer onto its current base, bottom-up. State is saved even if a later layer fails. */
function restack() {
  const state = loadState(), { map } = worktrees();
  const locals = sortStack(localLayers(state).map(branch => ({ branch })));
  let moved = 0;
  try {
    locals.forEach(({ branch }, i) => {
      // Prefer the base recorded by `new`/`retarget`; a merged layer's leftover branch must never become a base.
      const base = state.layers[branch]?.base ?? (i > 0 ? locals[i - 1].branch : 'origin/main');
      if (base !== 'origin/main' && rebaseLayer(state, branch, base, base, map.get(branch))) moved++;
    });
  } finally { saveState(state); }
  say(moved ? `Restacked ${moved} layer(s). Run checks, then \`stack.mjs push\`.` : 'Stack is already up to date.');
}

/** Force-push one branch with a lease on the remote tip last fetched. */
function pushBranch(branch) {
  const local = sha(branch), remote = sha(`origin/${branch}`);
  if (local === remote) return;
  say(`${dryRun ? '[dry run] ' : ''}Pushing ${branch} ${remote?.slice(0, 7) ?? '(new)'} → ${local.slice(0, 7)}.`);
  if (!dryRun) git(['push', '-u', `--force-with-lease=${branch}:${remote ?? ''}`, 'origin', branch]);
}

/**
 * After a lower PR merges, move the next layer onto main without the squashed commits. Each step is idempotent and
 * saved before the next, and the PR's base changes only after its rebased head is pushed, so an interruption never
 * leaves a PR pointing at main with a head that still carries the merged commits.
 */
function retarget() {
  const state = loadState(), { map } = worktrees();
  git(['fetch', '--prune', 'origin']);
  for (const pr of openStackPrs('number,headRefName,baseRefName').filter(p => p.baseRefName !== 'main')) {
    const merged = ghJson(['pr', 'list', '--state', 'merged', '--head', pr.baseRefName, '--json', 'number']);
    if (!merged.length) continue;
    say(`${dryRun ? '[dry run] ' : ''}#${merged[0].number} (${pr.baseRefName}) merged; retargeting #${pr.number} to main.`);
    rebaseLayer(state, pr.headRefName, 'origin/main', 'origin/main', map.get(pr.headRefName));
    saveState(state);
    pushBranch(pr.headRefName);
    if (dryRun) continue;
    run('gh', ['pr', 'edit', String(pr.number), '--base', 'main']);
    layer(state, pr.headRefName).base = 'origin/main';
    saveState(state);
  }
}

/** Squash-merge the bottom PR when it is merge-ready, then retarget the next layer and remove the merged branch and worktree. */
function merge() {
  const state = loadState(), { prs } = gather(state); saveObservations(state);
  const bottom = prs.find(pr => pr.base === 'main');
  if (!bottom) { say('No stack PR targets main.'); return; }
  if (!mergeReady(bottom)) { say(`#${bottom.number} is not merge-ready (state ${bottom.state}, CI ${bottom.checks}).`); return; }
  say(`${dryRun ? '[dry run] ' : ''}Squash-merging #${bottom.number} (${bottom.branch}).`);
  if (dryRun) return;
  run('gh', ['pr', 'merge', String(bottom.number), '--squash', '--match-head-commit', bottom.head]);
  retarget();
  const path = worktrees().map.get(bottom.branch), steps = [];
  if (path) steps.push(run('git', ['worktree', 'remove', path], { allowFail: true }));
  steps.push(run('git', ['branch', '-D', bottom.branch], { allowFail: true }));
  steps.push(run('git', ['push', 'origin', '--delete', bottom.branch], { allowFail: true }));
  // Keep ownership of a layer whose cleanup failed: marked merged, it is never pushed, restacked or used as a base.
  const next = loadState();
  if (steps.every(step => step.ok)) delete next.layers[bottom.branch];
  else { layer(next, bottom.branch).merged = true; say(`Cleanup of ${bottom.branch} incomplete; marked merged. ${steps.map(step => step.err).filter(Boolean).join(' ')}`); }
  saveState(next);
}

/** Capture the stack, the review gate and origin/main as a watch snapshot (see diffSnapshots). */
function snapshot(state) {
  const { repo, prs } = gather(state), slot = nextSlot(state), main = sha('origin/main');
  return {
    repo, gate: { open: Date.now() >= slot, next: pickNext(prs)?.number ?? null },
    main: { sha: main, subject: main ? git(['log', '-1', '--format=%s', main]) : '' },
    prs: Object.fromEntries(prs.map(pr => [pr.number, { branch: pr.branch, head: pr.head.slice(0, 7), state: pr.state, checks: pr.checks, threads: pr.openThreads, outside: pr.outsideFindings, activity: pr.activity }])),
  };
}

/** Unread GitHub notifications for this repository newer than `since` (read-only: nothing is marked as read). */
function notificationsSince(repo, since) {
  const items = ghJson(['api', 'notifications', '--paginate', '--slurp']).flat().filter(n => n.repository?.full_name === repo && n.updated_at > (since ?? ''));
  return items.map(n => ({ at: n.updated_at, line: `GitHub ${n.reason.replaceAll('_', ' ')}: ${n.subject?.title ?? ''}` }));
}

/** Local wall-clock time in UK time (BST/GMT) for event lines. */
const stamp = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

/**
 * Watch the stack: every --interval seconds (default 60) diff a fresh snapshot against the last one and print one line
 * per change. The last snapshot is saved in shared state, so a restarted watcher first reports everything that changed
 * while it was down. --once runs a single pass. Designed to run under a Monitor, re-armed when it expires.
 */
async function watch() {
  // setTimeout clamps delays above 2^31 - 1 ms (~24.8 days) to 1 ms, and NaN would poll GitHub continuously.
  const seconds = Number(option('--interval') ?? 60);
  if (!Number.isFinite(seconds) || seconds * 1000 > 2 ** 31 - 1) throw new Error('--interval must be a number of seconds up to 2147483.');
  const interval = Math.max(20, seconds) * 1000;
  let lastError = '';
  for (;;) {
    try {
      run('git', ['fetch', '--quiet', '--prune', 'origin'], { allowFail: true });
      const state = loadState(), next = snapshot(state), seen = state.watch?.notifiedAt;
      const lines = diffSnapshots(state.watch?.last, next);
      const notes = notificationsSince(next.repo, seen);
      state.watch = { last: next, notifiedAt: notes.map(n => n.at).concat(seen ?? '').sort().pop() };
      saveObservations(state);
      for (const line of [...lines, ...notes.map(n => n.line)]) console.log(`[${stamp()}] ${line}`);
      lastError = '';
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
      if (message !== lastError) console.log(`[${stamp()}] watch error: ${message}`);
      lastError = message;
    }
    if (flags.has('--once')) return;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/** Waive a review's outside-diff findings after answering them on the PR: stack.mjs waive <pr> <reviewId> <reason…>. */
function waive() {
  const [number, reviewId, ...words] = args.slice(1).filter(a => !a.startsWith('--')), reason = words.join(' ');
  if (!Number(number) || !Number(reviewId) || !reason) throw new Error('Usage: stack.mjs waive <pr> <reviewId> <reason>');
  const pr = openStackPrs('number,headRefName').find(p => p.number === Number(number));
  if (!pr) throw new Error(`#${number} is not an open stack PR.`);
  say(`${dryRun ? '[dry run] ' : ''}Waiving outside-diff findings of review ${reviewId} on #${number}.`);
  if (dryRun) return;
  run('gh', ['pr', 'comment', String(number), '--body', `Outside-diff finding(s) in CodeRabbit review ${reviewId} not acted on: ${reason}`]);
  const state = loadState(), record = layer(state, pr.headRefName);
  record.waived = [...new Set([...(record.waived ?? []), Number(reviewId)])];
  saveState(state);
}

/** Download the Linux visual baselines CI recorded for the current branch into tests/visual/__screenshots__ (then review and commit). */
function snapshots() {
  const branch = git(['branch', '--show-current']), top = git(['rev-parse', '--show-toplevel']);
  const [latest] = ghJson(['run', 'list', '--branch', branch, '--workflow', 'CI', '--limit', '1', '--json', 'databaseId,headSha,status']);
  if (!latest) throw new Error(`No CI run found for ${branch}.`);
  if (latest.status !== 'completed') throw new Error(`CI run ${latest.databaseId} for ${branch} is still ${latest.status}.`);
  if (latest.headSha !== sha('HEAD')) say(`Warning: run ${latest.databaseId} is for ${latest.headSha.slice(0, 7)}, not HEAD.`);
  say(`${dryRun ? '[dry run] ' : ''}Downloading visual-snapshots from run ${latest.databaseId}.`);
  if (!dryRun) run('gh', ['run', 'download', String(latest.databaseId), '-n', 'visual-snapshots', '-D', join(top, 'tests', 'visual', '__screenshots__')]);
  say(run('git', ['status', '--short', 'tests/visual'], { cwd: top }) || 'Baselines unchanged.');
}

/** Force-push (with lease) every live local layer whose tip differs from its remote branch. */
function push() {
  for (const branch of sortStack(localLayers(loadState()).map(b => ({ branch: b }))).map(l => l.branch)) pushBranch(branch);
}

/** Refresh the stack navigator block at the top of every open stack PR body. */
function nav() {
  const open = openStackPrs('number,headRefName,body').map(p => ({ ...p, branch: p.headRefName }));
  const dir = mkdtempSync(join(tmpdir(), 'stack-nav-'));
  try {
    for (const pr of open) {
      const body = replaceNav(pr.body, renderNav(open, pr.number));
      if (body === pr.body) continue;
      say(`${dryRun ? '[dry run] ' : ''}Updating navigator on #${pr.number}.`);
      if (!dryRun) { const file = join(dir, `${pr.number}.md`); writeFileSync(file, body); run('gh', ['pr', 'edit', String(pr.number), '--body-file', file]); }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const commands = { status, trigger, watch, new: newLayer, restack, retarget, merge, waive, push, nav, snapshots, port: () => console.log(stackPort(args[1] ?? git(['branch', '--show-current'])) ?? 5174) };
if (!commands[command]) { console.error('Usage: node scripts/stack.mjs <status|trigger|watch|new|restack|retarget|merge|waive|push|nav|snapshots|port> [--dry-run] [--json] [--pr N] [--full] [--force] [--base ref]'); process.exit(2); }
Promise.resolve().then(() => commands[command]()).catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
