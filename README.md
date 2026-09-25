# Grabble

A TBLive word-building game.

Players continuously drag moving letter tokens from a shared pool into the next slot on their own word line. Grabble uses `/play/[CODE]`, `/display/[CODE]`, `/tv/[CODE]`, `/host/[CODE]` and `/admin`, with transient Durable Object room state and no D1/R2 dependency.

## Surface architecture

Grabble is the first game migrated to the TBLive HTML-per-surface implementation pattern.

Each canonical browser surface has its own static HTML shell:

- `public/surfaces/play.html`
- `public/surfaces/display.html`
- `public/surfaces/tv.html`
- `public/surfaces/host.html`
- `public/surfaces/admin.html`

The shells load the shared static client and stylesheet:

- `public/js/grabble-client.js`
- `public/css/grabble.css`

The Worker maps the clean TBLive routes to these shells. The public routes remain canonical and must not expose `.html` URLs or route fallbacks.

This first migration deliberately preserves the existing Durable Object room, WebSocket messages, tokens, lifecycle and scoring behaviour. It changes the presentation boundary first so each surface can be tested independently on mobile browsers, desktop/display browsers and Fire TV/Silk before deeper client-module extraction.

## Fire TV and browser compatibility

The `/tv/[CODE]` shell is a genuine TV surface, not an alias for `/display/[CODE]`. It is tested separately for:

- Fire TV/Silk loading and reconnect;
- remote focus and Enter/Space activation;
- fixed viewport/no-scroll behaviour;
- QR lobby and live player presence;
- server-controlled countdown and progression;
- results and return/play-again actions.

A surface migration is not complete until the affected surface passes the TBLive conformance checks and the relevant device/browser smoke tests.

The dictionary is intentionally configurable through Grabble Admin and is cached by the admin Durable Object before public play.

## Contract enforcement

The static surface contract is checked in CI with `node tests/conformance/html-surfaces.mjs`. This verifies that all canonical shells exist, load external assets, remain distinct where required, and that the Worker no longer embeds the presentation monolith. Device-level checks for Fire TV/Silk, HDMI display and mobile play remain merge/release gates documented in `docs/HTML-PER-SURFACE-MIGRATION.md`.
