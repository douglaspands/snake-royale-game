## MODIFIED Requirements

### Requirement: REQ-AND-003 Bundled Static Web Assets Serving
The embedded Python server MUST package and serve the precompiled frontend distribution (`client/dist`) directly from the application package without requiring Node.js or runtime build tools on Android. The bundled asset directory MUST be an exact mirror of the compiled client distribution: the synchronisation step MUST NOT retain build outputs superseded by a later build, so that an application package built from a given commit carries the same assets regardless of whether it was built in a clean checkout or an existing working copy.

#### Scenario: SPA asset serving on Android
- **WHEN** a client or browser requests `/`, `/assets/*`, or any SPA client route on port 8000
- **THEN** the server responds with the precompiled HTML, JS, CSS, and asset files with appropriate MIME types

#### Scenario: Superseded bundles are not packaged
- **GIVEN** the bundled asset directory holds the output of a previous client build
- **WHEN** the client is rebuilt and synchronised into the application package
- **THEN** the directory MUST contain exactly the files emitted by the new build, and every file emitted only by the previous build MUST be absent

#### Scenario: Local and clean-checkout builds agree
- **GIVEN** two application packages built from the same commit, one in a working copy that already held a previous build's assets and one in a clean checkout
- **WHEN** their bundled asset directories are compared
- **THEN** both MUST contain exactly the same set of files

## ADDED Requirements

### Requirement: REQ-AND-009 Embedded Server Version Identity
The embedded server's health endpoint MUST report the version of the running application, derived from the project's declared package metadata rather than from a literal maintained separately. Where that metadata is unavailable at runtime, the endpoint MUST report an explicit unknown value and MUST still respond successfully.

#### Scenario: Health endpoint reports the release version
- **WHEN** a client requests `/health` from the embedded server
- **THEN** the response MUST carry a version field equal to the version declared in the project's package metadata

#### Scenario: Version identity survives a release bump
- **GIVEN** the project's declared version is changed for a new release
- **WHEN** `/health` is requested from the rebuilt application
- **THEN** the reported version MUST be the new one, with no separate edit required to any other source file

#### Scenario: Missing metadata degrades without failing
- **GIVEN** the packaged runtime cannot resolve the project's distribution metadata
- **WHEN** `/health` is requested
- **THEN** the endpoint MUST return a successful response reporting an explicit unknown version, rather than an error
