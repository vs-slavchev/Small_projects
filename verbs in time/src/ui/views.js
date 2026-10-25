// Vues : fonctions pures qui transforment un instantané de l'automate en HTML.
// Chaque vue déclare l'écran auquel elle appartient et peut fournir :
// - theme                   : variable CSS de la couleur du navigateur (par défaut --paper) ;
// - patch(root, snapshot)   : mise à jour ciblée lors d'une transition interne (sans patch, rien n'est redessiné) ;
// - mounted(root, snapshot) : effets après insertion dans le DOM ; peut retourner une fonction de nettoyage,
//                             appelée avant le rendu suivant.

(function (JeuxFr) {
'use strict';

const {
  AppState, AppEvent, Destination, COUNTDOWN_SECONDS, Person, Tense, dayKey, PROGRESS_UNLOCK_GAMES,
  escapeHtml: esc, plural, formatClock, formatSeconds, shortDate, relativeDay, fitFontSize, diffChars, similarity,
  VERDICT_TEXT, trendText, insightText, diagnosisText, achievementStatus, unlockedLabel,
} = JeuxFr;

const TIER_COLORS = Object.freeze({ 0: ['#ECE5D8', '#D6CDBC'], 1: ['#F1D7C2', '#C9946C'], 2: ['#E3E6EA', '#A9B0BA'], 3: ['#F3E1B8', '#D9B86A'] });
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
/** Caractères difficiles à taper sur certains claviers, insérés d'un appui. */
const ACCENT_KEYS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'ë', '’'];

/* ---------- Éléments communs ---------- */

function tabbar(active) {
  const tab = (to, icon, label) =>
    `<button class="tab${active === to ? ' on' : ''}" data-event="${AppEvent.NAVIGATE}" data-to="${to}"><span class="ico">${icon}</span>${label}</button>`;
  return `<nav class="tabbar">${tab(Destination.HOME, '▶', 'Jouer')}${tab(Destination.PROGRESS, '📈', 'Progrès')}${tab(Destination.ACHIEVEMENTS, '🏅', 'Succès')}</nav>`;
}

function topBar(session, now, freshIndex) {
  const answers = session.answers;
  let segments = '';
  for (let i = 0; i < session.length; i++) {
    const a = answers[i];
    const cls = a ? (a.correct ? 'ok' : 'ko') : i === session.position - 1 ? 'cur' : '';
    segments += `<div class="seg ${cls}${i === freshIndex ? ' fresh' : ''}"></div>`;
  }
  return `<div class="bar-row">
    <button class="close" data-event="${AppEvent.QUIT}" aria-label="Quitter la partie">✕</button>
    <div class="segs" style="grid-template-columns:repeat(${session.length},1fr)">${segments}</div>
    <div class="timer" id="timer">${formatClock(session.thinkingTime(now))}</div>
  </div>`;
}

/** Forme conjuguée découpée : chaque morceau (radical, terminaison, auxiliaire…) a sa couleur. */
const segmented = segments => segments
  .map(s => (s.kind === 'space' ? ' ' : `<span class="sg sg-${s.kind}">${esc(s.text)}</span>`)).join('');

/** Légende des couleurs de `segmented`. */
const SEGMENT_LEGEND = `<div class="sg-legend" aria-hidden="true">
  <span class="sg sg-stem">radical</span><span class="sg sg-ending">terminaison</span><span class="sg sg-aux">auxiliaire</span><span class="sg sg-agreement">accord</span>
</div>`;

/** Touches d'accent, insérées dans le champ du même formulaire. */
const accentKeys = disabled => `<div class="keys">${ACCENT_KEYS
  .map(k => `<button type="button" class="key" data-insert="${k}" tabindex="-1"${disabled ? ' disabled' : ''}>${k}</button>`).join('')}</div>`;

/** Bouton qui fait lire une forme à voix haute (masqué si le navigateur ne sait pas parler). */
const speakButton = text => `<button class="speak" data-speak="${esc(text)}" aria-label="Écouter « ${esc(text)} »">🔊</button>`;

/** Rappel de la question : « nous · finir · futur simple ». */
const questionLabel = question =>
  `${esc(question.person.subject)} · ${esc(question.verb.label)} · ${esc(question.tense.label)}`;

const soundLabel = on => (on ? 'Couper le son' : 'Activer le son');

/* ---------- Accueil (avec ou sans compte à rebours) ---------- */

/** Rappel des réglages quand ils restreignent l'entraînement. */
function focusLine({ tenses, types }) {
  const on = list => list.filter(item => item.on);
  if (on(tenses).length === tenses.length && on(types).length === types.length) return '';
  const parts = [
    on(tenses).length < tenses.length && on(tenses).map(t => t.tense.label).join(', '),
    on(types).length < types.length && on(types).map(t => t.type.label).join(', '),
  ].filter(Boolean);
  return `<button class="focus-line" data-event="${AppEvent.NAVIGATE}" data-to="${Destination.SETTINGS}">🎯 ${esc(parts.join(' · '))}</button>`;
}

const countdownFill = remaining => `${((COUNTDOWN_SECONDS - remaining + 1) / COUNTDOWN_SECONDS) * 100}%`;

const home = {
  screen: 'home',
  render({ state, context }) {
    const { streak, playedToday, week } = context.home;
    const days = week.map((d, i) => {
      const cls = ['day', d.played && 'done', d.isToday && `today ${d.played ? '' : 'todo'}`, d.isFuture && 'future'].filter(Boolean).join(' ');
      return `<div class="${cls}"><div class="dot" style="animation-delay:${i * 40}ms">${d.played ? '✓' : d.isToday ? '·' : ''}</div>${WEEKDAYS[i]}</div>`;
    }).join('');
    const message = playedToday
      ? `<div class="streak-msg ok">Série prolongée aujourd'hui.</div>`
      : streak
        ? `<div class="streak-msg">Joue aujourd'hui pour passer à ${streak + 1}.</div>`
        : `<div class="streak-msg">Joue une partie pour lancer ta série.</div>`;
    const startButton = state === AppState.COUNTDOWN
      ? `<div class="start-wrap">
          <button class="big-btn cd press" data-event="${AppEvent.START}">
            <div class="cd-fill"></div>
            <span class="cd-main">Nouvelle partie</span>
            <span class="cd-sub">Démarre dans <b id="cd">${context.countdown}</b> s</span>
          </button>
          <button class="link-btn" data-event="${AppEvent.CANCEL}">Pas maintenant</button>
        </div>`
      : `<button class="big-btn press" data-event="${AppEvent.START}">Nouvelle partie</button>`;
    return `<div class="screen home">
      <div class="top-safe"></div>
      <div class="home-body">
        <div class="home-head">
          <div class="logo">verbes <span>&amp;</span> temps</div>
          <div class="head-right">
            <button class="icon-btn" data-event="${AppEvent.NAVIGATE}" data-to="${Destination.SETTINGS}" aria-label="Réglages : temps et verbes à travailler">⚙️</button>
            <button class="icon-btn" id="sound" data-event="${AppEvent.TOGGLE_SOUND}" aria-label="${soundLabel(context.soundEnabled)}">${context.soundEnabled ? '🔊' : '🔇'}</button>
            <div class="pill"><span>🔥</span>${streak} ${plural(streak, 'jour')}</div>
          </div>
        </div>
        <div class="grow"></div>
        <div class="streak-hero">
          <div class="flame${streak ? '' : ' off'}">🔥</div>
          <div class="streak-num">${streak}</div>
          <div class="streak-lbl">${plural(streak, 'jour')} d'affilée</div>
          ${message}
        </div>
        <div class="week">${days}</div>
        ${focusLine(context.settings)}
        <div class="grow"></div>
        ${startButton}
        <div style="height:4px"></div>
      </div>
      ${tabbar(Destination.HOME)}
    </div>`;
  },
  patch(root, { state, context }) {
    const sound = root.querySelector('#sound');
    if (sound) {
      sound.textContent = context.soundEnabled ? '🔊' : '🔇';
      sound.setAttribute('aria-label', soundLabel(context.soundEnabled));
    }
    if (state === AppState.COUNTDOWN) {
      const n = root.querySelector('#cd');
      const fill = root.querySelector('.cd-fill');
      if (!n || !fill) return;
      if (n.textContent !== String(context.countdown)) {
        n.textContent = context.countdown;
        n.classList.remove('tick');
        void n.offsetWidth; // relance l'animation
        n.classList.add('tick');
      }
      fill.style.width = countdownFill(context.countdown);
    }
  },
  mounted(root, { state, context }) {
    if (state !== AppState.COUNTDOWN) return;
    const fill = root.querySelector('.cd-fill');
    // Deux images plus tard, pour que la transition CSS parte de 0.
    requestAnimationFrame(() => requestAnimationFrame(() => { if (fill) fill.style.width = countdownFill(context.countdown); }));
  },
};

/* ---------- Question (et bref retour visuel après la réponse) ---------- */

const question = {
  screen: 'question',
  /** Le chrono tourne tant que la question attend sa réponse ; le champ de saisie prend le focus. */
  mounted(root, { state, context }, env) {
    if (state !== AppState.QUESTION) return undefined;
    root.querySelector('#answer')?.focus();
    const el = root.querySelector('#timer');
    const id = setInterval(() => { el.textContent = formatClock(context.session.thinkingTime(env.now())); }, 250);
    return () => clearInterval(id);
  },
  render({ state, context }, env) {
    const { session } = context;
    const answer = session.lastAnswer;
    const { verb, tense, person, marker } = session.currentQuestion;
    const revealing = state === AppState.REVEALING;
    const combo = session.combo;
    const result = revealing ? (answer.correct ? ' good' : ' bad') : '';

    return `<div class="screen play">
      <div class="top-safe"></div>
      <div class="play-top">
        ${topBar(session, env.now(), -1)}
        <div class="sub-row">
          <span class="count">Tour ${session.position} / ${session.length}</span>
          <div class="combo${combo >= 2 ? ' bump' : ' hidden'}${combo >= 5 ? ' hot' : ''}"><span class="fl">🔥</span>Combo × ${combo}</div>
        </div>
      </div>
      <div class="card-wrap">
        <div class="card${result}">
          <div class="chip tense pill">${esc(tense.label)}</div>
          <div class="person">${marker ? `<span class="marker">${esc(marker)}</span> ` : ''}${esc(person.subject)} …</div>
          <div class="word" style="font-size:${fitFontSize(verb.label, 52, 520)}px">${esc(verb.label)}</div>
          <div class="en">${esc(verb.translation)}</div>
        </div>
      </div>
      <form class="answer-form${revealing ? ` locked${result}` : ''}" autocomplete="off">
        <label class="sr-only" for="answer">Conjugaison de « ${esc(verb.label)} » ${esc(tense.withPreposition)}, avec « ${esc(person.subject)} »</label>
        <div class="input-row">
          <input id="answer" name="answer" type="text" lang="fr" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
            enterkeyhint="done" placeholder="${esc(person.subject)} …" value="${revealing ? esc(answer.given) : ''}"${revealing ? ' disabled' : ''}>
          <button class="submit press" type="submit"${revealing ? ' disabled' : ''}>Valider</button>
        </div>
        ${accentKeys(revealing)}
      </form>
    </div>`;
  },
};

/* ---------- Explication ---------- */

function sparks(count = 10, radius = 34) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return `<i class="spark" style="--dx:${Math.round(Math.cos(angle) * radius)}px;--dy:${Math.round(Math.sin(angle) * radius)}px"></i>`;
  }).join('');
}

/** Les huit personnes du temps demandé, découpées ; la ligne de la question est mise en valeur. */
function conjugationTable(question) {
  const rows = Person.ALL.map(p => {
    const form = question.verb.conjugate(question.tense, p);
    return `<div class="cj-row${p === question.person ? ' on' : ''}">${segmented(form.segments)}</div>`;
  }).join('');
  return `<div class="cj-table">${rows}</div>`;
}

/**
 * Réponse comparée lettre à lettre à la forme juste la plus proche (avec ou sans sujet) :
 * lettres en trop barrées dans la réponse, lettres manquantes soulignées dans la forme juste.
 */
function answerDiff(given, expected) {
  const target = expected.accepted.reduce((best, form) => (similarity(given, form) > similarity(given, best) ? form : best));
  const parts = diffChars(given, target);
  const show = (skip, cls) => parts.filter(p => p.type !== skip)
    .map(p => (p.type === 'same' ? esc(p.text) : `<span class="${cls}">${esc(p.text)}</span>`)).join('');
  return { given: show('missing', 'df-extra'), target: show('extra', 'df-missing') };
}

/** Après une erreur : recopier la bonne forme pour pouvoir continuer. */
function retypeBlock({ retyped, retypeTried }) {
  const status = retyped ? '✓ Bien recopié.' : retypeTried ? 'Pas tout à fait : compare avec la forme en haut.' : 'Recopie la bonne forme pour la fixer.';
  return `<form class="retype${retyped ? ' done' : retypeTried ? ' again' : ''}" autocomplete="off">
    <label class="lbl" for="retype">À toi</label>
    <div class="input-row">
      <input id="retype" type="text" lang="fr" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"${retyped ? ' disabled' : ''}>
      <button class="submit press" type="submit"${retyped ? ' disabled' : ''}>OK</button>
    </div>
    <div class="retype-status" aria-live="polite">${status}</div>
    ${retyped ? '' : accentKeys(false)}
  </form>`;
}

const feedback = {
  screen: 'feedback',
  render({ context }, env) {
    const { session } = context;
    const { combo } = session;
    const answer = session.lastAnswer;
    const { question } = answer;
    const { verb, tense, expected } = question;
    let title, subtitle;
    if (answer.correct) {
      title = 'Exact.';
      subtitle = [combo >= 2 && `${combo} d'affilée`, formatSeconds(answer.timeMs)].filter(Boolean).join(' · ');
    } else if (answer.accentsOnly) {
      [title, subtitle] = ['Presque.', 'Attention aux accents.'];
    } else {
      [title, subtitle] = ['Pas cette fois.', 'La règle ci-dessous va t’aider.'];
    }
    const others = expected.others.length
      ? `<div class="also">Aussi accepté : ${expected.others.map(esc).join(', ')}</div>`
      : '';
    const diff = answer.correct ? null : answerDiff(answer.given, expected);
    const diagnosis = answer.diagnosis ? `<div class="diag">${diagnosisText(answer.diagnosis, question)}</div>` : '';
    const alsoLike = verb.alsoLike.length
      ? `<div class="also-like">Se conjugue comme lui : ${verb.alsoLike.map(esc).join(', ')}.</div>`
      : '';
    const locked = !context.retyped;
    return `<div class="screen play fb">
      <div class="top-safe"></div>
      <div class="play-top">${topBar(session, env.now(), session.position - 1)}</div>
      <div class="fb-word">
        <div class="ask">${questionLabel(question)}</div>
        <div class="big-row">
          <div class="big" style="font-size:${fitFontSize(expected.display, 44, 640)}px">${segmented(expected.segments)}</div>
          ${speakButton(expected.forms[0])}
        </div>
        ${SEGMENT_LEGEND}
        ${others}
        ${diff ? `<div class="you-said">Tu as répondu <span class="given">${diff.given}</span></div>
          <div class="you-said">Il fallait <span class="target">${diff.target}</span></div>` : ''}
      </div>
      <div class="grow"></div>
      <div class="sheet">
        <div class="verdict${answer.correct ? ' ok' : ''}">
          <div class="mark">${answer.correct ? `✓${sparks()}` : '!'}</div>
          <div><div class="t1">${title}</div><div class="t2">${subtitle}</div></div>
        </div>
        ${diagnosis}
        ${answer.correct ? '' : retypeBlock(context)}
        <div class="rule">
          <div class="rule-tags"><span class="lbl">Temps</span><span class="chip tense">${esc(tense.label)}</span></div>
          <div class="rule-text">${tense.rule}</div>
        </div>
        <div class="fun">
          <div class="rule-tags"><span class="lbl">${esc(verb.label)}</span><span class="chip type">${esc(verb.type.label)}</span></div>
          <div class="fun-text">${verb.note || verb.type.rule}</div>
          ${alsoLike}
        </div>
        <div class="rule">
          <div class="lbl">${esc(verb.label)} ${esc(tense.withPreposition)}</div>
          ${conjugationTable(question)}
        </div>
        <button class="next-btn press${answer.correct ? ' ok' : ''}" data-event="${AppEvent.CONTINUE}"${locked ? ' aria-disabled="true"' : ''}>${session.isComplete ? 'Voir le résultat' : 'Continuer'}</button>
      </div>
    </div>`;
  },
  /** Après une erreur, le champ de copie prend le focus. */
  mounted(root) {
    root.querySelector('#retype')?.focus({ preventScroll: true });
  },
  /** Copie proposée : état du champ, et « Continuer » déverrouillé une fois la forme recopiée. */
  patch(root, { context }) {
    const form = root.querySelector('.retype');
    if (!form) return;
    form.outerHTML = retypeBlock(context);
    const next = root.querySelector('.next-btn');
    if (context.retyped) {
      next.removeAttribute('aria-disabled');
      next.focus({ preventScroll: true });
    } else {
      const input = root.querySelector('#retype');
      input.focus({ preventScroll: true });
    }
  },
};

/* ---------- Bilan ---------- */

const results = {
  screen: 'results',
  theme: '--night',
  render({ context }) {
    const { record, verdict, unlocked, missed, streak } = context.summary;
    const unlockedHtml = unlocked.length
      ? `<div style="display:flex;flex-direction:column;gap:10px">
          <div class="kicker">Débloqué</div>
          ${unlocked.map((p, i) => {
            const [bg, rim] = TIER_COLORS[p.tier];
            return `<div class="unlock" style="animation-delay:${600 + i * 150}ms">
              <div class="em" style="background:${bg};box-shadow:inset 0 -3px 0 ${rim}">${p.emoji}</div>
              <div style="flex:1;display:flex;flex-direction:column;gap:2px"><div class="n">${esc(unlockedLabel(p))}</div><div class="d">${esc(p.reachedGoal)}</div></div>
            </div>`;
          }).join('')}
        </div>`
      : '';
    const review = missed.length
      ? `<div class="review">${missed.map(({ question: q, given }, i) => `<div class="miss" style="animation-delay:${400 + i * 60}ms">
          <span class="q">${questionLabel(q)}</span>
          <b>${segmented(q.expected.segments)}</b>
          <s>${esc(given)}</s>
        </div>`).join('')}</div>`
      : '<div class="review-none">Rien à revoir. Tout est juste.</div>';
    return `<div class="screen end">
      <div class="top-safe"></div>
      <div class="end-body">
        <div class="kicker">Partie terminée</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div class="score" id="score">0<small>%</small></div>
          <div class="score-msg">${record.correctCount} sur ${record.total}. ${VERDICT_TEXT[verdict]}</div>
        </div>
        <div class="stats">
          <div class="stat" style="animation-delay:150ms"><span>Temps</span><span>${formatClock(record.durationMs)}</span></div>
          <div class="stat" style="animation-delay:220ms"><span>Combo max</span><span>🔥 ${record.maxCombo}</span></div>
          <div class="stat" style="animation-delay:290ms"><span>Série</span><span>${streak} j</span></div>
        </div>
        ${unlockedHtml}
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="kicker">À revoir</div>
          ${review}
        </div>
        <div class="grow"></div>
        <div class="end-actions">
          ${missed.length ? `<button class="replay press" data-event="${AppEvent.START_REVIEW}">Rejouer mes erreurs (${missed.length})</button>` : ''}
          <button class="${missed.length ? 'ghost' : 'replay press'}" data-event="${AppEvent.START}">${missed.length ? 'Nouvelle partie' : 'Rejouer'}</button>
          <button class="ghost" data-event="${AppEvent.NAVIGATE}" data-to="${Destination.PROGRESS}">Voir ma progression</button>
        </div>
      </div>
    </div>`;
  },
  mounted(root, { context }) {
    const el = root.querySelector('#score');
    const target = context.summary.record.accuracy;
    const t0 = performance.now();
    const frame = t => {
      const p = Math.min(1, (t - t0) / 900);
      if (el) el.firstChild.nodeValue = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
};

/* ---------- Progrès ---------- */

function chart(timeline, today) {
  const n = timeline.length;
  const x = i => 30 + i * 24;
  const bars = timeline.map((g, i) => {
    const h = Math.max(2, g.accuracy * 1.5);
    const opacity = n === 1 ? 1 : (0.35 + (0.65 * i) / (n - 1)).toFixed(2);
    return `<rect class="bar" x="${x(i)}" y="${170 - h}" width="14" height="${h}" rx="3" opacity="${opacity}" style="animation-delay:${i * 45}ms"><title>${shortDate(g.endedAt)} · ${g.accuracy} %</title></rect>`;
  }).join('');
  const mid = Math.floor((n - 1) / 2);
  const last = timeline[n - 1].endedAt;
  const lastLabel = dayKey(last) === dayKey(today) ? 'auj.' : shortDate(last);
  const labels = `<text x="${x(0)}" y="190">${shortDate(timeline[0].endedAt)}</text>`
    + (n >= 5 ? `<text x="${x(mid) + 7}" y="190" text-anchor="middle">${shortDate(timeline[mid].endedAt)}</text>` : '')
    + `<text x="${x(n - 1) + 14}" y="190" text-anchor="end">${lastLabel}</text>`;
  return `<svg class="chart" viewBox="0 0 320 200" role="img" aria-label="Pourcentage de réussite des dernières parties">
    <g class="grid"><line x1="24" y1="20" x2="316" y2="20"/><line x1="24" y1="70" x2="316" y2="70"/><line x1="24" y1="120" x2="316" y2="120"/><line x1="24" y1="170" x2="316" y2="170"/></g>
    <g class="axis"><text x="0" y="23">100</text><text x="6" y="73">66</text><text x="6" y="123">33</text><text x="12" y="173">0</text></g>
    <g class="bars">${bars}</g>
    <g class="axis">${labels}</g>
  </svg>`;
}

const TENSE_ABBR = Object.freeze({ present: 'Prés.', imperfect: 'Imp.', passeCompose: 'P. c.', futurProche: 'F. pr.', futurSimple: 'F. s.' });
const MASTERY_LABEL = Object.freeze({ unseen: 'pas encore vu', weak: 'à revoir', learning: 'en cours', mastered: 'acquis' });

/** Grille de maîtrise : un verbe par ligne (regroupés par type), un temps par colonne. */
function masteryPanel(grid) {
  const head = `<div class="mg-row mg-head"><span></span>${Tense.ALL.map(t => `<span title="${esc(t.label)}">${TENSE_ABBR[t.id]}</span>`).join('')}</div>`;
  const groups = grid.map(({ type, verbs }) => `<div class="mg-type">${esc(type.label)}</div>
    ${verbs.map(({ verb, levels }) => `<div class="mg-row"><span class="mg-verb">${esc(verb.label)}</span>${levels
      .map((level, i) => `<i class="mg-cell ${level}" title="${esc(verb.label)} ${esc(Tense.ALL[i].withPreposition)} : ${MASTERY_LABEL[level]}"></i>`).join('')}</div>`).join('')}`).join('');
  const legend = Object.entries(MASTERY_LABEL).map(([level, label]) => `<span><i class="mg-cell ${level}"></i>${label}</span>`).join('');
  return `<div class="panel mastery">
    <div class="panel-head"><b>Maîtrise</b><span>verbe × temps</span></div>
    <div class="mg">${head}${groups}</div>
    <div class="mg-legend">${legend}</div>
  </div>`;
}

const progress = {
  screen: 'progress',
  render({ context }, env) {
    const report = context.progress;
    const today = new Date(env.now());
    let body;
    if (!report.isUnlocked) {
      const firsts = report.firstAccuracies;
      const slots = Array.from({ length: PROGRESS_UNLOCK_GAMES }, (_, i) => (i < firsts.length
        ? `<div class="slot full" style="animation-delay:${i * 80}ms">${firsts[i]}%</div>`
        : `<div class="slot">${i + 1}</div>`)).join('');
      const left = report.gamesUntilUnlock;
      body = `<div class="locked-card">
          <div class="slots">${slots}</div>
          <h2>${report.gameCount === 0 ? `Joue ${PROGRESS_UNLOCK_GAMES} parties pour voir ta courbe.` : `Encore ${left} ${plural(left, 'partie')} pour voir ta courbe.`}</h2>
          <p>Chaque partie terminée apparaîtra sur la chronologie.</p>
          <button class="mid-btn press" data-event="${AppEvent.START}">Jouer la partie ${report.gameCount + 1}</button>
        </div>`;
    } else {
      const trend = report.trend;
      const rows = report.recent.map((g, i) => `<div class="game-row" style="animation-delay:${150 + i * 50}ms">
          <span class="p">${g.accuracy}%</span>
          <div class="meta"><span>${relativeDay(g.endedAt, today)}</span><span>${formatClock(g.durationMs)}</span></div>
        </div>`).join('');
      body = `<div class="kpis">
          <div class="kpi"><span class="k">Réussite moyenne</span><span class="v">${report.averageAccuracy} %</span><span class="s${trend.delta > 0 ? ' up' : ''}">${trendText(trend)}</span></div>
          <div class="kpi" style="animation-delay:60ms"><span class="k">Parties</span><span class="v">${report.gameCount}</span><span class="s">${report.questionsSeen} verbes conjugués</span></div>
        </div>
        <div class="panel">
          <div class="panel-head"><b>Chronologie</b><span>% de réussite</span></div>
          ${chart(report.timeline, today)}
          <div class="insight">${insightText(report.insight)}</div>
        </div>
        <div class="games">
          <div class="lbl">Dernières parties</div>
          ${rows}
        </div>`;
    }
    return `<div class="screen">
      <div class="top-safe"></div>
      <div class="page">
        <div class="page-title">Progrès</div>
        ${body}
        ${masteryPanel(context.mastery)}
      </div>
      ${tabbar(Destination.PROGRESS)}
    </div>`;
  },
};

/* ---------- Succès ---------- */

function popover(achievement) {
  const status = achievementStatus(achievement);
  const [bg] = TIER_COLORS[achievement.tier];
  return `<div class="pop" role="dialog" aria-label="${esc(achievement.name)}">
    <div class="pop-head">
      <div class="em" style="background:${bg}">${achievement.emoji}</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:2px"><div class="n">${esc(achievement.name)}</div><div class="t">${status.tierLabel}</div></div>
      <button class="pop-x" data-event="${AppEvent.CLOSE_BADGE}" aria-label="Fermer">✕</button>
    </div>
    <div class="pop-d">${esc(achievement.description)}</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <div class="pop-prog"><span>${esc(status.nextLabel)}</span><span>${esc(status.progressLabel)}</span></div>
      <div class="meter"><div style="width:${status.percent}%"></div></div>
    </div>
  </div>`;
}

function syncPopover(root, { context }) {
  const host = root.querySelector('#pop');
  if (!host) return;
  root.querySelectorAll('.badge').forEach(el => el.classList.toggle('sel', Number(el.dataset.index) === context.selectedBadge));
  const open = context.selectedBadge !== null;
  root.querySelector('.page')?.classList.toggle('pop-open', open);
  host.innerHTML = open ? popover(context.achievements.list[context.selectedBadge]) : '';
}

const achievements = {
  screen: 'achievements',
  render({ context }) {
    const { list, earned, total } = context.achievements;
    const grid = list.map((p, i) => {
      const [bg, rim] = TIER_COLORS[p.tier];
      const ticks = p.thresholds.map((_, k) => `<i class="${p.reached > k ? 'on' : ''}"></i>`).join('');
      return `<button class="badge${p.tier ? '' : ' off'}" data-event="${AppEvent.SELECT_BADGE}" data-index="${i}" style="animation-delay:${i * 35}ms" aria-label="${esc(p.name)}">
        <div class="em" style="background:${bg};box-shadow:inset 0 -4px 0 ${rim}">${p.emoji}</div>
        <div class="n">${esc(p.name)}</div>
        <div class="ticks">${ticks}</div>
      </button>`;
    }).join('');
    return `<div class="screen">
      <div class="top-safe"></div>
      <div class="page">
        <div class="ach-head"><div class="page-title">Succès</div><span>${earned} / ${total}</span></div>
        <div class="badges">${grid}</div>
        <div class="pop-room"></div>
      </div>
      <div id="pop"></div>
      ${tabbar(Destination.ACHIEVEMENTS)}
    </div>`;
  },
  patch: syncPopover,
  mounted: syncPopover,
};

/* ---------- Réglages ---------- */

function settingsLists({ tenses, types }) {
  const toggle = (event, id, label, on) =>
    `<button class="toggle${on ? ' on' : ''}" data-event="${event}" data-id="${id}" aria-pressed="${on}"><span class="box">${on ? '✓' : ''}</span>${esc(label)}</button>`;
  return `<div class="lbl">Temps</div>
    <div class="toggles">${tenses.map(({ tense, on }) => toggle(AppEvent.TOGGLE_TENSE, tense.id, tense.label, on)).join('')}</div>
    <div class="lbl">Verbes</div>
    <div class="toggles">${types.map(({ type, on }) => toggle(AppEvent.TOGGLE_TYPE, type.id, type.label, on)).join('')}</div>`;
}

const settings = {
  screen: 'settings',
  render({ context }) {
    return `<div class="screen">
      <div class="top-safe"></div>
      <div class="page">
        <div class="page-title">Réglages</div>
        <p class="settings-intro">Choisis ce que tu veux travailler. Il reste toujours au moins un temps et un type de verbe.</p>
        <div class="settings-lists">${settingsLists(context.settings)}</div>
        <button class="mid-btn press" data-event="${AppEvent.START}">Jouer avec ces réglages</button>
      </div>
      ${tabbar(Destination.HOME)}
    </div>`;
  },
  patch(root, { context }) {
    const lists = root.querySelector('.settings-lists');
    if (lists) lists.innerHTML = settingsLists(context.settings);
  },
};

/** Vue de chaque état de l'automate. */
const VIEWS = Object.freeze({
  [AppState.HOME]: home,
  [AppState.COUNTDOWN]: home,
  [AppState.QUESTION]: question,
  [AppState.REVEALING]: question,
  [AppState.FEEDBACK]: feedback,
  [AppState.RESULTS]: results,
  [AppState.PROGRESS]: progress,
  [AppState.ACHIEVEMENTS]: achievements,
  [AppState.SETTINGS]: settings,
});

Object.assign(JeuxFr, { VIEWS });
})(globalThis.JeuxFr ??= {});
