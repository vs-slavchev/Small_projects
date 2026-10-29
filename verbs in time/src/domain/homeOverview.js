(function (Conjugo) {
'use strict';

const { dayKey, addDays, startOfWeek } = Conjugo;

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

const daysBetween = (from, to) => Math.round((new Date(dayKey(to)) - new Date(dayKey(from))) / 86_400_000);
const percent = (part, total) => Math.round((part / total) * 100);

/**
 * Tout ce que l'accueil et le parcours affichent, calculé à partir du profil.
 * Les gains sont mesurés en formes acquises et convertis en pourcentage du niveau de chaque partie.
 * @param {import('./playerProfile.js').PlayerProfile} profile joueur placé (niveau non nul)
 * @param {import('./levels.js').LevelLadder} ladder
 * @param {Date} now
 */
function homeOverview(profile, ladder, now) {
  const level = ladder.level(profile.level);
  const { mastered, total } = level.progress(profile.practice);
  const games = profile.games;
  const lastGame = games.at(-1) ?? null;
  const daysOff = lastGame ? daysBetween(lastGame.endedAt, now) : 1;
  const state = daysOff === 0 ? HomeState.PLAYED_TODAY
    : daysOff === 1 ? HomeState.NOT_YET_TODAY
      : daysOff <= AWAY_AFTER_DAYS ? HomeState.BACK : HomeState.AWAY;

  const leveled = games.filter(g => g.masteredGain !== null);
  const onDay = (date, filter = () => true) => leveled.filter(g => dayKey(g.endedAt) === dayKey(date) && filter(g));
  const gainPercentOf = list => Math.max(0, list.reduce((sum, g) => sum + percent(g.masteredGain, ladder.level(g.level).combos.length), 0));
  const formsGainedOn = date => Math.max(0, onDay(date).reduce((sum, g) => sum + g.masteredGain, 0));

  const recent = leveled.filter(g => g.level === level.number).slice(-PACE_GAMES);
  const pace = recent.length ? Math.max(1, recent.reduce((sum, g) => sum + g.masteredGain, 0) / recent.length) : DEFAULT_PACE;
  const remaining = total - mastered;

  const completed = profile.levelHistory;
  const completedNumbers = new Set(completed.map(h => h.level));
  const formsMastered = ladder.levels.filter(l => completedNumbers.has(l.number) && l.number !== level.number)
    .reduce((sum, l) => sum + l.combos.length, 0) + mastered;

  const monday = startOfWeek(now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const key = dayKey(date);
    return Object.freeze({
      date,
      isToday: key === dayKey(now),
      isFuture: key > dayKey(now),
      played: profile.calendar.playedOn(date),
      gainPercent: gainPercentOf(onDay(date)),
    });
  });

  return Object.freeze({
    state,
    daysOff,
    streak: profile.calendar.currentStreak(now),
    bestStreak: profile.calendar.longestStreak(),
    level,
    percent: percent(mastered, total),
    mastered,
    total,
    isLevelComplete: remaining === 0,
    todayPercent: gainPercentOf(onDay(now, g => g.level === level.number)),
    formsMastered,
    formsToday: formsGainedOn(now),
    formsYesterday: formsGainedOn(addDays(now, -1)),
    /** Gain estimé d'une prochaine partie, en pourcentage du niveau (au moins 1). */
    nextGamePercent: Math.max(1, Math.min(percent(pace, total), 100 - percent(mastered, total))),
    gamesLeft: remaining ? Math.ceil(remaining / pace) : 0,
    week: Object.freeze(week),
    /** Niveaux terminés, du plus récent au plus ancien. */
    journey: Object.freeze([...completed].reverse().map(h => Object.freeze({ ...h, level: ladder.level(h.level) }))),
  });
}

Object.assign(Conjugo, { HomeState, AWAY_AFTER_DAYS, homeOverview });
})(globalThis.Conjugo ??= {});
