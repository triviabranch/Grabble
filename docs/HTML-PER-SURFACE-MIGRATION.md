# Grabble HTML-per-surface migration

## Purpose

This branch is the first controlled migration from the original Grabble presentation monolith to the TBLive HTML-per-surface pattern.

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

The Worker now serves static surface shells from `public/surfaces/`. Each shell loads the shared Grabble client and stylesheet. The surface route remains clean:

`/play/[CODE]`, `/display/[CODE]`, `/tv/[CODE]`, `/host/[CODE]`, `/admin`.

The static files are implementation assets, not new public routes. Clients must continue to use the canonical clean paths.

## Validation matrix

| Surface | Primary clients | Required checks |
|---|---|---|
| Play | iOS Safari, Android Chrome, desktop Chrome | join, reconnect, drag/touch, wildcard, scoring, results continuation |
| Host | mobile Safari, desktop Chrome | setup, start, countdown, round progression, restart |
| Display | desktop Chrome/Edge, HDMI full-screen | QR, live player presence, pool, player boards, scoring reveal, results |
| TV | Fire TV/Silk, TV-sized Chromium | create, QR lobby, remote focus, start, gameplay, results, no scroll |
| Admin | desktop/mobile browser | room list, dictionary config, comparison, kill room |

## Next extraction phase

After this branch passes device smoke tests, split the shared client into small modules without changing the room protocol:

- connection/reconnect;
- shared shell and entry treatment;
- lobby/presence;
- player interaction;
- display/TV rendering;
- host controls;
- admin controls;
- results and scoreboard.

Do not change the Durable Object protocol and client decomposition in the same unverified change.