# Grabble TBLive 1.38 adoption status

## Implemented

| Requirement | Evidence |
| --- | --- |
| Canonical static shell for each surface | `public/surfaces/*.html`, `tests/conformance/html-surfaces.mjs` |
| Each shell loads small shared primitives and only its own surface stylesheet | `public/css/grabble-base.css`, `public/css/grabble-[surface].css`, `tests/conformance/html-surfaces.mjs` |
| Home `Play Now` enters `/host`; `/play/[CODE]` is join-only | `public/js/grabble-create.js`, `src/worker.js` |
| Host name is collected before setup and appears in initial room state | `src/worker.js`, `src/room.js`, `tests/conformance/persistence-1.38.mjs` |
| One create definition supplies host and TV options and request config | `public/js/grabble-create.js` |
| Context, version, controller role and canonical result route are checked | `public/js/grabble-create.js`, `src/worker.js` |
| Direct read-only display/TV projections do not require projection tokens | `src/room.js` |
| TV projection of a host room cannot control it | `src/room.js`, `public/js/grabble-tv.js` |
| Host may join as a player using the host player token | `public/js/grabble-host.js`, `public/js/grabble-play.js` |
| Opaque entry splash is limited to home→host, home→join and marked TV portal handoff | `public/js/grabble-create.js`, `public/js/grabble-tv.js` |
| Stale 1.35 conformance scripts, obsolete all-surface stylesheet and unused TV explainer styles removed | `tests/conformance/`, `public/css/` |
| Host, player join, public projection and hostless TV gameplay/replay browser flow | `tests/conformance/browser-flow.mjs` — configured in CI; local rerun against the merged tree was blocked because Wrangler failed during interface discovery (`uv_interface_addresses returned Unknown system error 1`) |

## Still required before claiming full conformance

- The external TV launcher must append `?entry=portal` on its handoff to Grabble.
- The Playwright flow is configured in CI; hosted CI evidence is pending. The local rerun against this merged tree could not start Wrangler because of the workspace interface-discovery error.
- Fire TV/Silk, mobile Safari/Chrome and HDMI display viewport evidence remains to be gathered.

Admin API/reporting integration remains outside this game-flow implementation; it does not block v1.38 game approval under the contract's temporary registry-link exception.
