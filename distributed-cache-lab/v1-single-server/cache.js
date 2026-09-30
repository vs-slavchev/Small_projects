/*
 * v1 · Single server
 *
 * One cache server, S1, holds every key. The client sends everything to S1.
 * This is the baseline every later version is compared against.
 */
(function () {
  const TIMEOUT_MS = 50; // client gives up if no reply arrives within this time (5 message trips)

  LAB.versions.push({
    id: 'v1',
    folder: 'v1-single-server',
    title: 'Single server',
    idea: 'One server holds every key. The client sends every request to it.',
    changed: 'Starting point.',
    nodes: ['S1'],

    // ---- node ----------------------------------------------------------

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

    // ---- client --------------------------------------------------------

    initClient(client) {
      client.server = 'S1'; // the only place to send anything
      client.timers = {}; // req -> timeout timer id
    },

    clientLines(client) {
      return ['sends everything to ' + client.server];
    },

    onClientOp(client, op, net) {
      const type = op.do === 'put' ? 'PUT' : 'GET';
      net.send(client.server, { type, req: op.req, key: op.key, value: op.value });
      client.timers[op.req] = net.timer(TIMEOUT_MS, { type: 'TIMEOUT', req: op.req, key: op.key });
      net.say(`sends it to ${client.server}, the only server`);
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
  });
})();
