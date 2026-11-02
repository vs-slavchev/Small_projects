(function (Conjugo) {
'use strict';

const {
  AppState, AppEvent, Destination, HomeState, PROGRESS_UNLOCK_GAMES, frenchList,
  escapeHtml: esc, plural, percentOf, formatSeconds, durationText, minutesText, fitFontSize, diffChars, similarity, accentMarks,
  VERDICT_TEXT, diagnosisText, achievementStatus, unlockedLabel,
} = Conjugo;

const tierOf = p => (p.isSingleStep ? (p.reached ? 3 : 0) : p.tier);

function tabbar(active) {
  const tab = (to, icon, label) =>
    `<button class="tab${active === to ? ' on' : ''}" data-event="${AppEvent.NAVIGATE}" data-to="${to}"${active === to ? ' aria-current="page"' : ''}><span class="ico">${icon}</span>${label}</button>`;
  const play = active === Destination.HOME
    ? `<button class="tab-play press" data-event="${AppEvent.START}">Jouer</button>`
    : `<button class="tab-play press" data-event="${AppEvent.NAVIGATE}" data-to="${Destination.HOME}">Jouer</button>`;
  return `<nav class="tabbar">${tab(Destination.JOURNEY, ICON.chart, 'Progrès')}<div class="tab-center">${play}</div>${tab(Destination.ACHIEVEMENTS, ICON.medal, 'Succès')}</nav>`;
}

function topBar(session, freshIndex) {
  const answers = session.answers;
  let segments = '';
  for (let i = 0; i < session.length; i++) {
    const a = answers[i];
    const cls = a ? (a.correct ? 'ok' : 'ko') : i === session.position - 1 ? 'cur' : '';
    segments += `<div class="seg ${cls}${i === freshIndex ? ' fresh' : ''}"></div>`;
  }
  const combo = session.combo >= 2
    ? `<span class="combo${session.combo >= 5 ? ' hot' : ''}" role="img" aria-label="Combo × ${session.combo}"><span class="fl" aria-hidden="true">🔥</span>×${session.combo}</span>` : '';
  return `<div class="bar-row">
    <button class="close" data-event="${AppEvent.QUIT}" aria-label="Quitter la partie">✕</button>
    <div class="segs" style="grid-template-columns:repeat(${session.length},1fr)">${segments}</div>
    ${combo}
  </div>`;
}

const segmented = segments => segments
  .map(s => (s.kind === 'space' ? ' ' : `<span class="sg sg-${s.kind}">${esc(s.text)}</span>`)).join('');

const LEGEND_KINDS = Object.freeze([['stem', 'radical'], ['ending', 'terminaison'], ['aux', 'auxiliaire'], ['participle', 'participe'], ['agreement', 'accord']]);
function segmentLegend(segments) {
  const present = new Set(segments.map(s => s.kind));
  const items = LEGEND_KINDS.filter(([kind]) => present.has(kind));
  return items.length > 1
    ? `<div class="sg-legend" aria-hidden="true">${items.map(([kind, label]) => `<span class="sg sg-${kind}">${label}</span>`).join('')}</div>` : '';
}

const underlineAt = (text, indices) => {
  const marks = new Set(indices);
  return [...text].map((ch, i) => (marks.has(i) ? `<u class="acc">${esc(ch)}</u>` : esc(ch))).join('');
};

const speakButton = text => `<button class="speak" data-speak="${esc(text)}" aria-label="Écouter « ${esc(text)} »">🔊</button>`;

const questionLabel = question =>
  `${esc(question.person.subject)} · ${esc(question.verb.label)} · ${esc(question.tense.label)}`;

const soundLabel = on => (on ? 'Couper le son' : 'Activer le son');

const DEMO_QUESTIONS = Object.freeze([
  { tense: 'présent', verb: 'parler', marker: 'Tous les jours,', subject: 'nous', answer: 'parlons' },
  { tense: 'passé composé', verb: 'finir', marker: 'Hier,', subject: 'vous', answer: 'avez fini' },
  { tense: 'futur simple', verb: 'être', marker: 'L’année prochaine,', subject: 'je', answer: 'serai' },
]);
const DEMO_TICK_MS = 130;
const DEMO_PHASES = Object.freeze({ idle: 6, hold: 5, press: 3, ok: 14 });
const DEMO_SPANS = DEMO_QUESTIONS.map(q => DEMO_PHASES.idle + q.answer.length + DEMO_PHASES.hold + DEMO_PHASES.press + DEMO_PHASES.ok);
const DEMO_CYCLE = DEMO_SPANS.reduce((a, b) => a + b, 0);

const demoSentence = ({ marker, subject, answer }, filled) => `${esc(marker)} <span class="demo-subj">${esc(subject)}</span> <span class="demo-slots">${
  answer.split(' ').map(w => `<span class="demo-slot" style="width:${Math.max(2.4, w.length * 0.58 + 0.4).toFixed(2)}em">${filled ? esc(w) : ''}</span>`).join('')}</span>.`;

function demoFrame(tick) {
  const { idle, hold, press } = DEMO_PHASES;
  let t = tick % DEMO_CYCLE;
  let index = 0;
  while (t >= DEMO_SPANS[index]) t -= DEMO_SPANS[index++];
  const q = DEMO_QUESTIONS[index];
  const typed = q.answer.slice(0, Math.max(0, Math.min(q.answer.length, t - idle + 1)));
  const afterTyping = t - idle - q.answer.length - hold;
  return { index, typed, pressed: afterTyping >= 0 && afterTyping < press, ok: afterTyping >= press };
}

const onboarding = {
  screen: 'onboarding',
  render() {
    const q = DEMO_QUESTIONS[0];
    return `<div class="screen onb">
      <div class="top-safe"></div>
      <div class="onb-body">
        <div class="logo">verbes <span>&amp;</span> temps</div>
        <div class="center-col">
          <div class="demo" id="demo" role="img" aria-label="Aperçu du jeu : on tape la forme conjuguée qui complète la phrase">
            <div class="demo-card" aria-hidden="true">
              <div class="demo-head"><span class="chip tense pill" id="demo-tense">${q.tense}</span><span class="demo-verb" id="demo-verb">${q.verb}</span></div>
              <p class="demo-sentence" id="demo-sentence">${demoSentence(q, false)}</p>
            </div>
            <div class="demo-row" aria-hidden="true">
              <div class="demo-input"><span class="demo-subject" id="demo-subject">${q.subject}&nbsp;</span><span id="demo-typed"></span><span class="caret"></span></div>
              <span class="demo-submit" id="demo-submit">Valider</span>
            </div>
          </div>
          <div class="onb-copy">
            <h1>La conjugaison, un petit pas par jour</h1>
            <p>Des parties de 2 minutes, toujours à votre niveau.</p>
          </div>
        </div>
        <div class="onb-actions">
          <button class="cta press" data-event="${AppEvent.CHOOSE_BEGINNER}">Je débute</button>
          <button class="cta outline press" data-event="${AppEvent.START_PLACEMENT}"><span>Je connais déjà un peu</span><small>Test de niveau · ≈ 3 min</small></button>
        </div>
      </div>
    </div>`;
  },
  mounted(root) {
    const demo = root.querySelector('#demo');
    if (!demo) return undefined;
    const el = id => root.querySelector(`#demo-${id}`);
    let shown = -1;
    let wasOk = null;
    const paint = tick => {
      const { index, typed, pressed, ok } = demoFrame(tick);
      const q = DEMO_QUESTIONS[index];
      if (index !== shown || ok !== wasOk) {
        el('tense').textContent = q.tense;
        el('verb').textContent = q.verb;
        el('subject').textContent = `${q.subject} `;
        el('sentence').innerHTML = demoSentence(q, ok);
        el('submit').textContent = ok ? '✓ Juste' : 'Valider';
        demo.classList.toggle('ok', ok);
        shown = index;
        wasOk = ok;
      }
      el('typed').textContent = typed;
      el('submit').classList.toggle('pressed', pressed);
    };
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const { idle, hold, press } = DEMO_PHASES;
      paint(idle + DEMO_QUESTIONS[0].answer.length + hold + press);
      return undefined;
    }
    let tick = 0;
    paint(tick);
    const id = setInterval(() => paint(++tick), DEMO_TICK_MS);
    return () => clearInterval(id);
  },
};

function answerWordCount(expected) {
  const words = [[]];
  for (const seg of expected.segments) {
    if (seg.kind === 'space') words.push([]);
    else words.at(-1).push(seg.kind);
  }
  return Math.max(1, words.filter(kinds => kinds.some(k => k !== 'subject')).length);
}

/** À l'impératif, la personne n'est pas un sujet : on la montre entre parenthèses, « (tu) ». */
const addressee = (tense, person) => (tense.hasSubject ? person.subject : `(${person.subject})`);

function questionBlock({ verb, tense, person, marker, expected }, extraClass = '') {
  const shown = addressee(tense, person);
  const subject = esc(marker || !tense.hasSubject ? shown : capitalize(shown));
  const blanks = '<span class="q-blank"></span>'.repeat(answerWordCount(expected));
  return `<div class="q-block${extraClass}">
    <div class="q-head"><span class="chip tense pill">${esc(tense.label)}</span><span class="q-verb">${esc(verb.label)}</span></div>
    <p class="q-sentence">${marker ? `${esc(marker)} ` : ''}<span class="q-subj${tense.hasSubject ? '' : ' addressee'}">${subject}</span> <span class="q-blanks">${blanks}</span>${tense.hasSubject ? '.' : '&nbsp;!'}</p>
  </div>`;
}

function answerInput(id, { placeholder = '', value = '', disabled = false } = {}) {
  return `<input id="${id}" class="answer-input" type="text" lang="fr" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
    enterkeyhint="done" placeholder="${esc(placeholder)}" value="${esc(value)}"${disabled ? ' disabled' : ''}>`;
}

const placement = {
  screen: 'placement',
  render({ context }) {
    const test = context.placement;
    const q = test.currentQuestion;
    const length = test.plannedLength;
    const segments = Array.from({ length }, (_, i) =>
      `<div class="seg ${i < test.position - 1 ? 'done' : i === test.position - 1 ? 'cur' : ''}"></div>`).join('');
    return `<div class="screen play">
      <div class="top-safe"></div>
      <div class="play-top">
        <div class="bar-row">
          <button class="close" data-event="${AppEvent.QUIT}" aria-label="Quitter le test">✕</button>
          <div class="segs-col">
            <span class="segs-label">Test de niveau · question ${test.position} sur ${length} au plus</span>
            <div class="segs neutral" style="grid-template-columns:repeat(${length},1fr)" aria-hidden="true">${segments}</div>
          </div>
        </div>
      </div>
      <div class="q-center">${questionBlock(q)}</div>
      <form class="answer-form" autocomplete="off" data-event="${AppEvent.PLACEMENT_ANSWER}">
        <label class="sr-only" for="placement-answer">Conjugaison de « ${esc(q.verb.label)} » ${esc(q.tense.withPreposition)}, avec « ${esc(q.person.subject)} »</label>
        <div class="input-row">
          ${answerInput('placement-answer', { placeholder: `${addressee(q.tense, q.person)} …` })}
          <button class="submit press" type="submit">Valider</button>
        </div>
        <button class="link-btn" type="button" data-event="${AppEvent.PLACEMENT_SKIP}">Je ne sais pas</button>
      </form>
    </div>`;
  },
  mounted(root) {
    root.querySelector('#placement-answer')?.focus();
  },
};

const SPARKS_SVG = `<svg class="cele-sparks" viewBox="0 0 220 200" aria-hidden="true">
  <path d="M30 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="var(--amber)"/>
  <path d="M190 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--amber-2)"/>
  <path d="M196 150l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--amber)"/>
  <path d="M22 150l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="var(--amber-2)"/>
  <circle cx="168" cy="92" r="3" fill="var(--amber)"/><circle cx="52" cy="104" r="3" fill="var(--amber)"/>
</svg>`;

function celebration({ number, full, title, text, button, extra = '', home = false }) {
  return `<div class="screen cele">
    <div class="top-safe"></div>
    <div class="cele-body">
      <div class="cele-center">
        <div class="cele-ring">
          ${SPARKS_SVG}
          <svg class="ring" viewBox="0 0 220 200" aria-hidden="true">
            <circle cx="110" cy="100" r="80" class="ring-track"/>
            <circle cx="110" cy="100" r="80" class="${full ? 'ring-full' : 'ring-dashed'}"/>
          </svg>
          <div class="cele-num"><span>Niveau</span><b>${number}</b></div>
        </div>
        <div class="cele-copy"><h1>${title}</h1><p>${text}</p></div>
        ${extra}
      </div>
      <div class="cele-actions">
        <button class="cta amber press" data-event="${AppEvent.START}">${button}</button>
        ${home ? `<button class="link-btn" data-event="${AppEvent.NAVIGATE}" data-to="${Destination.HOME}">Accueil</button>` : ''}
      </div>
    </div>
  </div>`;
}

const placementResult = {
  screen: 'placementResult',
  theme: '--night',
  render({ context }) {
    const { number } = context.startLevel;
    const known = number - 1;
    const text = known === 0 ? 'On commence par les bases,<br>à votre rythme.'
      : known === 1 ? 'Vous connaissez déjà bien le premier niveau.<br>Inutile de le refaire.'
        : `Vous connaissez déjà bien les ${known} premiers niveaux.<br>Inutile de les refaire.`;
    return celebration({ number, full: false, title: 'Votre point de départ est trouvé&nbsp;!', text, button: `Jouer le niveau ${number}` });
  },
};

const unlockedCard = (list, { dark = false } = {}) => (list.length
  ? `<div class="unlocked${dark ? ' dark' : ''}">
      <span class="unlocked-title">${plural(list.length, 'Succès débloqué', 'Succès débloqués')}</span>
      ${list.map(p => `<div class="unlocked-row">
        <span class="unlocked-em tier-${tierOf(p)}" aria-hidden="true">${p.emoji}</span>
        <span class="unlocked-text"><b>${esc(unlockedLabel(p))}</b><span>${esc(p.description)}</span></span>
      </div>`).join('')}
    </div>`
  : '');

const NUMBER_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
  'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt', 'vingt et un', 'vingt-deux'];

const levelUp = {
  screen: 'levelUp',
  theme: '--night',
  render({ context }) {
    const { level, unlocked } = context.summary;
    const { from, to } = level.span;
    const title = `${esc(level.verbList)} ${level.verbs.length > 1 ? 'sont' : 'est'} à vous&nbsp;!`;
    const { levelsPlayed } = context.summary;
    const count = levelsPlayed === 1 ? 'd’un' : `de ${NUMBER_WORDS[levelsPlayed] ?? levelsPlayed}`;
    const next = context.summary.nextLevel;
    return celebration({
      number: level.number, full: true, title,
      text: `De <i>${esc(from)}</i> à <i>${esc(to)}</i>.<br>Et ${count}&nbsp;!`,
      button: next > level.number ? `Jouer le niveau ${next}` : 'Rejouer',
      extra: unlockedCard(unlocked, { dark: true }),
      home: true,
    });
  },
};

const ICON = Object.freeze({
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
  medal: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5"/><path d="M9 13.5L8 21l4-2 4 2-1-7.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h12l-3 4 3 4H5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
});

const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);
const partiesText = n => `${n} ${plural(n, 'partie')}`;
const formsText = n => `${n}&nbsp;${plural(n, 'forme')}`;
const acquiredText = n => `${n}&nbsp;${plural(n, 'forme acquise', 'formes acquises')}`;
const masteredText = (n, total) => `${acquiredText(n)} sur ${total}`;

function soundButton(on) {
  return `<button class="icon-btn" id="sound" data-event="${AppEvent.TOGGLE_SOUND}" aria-label="${soundLabel(on)}">${on ? ICON.soundOn : ICON.soundOff}</button>`;
}

function homeHeader(soundEnabled, home) {
  const secured = home.state === HomeState.PLAYED_TODAY;
  const streak = home.streak
    ? `<span class="streak${secured ? '' : ' at-risk'}" role="img" aria-label="Série de ${home.streak} ${plural(home.streak, 'jour')}${secured ? ', assurée aujourd’hui' : ', à prolonger aujourd’hui'}">${ICON.flame}${home.streak}</span>` : '';
  return `<div class="home-head">
    <div class="logo">verbes <span>&amp;</span> temps</div>
    <div class="home-head-right">${streak}${soundButton(soundEnabled)}</div>
  </div>`;
}

function homeHeadline(home) {
  const amber = text => `<span class="hl">${text}</span>`;
  switch (home.state) {
    case HomeState.PLAYED_TODAY: {
      const done = home.completedToday;
      if (done.length) {
        const what = `${done.length === 1 ? 'le niveau' : 'les niveaux'} ${frenchList(done.map(String))}`;
        const more = home.todayGain > 0 && !done.includes(home.level.number)
          ? `<p>Et déjà +${formsText(home.todayGain)} dans le niveau ${home.level.number}.</p>` : '';
        return `<span class="eyebrow">Aujourd'hui, vous avez terminé</span><h1>${amber(what)}</h1>${more}`;
      }
      return home.todayGain > 0
        ? `<span class="eyebrow">Aujourd'hui</span><h1>${amber(`+${formsText(home.todayGain)}`)} ${plural(home.todayGain, 'acquise', 'acquises')}</h1>`
        : `<span class="eyebrow">Vous avez joué aujourd'hui.</span><h1>Chaque partie compte.</h1>`;
    }
    case HomeState.NOT_YET_TODAY: {
      const streak = home.streak
        ? `et votre série passe à ${home.streak + 1} ${plural(home.streak + 1, 'jour')}.`
        : 'et votre série commence.';
      return home.isLevelComplete
        ? `<h1>Tout est acquis.</h1><p>Une partie de révision garde les formes en mémoire, ${streak}</p>`
        : `<h1>Une partie aujourd'hui, c'est environ ${amber(`+${formsText(home.nextGameForms)}`)}</h1><p>en 2 minutes, ${streak}</p>`;
    }
    case HomeState.BACK:
      return `<span class="eyebrow">Content de vous revoir&nbsp;!</span><h1>Rien n'est perdu.</h1>
        <p>${home.mastered
    ? `${acquiredText(home.mastered)} vous ${plural(home.mastered, 'attendait', 'attendaient')} bien au chaud.`
    : 'Votre niveau vous attendait bien au chaud.'}</p>`;
    default:
      return `<h1>Bon retour&nbsp;!</h1><p>Regardez le chemin déjà parcouru&nbsp;:</p>`;
  }
}

function levelBar({ mastered, total, today = 0, next = 0 }, { dark = false, big = false, label } = {}) {
  const gained = Math.max(0, Math.min(today, mastered));
  // Largeurs prises entre bords arrondis : leur somme ne dépasse jamais 100 %.
  const width = n => percentOf(n, total);
  const slice = gained ? `<div class="lb-today" style="width:${width(mastered) - width(mastered - gained)}%"></div>`
    : next ? `<div class="lb-next" style="width:${width(mastered + next) - width(mastered)}%"></div>` : '';
  const filled = masteredText(mastered, total);
  label ??= gained ? `${filled}, dont ${gained} aujourd'hui`
    : next ? `${filled}, environ ${mastered + next} après une partie` : filled;
  const cls = ['level-bar', dark && 'dark', big && 'big'].filter(Boolean).join(' ');
  return `<div class="${cls}" role="img" aria-label="${label}"><div class="lb-done" style="width:${width(mastered - gained)}%"></div>${slice}</div>`;
}

function levelHead(eyebrow, level, mastered, extra = '') {
  const total = level.combos.length;
  return `<div class="lc-head">
    <div class="lc-name"><span class="eyebrow">${eyebrow}</span><b>${esc(level.title)}</b>${extra}</div>
    <span class="lc-pct" role="img" aria-label="${masteredText(mastered, total)}">${mastered}<small>/${total}</small></span>
  </div>`;
}

function homeBarParts(home) {
  const played = home.state === HomeState.PLAYED_TODAY && home.todayGain > 0;
  return {
    mastered: home.mastered, total: home.level.combos.length,
    today: played ? home.todayGain : 0, next: played ? 0 : home.nextGameForms,
  };
}

function levelNode(home) {
  const { level } = home;
  const total = level.combos.length;
  const parts = homeBarParts(home);
  const done = percentOf(parts.mastered - parts.today, total);
  const today = percentOf(parts.mastered, total) - done;
  const remaining = total - home.mastered;
  const parties = partiesText(home.gamesLeft);
  const note = home.isLevelComplete ? 'Niveau terminé : les parties gardent les formes en mémoire.'
    : home.state === HomeState.PLAYED_TODAY && home.todayGain > 0
      ? `Plus que <b>${formsText(remaining)}</b>${home.gamesLeft <= 1 ? ' : une partie peut suffire.' : ` · encore ≈ ${parties}.`}`
      : `Encore <b>≈ ${parties}</b> et il est à vous.`;
  return `<div class="path-node current">
    <span class="path-ring" style="--done:${done}%;--today:${done + today}%"><span>${level.number}</span></span>
    <div class="level-card">
      ${levelHead(`${home.levelAlreadyCompleted ? 'Terminé' : 'En cours'} · ${esc(capitalize(level.tense.label))}`, level, home.mastered)}
      <div class="lc-bar-row">${levelBar(parts)}<span class="lc-flag" role="img" aria-label="Niveau terminé">${ICON.flag}</span></div>
      <p class="lc-note">${note}</p>
    </div>
  </div>`;
}

const doneNode = entry => `<div class="path-node">
    <span class="path-check">${ICON.check}</span>
    <span class="path-text"><b>Niveau ${entry.level.number} · ${esc(entry.level.title)}</b><span>${esc(capitalize(entry.level.tense.label))}</span></span>
  </div>`;

function homePath(home) {
  const shown = home.journey.slice(0, 2);
  const more = home.journey.length - shown.length;
  return `<div class="path">
    ${levelNode(home)}
    ${shown.map(doneNode).join('')}
    ${more > 0 ? `<button class="path-more" data-event="${AppEvent.NAVIGATE}" data-to="${Destination.JOURNEY}">
      <span class="path-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="path-more-text">Et ${more} ${plural(more, 'autre niveau', 'autres niveaux')}</span>
      <span class="path-more-link">Parcours ${ICON.chevron}</span>
    </button>` : ''}
  </div>`;
}

function learnedCard(home) {
  if (home.state !== HomeState.PLAYED_TODAY || !home.learnedToday.length) return '';
  return `<div class="learned">
    <span class="learned-title">Vous savez désormais dire</span>
    <div class="learned-forms">${home.learnedToday.slice(0, 6).map(f => `<span>${esc(f)}</span>`).join('')}</div>
    ${home.streak ? `<span class="learned-streak">${ICON.check}Série de ${home.streak} ${plural(home.streak, 'jour')} assurée</span>` : ''}
  </div>`;
}

const playButton = label => `<button class="play-btn press" data-event="${AppEvent.START}"><span class="pb-text"><b>${label}</b></span></button>`;

const home = {
  screen: 'home',
  render({ context }) {
    const h = context.home;
    return `<div class="screen home">
      <div class="top-safe"></div>
      <div class="home-body">
        ${homeHeader(context.soundEnabled, h)}
        <div class="headline">${homeHeadline(h)}</div>
        ${learnedCard(h)}
        ${homePath(h)}
      </div>
      ${tabbar(Destination.HOME)}
    </div>`;
  },
  patch(root, { context }) {
    const sound = root.querySelector('#sound');
    if (sound) sound.outerHTML = soundButton(context.soundEnabled);
  },
};

const question = {
  screen: 'question',
  mounted(root, { state }) {
    if (state !== AppState.QUESTION) return undefined;
    root.querySelector('#answer')?.focus();
    return undefined;
  },
  render({ state, context }) {
    const { session } = context;
    const answer = session.lastAnswer;
    const { verb, tense, person } = session.currentQuestion;
    const revealing = state === AppState.REVEALING;
    const result = revealing ? (answer.correct ? ' good' : ' bad') : '';

    return `<div class="screen play">
      <div class="top-safe"></div>
      <div class="play-top">${topBar(session, -1)}</div>
      <div class="q-center">${questionBlock(session.currentQuestion, result)}</div>
      <form class="answer-form${revealing ? ` locked${result}` : ''}" autocomplete="off" data-event="${AppEvent.ANSWER}">
        <label class="sr-only" for="answer">Conjugaison de « ${esc(verb.label)} » ${esc(tense.withPreposition)}, avec « ${esc(person.subject)} »</label>
        <div class="input-row">
          ${answerInput('answer', { placeholder: `${addressee(tense, person)} …`, value: revealing ? answer.given : '', disabled: revealing })}
          <button class="submit press" type="submit"${revealing ? ' disabled' : ''}>Valider</button>
        </div>
      </form>
    </div>`;
  },
};

function sparks(count = 10, radius = 34) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return `<i class="spark" style="--dx:${Math.round(Math.cos(angle) * radius)}px;--dy:${Math.round(Math.sin(angle) * radius)}px"></i>`;
  }).join('');
}

function givenDiff(given, expected) {
  const target = expected.accepted.reduce((best, form) => (similarity(given, form) > similarity(given, best) ? form : best));
  return diffChars(given, target).filter(p => p.type !== 'missing')
    .map(p => (p.type === 'same' ? esc(p.text) : `<span class="df-extra">${esc(p.text)}</span>`)).join('');
}

function retypeBlock({ retyped, retypeTried, session }) {
  if (retyped) {
    return `<form class="retype done" data-event="${AppEvent.RETYPE}" aria-live="polite">
      <div class="retype-done"><span class="ok-mark" aria-hidden="true">✓</span><span class="retype-form">${esc(session.lastAnswer.question.expected.display)}</span><span class="retype-status">Bien recopié</span></div>
    </form>`;
  }
  return `<form class="retype${retypeTried ? ' again' : ''}" autocomplete="off" data-event="${AppEvent.RETYPE}">
    <label class="retype-label" for="retype">${retypeTried ? 'Pas tout à fait : compare avec la forme en haut.' : 'Recopie-la pour la fixer'}</label>
    <div class="input-row">
      ${answerInput('retype')}
      <button class="submit press" type="submit">OK</button>
    </div>
  </form>`;
}

const LOCK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h14v9H5zM8 11V8a4 4 0 0 1 8 0v3"/></svg>';

function nextButton({ session, retyped }) {
  const answer = session.lastAnswer;
  const label = session.isComplete ? 'Voir le résultat' : 'Continuer';
  if (!answer.correct && !retyped) {
    return `<button class="next-btn locked" data-event="${AppEvent.CONTINUE}" aria-disabled="true">${LOCK_ICON}Recopie pour continuer</button>`;
  }
  return `<button class="next-btn press${answer.correct ? ' ok' : ''}" data-event="${AppEvent.CONTINUE}">${label}</button>`;
}

const feedback = {
  screen: 'feedback',
  render({ context }) {
    const { session } = context;
    const { combo } = session;
    const answer = session.lastAnswer;
    const { question } = answer;
    const { verb, expected } = question;
    let kind, mark, title, subtitle;
    if (answer.correct) {
      [kind, mark, title] = ['ok', `✓${sparks()}`, 'Exact.'];
      subtitle = [combo >= 2 && `${combo} d'affilée`, formatSeconds(answer.timeMs)].filter(Boolean).join(' · ');
    } else if (answer.accentsOnly) {
      [kind, mark, title, subtitle] = ['almost', '~', 'Presque.', 'Attention aux accents.'];
    } else {
      [kind, mark, title, subtitle] = ['ko', '!', 'Pas cette fois.', 'Compare avec la bonne forme en haut.'];
    }
    const others = expected.others.length
      ? `<div class="also">Aussi accepté : ${expected.others.map(esc).join(', ')}</div>`
      : '';
    let big = segmented(expected.segments);
    let given = '';
    if (answer.accentsOnly) {
      // La forme affichée peut porter un accord facultatif (« allé(e) ») : on aligne sur l'écriture juste la plus proche.
      let match = null;
      for (const form of [expected.display, ...expected.forms]) {
        const marks = accentMarks(answer.given, form);
        if (marks.target.length) { match = { form, marks }; break; }
      }
      if (match) {
        big = underlineAt(expected.display.startsWith(match.form) ? expected.display : match.form, match.marks.target);
        given = underlineAt(match.marks.givenText, match.marks.given);
      } else {
        given = esc(answer.given);
      }
    } else if (!answer.correct) {
      given = givenDiff(answer.given, expected);
    }
    // « Presque » : le verdict dit déjà « Attention aux accents », pas de second encadré.
    const diagnosis = answer.diagnosis && !answer.accentsOnly ? `<div class="diag">${diagnosisText(answer.diagnosis, question)}</div>` : '';
    const alsoLike = verb.alsoLike.length
      ? `<div class="also-like">Se conjugue comme lui : ${verb.alsoLike.map(esc).join(', ')}.</div>`
      : '';
    return `<div class="screen play fb fb-${kind}">
      <div class="top-safe"></div>
      <div class="play-top">${topBar(session, session.position - 1)}</div>
      <div class="fb-word">
        <div class="ask">${questionLabel(question)}</div>
        <div class="big" style="font-size:${fitFontSize(expected.display, 56, 640)}px">${big}</div>
        <div class="big-row">
          ${speakButton(expected.forms[0])}
          ${given ? `<div class="you-said">Ta réponse : <span class="given">${given}</span></div>` : segmentLegend(expected.segments)}
        </div>
        ${others}
      </div>
      <div class="sheet">
        <div class="verdict ${kind}">
          <div class="mark">${mark}</div>
          <div><div class="t1">${title}</div><div class="t2">${subtitle}</div></div>
        </div>
        ${diagnosis}
        ${answer.correct ? '' : retypeBlock(context)}
        <div class="fun">
          <div class="rule-tags"><span class="lbl">${esc(verb.label)}</span><span class="chip type">${esc(verb.type.label)}</span></div>
          <div class="fun-text">${verb.note || verb.type.rule}</div>
          ${alsoLike}
        </div>
        ${nextButton(context)}
      </div>
    </div>`;
  },
  mounted(root) {
    root.querySelector('#retype')?.focus({ preventScroll: true });
  },
  patch(root, { context }) {
    const form = root.querySelector('.retype');
    if (!form) return;
    form.outerHTML = retypeBlock(context);
    root.querySelector('.next-btn').outerHTML = nextButton(context);
    if (context.retyped) root.querySelector('.next-btn').focus({ preventScroll: true });
    else root.querySelector('#retype').focus({ preventScroll: true });
  },
};

function resultsBar({ mastered, total, gained = 0, inProgress = 0, lost = 0 }) {
  const w = n => percentOf(n, total);
  const parts = [
    [mastered - gained, 'done'], [gained, 'today'], [lost, 'lost'], [inProgress, 'way'],
  ].filter(([n]) => n > 0).map(([n, cls]) => `<div class="rb-${cls}" style="width:${w(n)}%"></div>`).join('');
  const label = [masteredText(mastered, total), gained && `dont ${gained} pendant cette partie`, lost && `${lost} à revoir`, inProgress && `${inProgress} en chemin`]
    .filter(Boolean).join(', ');
  return `<div class="results-bar" role="img" aria-label="${label}">${parts}</div>`;
}

const lostCard = lost => (lost.length ? `<div class="re-card re-lost">
    <span class="re-card-title">À revoir</span>
    ${lost.map(q => `<div class="re-lost-row"><span class="re-redo" aria-hidden="true">↻</span><span><b>${esc(q.expected.display)}</b><span>Une bonne réponse peut suffire à la récupérer.</span></span></div>`).join('')}
  </div>` : '');

const results = {
  screen: 'results',
  render({ context }) {
    const s = context.summary;
    const { record, level } = s;
    const { masteredAfter: after, masteredGain: gain } = record;
    const total = level.combos.length;
    const lost = s.newlyLost;
    const dots = record.answers.map(a => `<i class="${a.correct ? 'ok' : 'ko'}"></i>`).join('');
    const scoreCard = `<div class="re-card">
      <div class="re-score"><b>${record.correctCount} / ${record.total} justes</b>
        <span class="re-dots" role="img" aria-label="${record.answers.map(a => (a.correct ? 'juste' : 'fausse')).join(', ')}">${dots}</span>
      </div>
    </div>`;
    const unlocked = unlockedCard(s.unlocked);
    let head, body;
    if (record.correctCount === 0) {
      head = `<span class="re-hero">${record.total}</span><span class="re-sub strong">${plural(record.total, 'forme recopiée', 'formes recopiées')}</span>`;
      const tile = (value, label, dark = false) => `<div class="re-tile${dark ? ' dark' : ''}"><b>${value}</b><span>${label}</span></div>`;
      // Formes perdues : la barre du niveau revient, pour expliquer la baisse qu'on verra à l'accueil.
      const lostBar = lost.length ? `<div class="re-progress">
          ${resultsBar({ mastered: after, total, lost: lost.length })}
          <div class="re-legend"><b>${after}</b> ${plural(after, 'acquise', 'acquises')} · <b class="lost">${lost.length}</b> à revoir</div>
        </div>` : '';
      body = `${lostBar}<div class="re-card">
          <h2 class="re-encourage">Recopier, c'est déjà progresser.</h2>
          <p class="re-encourage-text">Chaque forme recopiée, vous l'avez écrite juste une première fois. C'est comme ça qu'elle commence à se fixer.</p>
        </div>
        <div class="re-tiles">${tile(minutesText(record.durationMs), 'de pratique')}${tile(`Jour ${s.streak}`, s.streak > 1 ? 'série en cours' : 'série lancée', true)}</div>`;
    } else {
      // `gain` est le solde de la partie : formes devenues acquises moins formes repassées à revoir.
      const gained = s.newlyMastered.length;
      const inProgress = gain > 0 ? 0 : s.inProgress;
      const subGain = lost.length
        ? `${gained} ${plural(gained, 'forme acquise', 'formes acquises')}, ${lost.length} à revoir, en ${durationText(record.durationMs)}.`
        : `${plural(gain, 'forme acquise', 'formes acquises')} en ${durationText(record.durationMs)}. ${VERDICT_TEXT[s.verdict]}`;
      head = gain > 0
        ? `<span class="re-hero">+${gain}</span><span class="re-sub">${subGain}</span>`
        : `<span class="re-hero">${after}<small>/${total}</small></span><span class="re-sub">${plural(after, 'forme acquise', 'formes acquises')}${lost.length
          ? `. ${lost.length > 1 ? `${lost.length} formes sont à revoir.` : 'Une forme est à revoir.'}` : ', rien de perdu.'}</span>`;
      const legend = [
        gain > 0 ? `<b>${after}</b> / ${formsText(total)}` : `<b>${after}</b> ${plural(after, 'acquise', 'acquises')}`,
        inProgress && `<b>${inProgress}</b> en chemin`,
        lost.length && `<b class="lost">${lost.length}</b> à revoir`,
      ].filter(Boolean).join(' · ');
      body = `<div class="re-progress">
          ${resultsBar({ mastered: after, total, gained: Math.min(gained, after), inProgress, lost: lost.length })}
          <div class="re-legend">${legend}</div>
        </div>
        ${scoreCard}
        ${lostCard(lost)}`;
    }
    return `<div class="screen end">
      <div class="top-safe"></div>
      <div class="end-body">
        <div class="center-col">
          <div class="re-head">
            <span class="re-level">Niveau ${level.number} · ${esc(level.title)}</span>
            ${head}
          </div>
          ${body}
          ${unlocked}
        </div>
        <div class="end-actions">
          ${playButton('Encore une')}
          <button class="link-btn" data-event="${AppEvent.NAVIGATE}" data-to="${Destination.HOME}">Accueil</button>
        </div>
      </div>
    </div>`;
  },
};

const journey = {
  screen: 'journey',
  render({ context }) {
    const h = context.home;
    const { level } = h;
    const bar = { ...homeBarParts(h), next: 0 };
    const left = h.isLevelComplete ? 'Niveau terminé.' : `Encore ≈ ${partiesText(h.gamesLeft)} et il est à vous.`;
    const current = `<div class="jr-current">
        ${levelHead(`${h.levelAlreadyCompleted ? 'Terminé' : 'En cours'} · Niveau ${level.number}`, level, h.mastered, `<span class="jr-sub">${esc(capitalize(level.tense.label))} · ${esc(level.label)}</span>`)}
        ${levelBar(bar, { dark: true })}
        <p>${bar.today ? `<b>+${formsText(bar.today)} aujourd'hui.</b> ` : ''}${left}</p>
      </div>`;
    let body;
    if (h.gamesPlayed < PROGRESS_UNLOCK_GAMES) {
      const slots = Array.from({ length: PROGRESS_UNLOCK_GAMES }, (_, i) => {
        const g = h.firstScores[i];
        return g ? `<div class="slot full" style="animation-delay:${i * 80}ms">${g.correct}/${g.total}</div>` : '<div class="slot"></div>';
      }).join('');
      const left = PROGRESS_UNLOCK_GAMES - h.gamesPlayed;
      body = `<div class="locked-card">
          <div class="slots" role="img" aria-label="${h.gamesPlayed} ${plural(h.gamesPlayed, 'partie jouée', 'parties jouées')} sur ${PROGRESS_UNLOCK_GAMES}">${slots}</div>
          <h2>${h.gamesPlayed === 0 ? `Jouez ${PROGRESS_UNLOCK_GAMES} parties pour voir vos statistiques.` : `Encore ${left} ${plural(left, 'partie')} pour voir vos statistiques.`}</h2>
          <p>Formes acquises, temps de pratique, niveaux maîtrisés : tout se remplit au fil des parties.</p>
        </div>`;
    } else {
      const rows = h.journey.map((entry, i) => `<div class="jr-row" style="animation-delay:${i * 40}ms">
          <span class="jr-check">${ICON.check}</span>
          <span class="jr-text"><b>${esc(entry.level.title)}</b><span>${esc(capitalize(entry.level.tense.label))} · ${esc(entry.level.label)}</span></span>
          <span class="jr-num">Niveau ${entry.level.number}</span>
        </div>`).join('');
      body = `<div class="jr-tiles">
          <div class="jr-tile"><b>${h.formsMastered}</b><span>${plural(h.formsMastered, 'forme acquise', 'formes acquises')}</span></div>
          <div class="jr-tile"><b>${minutesText(h.practiceMs)}</b><span>de pratique</span></div>
        </div>
        <div class="jr-head"><h2>Déjà maîtrisé</h2><span>${h.levelsCompleted} ${plural(h.levelsCompleted, 'niveau')}</span></div>
        ${rows ? `<div class="jr-list">${rows}</div>` : '<p class="jr-empty">Vos niveaux terminés s’afficheront ici.</p>'}`;
    }
    return `<div class="screen">
      <div class="top-safe"></div>
      <div class="page journey">
        <div class="page-title">Mon parcours</div>
        ${current}
        ${body}
      </div>
      ${tabbar(Destination.JOURNEY)}
    </div>`;
  },
};

function popover(achievement) {
  const status = achievementStatus(achievement);
  return `<div class="pop" role="dialog" aria-label="${esc(achievement.name)}">
    <div class="pop-head">
      <div class="em tier-${tierOf(achievement)}">${achievement.emoji}</div>
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
      const tier = tierOf(p);
      const ticks = p.thresholds.map((_, k) => `<i class="${p.reached > k ? 'on' : ''}"></i>`).join('');
      return `<button class="badge t-${tier}${tier ? '' : ' off'}" data-event="${AppEvent.SELECT_BADGE}" data-index="${i}" style="animation-delay:${i * 35}ms" aria-label="${esc(p.name)}">
        <div class="em tier-${tier}">${tier === 3 ? '<span class="shine" aria-hidden="true"></span>' : ''}${p.emoji}</div>
        <div class="n">${esc(p.name)}</div>
        <div class="ticks">${ticks}</div>
      </button>`;
    }).join('');
    return `<div class="screen">
      <div class="top-safe"></div>
      <div class="page">
        <div class="ach-head"><div class="page-title">Succès</div><span>${earned} ${plural(earned, 'obtenu', 'obtenus')} sur ${total}</span></div>
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

const VIEWS = Object.freeze({
  [AppState.ONBOARDING]: onboarding,
  [AppState.PLACEMENT]: placement,
  [AppState.PLACEMENT_RESULT]: placementResult,
  [AppState.HOME]: home,
  [AppState.QUESTION]: question,
  [AppState.REVEALING]: question,
  [AppState.FEEDBACK]: feedback,
  [AppState.RESULTS]: results,
  [AppState.LEVEL_UP]: levelUp,
  [AppState.JOURNEY]: journey,
  [AppState.ACHIEVEMENTS]: achievements,
});

Object.assign(Conjugo, { VIEWS });
})(globalThis.Conjugo ??= {});
