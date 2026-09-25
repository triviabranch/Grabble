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
  assert.doesNotMatch(html, /<script>(?!\s*<\/script>)/i, `${file} must not contain an inline application`);
}

const worker = await read('src/index.js');
const wrangler = await read('wrangler.toml');
assert.doesNotMatch(worker, /const CSS=`|const CLIENT=`|function page\(/, 'Worker must not contain the presentation monolith');
assert.match(worker, /p\.length===2\)return serveSurface\(env,request,p\[0\]\)/, 'Worker must route canonical room surfaces only with a room code');
assert.match(worker, /p\.length===0\)return serveSurface\(env,request,'home'\)/, 'Worker must route the explicit home surface');
assert.doesNotMatch(worker, /return serveSurface\(env,request,'play'\)\}\};/, 'Worker must not fall back unknown paths to the player surface');
assert.match(worker, /env\.ASSETS\.fetch/, 'Worker must serve static surface assets');
assert.match(wrangler, /binding\s*=\s*"ASSETS"/, 'Wrangler must expose the ASSETS binding used by the Worker');
assert.match(worker, /p\[2\]==='rooms'/, 'Worker must expose the TBLive room registry contract');
assert.match(worker, /p\[2\]==='games'/, 'Worker must expose the registered games contract');
assert.match(worker, /kill-all/, 'Worker must expose the global kill-all contract');

const client = await read('public/js/grabble-client.js');
assert.match(client, /pathParts=location\.pathname\.split/, 'Client must derive its surface from the canonical path');
assert.doesNotMatch(client, /G_MODE|G_CODE/, 'Client must not depend on Worker-injected mode globals');
assert.match(client, /hostlessTv:true/, 'Grabble must declare hostless TV capability');

const display = await read('public/surfaces/display.html');
const tv = await read('public/surfaces/tv.html');
assert.notEqual(display, tv, 'Display and TV must remain distinct surface shells');

console.log('TBLive static surface conformance passed');
