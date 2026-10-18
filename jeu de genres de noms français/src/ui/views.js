// Vues : fonctions pures qui transforment un instantané de l'automate en HTML.
// Chaque vue déclare l'écran auquel elle appartient et peut fournir :
// - theme                   : variable CSS de la couleur du navigateur (par défaut --paper) ;
// - patch(root, snapshot)   : mise à jour ciblée lors d'une transition interne (sans patch, rien n'est redessiné) ;
// - mounted(root, snapshot) : effets après insertion dans le DOM ; peut retourner une fonction de nettoyage,
//                             appelée avant le rendu suivant.

(function (LeOuLa) {
'use strict';

const {
  AppState, AppEvent, Destination, COUNTDOWN_SECONDS, Gender, dayKey, PROGRESS_UNLOCK_GAMES,
  escapeHtml: esc, plural, formatClock, formatSeconds, shortDate, relativeDay, fitFontSize, VERDICT_TEXT,
  trendText, insightText, achievementStatus, unlockedLabel,
} = LeOuLa;

const TIER_COLORS = Object.freeze({ 0: ['#ECE5D8', '#D6CDBC'], 1: ['#F1D7C2', '#C9946C'], 2: ['#E3E6EA', '#A9B0BA'], 3: ['#F3E1B8', '#D9B86A'] });
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

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
    <div class="segs">${segments}</div>
    <div class="timer" id="timer">${formatClock(session.thinkingTime(now))}</div>
  </div>`;
}

const GENDER_ABBR = Object.freeze({ m: 'masc.', f: 'fém.' });
const GENDER_INITIAL = Object.freeze({ m: 'm.', f: 'f.' });

/** « la baguette », « l’école » : l'article prend la couleur du genre. */
function articled(word, tag = 'span') {
  const article = `<${tag} class="art-${word.gender.code}">${word.article}</${tag}>`;
  return `${article}${word.separator}${esc(word.text)}`;
}

const soundLabel = on => (on ? 'Couper le son' : 'Activer le son');

/* ---------- Accueil (avec ou sans compte à rebours) ---------- */

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
          <div class="logo">le <span>/</span> la</div>
          <div class="head-right">
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
  /** Le chrono tourne tant que le mot attend sa réponse. */
  mounted(root, { state, context }, env) {
    if (state !== AppState.QUESTION) return undefined;
    const el = root.querySelector('#timer');
    const id = setInterval(() => { el.textContent = formatClock(context.session.thinkingTime(env.now())); }, 250);
    return () => clearInterval(id);
  },
  render({ state, context }, env) {
    const { session } = context;
    const answer = session.lastAnswer;
    const word = session.currentWord;
    const revealing = state === AppState.REVEALING;
    const combo = session.combo;
    const cardState = revealing ? (answer.correct ? ' good' : ' bad') : '';
    const blank = revealing && answer.correct
      ? `<div class="blank ${word.gender.code}">${word.article}</div>`
      : '<div class="blank">___</div>';
    // Devant une voyelle ou un h muet, l'article ne dit plus le genre : « l’ (m.) » / « l’ (f.) ».
    // Le texte, et pas seulement la couleur, distingue les deux boutons.
    const button = (gender, cls) => {
      const chosen = revealing && answer.chosen === gender ? ' chosen' : '';
      const article = word.articleFor(gender);
      const text = word.elides ? `${article} <span class="ans-g">(${GENDER_INITIAL[gender.code]})</span>` : article;
      return `<button class="ans ${cls} press${chosen}" data-event="${AppEvent.ANSWER}" data-gender="${gender.code}" aria-label="${article} (${gender.label})">${text}</button>`;
    };
    return `<div class="screen play">
      <div class="top-safe"></div>
      <div class="play-top">
        ${topBar(session, env.now(), -1)}
        <div class="sub-row">
          <span class="count">Mot ${session.position} / ${session.length}</span>
          <div class="combo${combo >= 2 ? ' bump' : ' hidden'}${combo >= 5 ? ' hot' : ''}"><span class="fl">🔥</span>Combo × ${combo}</div>
        </div>
      </div>
      <div class="card-wrap">
        <div class="card${cardState}">
          ${blank}
          <div class="word" style="font-size:${fitFontSize(word.text, 56, 560)}px">${esc(word.text)}</div>
          <div class="en">${esc(word.translation)}</div>
        </div>
      </div>
      <div class="answers${revealing ? ' locked' : ''}">
        ${button(Gender.MASCULINE, 'le')}${button(Gender.FEMININE, 'la')}
      </div>
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

const feedback = {
  screen: 'feedback',
  render({ context }, env) {
    const { session } = context;
    const { combo } = session;
    const answer = session.lastAnswer;
    const { word } = answer;
    const group = word.group;
    let title, subtitle;
    if (answer.correct) {
      title = 'Exact.';
      subtitle = [word.isException && 'Exception déjouée', combo >= 2 && `${combo} d'affilée`, formatSeconds(answer.timeMs)].filter(Boolean).join(' · ');
    } else if (word.isException) {
      title = 'Piège classique.';
      subtitle = "Tu l'auras la prochaine fois.";
    } else {
      title = 'Pas cette fois.';
      subtitle = 'La règle ci-dessous va t’aider.';
    }
    const tags = word.isException
      ? `<span class="chip ${group.gender.code} strike">${esc(group.suffix)}</span><span class="chip exc">EXCEPTION</span>`
      : `<span class="chip ${group.gender.code}">${esc(group.suffix)}</span><span class="to ${group.gender.code}">→ ${group.gender.label}</span>`;
    const rule = word.isException
      ? `Les ${group.isEnding ? 'noms en ' : ''}<b>${esc(group.suffix)}</b> sont ${group.gender.label}s, mais <b>${esc(word.text)}</b> est ${word.gender.label}.`
      : group.rule;
    return `<div class="screen play fb">
      <div class="top-safe"></div>
      <div class="play-top">${topBar(session, env.now(), session.position - 1)}</div>
      <div class="fb-word">
        <div class="big" style="font-size:${fitFontSize(word.withArticle, 52, 600)}px">${articled(word)}</div>
        ${word.elides ? `<div class="gender-note ${word.gender.code}">nom ${word.gender.label}</div>` : ''}
        ${answer.correct ? '' : `<div class="you-said">Tu as répondu <s>${word.elides ? answer.chosen.label : answer.chosen.article}</s></div>`}
      </div>
      <div class="grow"></div>
      <div class="sheet">
        <div class="verdict${answer.correct ? ' ok' : ''}">
          <div class="mark">${answer.correct ? `✓${sparks()}` : '!'}</div>
          <div><div class="t1">${title}</div><div class="t2">${subtitle}</div></div>
        </div>
        <div class="rule">
          <div class="rule-tags"><span class="lbl">Groupe</span>${tags}</div>
          <div class="rule-text">${rule}</div>
        </div>
        ${word.anecdote ? `<div class="fun"><div class="lbl">💡 Anecdote</div><div class="fun-text">${word.anecdote}</div></div>` : ''}
        <button class="next-btn press${answer.correct ? ' ok' : ''}" data-event="${AppEvent.CONTINUE}">${session.isComplete ? 'Voir le résultat' : 'Continuer'}</button>
      </div>
    </div>`;
  },
};

/* ---------- Bilan ---------- */

const results = {
  screen: 'results',
  theme: '--night',
  render({ context }) {
    const { record, verdict, unlocked, missedWords, streak } = context.summary;
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
    const review = missedWords.length
      ? `<div class="review">${missedWords.map((w, i) => `<span style="animation-delay:${400 + i * 60}ms">${articled(w, 'b')}${w.elides ? ` <em class="g">${GENDER_ABBR[w.gender.code]}</em>` : ''}</span>`).join('')}</div>`
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
          <button class="replay press" data-event="${AppEvent.START}">Rejouer</button>
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
        </div>
        <div class="grow"></div>`;
    } else {
      const trend = report.trend;
      const rows = report.recent.map((g, i) => `<div class="game-row" style="animation-delay:${150 + i * 50}ms">
          <span class="p">${g.accuracy}%</span>
          <div class="meta"><span>${relativeDay(g.endedAt, today)}</span><span>${formatClock(g.durationMs)}</span></div>
        </div>`).join('');
      body = `<div class="kpis">
          <div class="kpi"><span class="k">Réussite moyenne</span><span class="v">${report.averageAccuracy} %</span><span class="s${trend.delta > 0 ? ' up' : ''}">${trendText(trend)}</span></div>
          <div class="kpi" style="animation-delay:60ms"><span class="k">Parties</span><span class="v">${report.gameCount}</span><span class="s">${report.wordsSeen} mots vus</span></div>
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
});

Object.assign(LeOuLa, { VIEWS });
})(globalThis.LeOuLa ??= {});
