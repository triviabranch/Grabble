import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const surfaces = ['home', 'play', 'host', 'display', 'tv', 'admin'];
const controllers = {
  home: 'grabble-home.js',
  play: 'grabble-play.js',
  host: 'grabble-host.js',
  display: 'grabble-display.js',
  tv: 'grabble-tv.js',
  admin: 'grabble-admin-surface.js',
};
const read = file => readFile(path.join(root, file), 'utf8');

for (const surface of surfaces) {
  const file = 'public/surfaces/' + surface + '.html';
  await access(path.join(root, file));
  const source = await read(file);
  assert.match(source, /<html\b/i, file + ' must be an HTML document');
  assert.match(source, /href="\/css\/grabble\.css"/, file + ' must load the surface stylesheet');
  assert.match(source, new RegExp('src="\/js\/' + controllers[surface] + '"'), file + ' must load its own controller');
  assert.doesNotMatch(source, /grabble-client\.js/, file + ' must not load the presentation monolith');
  assert.doesNotMatch(source, /<script>(?!\s*<\/script>)/i, file + ' must not contain inline application code');
  assert.match(source, /tblive-contract-version" content="1\.37"/, file + ' must declare TBLive 1.37');
}
await assert.rejects(access(path.join(root, 'public/js/grabble-client.js')), 'the obsolete presentation monolith must be removed');

const server = (await Promise.all([
  read('src/index.js'), read('src/worker.js'), read('src/room.js'), read('src/admin.js'),
])).join('\n');
const browser = (await Promise.all([
  read('public/js/grabble-surface.js'), read('public/js/grabble-room-common.js'),
  read('public/js/grabble-create.js'), read('public/js/grabble-transport.js'),
  read('public/js/grabble-player.js'), read('public/js/grabble-admin.js'), read('public/js/tblive-qr.js'),
])).join('\n');
const index = await read('src/index.js');
assert.ok(index.length < 1000, 'Worker entrypoint must remain a thin adapter');
assert.match(await read('src/worker.js'), /import \{ registryCall \} from ['"]\.\/shared\.js['"];/);
const wrangler = await read('wrangler.toml');
assert.doesNotMatch(server, /const CSS=|const CLIENT=|function page\(/);
assert.match(server, /\['play', 'display', 'tv', 'host'\]\.includes\(p\[0\]\).*p\.length === 2/);
assert.match(server, /p\.length === 0\) return serveSurface\('home'\)/);
assert.doesNotMatch(server, /return serveSurface\('play'\)\}\s*;\s*$/);
assert.match(server, /env\.ASSETS\.fetch/);
assert.match(server, /controlToken/);
assert.match(server, /UNAUTHORISED_CONTROL_ROLE/);
assert.match(server, /player_left/);
assert.match(server, /player_joined/);
assert.match(wrangler, /binding\s*=\s*"ASSETS"/);
assert.match(server, /p\[2\] === 'rooms'/);
assert.match(server, /p\[2\] === 'games'/);
assert.match(server, /kill-all/);

const capabilities = JSON.parse(await read('tblive.capabilities.json'));
assert.equal(capabilities.contractVersion, '1.37');
assert.equal(capabilities.capabilities.hostlessTv, true);
assert.equal(capabilities.capabilities.tvCreatesRoom, true);
assert.equal(capabilities.routes.mobile, '/play/[CODE]');
assert.equal(capabilities.routes.tv, '/tv/[CODE]');
assert.equal(capabilities.routes.display, '/display/[CODE]');
const createFlow = await read('public/js/grabble-create.js');
assert.ok(createFlow.includes('location.href = "/host"'));
assert.ok(createFlow.includes('location.href = "/play/" + c'));
assert.match(createFlow, /surface === "tv"/);
assert.match(createFlow, /surface === "host"/);
for (const [surface, controller] of Object.entries(controllers)) {
  assert.match(await read('public/surfaces/' + surface + '.html'), new RegExp(controller));
}
assert.doesNotMatch(browser, /<script[^>]+src=["'][^"']*grabble-client\.js/);
assert.doesNotMatch(browser, /api\.qrserver\.com|quickchart\.io|chart\.google\.com/);
assert.match(browser, /TBLiveQR/);
assert.match(await read('public/js/grabble-transport.js'), /v:\s*1/);
assert.match(await read('public/js/grabble-transport.js'), /snapshot/);
assert.match(server, /setAlarm|alarm\(/);
assert.match(server, /storage\.get|storage\.put/);
assert.match(server, /seq/);

const display = await read('public/surfaces/display.html');
const tv = await read('public/surfaces/tv.html');
assert.notEqual(display, tv);
const css = await read('public/css/grabble.css');
assert.match(css, /setup-modal-tv[\s\S]*100dvh/);
assert.match(css, /setup-modal-tv[\s\S]*overflow:hidden/);
assert.match(css, /setup-modal-tv[\s\S]*setup-footer/);
assert.match(css, /TBLive 1\.37 TV create density/);
assert.match(css, /aspect-ratio:auto!important/);
console.log('TBLive 1.37 static surface and monolith-boundary conformance passed');