# Tasks — v1.6.3-hotfix-release-packaging-hygiene

Sequential, single session. Three independent fixes; `B1`, `B2` and `B3` may be done in any order.

## 0. Node 0 — Environment & Spec Validation

- [ ] 0.1 Run `npm run spec:validate` and confirm the `REQ-AND-003` / `REQ-AND-009` delta is well-formed before touching code
- [ ] 0.2 Record the current state for comparison: list `android/app/src/main/assets/client_dist/assets/` and note every file present, and `curl -s localhost:8000/health` against a running `npm run dev`

## 1. Node B1 — Prune the Bundled Asset Mirror

- [ ] 1.1 In `package.json`, change `android:sync-client` to clear the destination before copying, per `design.md` D1
- [ ] 1.2 **Before running it for real**, verify the resolved destination path — echo it from the same working directory the script uses (`cd client`) and confirm it lands on `android/app/src/main/assets/client_dist` and nowhere else
- [ ] 1.3 Run `npm run android:sync-client` and confirm `client_dist/assets/` now holds exactly the files in `client/dist/assets/` — specifically that the orphaned `index-zn7FLEeE.js` and `index-D0PuLDD6.css` recorded in `0.2` are gone
- [ ] 1.4 Confirm the copied `index.html` still references the current hashed bundle, and that `android/app/src/main/python/server/` (the other generated mirror) was not touched

## 2. Node B2 — Health Endpoint Version Identity

- [ ] 2.1 In `server/app/main.py`, replace the hardcoded `"version": "1.0.0-VIPER"` in `health_check` with the value resolved from package metadata, per `design.md` D2, resolved once at import time rather than per request
- [ ] 2.2 Handle `PackageNotFoundError` by reporting an explicit unknown value, per `design.md` D3 — the endpoint must still return a successful response
- [ ] 2.3 Add a test asserting the reported version equals the version declared in `pyproject.toml`, so a divergence between the project name and the installed distribution name fails the gate
- [ ] 2.4 Add a test for the missing-metadata path asserting a successful response carrying the unknown value
- [ ] 2.5 Confirm the other fields of the payload — `status`, `active_players`, `tick` — are unchanged, since the Android dashboard's Online/Offline detection reads this response (`REQ-AND-001`)

## 3. Node B3 — Ignore Lane Worktrees

- [ ] 3.1 Add `.claude/worktrees/` to `.gitignore`, alongside the existing `.claude/settings.local.json` entry and its comment
- [ ] 3.2 Confirm `git status` is clean of worktree entries while a lane worktree exists on disk
- [ ] 3.3 Confirm the versioned `.claude/` configuration is still tracked — the new rule must not shadow it

## 4. Node INT — Quality Gates

- [ ] 4.1 Run `npm test` (root gate: pytest + vitest + openspec validate)
- [ ] 4.2 Run `npm run lint`
- [ ] 4.3 Bump `versionCode`/`versionName` in `android/app/build.gradle.kts` and the version identity in `openspec/config.yaml`, `package.json`, `pyproject.toml` and `README.md`
- [ ] 4.4 Re-run `npm run android:sync-client` after the version bump and confirm the mirror is still exact

## 5. Node VAL — On-Device Validation *(requires the physical device — user-executed)*

- [ ] 5.1 Dry-run the release workflow and compare the APK size against the previous release — it should drop by roughly the size of the orphaned bundles
- [ ] 5.2 Install the APK and confirm `/health` reports the new version from the device browser
- [ ] 5.3 Record which branch the packaged runtime takes — the real version or the unknown fallback — so `design.md` D3's open question is closed with evidence
- [ ] 5.4 Confirm the dashboard still shows Online when the server is up and Offline when it genuinely fails to start
- [ ] 5.5 Confirm "Jogar no App" and "Jogar no Navegador" both still load the game

## 6. Node DOC — Spec Sync & Archive

- [ ] 6.1 Run `/opsx-sync` to merge the modified `REQ-AND-003` and the added `REQ-AND-009` into `openspec/specs/android/spec.md`
- [ ] 6.2 Run `npm run spec:doctor`
- [ ] 6.3 Archive as `openspec/changes/archive/AAAA-MM-DD-v1.6.3-hotfix-release-packaging-hygiene/`
- [ ] 6.4 Tag and publish the release, then verify the published asset and its checksum
