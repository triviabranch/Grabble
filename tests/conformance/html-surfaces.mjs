import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const surfaces = ['home', 'play', 'host', 'display', 'tv', 'admin'];
const read = file => readFile(path.join(root, file), 'utf8');

for (const surface of surfaces) {
  const file = `public/surfaces/${surface}.html`;
  await access(path.join(root, file));
  const html = await read(file);
  assert.match(html, /<html\b/i, `${file} must be an HTML document`);
  assert.match(html, /href="\/css\/grabble\.css"/, `${file} must load the surface stylesheet`);
  assert.match(html, /src="\/js\/grabble-client\.js"/, `${file} must load the external client`);
  assert.match(html, /src="\/js\/grabble-transport\.js"/, `${file} must load the shared transport`);
  assert.match(html, /src="\/js\/grabble-create\.js"/, `${file} must load the shared create controller`);
  assert.match(html, /src="\/js\/grabble-admin\.js"/, `${file} must load the shared admin controller`);
  assert.match(html, /src="\/js\/grabble-player\.js"/, `${file} must load the shared player controller`);
  assert.match(html, /src="\/js\/tblive-qr\.js"/, `${file} must load the canonical TBLive QR module`);
  assert.doesNotMatch(html, /<script>(?!\s*<\/script>)/i, `${file} must not contain an inline application`);
}

const worker = (await read('src/index.js')) + (await read('src/worker.js')) + (await read('src/room.js')) + (await read('src/admin.js'));
const wrangler = await read('wrangler.toml');
assert.doesNotMatch(worker, /const CSS=`|const CLIENT=`|function page\(/, 'Worker must not contain the presentation monolith');
assert.match(worker, /p\.length===2\)return serveSurface\(env,request,p\[0\]\)/, 'Worker must route canonical room surfaces only with a room code');
assert.match(worker, /p\.length===0\)return serveSurface\(env,request,'home'\)/, 'Worker must route the explicit home surface');
assert.doesNotMatch(worker, /return serveSurface\(env,request,'play'\)\}\};/, 'Worker must not fall back unknown paths to the player surface');
assert.match(worker, /env\.ASSETS\.fetch/, 'Worker must serve static surface assets');
assert.match(worker, /controlToken/, 'Room creation and control WebSockets must use a room-scoped control token');
assert.match(worker, /UNAUTHORISED_CONTROL_ROLE/, 'TV/host control connections must reject missing or invalid control tokens');
assert.match(worker, /broadcastEvent\('player_left'/, 'Player leave must emit player_left');
assert.match(worker, /broadcastEvent\('player_joined'/, 'Player join must emit player_joined');
assert.match(wrangler, /binding\s*=\s*"ASSETS"/, 'Wrangler must expose the ASSETS binding used by the Worker');
assert.match(worker, /p\[2\]==='rooms'/, 'Worker must expose the TBLive room registry contract');
assert.match(worker, /p\[2\]==='games'/, 'Worker must expose the registered games contract');
assert.match(worker, /kill-all/, 'Worker must expose the global kill-all contract');

const capabilities = JSON.parse(await read('tblive.capabilities.json'));
assert.equal(capabilities.contractVersion, '1.30', 'Grabble must declare TBLive contract 1.30');
assert.equal(capabilities.capabilities.hostlessTv, true, 'Grabble must expose hostless TV');
assert.equal(capabilities.capabilities.tvCreatesRoom, true, 'TV must be able to create a room');

const client = await read('public/js/grabble-client.js');
const transport = await read('public/js/grabble-transport.js');
assert.match(transport, /GrabbleTransport/, 'Transport module must expose the shared room transport');
const admin = await read('public/js/grabble-admin.js');
assert.match(admin, /GrabbleAdmin/, 'Admin module must expose the shared admin controller');
const player = await read('public/js/grabble-player.js');
assert.match(player, /GrabblePlayer/, 'Player module must expose the shared player controller');
assert.match(client, /pathParts\s*=\s*location\.pathname\.split/, 'Client must derive its surface from the canonical path');
assert.doesNotMatch(client, /G_MODE|G_CODE/, 'Client must not depend on Worker-injected mode globals');
assert.doesNotMatch(client, /api\.qrserver\.com|quickchart\.io|chart\.google\.com/, 'Grabble must not use third-party QR services');
assert.match(client, /data-join-qr/, 'Grabble must render the join QR in a local container');
assert.match(client, /tvEntryPhase\s*=\s*["']idle["']/, 'TV room routes must retain the idle entry phase');
assert.doesNotMatch(client, /tvEntryPhase\s*!==\s*["']lobby["']/, 'TV room routes must not re-enter the legacy splash/bridge flow');
assert.match(client, /mode\s*===\s*["']tv["']\s*\?\s*["']tv["']\s*:\s*["']display["']/, 'TV room routes must retain the TV controller role');

const display = await read('public/surfaces/display.html');
const tv = await read('public/surfaces/tv.html');
assert.notEqual(display, tv, 'Display and TV must remain distinct surface shells');

const css = await read('public/css/grabble.css');
assert.match(css, /setup-modal-tv[\s\S]*100dvh/, 'TV create flow must use a bounded dynamic viewport');
assert.match(css, /setup-modal-tv[\s\S]*overflow:hidden/, 'TV create shell must contain overflow');
assert.match(css, /setup-modal-tv[\s\S]*setup-footer/, 'TV create flow must have one persistent footer rail');
assert.match(client, /play-again/, 'In-room replay action must exist');
assert.match(client, /TBLiveQR/, 'QR rendering must use the canonical local TBLive renderer');


assert.match(css, /TBLive 1\.30 TV create density/, 'TV create flow must use the 1.30 density patch');
assert.match(css, /aspect-ratio:auto!important/, 'TV create card must not force a viewport-breaking aspect ratio');
console.log('TBLive 1.30 static surface conformance passed');
