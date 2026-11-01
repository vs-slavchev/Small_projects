(function (Conjugo) {
'use strict';

const { dayKey, addDays, daysBetween, LevelVia, Person, GameRecord } = Conjugo;

/** Parties à jouer avant d'ouvrir les statistiques de l'onglet Progrès. */
const PROGRESS_UNLOCK_GAMES = 3;

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
 * @returns {{ gamesLeft: number, nextGameForms: number }} parties restantes, formes qu'une partie devrait rapporter (au moins 1, 0 si tout est acquis)
 */
function levelPace(games, level, mastered) {
  const total = level.combos.length;
  const recent = games.filter(g => g.level === level.number && isMeasured(g, level)).slice(-PACE_GAMES);
  const pace = recent.length ? Math.max(1, sumGain(recent) / recent.length) : DEFAULT_PACE;
  const remaining = total - mastered;
  return Object.freeze({
    gamesLeft: remaining > 0 ? Math.ceil(remaining / pace) : 0,
    // Seule l'estimation affichée est arrondie : les parties restantes gardent le rythme exact.
    nextGameForms: remaining > 0 ? Math.min(Math.max(1, Math.round(pace)), remaining) : 0,
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

  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(addDays(now, -1));
  // Parties d'aujourd'hui et d'hier, mesurées dans un niveau du parcours actuel.
  const measuredOn = key => profile.games.filter(g =>
    dayKey(g.endedAt) === key && ladder.has(g.level) && isMeasured(g, ladder.level(g.level)));
  const today = measuredOn(todayKey);
  // Niveaux terminés aujourd'hui en jouant, dans l'ordre.
  const completedToday = profile.levelHistory
    .filter(h => h.via === LevelVia.PLAY && dayKey(h.completedAt) === todayKey).map(h => h.level);

  // Formes réellement acquises en jouant : les niveaux validés par le test de placement n'en apportent aucune.
  const formsMastered = ladder.keys.filter(key => profile.practice.get(key).isMastered).length;
  // Gain du jour dans le seul niveau en cours : on n'additionne jamais les gains de niveaux différents,
  // et un niveau terminé aujourd'hui est annoncé comme tel, pas comme un gain.
  const todayGain = completedToday.includes(level.number)
    ? 0 : Math.max(0, sumGain(today.filter(g => g.level === level.number)));

  // Formes du niveau en cours devenues acquises pendant les parties du jour, et toujours acquises (ordre du niveau).
  const todayKeys = new Set(today.filter(g => g.level === level.number).flatMap(g => g.masteredKeys));
  const learnedToday = level.combos
    .filter(c => todayKeys.has(c.key) && profile.practice.get(c.key).isMastered)
    .map(c => { const shown = today.flatMap(g => g.answers).find(a => GameRecord.practiceKeyOf(a) === c.key);
      return c.verb.conjugate(c.tense, (shown && Person.of(shown.person)) || Person.SLOTS[c.slot][0]).display; });

  return Object.freeze({
    state,
    /** Le joueur revient après au moins un jour sans jouer. */
    isReturning: state === HomeState.BACK || state === HomeState.AWAY,
    streak: profile.calendar.currentStreak(now),
    level,
    /** Formes acquises du niveau en cours (sur `level.combos.length`). */
    mastered,
    isLevelComplete: mastered === total,
    /** Formes gagnées aujourd'hui dans le niveau en cours (un niveau terminé aujourd'hui est dans `completedToday`, pas ici). */
    todayGain,
    /** Numéros des niveaux terminés aujourd'hui en jouant, dans l'ordre. */
    completedToday: Object.freeze(completedToday),
    formsMastered,
    formsToday: Math.max(0, sumGain(today)),
    formsYesterday: Math.max(0, sumGain(measuredOn(yesterdayKey))),
    ...levelPace(profile.games, level, mastered),
    /** Nombre de niveaux terminés, niveau en cours compris s'il l'est déjà. */
    levelsCompleted: profile.levelHistory.length,
    /** Après le dernier niveau, le joueur y reste pour réviser : il est terminé tout en restant en cours. */
    levelAlreadyCompleted: profile.hasCompleted(level.number),
    /** Formes du niveau en cours acquises grâce aux parties du jour (« Vous savez désormais dire »). */
    learnedToday: Object.freeze(learnedToday),
    /** Parties jouées en tout ; l'onglet Progrès montre ses statistiques à partir de PROGRESS_UNLOCK_GAMES. */
    gamesPlayed: profile.games.length,
    /** Réponses justes et total des premières parties, pour l'onglet Progrès encore verrouillé. */
    firstScores: Object.freeze(profile.games.slice(0, PROGRESS_UNLOCK_GAMES).map(g => Object.freeze({ correct: g.correctCount, total: g.total }))),
    /** Temps passé à jouer, toutes parties confondues. */
    practiceMs: profile.games.reduce((sum, g) => sum + g.durationMs, 0),
    /** Niveaux terminés autres que le niveau en cours, du plus récent au plus ancien. */
    journey: Object.freeze([...profile.levelHistory].reverse().filter(h => h.level !== level.number)
      .map(h => Object.freeze({ ...h, level: ladder.level(h.level) }))),
  });
}

Object.assign(Conjugo, { HomeState, AWAY_AFTER_DAYS, PROGRESS_UNLOCK_GAMES, levelPace, homeOverview });
})(globalThis.Conjugo ??= {});
