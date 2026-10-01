# Grabble TBLive surface architecture

## Canonical routes

`/`, `/host`, `/host/[CODE]`, `/play/[CODE]`, `/display/[CODE]`, `/tv`, `/tv/[CODE]` and `/admin` are served from distinct static HTML shells. Unknown routes return 404. The shell owns its wordmark/header and mounts the matching surface controller into its own `#surface-content` element.

## Shared runtime boundaries

- `src/worker.js` owns route dispatch and validates the create request context/version.
- `src/room.js` owns authoritative room state, player registration, actions and lifecycle.
- `public/js/grabble-transport.js` owns WebSocket connection and reconnect.
- `public/js/grabble-surface.js` contains route identity, a generic content mount and connection helpers; it does not generate shell markup.
- Each surface controller owns the page-level render and binds only to its shell.
- `public/js/grabble-create.js` defines setup choices once and shares that definition between host and TV creation.

## v1.38 flow

Homepage `Play Now` enters `/host`, showing one opaque 2.5-second splash and then the `Your Name` step before game setup. The host name and player token are included with creation; the host is present in the first room snapshot and can join on the same device. Homepage `Join Room` has its own one-time splash, then captures room code and player name in one form. Direct and QR player joins skip the splash.

Host and TV use the same game format options and room config. Host creation returns `/host/[CODE]`; TV creation returns `/tv/[CODE]`. TV portal launch passes `?entry=portal` to show its one-time splash. Read-only display and TV projections connect from their canonical room URLs without a projection token; only the authoritative host or TV controller can progress a room.

## Remaining adoption checks

Each shell loads `grabble-base.css` for shared primitives and its own `grabble-[surface].css` stylesheet. The full host, join, projection and TV replay browser flow passes locally. The external TriviaBranch TV launcher still needs to append `?entry=portal` when handing off to Grabble. A hosted CI run and Fire TV/Silk, mobile Safari/Chrome and HDMI display viewport evidence remain before recording full v1.38 conformance.
