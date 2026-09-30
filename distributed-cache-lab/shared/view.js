/*
 * Rendering. Draws a precomputed run (see sim.js) one step at a time:
 * clients on top, nodes below, messages in flight on the wires between them,
 * and a log of every event so far. Knows nothing about caching either; the
 * version supplies any extra text through clientLines / nodeLines / entryNote.
 */
(function () {
  const LAB = globalThis.LAB;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const show = (v) => (v === undefined ? '' : JSON.stringify(v));

  // How each request outcome is labelled and coloured.
  function outcomeLabel(o) {
    if (o.kind === 'ok') return { text: o.do === 'put' ? 'acked' : 'hit', tone: 'ok' };
    if (o.kind === 'miss') return { text: 'miss', tone: 'neutral' };
    if (o.kind === 'lost') return { text: 'value lost', tone: 'warn' };
    if (o.kind === 'unavailable') return { text: 'unavailable', tone: 'warn' };
    if (o.kind === 'failed') return { text: 'write failed', tone: 'warn' };
    return { text: 'stale read', tone: 'bad' };
  }

  function badge(text, tone) {
    return `<span class="badge tone-${tone}">${esc(text)}</span>`;
  }

  function summaryBadges(outcomes) {
    const counts = new Map();
    for (const o of outcomes) {
      const l = outcomeLabel(o);
      const key = l.text;
      if (!counts.has(key)) counts.set(key, { ...l, n: 0 });
      counts.get(key).n++;
    }
    const order = ['acked', 'hit', 'miss', 'unavailable', 'write failed', 'value lost', 'stale read'];
    return [...counts.values()]
      .sort((a, b) => order.indexOf(a.text) - order.indexOf(b.text))
      .map((c) => badge(`${c.n} ${c.text}`, c.tone))
      .join(' ');
  }

  // ---- cards -------------------------------------------------------------

  function clientCard(version, c, snap) {
    const lines = version.clientLines ? version.clientLines(c, snap) : [];
    const pending = c.pending.length
      ? `<ul class="pending">${c.pending
          .map((p) => `<li><span class="req">#r${p.req}</span> ${p.do.toUpperCase()} ${esc(p.key)}${p.do === 'put' ? ' = ' + esc(show(p.value)) : ''}</li>`)
          .join('')}</ul>`
      : '<p class="quiet">nothing</p>';
    return `<article class="card client${snap.actor === c.name ? ' is-active' : ''}" data-actor="${esc(c.name)}">
      <header><span class="name">${esc(c.name)}</span><span class="role">client</span></header>
      ${lines.map((l) => `<p class="meta">${esc(l)}</p>`).join('')}
      <p class="sub">waiting for a reply</p>${pending}
    </article>`;
  }

  function nodeCard(version, n, snap, prev) {
    const before = prev && prev.nodes.find((p) => p.name === n.name);
    const keys = Object.keys(n.store || {});
    const lines = version.nodeLines ? version.nodeLines(n, snap) : [];
    let body;
    if (!n.up) body = '<p class="empty">down, memory wiped</p>';
    else if (!keys.length) body = '<p class="empty">empty</p>';
    else {
      body = `<table class="kv"><tbody>${keys
        .map((k) => {
          const old = before && before.up && before.store ? before.store[k] : undefined;
          const cls = old === undefined ? (before ? 'is-new' : '') : old !== n.store[k] ? 'is-changed' : '';
          const note = version.entryNote ? version.entryNote(n, k, snap) : null;
          return `<tr class="${cls}${note ? ' has-note' : ''}"><td class="k">${esc(k)}</td><td class="v">${esc(show(n.store[k]))}${
            note ? `<span class="note">${esc(note)}</span>` : ''
          }</td></tr>`;
        })
        .join('')}</tbody></table>`;
    }
    const status = n.up ? '<span class="pill up">up</span>' : '<span class="pill down">down</span>';
    return `<article class="card node${n.up ? '' : ' is-down'}${snap.actor === n.name ? ' is-active' : ''}" data-actor="${esc(n.name)}">
      <header><span class="name">${esc(n.name)}</span>${status}</header>
      ${lines.map((l) => `<p class="meta">${esc(l)}</p>`).join('')}
      ${body}
    </article>`;
  }

  // ---- wires and message chips ------------------------------------------

  function drawWires(stage, snap) {
    const svg = stage.querySelector('svg.wires');
    const chips = stage.querySelector('.chips');
    const box = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const rect = (name) => {
      const el = stage.querySelector(`[data-actor="${CSS.escape(name)}"]`);
      const r = el.getBoundingClientRect();
      return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: (r.left + r.right) / 2 - box.left };
    };

    const items = snap.inFlight.map((m) => ({ m, state: 'flight' }));
    if (snap.delivered) items.unshift({ m: snap.delivered, state: snap.dropped ? 'dropped' : 'arrived' });

    const seen = {};
    let paths = '';
    let chipHtml = '';
    for (const { m, state } of items) {
      const a = rect(m.from);
      const b = rect(m.to);
      const pair = m.from + '>' + m.to;
      const idx = (seen[pair] = (seen[pair] || 0) + 1) - 1;
      let point;
      let d;
      if (a.b <= b.t || a.t >= b.b) {
        const down = a.b <= b.t;
        const off = down ? -7 : 7; // keeps requests and replies on separate lines
        const x1 = a.cx + off;
        const y1 = down ? a.b : a.t;
        const x2 = b.cx + off;
        const y2 = down ? b.t : b.b;
        d = `M${x1},${y1} L${x2},${y2}`;
        point = (t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
      } else {
        // Same row: curve underneath the cards.
        const x1 = a.cx;
        const x2 = b.cx;
        const y = Math.max(a.b, b.b);
        const cy = y + 56;
        d = `M${x1},${a.b} Q${(x1 + x2) / 2},${cy} ${x2},${b.b}`;
        point = (t) => {
          const u = 1 - t;
          return [u * u * x1 + 2 * u * t * ((x1 + x2) / 2) + t * t * x2, u * u * a.b + 2 * u * t * cy + t * t * b.b];
        };
      }
      let t;
      if (state === 'flight') {
        const progress = Math.min(1, Math.max(0, (snap.time - m.sentAt) / (m.at - m.sentAt)));
        t = Math.max(0.15, 0.4 + 0.3 * progress - 0.16 * idx);
      } else t = 0.88;
      const [x, y] = point(t);
      paths += `<path class="wire ${state}" d="${d}" marker-end="url(#arrow-${state === 'dropped' ? 'dropped' : 'ok'})"/>`;
      chipHtml += `<span class="chip ${state}" style="left:${x}px;top:${y}px">${
        state === 'dropped' ? '<span class="x" aria-hidden="true">✕</span>' : ''
      }${esc(LAB.label(m))}</span>`;
    }
    svg.innerHTML = `<defs>
      <marker id="arrow-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0,0 L10,5 L0,10 z"/></marker>
      <marker id="arrow-dropped" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow dropped" d="M0,0 L10,5 L0,10 z"/></marker>
    </defs>${paths}`;
    chips.innerHTML = chipHtml;

    // Keep chips inside the stage and nudge them up or down until none overlap.
    const placed = [];
    for (const chip of chips.children) {
      const w = chip.offsetWidth;
      const h = chip.offsetHeight;
      const x = Math.min(Math.max(parseFloat(chip.style.left), w / 2 + 4), box.width - w / 2 - 4);
      const y0 = parseFloat(chip.style.top);
      const hits = (y) => placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.y - y) < (p.h + h) / 2 + 3);
      let y = y0;
      for (let k = 1; hits(y) && k < 12; k++) y = y0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (h + 4);
      chip.style.left = x + 'px';
      chip.style.top = y + 'px';
      placed.push({ x, y, w, h });
    }
  }

  // ---- event log ---------------------------------------------------------

  function logItem(s, n, current) {
    const o = s.outcome ? outcomeLabel(s.outcome) : null;
    return `<li class="ev ev-${s.kind}${current ? ' is-current' : ''}">
      <span class="t">${n}</span>
      <div class="body">
        <p class="title">${esc(s.title)}</p>
        ${s.lines.map((l) => `<p class="line">${esc(l)}</p>`).join('')}
        ${s.outcome ? `<p class="outcome">${badge(o.text, o.tone)} <span>${esc(s.outcome.text)}</span></p>` : ''}
      </div>
    </li>`;
  }

  // ---- version page --------------------------------------------------------

  let keyHandler = null;
  document.addEventListener('keydown', (e) => {
    if (keyHandler && (e.key === 'ArrowRight' || e.key === 'n') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      keyHandler();
    }
  });

  let resizeObserver = null;

  function renderVersion(root, version, scenarioId) {
    const scenario = LAB.scenarios.find((s) => s.id === scenarioId) || LAB.scenarios[0];
    const result = LAB.run(version, scenario);
    const index = LAB.versions.indexOf(version);
    const prevVersion = LAB.versions[index - 1];

    const facts = (version.facts || [])
      .map((f) => `<li><span class="fact-value">${esc(f.value)}</span><span class="fact-label">${esc(f.label)}<small>${esc(f.note || '')}</small></span></li>`)
      .join('');

    root.innerHTML = `
      <section class="version">
        <header class="v-head">
          <p class="eyebrow">${esc(version.id)} · ${prevVersion ? 'copy of ' + esc(prevVersion.id) + ' plus one change' : 'the baseline'}</p>
          <h1>${esc(version.title)}</h1>
          <p class="idea">${esc(version.idea)}</p>
          ${prevVersion ? `<p class="changed"><strong>Changed from ${esc(prevVersion.id)}:</strong> ${esc(version.changed)}</p>` : ''}
          ${facts ? `<ul class="facts">${facts}</ul>` : ''}
        </header>

        <nav class="scenario-tabs" aria-label="Scenarios">
          ${LAB.scenarios
            .map(
              (s) => `<a href="#${esc(version.id)}-${esc(s.id)}" class="${s === scenario ? 'is-selected' : ''}"${
                s === scenario ? ' aria-current="page"' : ''
              }>${esc(s.title)}</a>`
            )
            .join('')}
        </nav>

        <div class="brief">
          <p class="lesson">${esc(scenario.lesson)}</p>
          <p class="watch"><span class="label">Watch for</span> ${esc(scenario.watch)}</p>
        </div>

        <div class="run" id="run"></div>
      </section>`;

    const runEl = root.querySelector('#run');
    if (!result.supported) {
      keyHandler = null;
      runEl.innerHTML = `<div class="na"><p class="na-title">Not applicable to ${esc(version.id)}</p><p>${esc(result.reason)}</p></div>`;
      return;
    }

    runEl.innerHTML = `
      <div class="controls">
        <button type="button" id="next" class="next">Next event</button>
        <span class="counter" id="counter"></span>
      </div>
      <div class="done" id="done" hidden></div>
      <div class="layout">
        <div class="stage" id="stage">
          <svg class="wires" aria-hidden="true"></svg>
          <div class="tier">
            <p class="tier-label">Clients</p>
            <div class="row row-clients" id="clients"></div>
          </div>
          <div class="tier">
            <p class="tier-label">Cache servers</p>
            <div class="row row-nodes" id="nodes"></div>
          </div>
          <div class="chips" aria-hidden="true"></div>
        </div>
        <section class="log-panel" aria-label="Event log">
          <h2>Events</h2>
          <ol class="log" id="log"></ol>
        </section>
      </div>`;

    const last = result.steps.length - 1;
    let i = 0;
    const stage = runEl.querySelector('#stage');
    const nextBtn = runEl.querySelector('#next');

    function paint() {
      const snap = result.steps[i];
      const prev = result.steps[i - 1];
      runEl.querySelector('#clients').innerHTML = snap.clients.map((c) => clientCard(version, c, snap)).join('');
      runEl.querySelector('#nodes').innerHTML = snap.nodes.map((n) => nodeCard(version, n, snap, prev)).join('');
      drawWires(stage, snap);
      runEl.querySelector('#counter').textContent = i === 0 ? `${last} events ahead` : `Event ${i} of ${last}`;
      const log = runEl.querySelector('#log');
      log.innerHTML =
        i === 0
          ? '<li class="ev ev-start is-current"><span class="t">0</span><div class="body"><p class="title">Nothing has happened yet.</p><p class="line">Press Next event, or the → key.</p></div></li>'
          : result.steps
              .slice(1, i + 1)
              .map((s, k) => logItem(s, k + 1, k === i - 1))
              .join('');
      log.scrollTop = log.scrollHeight; // newest event is at the bottom
      const done = runEl.querySelector('#done');
      done.hidden = i !== last;
      if (i === last) {
        done.innerHTML = `<p><strong>Scenario finished.</strong> ${result.messagesSent} messages sent.</p><p class="summary">${summaryBadges(result.outcomes)}</p>`;
      }
      nextBtn.textContent = i === last ? 'Start over' : 'Next event';
    }

    function next() {
      i = i === last ? 0 : i + 1;
      paint();
    }

    nextBtn.addEventListener('click', next);
    keyHandler = next;
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => drawWires(stage, result.steps[i]));
    resizeObserver.observe(stage);
    paint();
  }

  // ---- overview --------------------------------------------------------------

  function renderOverview(root, ladder) {
    const built = LAB.versions;
    const ladderHtml = ladder
      .map((v) => {
        const version = built.find((b) => b.id === v.id);
        return `<li class="${version ? 'is-built' : 'is-planned'}">
          <span class="vid">${esc(v.id)}</span>
          <div>
            <p class="v-title">${version ? `<a href="#${esc(v.id)}">${esc(v.title)}</a>` : esc(v.title)}</p>
            <p class="v-idea">${esc(v.idea)}</p>
          </div>
          <span class="status">${version ? 'built' : 'planned'}</span>
        </li>`;
      })
      .join('');

    const head = built.map((v) => `<th scope="col"><a href="#${esc(v.id)}">${esc(v.id)}</a><span>${esc(v.title)}</span></th>`).join('');
    const rows = LAB.scenarios
      .map((s) => {
        const cells = built
          .map((v) => {
            const r = LAB.run(v, s);
            if (!r.supported) return `<td class="is-na"><span class="na-cell">n/a</span></td>`;
            return `<td><a class="cell" href="#${esc(v.id)}-${esc(s.id)}"><span class="badges">${summaryBadges(r.outcomes)}</span><span class="cost">${
              r.steps.length - 1
            } events · ${r.messagesSent} messages</span></a></td>`;
          })
          .join('');
        return `<tr><th scope="row"><span class="s-title">${esc(s.title)}</span><span class="s-lesson">${esc(s.lesson)}</span></th>${cells}</tr>`;
      })
      .join('');

    keyHandler = null;
    root.innerHTML = `
      <section class="overview">
        <header class="o-head">
          <h1>Cache Lab</h1>
          <p class="idea">A distributed cache, built one idea at a time. Every version runs the same planned scenarios in a
          simulated network, one event per click, so you can see what each design choice does and what it costs.</p>
          <ol class="how">
            <li>Pick a version and a scenario.</li>
            <li>Before stepping, guess what will happen.</li>
            <li>Press <kbd>Next event</kbd> (or <kbd>→</kbd>) to move one event forward.</li>
          </ol>
          <p class="model">Model: clients (C1, C2, …) talk to cache servers (S1, S2, …). Every message takes the same time
          to arrive, and a client gives up if no reply comes back in time. A crashed server loses its memory.
          Nothing is random, so a run always plays out the same way.</p>
        </header>

        <h2>Compare</h2>
        <p class="section-note">Each cell is one full run of a scenario on a version. Open a cell to step through it.</p>
        <div class="table-wrap">
          <table class="matrix">
            <thead><tr><th scope="col">Scenario</th>${head}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <h2>Versions</h2>
        <p class="section-note">Each version is a copy of an earlier one with a single new idea.</p>
        <ol class="ladder">${ladderHtml}</ol>
      </section>`;
  }

  LAB.view = { renderVersion, renderOverview };
})();
