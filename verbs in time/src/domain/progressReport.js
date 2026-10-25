(function (JeuxFr) {
'use strict';

const { addDays, GameRecord, AnswerStatsBook } = JeuxFr;

const PROGRESS_UNLOCK_GAMES = 3;
const TIMELINE_SIZE = 12;
const RECENT_SIZE = 5;
const TREND_WINDOW_DAYS = 14;
const STEADY_THRESHOLD = 70;
/** Parties récentes comparées au reste de la chronologie (montée, vitesse). */
const INSIGHT_RECENT = 3;
/** Écart, en points, à partir duquel une montée ou un creux mérite d'être signalé. */
const INSIGHT_SWING = 10;
/** Nombre d'erreurs sur un même verbe à un même temps pour qu'il soit signalé comme piège. */
const TRAP_MISSES = 2;
/** Gain de vitesse minimal (en part du temps de réponse) pour être signalé. */
const SPEEDUP_RATIO = 0.15;

const TrendWindow = Object.freeze({ TWO_WEEKS: 'twoWeeks', SINCE_START: 'sinceStart' });
const InsightKind = Object.freeze({
  RECORD: 'record', RISING: 'rising', DIP: 'dip', TRAP: 'trap', FASTER: 'faster',
  STEADY: 'steady', ABOVE_AVERAGE: 'aboveAverage', KEEP_PRACTICING: 'keepPracticing',
});

const mean = values => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);
const meanAccuracy = games => mean(games.map(g => g.accuracy));

/**
 * Lecture de la progression du joueur : la chronologie s'affiche
 * une fois les 3 premières parties terminées.
 */
class ProgressReport {
  #games;
  #now;
  #bank;

  /**
   * @param {import('./gameRecord.js').GameRecord[]} games triées de la plus ancienne à la plus récente
   * @param {Date | number} now
   * @param {import('./conjugation.js').VerbBank} bank pour nommer les verbes comme ailleurs (« se lever »)
   */
  constructor(games, now, bank) {
    this.#games = games;
    this.#now = new Date(now);
    this.#bank = bank;
  }

  get gameCount() { return this.#games.length; }
  get isUnlocked() { return this.#games.length >= PROGRESS_UNLOCK_GAMES; }
  get gamesUntilUnlock() { return Math.max(0, PROGRESS_UNLOCK_GAMES - this.#games.length); }
  /** Réussite des premières parties, pour l'écran verrouillé. */
  get firstAccuracies() { return this.#games.slice(0, PROGRESS_UNLOCK_GAMES).map(g => g.accuracy); }
  get questionsSeen() { return this.#games.reduce((sum, g) => sum + g.total, 0); }
  get averageAccuracy() { return Math.round(meanAccuracy(this.#games)); }

  /**
   * Évolution de la réussite moyenne : les 2 dernières semaines contre les précédentes
   * ou, faute d'historique assez ancien, la seconde moitié des parties contre la première.
   */
  get trend() {
    const cutoff = addDays(this.#now, -TREND_WINDOW_DAYS);
    const recent = this.#games.filter(g => g.endedAt >= cutoff);
    const older = this.#games.filter(g => g.endedAt < cutoff);
    if (recent.length && older.length) {
      return { delta: Math.round(meanAccuracy(recent) - meanAccuracy(older)), window: TrendWindow.TWO_WEEKS };
    }
    const half = Math.floor(this.#games.length / 2);
    const delta = half ? Math.round(meanAccuracy(this.#games.slice(half)) - meanAccuracy(this.#games.slice(0, half))) : 0;
    return { delta, window: TrendWindow.SINCE_START };
  }

  /** Dernières parties pour la chronologie, de la plus ancienne à la plus récente. */
  get timeline() {
    return this.#games.slice(-TIMELINE_SIZE);
  }

  /** Dernières parties, de la plus récente à la plus ancienne. */
  get recent() {
    return this.#games.slice(-RECENT_SIZE).reverse();
  }

  /**
   * Commentaire de la chronologie : le constat le plus parlant, par ordre de priorité —
   * record, montée récente, creux, conjugaison piège, gain de vitesse, régularité, puis encouragement.
   */
  get insight() {
    const games = this.#games;
    if (!games.length) return { kind: InsightKind.KEEP_PRACTICING };
    const timeline = this.timeline;
    const last = games.at(-1).accuracy;
    const average = this.averageAccuracy;
    return this.#record(last) ?? rising(timeline) ?? dip(last, average) ?? trap(timeline, this.#bank) ?? faster(timeline)
      ?? this.#steady() ?? (last > average ? { kind: InsightKind.ABOVE_AVERAGE, accuracy: last } : null)
      ?? { kind: InsightKind.KEEP_PRACTICING };
  }

  /** La dernière partie bat strictement toutes les précédentes. */
  #record(last) {
    if (this.#games.length < 2) return null;
    const best = GameRecord.bestAccuracy(this.#games.slice(0, -1));
    return last > best ? { kind: InsightKind.RECORD, accuracy: last, previous: best } : null;
  }

  /** Série de parties consécutives au-dessus du seuil de régularité. */
  #steady() {
    const steady = GameRecord.accuracyRuns(this.#games, STEADY_THRESHOLD).at(-1);
    return steady >= 2 ? { kind: InsightKind.STEADY, count: steady, threshold: STEADY_THRESHOLD, all: steady === this.#games.length } : null;
  }
}

/** Les dernières parties de la chronologie dépassent nettement celles d'avant. */
function rising(timeline) {
  if (timeline.length < INSIGHT_RECENT + 2) return null;
  const recent = meanAccuracy(timeline.slice(-INSIGHT_RECENT));
  const delta = Math.round(recent - meanAccuracy(timeline.slice(0, -INSIGHT_RECENT)));
  return delta >= INSIGHT_SWING ? { kind: InsightKind.RISING, count: INSIGHT_RECENT, accuracy: Math.round(recent), delta } : null;
}

/** La dernière partie est nettement sous la moyenne. */
function dip(last, average) {
  return average - last >= INSIGHT_SWING ? { kind: InsightKind.DIP, accuracy: last, average } : null;
}

/** Verbe le plus souvent raté à un même temps sur la chronologie, s'il l'a encore été à sa dernière apparition. */
function trap(timeline, bank) {
  const book = new AnswerStatsBook();
  for (const a of timeline.flatMap(g => g.answers)) book.record(GameRecord.practiceKeyOf(a), a.correct);
  let found = null;
  for (const [key, stat] of book.entries()) {
    const misses = stat.seen - stat.correct;
    if (misses < TRAP_MISSES || stat.lastCorrect) continue;
    if (!found || misses > found.misses || (misses === found.misses && key.localeCompare(found.key) < 0)) found = { key, misses };
  }
  if (!found) return null;
  const [infinitive, tense] = found.key.split('|');
  return { kind: InsightKind.TRAP, verb: bank.verb(infinitive)?.label ?? infinitive, tense, misses: found.misses };
}

/** Temps de réponse moyen des dernières parties nettement plus court qu'au début de la chronologie. */
function faster(timeline) {
  if (timeline.length < 2 * INSIGHT_RECENT) return null;
  const perQuestion = games => {
    const times = games.flatMap(g => g.answers.map(a => a.timeMs));
    return times.every(t => t > 0) ? mean(times) : null;
  };
  const before = perQuestion(timeline.slice(0, INSIGHT_RECENT));
  const now = perQuestion(timeline.slice(-INSIGHT_RECENT));
  if (!before || !now || now > before * (1 - SPEEDUP_RATIO)) return null;
  return { kind: InsightKind.FASTER, beforeMs: Math.round(before), nowMs: Math.round(now) };
}

/** Niveau d'une conjugaison (verbe + temps) dans la grille de maîtrise. */
const MasteryLevel = Object.freeze({ UNSEEN: 'unseen', WEAK: 'weak', LEARNING: 'learning', MASTERED: 'mastered' });
/** Sous ce taux de réussite, une conjugaison est faible. */
const WEAK_ACCURACY = 0.5;

/**
 * Grille de maîtrise : pour chaque type de verbe, ses verbes, et pour chaque verbe un niveau par temps.
 * @param {import('./conjugation.js').VerbBank} bank
 * @param {import('../../../jeux-francais-commun/src/domain/answerStats.js').AnswerStatsBook} practice
 * @param {import('./conjugation.js').Tense[]} tenses
 */
function masteryGrid(bank, practice, tenses) {
  const level = stat => {
    if (!stat.seen) return MasteryLevel.UNSEEN;
    if (stat.isMastered) return MasteryLevel.MASTERED;
    return stat.accuracy < WEAK_ACCURACY ? MasteryLevel.WEAK : MasteryLevel.LEARNING;
  };
  return bank.types.map(type => ({
    type,
    verbs: bank.verbs.filter(v => v.type === type).map(verb => ({
      verb,
      levels: tenses.map(t => level(practice.get(GameRecord.practiceKeyOf({ verb: verb.infinitive, tense: t.id })))),
    })),
  }));
}

Object.assign(JeuxFr, {
  MasteryLevel, masteryGrid,
  PROGRESS_UNLOCK_GAMES, TIMELINE_SIZE, RECENT_SIZE, TREND_WINDOW_DAYS, STEADY_THRESHOLD,
  TrendWindow, InsightKind, ProgressReport,
});
})(globalThis.JeuxFr ??= {});
