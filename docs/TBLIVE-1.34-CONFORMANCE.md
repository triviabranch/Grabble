# Grabble TBLive 1.34 conformance record

Updated: 2026-09-27

## Automated release gates

| Gate | Evidence | Status |
| --- | --- | --- |
| Contract/version declaration | `tblive.capabilities.json`, canonical surface metadata | PASS |
| Static surface and route conformance | `tests/conformance/html-surfaces.mjs` | PASS |
| Protocol, reconnect, lifecycle and bounded-write checks | `tests/conformance/tblive-1.34.mjs` | PASS |
| Representative room persistence flow | `tests/conformance/persistence-1.34.mjs` | PASS |
| Hostless TV browser flow | `tests/conformance/browser-flow.mjs` in GitHub Actions | PASS |
| Admin test-run API/reporting | Explicit project scope decision | OUT OF SCOPE |

## Device evidence

The automated gate proves the local Worker and TV-sized Chromium journey. The following release evidence is separate and must not be inferred from CI:

- Fire TV/Silk: not exercised by this workflow.
- HDMI/full-screen display: not exercised by this workflow.
- Mobile Safari/Chrome: not exercised by this workflow.

Until those target-device checks are recorded against the deployed build, this file describes automated 1.34 conformance, not an unqualified all-device certification.
