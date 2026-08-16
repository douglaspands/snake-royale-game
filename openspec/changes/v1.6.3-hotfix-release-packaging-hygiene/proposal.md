## Why

Three defects surfaced while validating `v1.6.1`. None affects gameplay; all three degrade the release artifact or the ability to diagnose it.

**1. Superseded client bundles accumulate in the local working copy.** `npm run android:sync-client` is `cd client && npm run build && mkdir -p ../android/app/src/main/assets/client_dist && cp -r dist/* ../android/app/src/main/assets/client_dist/`. Vite emits content-hashed filenames, so each build produces a new `assets/index-<hash>.js` and `assets/index-<hash>.css`; `cp -r` adds them without removing the previous ones. After the `v1.6.1` sync the directory holds two generations side by side — the live `index-DDbdtsrR.js` / `index-CVj7B72O.css` and the orphaned `index-zn7FLEeE.js` / `index-D0PuLDD6.css`.

**The released APK is not affected, and this proposal originally claimed otherwise.** `android/app/src/main/assets/client_dist/` is gitignored (`.gitignore:67`), so a CI checkout never contains it, and the workflow's own "Sync Web Client to Android Assets" step does the same `mkdir -p` + `cp -r` into an empty directory. Verified against the `v1.6.1` dry-run artifact: `unzip -l` on the produced APK lists exactly `assets/client_dist/assets/index-CVj7B72O.css` and `index-DDbdtsrR.js` and nothing else.

What remains is a local-workflow defect, and it is worth fixing on its own terms: `npm run android:build` (`android:sync-client` then `assembleDebug`) packages whatever is in the working copy, so a locally built debug APK *does* carry the orphans and diverges from what CI produces from the same commit. That divergence is exactly what makes `v1.5.5` task 8.7 ("confirm the served bundle is the new one, not the previous release's") ambiguous when checked locally: a stale directory cannot distinguish "the new bundle is being served" from "the old one happens to still be present".

**2. `/health` reports a version identity frozen at `1.0.0-VIPER`.** `server/app/main.py:50` hardcodes that string. It has not tracked a release since v1.0.0, so the endpoint the Android dashboard polls for its Online/Offline state — and the first thing anyone curls when diagnosing a device — reports a version six releases stale. There is no requirement governing the endpoint's payload today, so nothing was violated; the identity was simply never wired up.

**3. `.claude/worktrees/` is not ignored by git.** The parallel sub-agent lane workflow adopted in `v1.6.1` creates git worktrees under that path. They surface as untracked entries in `git status`, and a worktree that is accidentally staged would commit a nested checkout.

## What Changes

- `android:sync-client` clears the destination before copying, so `client_dist/` is an exact mirror of `client/dist/` rather than an accumulation of every build ever run.
- `/health` reports the version from the package metadata instead of a hardcoded literal, so it cannot drift from the release again.
- `.gitignore` covers `.claude/worktrees/`.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `android`: modifies `REQ-AND-003` to require the bundled asset directory to be an exact mirror of the compiled client distribution, carrying no superseded build outputs; adds `REQ-AND-009` requiring the embedded server's health endpoint to report the running application version.

## Impact

- `package.json` — the `android:sync-client` script.
- `server/app/main.py` — the `health_check` payload.
- `server/tests/` — coverage for the health payload's version field.
- `.gitignore` — the worktrees path.
- `android/app/src/main/assets/client_dist/assets/` — the two orphaned files are removed by the first corrected sync. This directory is generated and gitignored; per `CLAUDE.md` it is never edited by hand, and this change edits the script that produces it, not its contents.
- **No client source change.** The compiled output is unaffected; only which copies of it survive in the local Android assets.
- **No gameplay change.** No protocol, physics or rendering behaviour is touched.
- **No change to the released APK's contents.** Fix 1 makes locally built APKs match what CI already produces; it does not alter the CI artifact. Expect no size reduction in the published release.

## Non-goals

Follow-up 8.5 of `v1.6.1` — lane worktrees being cut from an older base than the orchestrator's HEAD — is **not** addressed here. The cause is now understood: worktrees branch from the repository's default branch, and `origin/main` sits at `a81dbb4`, so everything released since (v1.5.4, v1.5.5, v1.6.0) lives only on unmerged feature branches. There is no code change that fixes this — it resolves itself when those branches merge to `main`, and until then it is handled by the verification step recorded in `CLAUDE.md` § Execução paralela com sub-agentes. It is listed here only so it is not mistaken for an item this change closes.
