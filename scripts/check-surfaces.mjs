import fs from 'node:fs';

const shells = [
  ['home', 'public/surfaces/home.html'],
  ['play', 'public/surfaces/play.html'],
  ['host', 'public/surfaces/host.html'],
  ['display', 'public/surfaces/display.html'],
  ['tv', 'public/surfaces/tv.html'],
  ['admin', 'public/surfaces/admin.html']
];

for (const [name, file] of shells) {
  const html = fs.readFileSync(file, 'utf8');
  if (!/^<!doctype html>/i.test(html)) throw new Error(name + ': missing doctype');
  if (/<script>(?!\s*<\/script>)/i.test(html)) throw new Error(name + ': inline application script remains');
  if (!html.includes('/js/grabble-client.js')) throw new Error(name + ': shared client missing');
  if (!html.includes('/js/grabble-transport.js')) throw new Error(name + ': shared transport missing');
  if (!html.includes('/js/grabble-create.js')) throw new Error(name + ': shared create controller missing');
  if (!html.includes('/js/grabble-admin.js')) throw new Error(name + ': shared admin controller missing');
  if (!html.includes('/js/grabble-player.js')) throw new Error(name + ': shared player controller missing');
  if (name === 'tv' && !html.includes('/js/tv.js')) throw new Error('tv: dedicated surface adapter missing');
}

const client = fs.readFileSync('public/js/grabble-client.js', 'utf8');
const index = fs.readFileSync('src/index.js', 'utf8');
const worker = fs.readFileSync('src/worker.js', 'utf8');
const create = fs.readFileSync('public/js/grabble-create.js', 'utf8');
const transport = fs.readFileSync('public/js/grabble-transport.js', 'utf8');
const admin = fs.readFileSync('public/js/grabble-admin.js', 'utf8');
const player = fs.readFileSync('public/js/grabble-player.js', 'utf8');
new Function(client);
new Function(create);
new Function(transport);
new Function(admin);
new Function(player);
if (index.length > 1000) throw new Error('Worker entrypoint must remain a thin adapter');
if (!worker.includes("import { registryCall } from './shared.js';")) throw new Error('Worker router must import shared registry helpers');
for (const required of ['GrabbleCreate', 'tvHome', 'openCreateFlow']) {
  if (!create.includes(required)) throw new Error('create controller: missing ' + required);
}
if (!/tvEntryPhase\s*=\s*["']idle["']/.test(client)) throw new Error('client: missing idle TV entry phase');
if (!/tv-back/.test(client)) throw new Error('client: missing TV back control');
if (!/window\.GrabbleCreate/.test(client)) throw new Error('client: missing shared create controller');
for (const forbidden of ["create('competition').then(x=>location.href='/tv/'", "<small>'+({play:'PLAYER',display:'DISPLAY',tv:'TV'"]) {
  if (client.includes(forbidden)) throw new Error('tv: legacy hostless path remains: ' + forbidden);
}

const tvAdapter = fs.readFileSync('public/js/tv.js', 'utf8');
new Function(tvAdapter);
console.log('Grabble TBLive surface conformance valid');
