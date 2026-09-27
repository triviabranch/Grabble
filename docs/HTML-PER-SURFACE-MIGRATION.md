# Grabble HTML-per-surface migration

## Purpose

This is the controlled Grabble migration from the original presentation monolith to the TBLive 1.35 HTML-per-surface pattern.

## Preserved contract

The migration does not change:

- TBLive contract 1.35 canonical routes;
- Durable Object room authority;
- WebSocket transport;
- player identity or reconnect behaviour;
- scoring and dictionary validation;
- room phases, expiry or admin kill;
- hostless TV capability;
- the mobile \`/play/[CODE]\` join-lobby flow.

## Changed boundary

The Worker serves explicit static shells from \`public/surfaces/\`. Each canonical surface has its own controller and browser-test boundary. Shared modules are limited to transport, create flow, room-state primitives, player input, identity, tokens, and design primitives.

The routes remain clean:

\`/\`, \`/play/[CODE]\`, \`/display/[CODE]\`, \`/tv/[CODE]\`, \`/host/[CODE]\`, \`/admin\`.

Unknown paths return 404 rather than silently loading the player shell.

## Current module boundary

- \`src/index.js\` — Worker entrypoint and Durable Object exports;
- \`src/worker.js\` — HTTP, static-asset and API routing;
- \`src/room.js\` — room Durable Object, protocol, timers and game state;
- \`src/admin.js\` — admin Durable Object and room metadata;
- \`src/shared.js\` — shared server helpers and constants;
- \`public/js/grabble-surface.js\` — shell, identity, room connection and shared primitives;
- \`public/js/grabble-room-common.js\` — small room-state presentation primitives;
- \`public/js/grabble-create.js\` — shared create flow;
- \`public/js/grabble-transport.js\` — room WebSocket/token/reconnect behavior;
- \`public/js/grabble-player.js\` — shared player input runtime;
- \`public/js/grabble-home.js\`, \`grabble-play.js\`, \`grabble-tv.js\`, \`grabble-display.js\`, \`grabble-host.js\`, \`grabble-admin-surface.js\` — independently addressed surface controllers.

No page-level controller imports another surface controller, and no controller falls back to the legacy \`grabble-client.js\` renderer.

## Validation

The v1.35 workflow runs static route/shell checks, protocol and persistence gates, and a hostless browser flow covering create → lobby → join → launch → countdown → game → results. Admin API/reporting remains explicitly out of scope.
