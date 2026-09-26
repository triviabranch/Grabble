# Grabble HTML-per-surface migration

## Purpose

This is the first controlled Grabble migration from the original presentation monolith to the TBLive HTML-per-surface pattern.

## Preserved contract

The migration does not change:

- TBLive contract 1.30 canonical routes;
- Durable Object room authority;
- WebSocket transport;
- player identity or reconnect behaviour;
- scoring and dictionary validation;
- room phases, expiry or admin kill;
- hostless TV capability.

## Changed boundary

The Worker now serves explicit static surface shells from `public/surfaces/`. Each shell loads the shared create controller, game runtime and stylesheet. The surface routes remain clean:

`/`, `/play/[CODE]`, `/display/[CODE]`, `/tv/[CODE]`, `/host/[CODE]`, `/admin`.

The static files are implementation assets, not new public routes. Clients must continue to use the canonical clean paths. Unknown paths return 404 rather than silently loading the player shell.

## Current module boundary

The former server monolith is split into focused modules:

- `src/index.js` — Worker entrypoint and Durable Object exports;
- `src/worker.js` — HTTP, static-asset and API routing;
- `src/room.js` — room Durable Object, protocol, timers and game state;
- `src/admin.js` — admin Durable Object and room metadata;
- `src/shared.js` — shared server helpers and constants.

On the browser side, `public/js/grabble-create.js` owns the shared create/home flow, `public/js/grabble-transport.js` owns room WebSocket/token/reconnect behavior, and `public/js/grabble-admin.js` owns the admin controller. `public/js/grabble-client.js` now owns the remaining room/game rendering and player interaction; this change intentionally preserves its room protocol and surface behavior.

## Registry and administration

Grabble remains a standalone game Worker and domain, but exposes the shared TBLive room-control contract:

- `GET /api/admin/rooms`;
- `GET /api/admin/games`;
- `POST /api/admin/rooms/:gameId/:roomCode/kill`;
- `POST /api/admin/rooms/kill-all`.

Room status is held in the Grabble Admin Durable Object as operational metadata. Room state, players, tokens, timers and scoring remain authoritative in the room Durable Object. The central TBLive Admin consumes these endpoints; it is not replaced by a second Grabble room implementation.

## Validation matrix

| Surface | Primary clients | Required checks |
|---|---|---|
| Play | iOS Safari, Android Chrome, desktop Chrome | join, reconnect, drag/touch, wildcard, scoring, results continuation |
| Host | mobile Safari, desktop Chrome | setup, start, countdown, round progression, restart |
| Display | desktop Chrome/Edge, HDMI full-screen | QR, live player presence, pool, player boards, scoring reveal, results |
| TV | Fire TV/Silk, TV-sized Chromium | create, QR lobby, remote focus, start, gameplay, results, no scroll |
| Admin | desktop/mobile browser | room list, dictionary config, comparison, kill room |

## Current TV contract alignment

The hostless `/tv/[CODE]` path now follows the TBLive entry rhythm:

`TV create modal → room creation → live QR lobby → launch/countdown → game → results continuation`.

The TV surface has a dedicated adapter, a TriviaBranch return control, centred Grabble wordmark, and no top-right `TV` label. After creation it opens `/tv/[CODE]` directly as the hostless room controller; it does not show a second splash, join bridge or host QR. The hostless room remains authoritative in the existing room/WebSocket implementation.

## Next extraction phase

After this branch passes device smoke tests, continue extracting the shared client into small modules without changing the room protocol:

- connection/reconnect;
- shared shell and entry treatment;
- lobby/presence;
- player interaction;
- display/TV rendering;
- host controls;
- admin controls;
- results and scoreboard.

Do not change the Durable Object protocol and client decomposition in the same unverified change.
