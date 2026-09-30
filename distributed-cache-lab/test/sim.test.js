// Run with: node --test   (from the distributed-cache-lab folder)
const test = require('node:test');
const assert = require('node:assert');

require('../shared/sim.js');
require('../shared/scenarios.js');
require('../v1-single-server/cache.js');
require('../v2-modulo-sharding/cache.js');

const version = (id) => LAB.versions.find((v) => v.id === id);
const scenario = (id) => LAB.scenarios.find((s) => s.id === id);
const kinds = (r) => r.outcomes.map((o) => `${o.do} ${o.key} ${o.kind}`);

test('every run is deterministic and ends with nothing in flight', () => {
  for (const v of LAB.versions) {
    for (const s of LAB.scenarios) {
      const a = LAB.run(v, s);
      const b = LAB.run(v, s);
      assert.deepStrictEqual(a, b, `${v.id} ${s.id}`);
      if (a.supported) assert.strictEqual(a.steps.at(-1).inFlight.length, 0, `${v.id} ${s.id}`);
    }
  }
});

test('happy paths are clean on every version', () => {
  for (const v of LAB.versions) {
    for (const id of ['put-get', 'overwrite']) {
      const r = LAB.run(v, scenario(id));
      assert.ok(r.outcomes.every((o) => o.kind === 'ok'), `${v.id} ${id}: ${kinds(r)}`);
    }
  }
  assert.strictEqual(LAB.run(version('v1'), scenario('overwrite')).outcomes.at(-1).value, '2 books');
});

test('v1: a crash makes everything unavailable, then everything is lost', () => {
  const r = LAB.run(version('v1'), scenario('crash'));
  assert.deepStrictEqual(kinds(r).slice(3), [
    'get user:1 unavailable',
    'get user:2 unavailable',
    'get user:3 unavailable',
    'get user:1 lost',
    'get user:2 lost',
    'get user:3 lost',
  ]);
});

test('v1 cannot add nodes', () => {
  assert.strictEqual(LAB.run(version('v1'), scenario('add-server')).supported, false);
});

test('v2: a crash only affects the keys that live on the crashed node', () => {
  const r = LAB.run(version('v2'), scenario('crash'));
  const bad = r.outcomes.filter((o) => o.kind !== 'ok').map((o) => `${o.key} ${o.kind}`);
  assert.deepStrictEqual(bad, ['user:2 unavailable', 'user:2 lost']);
});

test('v2: adding a node turns most keys into misses', () => {
  const r = LAB.run(version('v2'), scenario('add-server'));
  const gets = r.outcomes.filter((o) => o.do === 'get').map((o) => `${o.key} ${o.kind}`);
  assert.deepStrictEqual(gets, ['item:1 lost', 'item:3 ok', 'item:4 lost', 'item:5 lost']);
  const moved = parseFloat(version('v2').facts[0].value);
  assert.ok(moved > 70 && moved < 80, `moved ${moved}%`);
});

test('the checker flags a stale read', () => {
  // A deliberately broken version: the node ignores overwrites.
  const broken = {
    ...version('v1'),
    onNodeMessage(node, msg, net) {
      if (msg.type === 'PUT' && msg.key in node.store) {
        net.send(msg.from, { type: 'PUT_OK', req: msg.req, key: msg.key });
        return;
      }
      version('v1').onNodeMessage(node, msg, net);
    },
  };
  const r = LAB.run(broken, scenario('overwrite'));
  assert.strictEqual(r.outcomes.at(-1).kind, 'stale');
});

test('snapshots record what clients were promised', () => {
  const grow = LAB.run(version('v2'), scenario('add-server')).steps.at(-1);
  assert.deepStrictEqual(grow.promised, { 'item:1': 'lamp', 'item:3': 'desk', 'item:4': 'chair', 'item:5': 'rug' });

  const crash = LAB.run(version('v1'), scenario('crash')).steps.at(-1);
  assert.deepStrictEqual(Object.keys(crash.promised), ['user:1', 'user:2', 'user:3']);
  assert.deepStrictEqual(crash.nodes[0].store, {}); // promised, but held nowhere
});
