import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const surfaces = ['play', 'host', 'display', 'tv', 'admin'];
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
assert.doesNotMatch(worker, /const CSS=`|const CLIENT=`|function page\(/, 'Worker must not contain the presentation monolith');
assert.match(worker, /serveSurface\(env,request,'display'\)/, 'Worker must route the canonical display surface');
assert.match(worker, /serveSurface\(env,request,'tv'\)/, 'Worker must route the canonical TV surface');
assert.match(worker, /env\.ASSETS\.fetch/, 'Worker must serve static surface assets');

const client = await read('public/js/grabble-client.js');
assert.match(client, /pathParts=location\.pathname\.split/, 'Client must derive its surface from the canonical path');
assert.doesNotMatch(client, /G_MODE|G_CODE/, 'Client must not depend on Worker-injected mode globals');
assert.match(client, /hostlessTv:true/, 'Grabble must declare hostless TV capability');

const display = await read('public/surfaces/display.html');
const tv = await read('public/surfaces/tv.html');
assert.notEqual(display, tv, 'Display and TV must remain distinct surface shells');

console.log('TBLive static surface conformance passed');