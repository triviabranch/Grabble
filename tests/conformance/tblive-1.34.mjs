import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(file, 'utf8');
const room = await read('src/room.js');
const worker = await read('src/worker.js');
const transport = await read('public/js/grabble-transport.js');
const admin = await read('src/admin.js');
const adminClient = await read('public/js/grabble-admin.js');
const workflow = await read('.github/workflows/tblive-conformance.yml');
const capabilities = JSON.parse(await read('tblive.capabilities.json'));

assert.equal(capabilities.contractVersion, '1.34');
assert.equal(capabilities.capabilities.hostlessTv, true);
assert.equal(capabilities.capabilities.tvCreatesRoom, true);
for (const event of ['hello', 'authenticated', 'snapshot', 'state_changed', 'phase_changed', 'player_joined', 'player_left', 'timer_started', 'timer_updated', 'score_updated', 'finished', 'room_closed']) {
  assert.match(room, new RegExp(`['"]${event}['"]`), `missing protocol event ${event}`);
}
assert.match(room, /type, payload/, 'events must use their named type, not a generic event wrapper');
assert.match(room, /requestId/, 'actions must be correlated');
assert.match(room, /MALFORMED_MESSAGE|INVALID_ACTION|ACTION_NOT_ALLOWED/, 'invalid actions must return structured errors');
assert.match(room, /reply\([^\n]+['"]ack['"]/, 'valid actions must return acknowledgements');
assert.match(room, /displayToken/, 'display role must have a dedicated room token');
assert.match(room, /setAlarm|alarm\(/, 'room lifecycle must use Durable Object alarms');
assert.match(room, /deleteAlarm/, 'closed rooms must clear their alarm');
assert.match(room, /double-word|triple-word/, 'word bonuses must affect scoring');
assert.match(transport, /seq > lastSeq \+ 1/, 'clients must request a snapshot after a sequence gap');
assert.match(transport, /displayToken/, 'display token must be supplied by the client transport');
assert.doesNotMatch(admin + worker, /heartbeat|lastHeartbeat|lastSeen/, 'registry must not use heartbeat-shaped fields');
assert.doesNotMatch(adminClient, /lastSeen/, 'admin UI must not depend on heartbeat-shaped fields');
assert.match(admin, /u\.pathname === ['"]\/register['"]/, 'registry registration must be create-time registration');
assert.match(room, /\/unregister\//, 'room closure must unregister the room');
assert.doesNotMatch(transport, /setInterval\([^)]*fetch|setInterval\([^)]*api/, 'transport must not poll server state');
assert.match(workflow, /browser-flow/, 'CI must run the hostless browser flow');
console.log('TBLive 1.34 protocol and release-gate conformance passed');
