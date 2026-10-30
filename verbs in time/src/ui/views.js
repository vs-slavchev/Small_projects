// Vues : fonctions pures qui transforment un instantané de l'automate en HTML.
// Chaque vue déclare l'écran auquel elle appartient et peut fournir :
// - theme                   : variable CSS de la couleur du navigateur (par défaut --paper) ;
// - patch(root, snapshot)   : mise à jour ciblée lors d'une transition interne (sans patch, rien n'est redessiné) ;
// - mounted(root, snapshot) : effets après insertion dans le DOM ; peut retourner une fonction de nettoyage,
//                             appelée avant le rendu suivant.

(function (Conjugo) {
'use strict';

const {
  AppState, AppEvent, Destination, HomeState, frenchList,
  escapeHtml: esc, plural, percentOf, formatClock, formatSeconds, durationText, fitFontSize, diffChars, similarity,
  VERDICT_TEXT, diagnosisText, achievementStatus, unlockedLabel,
} = Conjugo;

const TIER_COLORS = Object.freeze({ 0: ['#ECE5D8', '#D6CDBC'], 1: ['#F1D7C2', '#C9946C'], 2: ['#E3E6EA', '#A9B0BA'], 3: ['#F3E1B8', '#D9B86A'] });
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/* ---------- Éléments communs ---------- */

function tabbar(active) {
  const tab = (to, icon, label) =>
    `<button class="tab${active === to ? ' on' : ''}" data-event="${AppEvent.NAVIGATE}" data-to="${to}"${active === to ? ' aria-current="page"' : ''}><span class="ico">${icon}</span>${label}</button>`;
  return `<nav class="tabbar">${tab(Destination.HOME, ICON.play, 'Jouer')}${tab(Destination.JOURNEY, ICON.chart, 'Progrès')}${tab(Destination.ACHIEVEMENTS, ICON.medal, 'Succès')}</nav>`;
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

/** Bouton qui fait lire une forme à voix haute (masqué si le navigateur ne sait pas parler). */
const speakButton = text => `<button class="speak" data-speak="${esc(text)}" aria-label="Écouter « ${esc(text)} »">🔊</button>`;

/** Rappel de la question : « nous · finir · futur simple ». */
const questionLabel = question =>
  `${esc(question.person.subject)} · ${esc(question.verb.label)} · ${esc(question.tense.label)}`;

const soundLabel = on => (on ? 'Couper le son' : 'Activer le son');

/* ---------- Premier lancement ---------- */

/** Aperçu animé du jeu : « parlons » s'écrit lettre à lettre puis s'efface, en boucle. */
const DEMO_WORD = 'parlons';
const DEMO_TICK_MS = 130;
const demoFrames = (() => {
  const frames = [['', 6]];
  for (let i = 1; i <= DEMO_WORD.length; i++) frames.push([DEMO_WORD.slice(0, i), 1]);
  frames.push([DEMO_WORD, 14]);
  for (let i = DEMO_WORD.length - 1; i >= 0; i--) frames.push([DEMO_WORD.slice(0, i), 1]);
  return frames;
})();

const onboarding = {
  screen: 'onboarding',
  render() {
    return `<div class="screen onb">
      <div class="top-safe"></div>
      <div class="onb-body">
        <div class="logo">verbes <span>&amp;</span> temps</div>
        <div class="center-col">
          <div class="demo" role="img" aria-label="Aperçu du jeu : on tape la forme conjuguée d’un verbe">
            <div class="demo-card" aria-hidden="true">
              <span class="chip tense pill">présent</span>
              <span class="person">nous …</span>
              <span class="demo-word">parler</span>
              <span class="en">to speak</span>
            </div>
            <div class="demo-row" aria-hidden="true">
              <div class="demo-input"><span class="demo-subject">nous&nbsp;</span><span id="demo-typed"></span><span class="caret"></span></div>
              <span class="demo-submit">Valider</span>
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
    const el = root.querySelector('#demo-typed');
    if (!el) return undefined;
    let frame = 0;
    let hold = 0;
    const id = setInterval(() => {
      if (++hold < demoFrames[frame][1]) return;
      frame = (frame + 1) % demoFrames.length;
      hold = 0;
      el.textContent = demoFrames[frame][0];
    }, DEMO_TICK_MS);
    return () => clearInterval(id);
  },
};

/* ---------- Test de placement ---------- */

/** Carte d'une question : temps, sujet (et expression de temps), verbe à conjuguer. */
function questionCard({ verb, tense, person, marker }, extraClass = '') {
  return `<div class="card${extraClass}">
    <div class="chip tense pill">${esc(tense.label)}</div>
    <div class="person">${marker ? `<span class="marker">${esc(marker)}</span> ` : ''}${esc(person.subject)} …</div>
    <div class="word" style="--word-size:${fitFontSize(verb.label, 52, 520)}px">${esc(verb.label)}</div>
    <div class="en">${esc(verb.translation)}</div>
  </div>`;
}

/** Champ de réponse, réglé pour un clavier de téléphone (ni correction ni majuscule automatiques). */
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
          <div class="segs neutral" style="grid-template-columns:repeat(${length},1fr)" aria-hidden="true">${segments}</div>
        </div>
        <div class="sub-row"><span class="count">Test de placement · question ${test.position}</span></div>
      </div>
      <div class="card-wrap">${questionCard(q)}</div>
      <form class="answer-form" autocomplete="off" data-event="${AppEvent.PLACEMENT_ANSWER}">
        <label class="sr-only" for="placement-answer">Conjugaison de « ${esc(q.verb.label)} » ${esc(q.tense.withPreposition)}, avec « ${esc(q.person.subject)} »</label>
        <div class="input-row">
          ${answerInput('placement-answer', { placeholder: `${q.person.subject} …` })}
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

/* ---------- Résultat du placement et niveau terminé ---------- */

const SPARKS_SVG = `<svg class="cele-sparks" viewBox="0 0 220 200" aria-hidden="true">
  <path d="M30 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="var(--amber)"/>
  <path d="M190 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--amber-2)"/>
  <path d="M196 150l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--amber)"/>
  <path d="M22 150l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="var(--amber-2)"/>
  <circle cx="168" cy="92" r="3" fill="var(--amber)"/><circle cx="52" cy="104" r="3" fill="var(--amber)"/>
</svg>`;

/** Écran de fête sur fond nuit : anneau du niveau (plein, ou pointillé s'il commence), titre, phrase et un seul bouton. */
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

/** Succès débloqués pendant la partie, en pastilles. */
const unlockedChips = list => (list.length
  ? `<div class="re-unlocked">${list.map(p => `<span>${p.emoji} ${esc(unlockedLabel(p))}</span>`).join('')}</div>`
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
      extra: unlockedChips(unlocked),
      home: true,
    });
  },
};

/* ---------- Accueil ---------- */

const ICON = Object.freeze({
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2.5 2 3 3 .5-2 0-5 0-7z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M7 4.5v15l12-7.5z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
  medal: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5"/><path d="M9 13.5L8 21l4-2 4 2-1-7.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
});

const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);
const partiesText = n => `${n} ${plural(n, 'partie')}`;
/** « 3 formes », « 1 forme » */
const formsText = n => `${n}&nbsp;${plural(n, 'forme')}`;
/** « 8 formes acquises sur 12 » */
const masteredText = (n, total) => `${n} ${plural(n, 'forme acquise', 'formes acquises')} sur ${total}`;

function soundButton(on) {
  return `<button class="icon-btn" id="sound" data-event="${AppEvent.TOGGLE_SOUND}" aria-label="${soundLabel(on)}">${on ? ICON.soundOn : ICON.soundOff}</button>`;
}

/** En-tête commun : logo, son, et la série (ou le record, quand la série est rompue). */
function homeHeader(home, soundEnabled) {
  const away = home.isReturning;
  const value = away ? home.bestStreak : home.streak;
  const pill = value
    ? `<span class="pill${away ? ' muted' : ''}">${ICON.flame}${away ? 'Record ' : ''}${value} ${plural(value, 'jour')}</span>`
    : '';
  return `<div class="home-head">
    <div class="logo">verbes <span>&amp;</span> temps</div>
    <div class="head-right">${soundButton(soundEnabled)}${pill}</div>
  </div>`;
}

/** Phrase d'accroche propre à chaque état de l'accueil. */
function homeHeadline(home) {
  const amber = text => `<span class="hl">${text}</span>`;
  switch (home.state) {
    case HomeState.PLAYED_TODAY: {
      const done = home.completedToday;
      if (done.length) {
        const what = `${done.length === 1 ? 'le niveau' : 'les niveaux'} ${frenchList(done.map(String))}`;
        // Le gain du niveau en cours s'ajoute, sauf si c'est le niveau terminé (le dernier, gardé pour réviser).
        const more = home.todayGain > 0 && !done.includes(home.level.number)
          ? `<p>Et déjà +${formsText(home.todayGain)} dans le niveau ${home.level.number}.</p>` : '';
        return `<span class="eyebrow">Aujourd'hui, vous avez terminé</span><h1>${amber(what)}</h1>${more}`;
      }
      return home.todayGain > 0
        ? `<span class="eyebrow">Aujourd'hui, vous avez avancé de</span><h1>${amber(`+${formsText(home.todayGain)}`)}</h1>`
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
        <p>${!home.mastered ? 'Votre niveau vous attendait bien au chaud.'
          : home.mastered === 1 ? 'Votre forme acquise vous attendait bien au chaud.'
            : `Vos ${home.mastered}&nbsp;formes acquises vous attendaient bien au chaud.`}</p>`;
    default:
      return `<h1>Bon retour&nbsp;!</h1><p>Regardez le chemin déjà parcouru&nbsp;:</p>`;
  }
}

/** Carte sombre : les formes déjà acquises (masquée tant qu'il n'y en a aucune). */
function achievedCard(home) {
  if (!home.formsMastered) return '';
  const done = home.levelsCompleted;
  const sub = {
    [HomeState.PLAYED_TODAY]: home.formsToday ? `+${home.formsToday} aujourd'hui` : '',
    [HomeState.NOT_YET_TODAY]: home.formsYesterday ? `+${home.formsYesterday} hier` : '',
    [HomeState.BACK]: plural(home.formsMastered, 'intacte', 'intactes'),
    [HomeState.AWAY]: done ? `${done} ${plural(done, 'niveau terminé', 'niveaux terminés')}` : '',
  }[home.state];
  return `<div class="achieved">
    <span class="eyebrow">Vous savez ${home.isReturning ? 'toujours' : 'déjà'} conjuguer</span>
    <div class="achieved-row">
      <span class="achieved-num">${home.formsMastered}</span>
      <span class="achieved-unit"><b>${plural(home.formsMastered, 'forme')}</b>${sub ? `<em>${sub}</em>` : ''}</span>
    </div>
  </div>`;
}

/**
 * Barre du niveau, en formes acquises sur `total` : acquis avant aujourd'hui, puis le gain du jour (plein, ambre)
 * ou celui qu'apporterait une prochaine partie (pointillé).
 * @param {{ mastered: number, total: number, today?: number, next?: number }} parts @param {{ dark?: boolean }} [options]
 */
function levelBar({ mastered, total, today = 0, next = 0 }, { dark = false, big = false, label } = {}) {
  const gained = Math.max(0, Math.min(today, mastered));
  const width = n => percentOf(n, total);
  const slice = gained ? `<div class="lb-today" style="width:${width(gained)}%"></div>` : next ? `<div class="lb-next" style="width:${width(next)}%"></div>` : '';
  const filled = masteredText(mastered, total);
  label ??= gained ? `${filled}, dont ${gained} aujourd'hui`
    : next ? `${filled}, environ ${mastered + next} après une partie` : filled;
  const cls = ['level-bar', dark && 'dark', big && 'big'].filter(Boolean).join(' ');
  return `<div class="${cls}" role="img" aria-label="${label}"><div class="lb-done" style="width:${width(mastered) - width(gained)}%"></div>${slice}</div>`;
}

/** En-tête d'une carte de niveau : petite ligne, verbes du niveau (et une précision), formes acquises sur formes du niveau. */
function levelHead(eyebrow, level, mastered, total, extra = '') {
  return `<div class="lc-head">
    <div class="lc-name"><span class="eyebrow">${eyebrow}</span><b>${esc(level.title)}</b>${extra}</div>
    <span class="lc-pct" role="img" aria-label="${masteredText(mastered, total)}">${mastered}<small>/${total}</small></span>
  </div>`;
}

/** Parts de la barre du niveau sur l'accueil : le gain du jour s'il y en a un, sinon la prochaine partie. */
function homeBarParts(home) {
  const played = home.state === HomeState.PLAYED_TODAY && home.todayGain > 0;
  return {
    mastered: home.mastered, total: home.total,
    today: played ? home.todayGain : 0, next: played ? 0 : home.nextGameForms,
  };
}

function levelCard(home) {
  const { level } = home;
  const parties = partiesText(home.gamesLeft);
  const badge = (text, dashed) => `<span class="badge-pill${dashed ? ' dashed' : ''}">${dashed ? '' : '<i></i>'}${text}</span>`;
  const next = `≈&nbsp;+${formsText(home.nextGameForms)}`;
  const footer = home.isLevelComplete ? '<span class="lc-note">Niveau terminé</span>' : {
    [HomeState.PLAYED_TODAY]: home.todayGain > 0
      ? `${badge(`+${formsText(home.todayGain)} aujourd'hui`)}<span class="lc-note">à ce rythme, ≈ ${parties}</span>`
      : `${badge(`Une partie ${next}`, true)}<span class="lc-note">encore ≈ ${parties}</span>`,
    [HomeState.NOT_YET_TODAY]: `${badge(`Une partie ${next}`, true)}<span class="lc-note">≈ ${parties} et il est à vous</span>`,
    [HomeState.BACK]: badge(`Une partie suffit pour repartir&nbsp;: ${next}`, true),
    [HomeState.AWAY]: `${badge(`Une partie ${next}`, true)}<span class="lc-note">encore ≈ ${parties}</span>`,
  }[home.state];
  return `<div class="level-card">
    ${levelHead(`Niveau ${level.number} · ${esc(capitalize(level.tense.label))}`, level, home.mastered, home.total)}
    ${levelBar(homeBarParts(home))}
    <div class="lc-foot">${footer}</div>
  </div>`;
}

/** Hauteur maximale d'une barre de la semaine, en pixels. */
const WEEK_BAR_MAX = 64;
/** Gain le plus petit qui remplit une barre : une semaine de petits gains ne s'affiche pas en barres pleines. */
const WEEK_BAR_MIN_PEAK = 4;

/** Semaine en barres : formes gagnées chaque jour ; aujourd'hui en ambre (joué) ou en pointillé (à jouer). */
function weekChart(home) {
  const isPending = d => d.isToday && home.state !== HomeState.PLAYED_TODAY && home.nextGameForms > 0;
  // Barres à l'échelle du meilleur jour de la semaine : les grosses journées restent distinctes.
  const peak = Math.max(WEEK_BAR_MIN_PEAK, ...home.week.map(d => (isPending(d) ? home.nextGameForms : d.gain)));
  const weekBarHeight = forms => Math.max(4, Math.round((forms / peak) * WEEK_BAR_MAX));
  const bars = home.week.map((d, i) => {
    const pending = isPending(d);
    let cls = 'wk-bar';
    let label = '';
    let height = 4;
    if (pending) {
      cls += ' next';
      label = `+${home.nextGameForms}&nbsp;?`;
      height = weekBarHeight(home.nextGameForms);
    } else if (d.isFuture) {
      cls += ' future';
    } else if (d.completed.length) {
      // Coche par niveau terminé, puis le gain déjà fait dans le niveau suivant.
      label = `${'✓'.repeat(d.completed.length)}${d.gain ? `&nbsp;+${d.gain}` : ''}`;
      height = WEEK_BAR_MAX;
      cls += d.isToday ? ' today' : ' gain';
    } else {
      label = d.gain ? `+${d.gain}` : '0';
      height = weekBarHeight(d.gain);
      cls += d.isToday ? ' today' : d.gain ? ' gain' : ' zero';
    }
    return `<div class="wk-day${d.isToday ? ' is-today' : ''}"><span class="wk-label">${label}</span><div class="${cls}" style="height:${height}px"></div><span class="wk-name">${WEEKDAYS[i]}</span></div>`;
  }).join('');
  const note = home.state === HomeState.BACK && home.bestStreak
    ? `<span class="wk-note">Une nouvelle série commence aujourd'hui. Votre record&nbsp;: ${home.bestStreak} ${plural(home.bestStreak, 'jour')}.</span>`
    : '';
  return `<div class="week-chart">
    <span class="section-label">Cette semaine</span>
    <div class="wk-bars" role="img" aria-label="Formes acquises chaque jour de la semaine dans le niveau joué ; coche : niveau terminé ce jour-là">${bars}</div>
    ${note}
  </div>`;
}

/** Après une longue absence : les derniers niveaux terminés, puis le niveau en cours. */
function journeyDots(home) {
  const done = home.journey.slice(0, 5).reverse();
  const dots = [
    ...done.map(h => `<span class="jd done" title="Niveau ${h.level.number}">${ICON.check}</span><span class="jd-link"></span>`),
    `<span class="jd current">${home.level.number}</span>`,
  ].join('');
  return `<div class="week-chart">
    <span class="section-label">Votre parcours</span>
    <div class="jd-row" role="img" aria-label="${home.levelsCompleted ? `${home.levelsCompleted} ${plural(home.levelsCompleted, 'niveau terminé', 'niveaux terminés')}, ` : ''}niveau ${home.level.number} ${home.levelAlreadyCompleted ? 'terminé, en révision' : `en cours, ${masteredText(home.mastered, home.total)}`}">${dots}</div>
  </div>`;
}

/** Bouton de l'accueil selon son état : libellé, et précision (`null` : la longueur de la partie). */
const PLAY_CTA = Object.freeze({
  [HomeState.PLAYED_TODAY]: ['Encore une', null],
  [HomeState.NOT_YET_TODAY]: ['Nouvelle partie', null],
  [HomeState.BACK]: ['Reprendre', null],
  [HomeState.AWAY]: ['Reprendre', null],
});

/** Bouton de partie : libellé, précision éventuelle, et ce qu'une partie rapporte. */
function playButton(label, sub, forms) {
  return `<button class="play-btn press" data-event="${AppEvent.START}">
    <span class="pb-text"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>
    ${forms > 0 ? `<span class="pb-tag">≈&nbsp;+${formsText(forms)}</span>` : ''}
  </button>`;
}

const home = {
  screen: 'home',
  render({ context }) {
    const h = context.home;
    const [label, sub] = PLAY_CTA[h.state];
    const length = `${context.gameLength} questions · ≈ 2 min`;
    return `<div class="screen home">
      <div class="top-safe"></div>
      <div class="home-body">
        ${homeHeader(h, context.soundEnabled)}
        <div class="headline">${homeHeadline(h)}</div>
        ${achievedCard(h)}
        ${levelCard(h)}
        ${h.state === HomeState.AWAY ? journeyDots(h) : weekChart(h)}
        <div class="grow"></div>
        ${playButton(label, sub ?? length, h.nextGameForms)}
      </div>
      ${tabbar(Destination.HOME)}
    </div>`;
  },
  patch(root, { context }) {
    const sound = root.querySelector('#sound');
    if (sound) sound.outerHTML = soundButton(context.soundEnabled);
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
    const { verb, tense, person } = session.currentQuestion;
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
      <div class="card-wrap">${questionCard(session.currentQuestion, result)}</div>
      <form class="answer-form${revealing ? ` locked${result}` : ''}" autocomplete="off" data-event="${AppEvent.ANSWER}">
        <label class="sr-only" for="answer">Conjugaison de « ${esc(verb.label)} » ${esc(tense.withPreposition)}, avec « ${esc(person.subject)} »</label>
        <div class="input-row">
          ${answerInput('answer', { placeholder: `${person.subject} …`, value: revealing ? answer.given : '', disabled: revealing })}
          <button class="submit press" type="submit"${revealing ? ' disabled' : ''}>Valider</button>
        </div>
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
  // Une fois la forme recopiée, le champ et son bouton ne servent plus : seul le message reste.
  return `<form class="retype${retyped ? ' done' : retypeTried ? ' again' : ''}" autocomplete="off" data-event="${AppEvent.RETYPE}">
    ${retyped ? '' : `<label class="lbl" for="retype">À toi</label>
    <div class="input-row">
      ${answerInput('retype')}
      <button class="submit press" type="submit">OK</button>
    </div>`}
    <div class="retype-status" aria-live="polite">${status}</div>
  </form>`;
}

const feedback = {
  screen: 'feedback',
  render({ context }, env) {
    const { session } = context;
    const { combo } = session;
    const answer = session.lastAnswer;
    const { question } = answer;
    const { verb, expected } = question;
    let title, subtitle;
    if (answer.correct) {
      title = 'Exact.';
      subtitle = [combo >= 2 && `${combo} d'affilée`, formatSeconds(answer.timeMs)].filter(Boolean).join(' · ');
    } else if (answer.accentsOnly) {
      [title, subtitle] = ['Presque.', 'Attention aux accents.'];
    } else {
      [title, subtitle] = ['Pas cette fois.', 'Compare avec la bonne forme en haut.'];
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
        <div class="fun">
          <div class="rule-tags"><span class="lbl">${esc(verb.label)}</span><span class="chip type">${esc(verb.type.label)}</span></div>
          <div class="fun-text">${verb.note || verb.type.rule}</div>
          ${alsoLike}
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
  render({ context }) {
    const s = context.summary;
    const { record, level } = s;
    const { gain } = s;
    const { masteredBefore, masteredAfter } = record;
    const hero = gain > 0
      ? `<span class="re-hero">+${gain}</span>`
      : `<span class="re-hero">${masteredAfter}<small>/${s.total}</small></span>`;
    const sub = gain > 0
      ? `${plural(gain, 'forme')} en ${durationText(record.durationMs)}. ${VERDICT_TEXT[s.verdict]}`
      : `${plural(masteredAfter, 'forme acquise', 'formes acquises')} du niveau. ${VERDICT_TEXT[s.verdict]}`;
    const dots = record.answers.map(a => `<i class="${a.correct ? 'ok' : 'ko'}"></i>`).join('');
    const mastered = s.newlyMastered;
    const masteredRow = mastered.length
      ? `<div class="re-sep"></div>
        <div class="re-new">
          <span class="re-star">${ICON.star}</span>
          <span><small>${mastered.length > 1 ? 'Nouvelles formes maîtrisées' : 'Nouvelle forme maîtrisée'}</small>
          <b>${mastered.map(q => esc(q.expected.display)).join(', ')}</b></span>
        </div>`
      : '';
    const unlocked = unlockedChips(s.unlocked);
    return `<div class="screen end">
      <div class="top-safe"></div>
      <div class="end-body">
        <div class="center-col">
          <div class="re-head">
            <span class="re-level">Niveau ${level.number} · ${esc(level.title)}</span>
            ${hero}
            <span class="re-sub">${sub}</span>
          </div>
          <div class="re-progress">
            ${levelBar({ mastered: masteredAfter, total: s.total, today: gain }, { big: true, label: `Formes acquises du niveau : de ${masteredBefore} à ${masteredAfter} sur ${s.total}` })}
            <div class="re-legend"><span>${masteredBefore} → <b>${masteredAfter}</b> / ${formsText(s.total)}</span><span>${s.gamesLeft ? `encore ≈ ${partiesText(s.gamesLeft)}` : ''}</span></div>
          </div>
          <div class="re-card">
            <div class="re-score"><b>${record.correctCount} / ${record.total} justes</b>
              <span class="re-dots" role="img" aria-label="${record.answers.map(a => (a.correct ? 'juste' : 'fausse')).join(', ')}">${dots}</span>
            </div>
            ${masteredRow}
          </div>
          ${unlocked}
        </div>
        <div class="end-actions">
          ${playButton('Encore une', '', s.nextGameForms)}
          <button class="link-btn" data-event="${AppEvent.NAVIGATE}" data-to="${Destination.HOME}">Accueil</button>
        </div>
      </div>
    </div>`;
  },
};

/* ---------- Progrès : le parcours ---------- */

const journey = {
  screen: 'journey',
  render({ context }) {
    const h = context.home;
    const { level } = h;
    const rows = h.journey.map((entry, i) => `<div class="jr-row" style="animation-delay:${i * 40}ms">
        <span class="jr-check">${ICON.check}</span>
        <span class="jr-text"><b>${esc(entry.level.label)}</b><span>${esc(entry.level.title)}</span></span>
        <span class="jr-num">Niveau ${entry.level.number}</span>
      </div>`).join('');
    const bar = { ...homeBarParts(h), next: 0 };
    const left = h.isLevelComplete ? 'Niveau terminé.' : `Encore ≈ ${partiesText(h.gamesLeft)} et une nouvelle étape s'ouvre.`;
    return `<div class="screen">
      <div class="top-safe"></div>
      <div class="page journey">
        <div class="page-title">Mon parcours</div>
        <div class="jr-current">
          ${levelHead(`${h.levelAlreadyCompleted ? 'Terminé' : 'En cours'} · Niveau ${level.number}`, level, h.mastered, h.total, `<span class="jr-sub">${esc(capitalize(level.tense.label))} · ${esc(level.label)}</span>`)}
          ${levelBar(bar, { dark: true })}
          <p>${bar.today ? `<b>+${formsText(bar.today)} aujourd'hui.</b> ` : ''}${left}</p>
        </div>
        <div class="jr-head"><h2>Déjà maîtrisé</h2><span>${h.levelsCompleted} ${plural(h.levelsCompleted, 'niveau')}</span></div>
        ${rows ? `<div class="jr-list">${rows}</div>` : '<p class="jr-empty">Vos niveaux terminés s’afficheront ici.</p>'}
      </div>
      ${tabbar(Destination.JOURNEY)}
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

/** Vue de chaque état de l'automate. */
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
