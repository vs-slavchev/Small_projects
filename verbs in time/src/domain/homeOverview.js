(function (Conjugo) {
'use strict';

const { dayKey, addDays, daysBetween, LevelVia, Person, GameRecord } = Conjugo;

const PROGRESS_UNLOCK_GAMES = 3;

const HomeState = Object.freeze({
  PLAYED_TODAY: 'playedToday',
  NOT_YET_TODAY: 'notYetToday',
  BACK: 'back',
  AWAY: 'away',
});
const AWAY_AFTER_DAYS = 7;
const PACE_GAMES = 5;
const DEFAULT_PACE = 2;

const isMeasured = (game, level) =>
  game.masteredGain !== null && game.masteredBefore <= level.combos.length && game.masteredAfter <= level.combos.length;

const sumGain = games => games.reduce((sum, g) => sum + g.masteredGain, 0);

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
  const measuredOn = key => profile.games.filter(g =>
    dayKey(g.endedAt) === key && ladder.has(g.level) && isMeasured(g, ladder.level(g.level)));
  const today = measuredOn(todayKey);
  const completedToday = profile.levelHistory
    .filter(h => h.via === LevelVia.PLAY && dayKey(h.completedAt) === todayKey).map(h => h.level);

  // Formes réellement acquises en jouant : les niveaux validés par le test de placement n'en apportent aucune.
  const formsMastered = ladder.keys.filter(key => profile.practice.get(key).isMastered).length;
  // Gain du jour dans le seul niveau en cours : on n'additionne jamais les gains de niveaux différents,
  // et un niveau terminé aujourd'hui est annoncé comme tel, pas comme un gain.
  const todayGain = completedToday.includes(level.number)
    ? 0 : Math.max(0, sumGain(today.filter(g => g.level === level.number)));

  const todayKeys = new Set(today.filter(g => g.level === level.number).flatMap(g => g.masteredKeys));
  const learnedToday = level.combos
    .filter(c => todayKeys.has(c.key) && profile.practice.get(c.key).isMastered)
    .map(c => { const shown = today.flatMap(g => g.answers).find(a => GameRecord.practiceKeyOf(a) === c.key);
      return c.verb.conjugate(c.tense, (shown && Person.of(shown.person)) || Person.SLOTS[c.slot][0]).display; });

  return Object.freeze({
    state,
    isReturning: state === HomeState.BACK || state === HomeState.AWAY,
    streak: profile.calendar.currentStreak(now),
    level,
    mastered,
    isLevelComplete: mastered === total,
    todayGain,
    completedToday: Object.freeze(completedToday),
    formsMastered,
    formsToday: Math.max(0, sumGain(today)),
    formsYesterday: Math.max(0, sumGain(measuredOn(yesterdayKey))),
    ...levelPace(profile.games, level, mastered),
    levelsCompleted: profile.levelHistory.length,
    levelAlreadyCompleted: profile.hasCompleted(level.number),
    learnedToday: Object.freeze(learnedToday),
    gamesPlayed: profile.games.length,
    firstScores: Object.freeze(profile.games.slice(0, PROGRESS_UNLOCK_GAMES).map(g => Object.freeze({ correct: g.correctCount, total: g.total }))),
    practiceMs: profile.games.reduce((sum, g) => sum + g.durationMs, 0),
    journey: Object.freeze([...profile.levelHistory].reverse().filter(h => h.level !== level.number)
      .map(h => Object.freeze({ ...h, level: ladder.level(h.level) }))),
  });
}

Object.assign(Conjugo, { HomeState, AWAY_AFTER_DAYS, PROGRESS_UNLOCK_GAMES, levelPace, homeOverview });
})(globalThis.Conjugo ??= {});
