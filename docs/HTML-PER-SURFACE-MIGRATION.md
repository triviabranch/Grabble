# Grabble HTML-per-surface migration

## Purpose

This is the first controlled Grabble migration from the original presentation monolith to the TBLive HTML-per-surface pattern.

## Preserved contract

The migration does not change:

- canonical routes;
- Durable Object room authority;
- WebSocket transport;
- player identity or reconnect behaviour;
- scoring and dictionary validation;
- room phases, expiry or admin kill;
- hostless TV capability.

## Changed boundary

The Worker now serves explicit static surface shells from `public/surfaces/`. Each shell loads the shared Grabble client and stylesheet. The surface routes remain clean:

`/`, `/play/[CODE]`, `/display/[CODE]`, `/tv/[CODE]`, `/host/[CODE]`, `/admin`.

The static files are implementation assets, not new public routes. Clients must continue to use the canonical clean paths. Unknown paths return 404 rather than silently loading the player shell.

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
