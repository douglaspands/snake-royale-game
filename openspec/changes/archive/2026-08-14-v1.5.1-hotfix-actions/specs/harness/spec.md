## ADDED Requirements

### Requirement: REQ-HARN-007 PR-Only CI Status Gate Execution
The Continuous Integration pipeline on GitHub Actions SHALL execute quality gates exclusively on Pull Request events targeting protected branches (`main`, `master`) and manual workflow dispatches, omitting redundant execution on direct push or merge commits.

#### Scenario: Pull Request quality gate triggering
- **WHEN** a Pull Request targeting `main` or `master` is opened, synchronized, or reopened
- **THEN** GitHub Actions runs OpenSpec validation, backend tests, static linters, and frontend tests as required status checks

#### Scenario: Post-merge push execution prevention
- **WHEN** a Pull Request is merged into `main` or `master`
- **THEN** the CI workflow does NOT trigger a redundant push job, conserving runner resources
