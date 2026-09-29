// Stacked-PR helper for the UI redesign: status, CodeRabbit review gate, worktrees, restack, retarget, push and navigator.
// Usage: node scripts/stack.mjs <status|trigger|new|restack|retarget|merge|push|nav|port> [options]. See docs/ui-redesign-plan.html §16.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REVIEWER, isTrustedTrigger, mergeReady, nextSlot, rateLimitDeadline, parseStackBranch, pickNext, renderNav, replaceNav, reviewState, sortStack, stackPort } from './stack-core.mjs';

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
/** Load babysitter state shared by every worktree (never committed). */
function loadState() {
  try { return JSON.parse(readFileSync(statePath, 'utf8')); } catch { return { lastTriggerAt: 0, rateLimitUntil: 0, layers: {} }; }
}
/** Persist babysitter state unless this is a dry run. */
function saveState(state) {
  if (dryRun) return;
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
}
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

/** Count unresolved review threads opened by CodeRabbit. */
function openThreads(repo, number) {
  const [owner, name] = repo.split('/');
  const query = 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved comments(first:1){nodes{author{login}}}}}}}}';
  const data = ghJson(['api', 'graphql', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`, '-F', `number=${number}`]);
  return data.data.repository.pullRequest.reviewThreads.nodes.filter(t => !t.isResolved && t.comments.nodes[0]?.author?.login === 'coderabbitai').length;
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
      reviewedShas: reviews.filter(r => r.user?.login === REVIEWER).map(r => r.commit_id),
      lastTriggerAt: triggers.length ? Math.max(...triggers) : 0,
      checks: checksFor(pr.number), openThreads: openThreads(repo, pr.number),
      // The PR's own head commit, not whatever a same-named ref resolves to.
      patchId: patchId(`origin/${pr.baseRefName}`, pr.headRefOid),
    };
    // Bind review evidence to the PR, the head CodeRabbit reviewed and the diff it saw (recorded once per reviewed head).
    const evidence = state.layers[item.branch]?.review;
    if (item.reviewedShas.includes(item.head) && item.patchId && (evidence?.pr !== item.number || evidence?.head !== item.head)) {
      layer(state, item.branch).review = { pr: item.number, head: item.head, patchId: item.patchId };
    }
    const bound = state.layers[item.branch]?.review;
    item.reviewedPatchId = bound?.pr === item.number ? bound.patchId : undefined;
    item.state = reviewState(item);
    state.lastTriggerAt = Math.max(state.lastTriggerAt ?? 0, item.lastTriggerAt);
    prs.push(item);
  }
  return { repo, prs: sortStack(prs) };
}

/** Print or emit the stack status and the next review slot. */
function status() {
  const state = loadState(), { prs } = gather(state), slot = nextSlot(state);
  saveState(state);
  const summary = { now: new Date().toISOString(), nextSlot: new Date(slot).toISOString(), gateOpen: Date.now() >= slot, next: pickNext(prs)?.number ?? null,
    prs: prs.map(({ body, reviewedShas, ...rest }) => ({ ...rest, head: rest.head.slice(0, 7) })) };
  if (flags.has('--json')) { console.log(JSON.stringify(summary, null, 2)); return; }
  for (const pr of prs) say(`#${pr.number}`.padEnd(6), pr.branch.padEnd(26), `← ${pr.base}`.padEnd(24), pr.head.slice(0, 7), `ci:${pr.checks}`.padEnd(12), pr.state.padEnd(11), `threads:${pr.openThreads}`);
  say(`Review gate ${summary.gateOpen ? 'OPEN' : `closed until ${summary.nextSlot}`}; next in queue: ${summary.next ? `#${summary.next}` : 'none'}`);
}

/** Request a CodeRabbit review for the highest-priority queued PR if the hourly gate is open. */
function trigger() {
  const state = loadState(), { prs } = gather(state), slot = nextSlot(state);
  if (Date.now() < slot && !flags.has('--force')) { saveState(state); say(`Gate closed until ${new Date(slot).toISOString()}.`); return; }
  const requested = option('--pr'), pr = requested ? prs.find(p => p.number === Number(requested)) : pickNext(prs);
  if (!pr) { saveState(state); say('Nothing is queued for review.'); return; }
  const body = flags.has('--full') ? '@coderabbitai full review' : '@coderabbitai review';
  say(`${dryRun ? '[dry run] ' : ''}Requesting review on #${pr.number} (${pr.branch}) at ${pr.head.slice(0, 7)}.`);
  if (!dryRun) { run('gh', ['pr', 'comment', String(pr.number), '--body', body]); state.lastTriggerAt = Date.now(); }
  saveState(state);
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
  const state = loadState(), { prs } = gather(state); saveState(state);
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

const commands = { status, trigger, new: newLayer, restack, retarget, merge, push, nav, port: () => console.log(stackPort(args[1] ?? git(['branch', '--show-current'])) ?? 5174) };
if (!commands[command]) { console.error('Usage: node scripts/stack.mjs <status|trigger|new|restack|retarget|merge|push|nav|port> [--dry-run] [--json] [--pr N] [--full] [--force] [--base ref]'); process.exit(2); }
try { commands[command](); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
