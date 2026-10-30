(function (Conjugo) {
'use strict';

const { dayKey, addDays, daysBetween, percentOf } = Conjugo;

/** Ce que l'accueil met en avant, selon le dernier jour joué. */
const HomeState = Object.freeze({
  PLAYED_TODAY: 'playedToday', // gain du jour
  NOT_YET_TODAY: 'notYetToday', // dernière partie hier (ou aucune) : ce qu'une partie rapporterait
  BACK: 'back',                 // 1 à 6 jours sans jouer : rien n'est perdu
  AWAY: 'away',                 // une semaine ou plus : le chemin déjà parcouru
});
/** Jours sans jouer à partir desquels le joueur est « parti ». */
const AWAY_AFTER_DAYS = 7;
/** Parties récentes du niveau qui servent à estimer le gain d'une partie. */
const PACE_GAMES = 5;
/** Gain estimé d'une partie, en formes, faute d'historique dans le niveau. */
const DEFAULT_PACE = 2;

/** Partie dont le gain se mesure dans `level` : comptes présents et compatibles avec la taille du niveau. */
const isMeasured = (game, level) =>
  game.masteredGain !== null && game.masteredBefore <= level.combos.length && game.masteredAfter <= level.combos.length;

/** Formes gagnées par un ensemble de parties. */
const sumGain = games => games.reduce((sum, g) => sum + g.masteredGain, 0);

/**
 * Rythme du joueur dans un niveau, d'après ses dernières parties dans ce niveau.
 * @param {import('./gameRecord.js').GameRecord[]} games parties archivées, dans l'ordre
 * @param {import('./levels.js').Level} level @param {number} mastered formes du niveau déjà acquises
 * @returns {{ gamesLeft: number, nextGamePercent: number }} parties restantes, gain estimé d'une partie (au moins 1 %, 0 si tout est acquis)
 */
function levelPace(games, level, mastered) {
  const total = level.combos.length;
  const recent = games.filter(g => g.level === level.number && isMeasured(g, level)).slice(-PACE_GAMES);
  const pace = recent.length ? Math.max(1, sumGain(recent) / recent.length) : DEFAULT_PACE;
  const remaining = total - mastered;
  return Object.freeze({
    gamesLeft: remaining > 0 ? Math.ceil(remaining / pace) : 0,
    nextGamePercent: remaining > 0 ? Math.max(1, Math.min(percentOf(pace, total), 100 - percentOf(mastered, total))) : 0,
  });
}

/**
 * Tout ce que l'accueil et le parcours affichent, calculé à partir du profil.
 * Les gains sont comptés en formes acquises, niveau par niveau, puis convertis en pourcentage du niveau.
 * @param {import('./playerProfile.js').PlayerProfile} profile joueur placé (niveau non nul)
 * @param {import('./levels.js').LevelLadder} ladder
 * @param {Date} now
 */
function homeOverview(profile, ladder, now) {
  const level = ladder.level(profile.level);
  const { mastered, total } = level.progress(profile.practice);
  const lastGame = profile.games.at(-1) ?? null;
  const daysOff = lastGame ? Math.max(0, daysBetween(lastGame.endedAt, now)) : 1; // horloge reculée : comme aujourd'hui
  const state = daysOff === 0 ? HomeState.PLAYED_TODAY
    : daysOff === 1 ? HomeState.NOT_YET_TODAY
      : daysOff <= AWAY_AFTER_DAYS ? HomeState.BACK : HomeState.AWAY;

  // Parties mesurées dans un niveau du parcours actuel, regroupées par jour en un seul passage.
  const byDay = new Map();
  for (const g of profile.games) {
    if (!ladder.has(g.level) || !isMeasured(g, ladder.level(g.level))) continue;
    const key = dayKey(g.endedAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(g);
  }
  const onDay = date => byDay.get(dayKey(date)) ?? [];
  /** Gain d'une journée en pourcentage : formes gagnées dans chaque niveau, rapportées à la taille du niveau. */
  const gainPercentOf = games => {
    const byLevel = new Map();
    for (const g of games) byLevel.set(g.level, (byLevel.get(g.level) ?? 0) + g.masteredGain);
    return Math.max(0, [...byLevel].reduce((sum, [n, gain]) => sum + percentOf(gain, ladder.level(n).combos.length), 0));
  };

  // Formes réellement acquises en jouant : les niveaux validés par le test de placement n'en apportent aucune.
  const formsMastered = [...new Set(ladder.levels.flatMap(l => l.combos.map(c => c.key)))]
    .filter(key => profile.practice.get(key).isMastered).length;
  const today = onDay(now);

  return Object.freeze({
    state,
    /** Le joueur revient après au moins un jour sans jouer : la série est rompue, on montre le record. */
    isReturning: state === HomeState.BACK || state === HomeState.AWAY,
    streak: profile.calendar.currentStreak(now),
    bestStreak: profile.calendar.longestStreak(),
    level,
    percent: percentOf(mastered, total),
    isLevelComplete: mastered === total,
    /** Gain du jour, tous niveaux confondus (un niveau terminé aujourd'hui compte). */
    todayPercent: gainPercentOf(today),
    /** Part du gain du jour dans le niveau en cours : le segment « aujourd'hui » de sa barre. */
    todayLevelPercent: gainPercentOf(today.filter(g => g.level === level.number)),
    formsMastered,
    formsToday: Math.max(0, sumGain(today)),
    formsYesterday: Math.max(0, sumGain(onDay(addDays(now, -1)))),
    ...levelPace(profile.games, level, mastered),
    week: Object.freeze(profile.calendar.week(now).map(d => Object.freeze({ ...d, gainPercent: gainPercentOf(onDay(d.date)) }))),
    /** Nombre de niveaux terminés, niveau en cours compris s'il l'est déjà. */
    levelsCompleted: profile.levelHistory.length,
    /** Après le dernier niveau, le joueur y reste pour réviser : il est terminé tout en restant en cours. */
    levelAlreadyCompleted: profile.hasCompleted(level.number),
    /** Niveaux terminés autres que le niveau en cours, du plus récent au plus ancien. */
    journey: Object.freeze([...profile.levelHistory].reverse().filter(h => h.level !== level.number)
      .map(h => Object.freeze({ ...h, level: ladder.level(h.level) }))),
  });
}

Object.assign(Conjugo, { HomeState, AWAY_AFTER_DAYS, levelPace, homeOverview });
})(globalThis.Conjugo ??= {});
