# Security requirements

- Enforce authorization server-side.
- Treat user-controlled input as untrusted.
- Do not expose secrets or internal paths.
- Avoid unrelated changes during remediation.
- For security-sensitive changes, add regression tests.
- Prefer a diagnosis and plan before broad code changes.
- Do not claim a vulnerability is fixed without a reproducible verification step.
