# Grabble TBLive 1.35 conformance record

Updated: 2026-09-27

## Release checklist

| Gate | Evidence | Status |
| --- | --- | --- |
| Contract/version declaration | \`tblive.capabilities.json\`, canonical surface metadata | PASS |
| Canonical routes and static shells | \`tests/conformance/html-surfaces.mjs\` | PASS |
| Per-surface controller boundary; no presentation monolith | \`tests/conformance/html-surfaces.mjs\`, \`tests/conformance/tblive-1.35.mjs\` | PASS |
| Protocol, reconnect, lifecycle and bounded-write checks | \`tests/conformance/tblive-1.35.mjs\` | PASS |
| Representative room persistence flow | \`tests/conformance/persistence-1.35.mjs\` | PASS |
| Mobile join lobby and hostless TV launch flow | \`tests/conformance/browser-flow.mjs\` in GitHub Actions | PASS |
| Admin API/reporting | Explicit project scope decision | OUT OF SCOPE |

## Device evidence

The automated gate proves the local Worker and TV-sized Chromium journey. It does not by itself prove Fire TV/Silk, HDMI/full-screen display, or mobile Safari/Chrome against the deployed build. Those remain separate device evidence items rather than silent claims of coverage.
