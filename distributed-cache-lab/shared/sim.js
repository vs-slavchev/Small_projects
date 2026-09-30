/*
 * Simulation harness.
 *
 * Runs one scenario against one version and records every event as a step:
 * a client starting a request, a message arriving, a timer firing, a node
 * crashing. The harness knows nothing about caching. Nodes and clients get
 * all their behaviour from the version's cache.js.
 *
 * Everything is deterministic: every message takes exactly LATENCY_MS to
 * arrive and there is no randomness, so a scenario always plays out the same.
 */
(function () {
  const LAB = (globalThis.LAB = globalThis.LAB || { versions: [], scenarios: [] });

  const LATENCY_MS = 10; // every message takes this long to arrive
  const OP_GAP_MS = 10; // pause before the next scenario op once the network is quiet
  const MAX_STEPS = 400;

  const clone = (x) => JSON.parse(JSON.stringify(x));

  function label(m) {
    let s = m.type;
    if (m.key !== undefined) s += ' ' + m.key;
    if (m.value !== undefined) s += ' = ' + JSON.stringify(m.value);
    return s;
  }

  function unsupportedReason(version, scenario) {
    if (scenario.ops.some((op) => op.do === 'addNode') && !version.onAddNode) {
      return 'This version has a fixed set of nodes, so there is no way to add one.';
    }
    return null;
  }

  function run(version, scenario) {
    const reason = unsupportedReason(version, scenario);
    if (reason) return { supported: false, reason };

    const w = {
      time: 0,
      nodes: {},
      clients: {},
      queue: [], // messages in flight and pending timers
      seq: 0,
      messagesSent: 0,
      reqSeq: 0,
      open: {}, // req -> request the client has not finished yet
      puts: {}, // key -> [{ value, seq }] every put ever started, for the stale check
      acked: {}, // key -> { value, seq } last acknowledged put
      outcomes: [],
    };
    const steps = [];
    let step = null;

    function newStep(kind, actor, title) {
      step = { kind, actor, title, lines: [], outcome: null, delivered: null, dropped: false };
    }

    function createNode(name) {
      const node = { name, up: true };
      version.initNode(node);
      w.nodes[name] = node;
    }

    function createClient(name) {
      const client = { name };
      version.initClient(client, Object.keys(w.nodes));
      w.clients[name] = client;
    }

    // The only way version code talks to the world.
    function netFor(actor) {
      return {
        now: () => w.time,
        send(to, msg) {
          w.messagesSent++;
          w.queue.push({ ...msg, id: ++w.seq, from: actor.name, to, sentAt: w.time, at: w.time + LATENCY_MS });
        },
        timer(ms, msg) {
          const t = { ...msg, id: ++w.seq, timer: true, from: actor.name, to: actor.name, sentAt: w.time, at: w.time + ms };
          w.queue.push(t);
          return t.id;
        },
        cancel(id) {
          w.queue = w.queue.filter((m) => m.id !== id);
        },
        say(text) {
          step.lines.push(text);
        },
        done(req, result) {
          finish(req, result);
        },
      };
    }

    // Judges a finished request against what the client was promised earlier.
    function finish(req, result) {
      const r = w.open[req];
      if (!r) return;
      delete w.open[req];
      let kind;
      let text;
      let value = r.value;
      if (r.do === 'put') {
        if (result.ok) {
          w.acked[r.key] = { value: r.value, seq: r.req };
          kind = 'ok';
          text = `PUT ${r.key} acknowledged`;
        } else {
          kind = 'failed';
          text = `PUT ${r.key} failed: ${result.error}`;
        }
      } else if (result.error) {
        kind = 'unavailable';
        text = `GET ${r.key} failed: ${result.error}`;
      } else if (result.value === undefined) {
        value = undefined;
        if (r.expected) {
          kind = 'lost';
          text = `GET ${r.key} missed, but ${JSON.stringify(r.expected.value)} was acknowledged earlier`;
        } else {
          kind = 'miss';
          text = `GET ${r.key} missed (never written)`;
        }
      } else {
        value = result.value;
        const minSeq = r.expected ? r.expected.seq : 0;
        const fresh = (w.puts[r.key] || []).some((p) => p.value === result.value && p.seq >= minSeq);
        kind = fresh ? 'ok' : 'stale';
        text = fresh
          ? `GET ${r.key} returned ${JSON.stringify(result.value)}`
          : `GET ${r.key} returned ${JSON.stringify(result.value)}, but ${JSON.stringify(r.expected.value)} was acknowledged earlier`;
      }
      const outcome = { req: r.req, client: r.client, do: r.do, key: r.key, value, kind, text, time: w.time };
      w.outcomes.push(outcome);
      step.outcome = outcome;
    }

    function doOp(op) {
      if (op.do === 'put' || op.do === 'get') {
        const client = w.clients[op.client || 'c1'];
        const req = ++w.reqSeq;
        w.open[req] = { req, client: client.name, do: op.do, key: op.key, value: op.value, expected: w.acked[op.key] };
        if (op.do === 'put') (w.puts[op.key] = w.puts[op.key] || []).push({ value: op.value, seq: req });
        const what = op.do === 'put' ? `PUT ${op.key} = ${JSON.stringify(op.value)}` : `GET ${op.key}`;
        newStep('op', client.name, `${client.name} starts ${what} (#r${req})`);
        version.onClientOp(client, { req, do: op.do, key: op.key, value: op.value }, netFor(client));
      } else if (op.do === 'crash') {
        const node = w.nodes[op.node];
        newStep('fault', node.name, `${node.name} crashes. Everything in its memory is gone.`);
        node.up = false;
        for (const k of Object.keys(node)) if (k !== 'name' && k !== 'up') delete node[k];
        version.initNode(node);
        w.queue = w.queue.filter((m) => !(m.timer && m.to === node.name));
      } else if (op.do === 'restart') {
        const node = w.nodes[op.node];
        newStep('fault', node.name, `${node.name} restarts with empty memory`);
        node.up = true;
      } else if (op.do === 'addNode') {
        newStep('topology', op.node, `Node ${op.node} joins the cluster`);
        createNode(op.node);
        version.onAddNode(op.node, Object.values(w.clients), netFor({ name: op.node }));
      } else {
        throw new Error('Unknown scenario op: ' + op.do);
      }
    }

    function deliver(m) {
      if (m.timer) {
        newStep('timer', m.to, `${m.to}: ${m.type} timer${m.req ? ' for #r' + m.req : ''} fires`);
        version.onClientMessage(w.clients[m.to], m, netFor(w.clients[m.to]));
        return;
      }
      const node = w.nodes[m.to];
      if (node && !node.up) {
        newStep('drop', m.to, `${label(m)} from ${m.from} is lost: ${m.to} is down`);
        step.delivered = clone(m);
        step.dropped = true;
        return;
      }
      newStep('deliver', m.to, `${m.to} receives ${label(m)} from ${m.from}`);
      step.delivered = clone(m);
      if (node) version.onNodeMessage(node, m, netFor(node));
      else version.onClientMessage(w.clients[m.to], m, netFor(w.clients[m.to]));
    }

    function snapshot() {
      return {
        ...step,
        time: w.time,
        nodes: Object.values(w.nodes).map(clone),
        clients: Object.values(w.clients).map((c) => ({
          ...clone(c),
          pending: Object.values(w.open)
            .filter((r) => r.client === c.name)
            .map((r) => ({ req: r.req, do: r.do, key: r.key, value: r.value })),
        })),
        inFlight: w.queue
          .filter((m) => !m.timer)
          .sort((a, b) => a.at - b.at || a.id - b.id)
          .map(clone),
      };
    }

    for (const name of version.nodes) createNode(name);
    const clientNames = [...new Set(scenario.ops.filter((op) => op.do === 'put' || op.do === 'get').map((op) => op.client || 'c1'))];
    for (const name of clientNames) createClient(name);

    newStep('start', null, 'Start. Nothing has happened yet.');
    steps.push(snapshot());

    let opIndex = 0;
    let lastOpTime = 0;
    function nextOpTime() {
      const op = scenario.ops[opIndex];
      if (!op) return Infinity;
      if (op.after !== undefined) return Math.max(w.time, lastOpTime + op.after);
      if (w.queue.length) return Infinity; // wait until the network is quiet
      return w.time + (opIndex === 0 ? 0 : OP_GAP_MS);
    }

    while (steps.length < MAX_STEPS) {
      const tOp = nextOpTime();
      let next = null;
      for (const m of w.queue) if (!next || m.at < next.at || (m.at === next.at && m.id < next.id)) next = m;
      const tMsg = next ? next.at : Infinity;
      if (tOp === Infinity && tMsg === Infinity) break;
      if (tMsg <= tOp) {
        w.queue = w.queue.filter((m) => m !== next);
        w.time = next.at;
        deliver(next);
      } else {
        w.time = tOp;
        lastOpTime = tOp;
        doOp(scenario.ops[opIndex++]);
      }
      steps.push(snapshot());
    }

    return { supported: true, steps, outcomes: w.outcomes, messagesSent: w.messagesSent };
  }

  LAB.run = run;
  LAB.label = label;
  LAB.LATENCY_MS = LATENCY_MS;
})();
