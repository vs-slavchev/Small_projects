/*
 * v2 · Modulo sharding
 *
 * Copy of v1 with one change: three servers instead of one, and the client
 * picks the server for each key with hash(key) % number_of_servers.
 * The servers themselves are unchanged and don't know about each other.
 */
(function () {
  const TIMEOUT_MS = 50; // client gives up if no reply arrives within this time (5 message trips)

  // FNV-1a, a small, well-spread string hash.
  function hash(key) {
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  function owner(nodes, key) {
    return nodes[hash(key) % nodes.length];
  }

  // Share of keys whose server changes when the cluster grows from 3 to 4 servers.
  function keysMovedOnGrow() {
    const before = ['S1', 'S2', 'S3'];
    const after = ['S1', 'S2', 'S3', 'S4'];
    const total = 10000;
    let moved = 0;
    for (let i = 0; i < total; i++) if (owner(before, 'key-' + i) !== owner(after, 'key-' + i)) moved++;
    return ((100 * moved) / total).toFixed(1) + '%';
  }

  LAB.versions.push({
    id: 'v2',
    folder: 'v2-modulo-sharding',
    title: 'Modulo sharding',
    idea: 'Three servers share the keys. The client picks the server with hash(key) % 3.',
    changed: 'One server became three. The client now routes each key to one of them.',
    nodes: ['S1', 'S2', 'S3'],
    facts: [{ label: 'Keys that change server when a 4th server joins', value: keysMovedOnGrow(), note: 'measured over 10,000 keys' }],

    // ---- node (unchanged from v1) ----------------------------------------

    initNode(node) {
      node.store = {}; // key -> value, in memory only
    },

    onNodeMessage(node, msg, net) {
      if (msg.type === 'PUT') {
        node.store[msg.key] = msg.value;
        net.send(msg.from, { type: 'PUT_OK', req: msg.req, key: msg.key });
        net.say('stores the value and replies PUT_OK');
      } else if (msg.type === 'GET') {
        if (msg.key in node.store) {
          net.send(msg.from, { type: 'VALUE', req: msg.req, key: msg.key, value: node.store[msg.key] });
          net.say('finds the key and replies with its value');
        } else {
          net.send(msg.from, { type: 'NOT_FOUND', req: msg.req, key: msg.key });
          net.say('does not have the key and replies NOT_FOUND');
        }
      }
    },

    // Marks entries this server still holds but no client will ever ask it for.
    entryNote(node, key, snap) {
      const client = snap.clients[0];
      if (!client) return null;
      const now = owner(client.nodes, key);
      return now === node.name ? null : `orphaned: clients now ask ${now}`;
    },

    // ---- client ----------------------------------------------------------

    initClient(client, nodeNames) {
      client.nodes = nodeNames.slice(); // the client's view of the cluster
      client.timers = {}; // req -> timeout timer id
    },

    clientLines(client) {
      return [`routes by hash(key) % ${client.nodes.length}`, 'servers: ' + client.nodes.join(' ')];
    },

    onClientOp(client, op, net) {
      const type = op.do === 'put' ? 'PUT' : 'GET';
      const n = client.nodes.length;
      const target = owner(client.nodes, op.key);
      net.send(target, { type, req: op.req, key: op.key, value: op.value });
      client.timers[op.req] = net.timer(TIMEOUT_MS, { type: 'TIMEOUT', req: op.req, key: op.key });
      net.say(`hash("${op.key}") % ${n} = ${hash(op.key) % n}, so it goes to ${target}`);
    },

    onClientMessage(client, msg, net) {
      if (msg.type === 'TIMEOUT') {
        delete client.timers[msg.req];
        net.say('no reply in time, so the request fails');
        net.done(msg.req, { error: 'timeout' });
        return;
      }
      if (!(msg.req in client.timers)) {
        net.say('the request already timed out, so the reply is ignored');
        return;
      }
      net.cancel(client.timers[msg.req]);
      delete client.timers[msg.req];
      if (msg.type === 'PUT_OK') net.done(msg.req, { ok: true });
      if (msg.type === 'VALUE') net.done(msg.req, { value: msg.value });
      if (msg.type === 'NOT_FOUND') net.done(msg.req, { value: undefined });
    },

    // ---- cluster change ----------------------------------------------------

    onAddNode(name, clients, net) {
      for (const c of clients) c.nodes.push(name);
      net.say(`every client now routes by hash(key) % ${clients[0].nodes.length}`);
      net.say('no data is moved: keys stay where they were written');
    },
  });
})();
