import assert from 'node:assert/strict';
import { GrabbleRoom } from '../../src/room.js';

let writes = 0;
let stored = null;
const state = {
  storage: {
    async get() { return stored; },
    async put(key, value) { writes++; stored = value; },
    async deleteAlarm() {},
    setAlarm() {},
  },
};
const room = new GrabbleRoom(state, {});
await room.init(new Request('https://room/init', {
  method: 'POST',
  body: JSON.stringify({
    code: 'TEST',
    mode: 'single',
    controlToken: 'control',
    displayToken: 'display',
  }),
}));
const afterInit = writes;
room.clients.set('player', { send() {} });
room.data.players = [{ id: 'player', name: 'Ash', word: '', wordTiles: [], score: 0, totalScore: 0 }];
room.data.ownerId = 'player';

for (let i = 0; i < 25; i++) await room.broadcastSnapshot(false);
assert.equal(writes, afterInit, 'snapshots used for transport must not write storage');

await room.start();
assert.equal(writes, afterInit + 1, 'a meaningful lifecycle transition must persist once');

for (let i = 0; i < 25; i++) await room.broadcastSnapshot(false);
assert.equal(writes, afterInit + 1, 'repeated transport snapshots must remain write-free');

console.log('TBLive 1.34 bounded-write room-flow conformance passed');
