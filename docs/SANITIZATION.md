# Publication preparation

This source distribution starts with a new Git history and a generic commit identity.

The publication allowlist includes application code, bundled third-party runtime assets, synthetic test fixtures, documentation and build scripts. It excludes workspace metadata, hosting identity, credentials, local development paths, browser profiles, personal reading records, screenshots, camera recordings, downloaded portrait fixtures and earlier archive outputs.

The installable archive is generated from the same application source with deterministic file metadata. Vendor checksums are recorded in vendor-sha256.json; third-party licensing notices are retained.

Bundled third-party files are preserved byte-for-byte. Upstream compiler paths or virtual filesystem names inside those assets are not local user data.
