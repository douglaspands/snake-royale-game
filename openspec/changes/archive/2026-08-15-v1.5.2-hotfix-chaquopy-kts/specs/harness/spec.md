## MODIFIED Requirements

### Requirement: REQ-HARN-007 PR-Only CI Status Gate Execution
The Continuous Integration pipeline on GitHub Actions SHALL execute quality gates exclusively on Pull Request events targeting protected branches (`main`, `master`) and manual workflow dispatches, omitting redundant execution on direct push or merge commits, and SHALL cancel superseded in-progress runs for the same ref via a `concurrency` group when new commits arrive.

#### Scenario: Pull Request quality gate triggering
- **WHEN** a Pull Request targeting `main` or `master` is opened, synchronized, or reopened
- **THEN** GitHub Actions runs OpenSpec validation, backend tests, static linters, and frontend tests as required status checks

#### Scenario: Post-merge push execution prevention
- **WHEN** a Pull Request is merged into `main` or `master`
- **THEN** the CI workflow does NOT trigger a redundant push job, conserving runner resources

#### Scenario: Superseded run cancellation
- **WHEN** a new commit is pushed to a Pull Request while a CI run for a previous commit on the same ref is still in progress
- **THEN** GitHub Actions cancels the in-progress run for that ref via the workflow's `concurrency` group, conserving runner resources
