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
  if (!html.includes('/js/grabble-create.js')) throw new Error(name + ': shared create controller missing');
  if (name === 'tv' && !html.includes('/js/tv.js')) throw new Error('tv: dedicated surface adapter missing');
}

const client = fs.readFileSync('public/js/grabble-client.js', 'utf8');
const create = fs.readFileSync('public/js/grabble-create.js', 'utf8');
new Function(client);
new Function(create);
for (const required of ['GrabbleCreate', 'tvHome', 'openCreateFlow']) {
  if (!create.includes(required)) throw new Error('create controller: missing ' + required);
}
for (const required of ["tvEntryPhase==='idle'", 'tv-back', 'window.GrabbleCreate']) {
  if (!client.includes(required)) throw new Error('client: missing ' + required);
}
for (const forbidden of ["create('competition').then(x=>location.href='/tv/'", "<small>'+({play:'PLAYER',display:'DISPLAY',tv:'TV'"]) {
  if (client.includes(forbidden)) throw new Error('tv: legacy hostless path remains: ' + forbidden);
}

const tvAdapter = fs.readFileSync('public/js/tv.js', 'utf8');
new Function(tvAdapter);
console.log('Grabble TBLive surface conformance valid');
