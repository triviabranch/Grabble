# Grabble

A TBLive word-building game.

Players continuously drag moving letter tokens from a shared pool into the next slot on their own word line. Grabble uses `/play/[CODE]`, `/display/[CODE]`, `/tv/[CODE]`, `/host/[CODE]` and `/admin`, with transient Durable Object room state and no D1/R2 dependency.

## Surface architecture

Grabble is the first game migrated to the TBLive HTML-per-surface implementation pattern.

Each canonical browser surface has its own static HTML shell, including the explicit home shell:

- `public/surfaces/home.html`
- `public/surfaces/play.html`
- `public/surfaces/display.html`
- `public/surfaces/tv.html`
- `public/surfaces/host.html`
- `public/surfaces/admin.html`

The shells load the shared static client and stylesheet:

- `public/js/grabble-client.js`
- `public/css/grabble.css`

The Worker maps the clean TBLive routes to these shells. The public routes remain canonical and must not expose `.html` URLs or route fallbacks.

The Worker has explicit mappings for `/`, `/play/[CODE]`, `/display/[CODE]`, `/tv/[CODE]`, `/host/[CODE]` and `/admin`. Unknown paths return 404; they never fall back to the player surface.

The migration preserves the existing Durable Object room, WebSocket messages, tokens, lifecycle and scoring behaviour. The central room registry contract is also exposed through `/api/admin/rooms`, `/api/admin/games`, the canonical room-kill route and `kill-all`, so the standalone Grabble Worker can be controlled by the central TBLive Admin without inventing another room model.

## Fire TV and browser compatibility

The `/tv/[CODE]` shell is a genuine TV surface, not an alias for `/display/[CODE]`. It is tested separately for:

- Fire TV/Silk loading and reconnect;
- remote focus and Enter/Space activation;
- fixed viewport/no-scroll behaviour;
- QR lobby and live player presence;
- server-controlled countdown and progression;
- results and return/play-again actions.

A surface migration is not complete until the affected surface passes the TBLive conformance checks and the relevant device/browser smoke tests.

The dictionary is intentionally configurable through the game adapter and cached by the admin Durable Object before public play. Game-specific diagnostics remain an adapter capability; the production operational surface is the central TBLive Admin.

## Contract enforcement

The static surface contract is checked in CI with `node tests/conformance/html-surfaces.mjs`. This verifies that all canonical shells exist, load external assets, remain distinct where required, that the Worker exposes the room registry contract and that unknown routes do not fall back. Device-level checks for Fire TV/Silk, HDMI display and mobile play remain merge/release gates documented in `docs/HTML-PER-SURFACE-MIGRATION.md`.
