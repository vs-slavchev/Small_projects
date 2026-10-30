(function (Conjugo) {
'use strict';

const { dayKey, addDays, daysBetween, LevelVia } = Conjugo;

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

/** Ajoute `value` à la liste de `key` dans `map`. */
const groupInto = (map, key, value) => {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
};

/** Formes gagnées par un ensemble de parties. */
const sumGain = games => games.reduce((sum, g) => sum + g.masteredGain, 0);

/**
 * Rythme du joueur dans un niveau, d'après ses dernières parties dans ce niveau.
 * @param {import('./gameRecord.js').GameRecord[]} games parties archivées, dans l'ordre
 * @param {import('./levels.js').Level} level @param {number} mastered formes du niveau déjà acquises
 * @returns {{ gamesLeft: number, nextGameForms: number }} parties restantes, formes qu'une partie devrait rapporter (au moins 1, 0 si tout est acquis)
 */
function levelPace(games, level, mastered) {
  const total = level.combos.length;
  const recent = games.filter(g => g.level === level.number && isMeasured(g, level)).slice(-PACE_GAMES);
  // Formes par partie, entières : l'estimation affichée et le nombre de parties restantes concordent.
  const pace = recent.length ? Math.max(1, Math.round(sumGain(recent) / recent.length)) : DEFAULT_PACE;
  const remaining = total - mastered;
  return Object.freeze({
    gamesLeft: remaining > 0 ? Math.ceil(remaining / pace) : 0,
    nextGameForms: Math.min(pace, remaining),
  });
}

/**
 * Tout ce que l'accueil et le parcours affichent, calculé à partir du profil.
 * Les gains sont comptés en formes acquises, niveau par niveau.
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
    if (ladder.has(g.level) && isMeasured(g, ladder.level(g.level))) groupInto(byDay, dayKey(g.endedAt), g);
  }
  const onDay = date => byDay.get(dayKey(date)) ?? [];
  // Niveaux terminés en jouant, par jour : un tel jour se fête d'une coche.
  const completedByDay = new Map();
  for (const h of profile.levelHistory) {
    if (h.via === LevelVia.PLAY) groupInto(completedByDay, dayKey(h.completedAt), h.level);
  }
  const completedOn = date => completedByDay.get(dayKey(date)) ?? [];
  /**
   * Gain d'une journée dans un seul niveau, en formes acquises : on n'additionne jamais
   * les gains de niveaux différents. Un niveau terminé ce jour-là compte comme une coche, pas comme un gain.
   */
  const dayGain = (date, levelNumber) => {
    if (levelNumber === undefined || completedOn(date).includes(levelNumber)) return 0;
    return Math.max(0, sumGain(onDay(date).filter(g => g.level === levelNumber)));
  };

  // Formes réellement acquises en jouant : les niveaux validés par le test de placement n'en apportent aucune.
  const formsMastered = ladder.keys.filter(key => profile.practice.get(key).isMastered).length;
  const today = onDay(now);
  const todayGain = dayGain(now, level.number);

  return Object.freeze({
    state,
    /** Le joueur revient après au moins un jour sans jouer : la série est rompue, on montre le record. */
    isReturning: state === HomeState.BACK || state === HomeState.AWAY,
    streak: profile.calendar.currentStreak(now),
    bestStreak: profile.calendar.longestStreak(),
    level,
    /** Formes acquises du niveau en cours, sur les formes qu'il demande. */
    mastered,
    total,
    isLevelComplete: mastered === total,
    /** Formes gagnées aujourd'hui dans le niveau en cours (un niveau terminé aujourd'hui est dans `completedToday`, pas ici). */
    todayGain,
    /** Numéros des niveaux terminés aujourd'hui en jouant, dans l'ordre. */
    completedToday: Object.freeze(completedOn(now)),
    formsMastered,
    formsToday: Math.max(0, sumGain(today)),
    formsYesterday: Math.max(0, sumGain(onDay(addDays(now, -1)))),
    ...levelPace(profile.games, level, mastered),
    /**
     * `completed` : niveaux terminés ce jour-là ; `gain` : formes gagnées dans le niveau joué en dernier ce jour-là
     * (aujourd'hui : le niveau en cours, comme le titre de l'accueil).
     */
    week: Object.freeze(profile.calendar.week(now).map(d => Object.freeze({
      ...d,
      completed: Object.freeze(completedOn(d.date)),
      gain: d.isToday ? todayGain : dayGain(d.date, onDay(d.date).at(-1)?.level),
    }))),
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
