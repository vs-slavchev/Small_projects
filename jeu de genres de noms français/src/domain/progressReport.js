(function (LeOuLa) {
'use strict';

const { addDays, GameRecord, Gender, WordStatsBook } = LeOuLa;

const PROGRESS_UNLOCK_GAMES = 3;
const TIMELINE_SIZE = 12;
const RECENT_SIZE = 5;
const TREND_WINDOW_DAYS = 14;
const STEADY_THRESHOLD = 70;
/** Parties récentes comparées au reste de la chronologie (montée, vitesse). */
const INSIGHT_RECENT = 3;
/** Écart, en points, à partir duquel une montée ou un creux mérite d'être signalé. */
const INSIGHT_SWING = 10;
/** Nombre d'erreurs sur un même mot pour qu'il soit signalé comme piège. */
const TRAP_MISSES = 2;
/** Gain de vitesse minimal (en part du temps de réponse) pour être signalé. */
const SPEEDUP_RATIO = 0.15;

const TrendWindow = Object.freeze({ TWO_WEEKS: 'twoWeeks', SINCE_START: 'sinceStart' });
const InsightKind = Object.freeze({
  RECORD: 'record', RISING: 'rising', DIP: 'dip', TRAP_WORD: 'trapWord', FASTER: 'faster',
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

  /** @param {import('./gameRecord.js').GameRecord[]} games triées de la plus ancienne à la plus récente */
  constructor(games, now) {
    this.#games = games;
    this.#now = new Date(now);
  }

  get gameCount() { return this.#games.length; }
  get isUnlocked() { return this.#games.length >= PROGRESS_UNLOCK_GAMES; }
  get gamesUntilUnlock() { return Math.max(0, PROGRESS_UNLOCK_GAMES - this.#games.length); }
  /** Réussite des premières parties, pour l'écran verrouillé. */
  get firstAccuracies() { return this.#games.slice(0, PROGRESS_UNLOCK_GAMES).map(g => g.accuracy); }
  get wordsSeen() { return this.#games.reduce((sum, g) => sum + g.total, 0); }
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
    const first = this.#games.slice(0, half).map(g => g.accuracy);
    const second = this.#games.slice(half).map(g => g.accuracy);
    return { delta: first.length ? Math.round(mean(second) - mean(first)) : 0, window: TrendWindow.SINCE_START };
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
   * record, montée récente, creux, mot piège, gain de vitesse, régularité, puis encouragement.
   */
  get insight() {
    const games = this.#games;
    if (!games.length) return { kind: InsightKind.KEEP_PRACTICING };
    const timeline = this.timeline;
    const last = games.at(-1).accuracy;
    const average = this.averageAccuracy;
    return this.#record(last) ?? rising(timeline) ?? dip(last, average) ?? trapWord(timeline) ?? faster(timeline)
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

/** Mot le plus souvent raté sur la chronologie, s'il l'a encore été à sa dernière apparition. */
function trapWord(timeline) {
  const book = new WordStatsBook();
  const wrongChoice = new Map();
  for (const a of timeline.flatMap(g => g.answers)) {
    book.record(a.word, a.correct);
    // Une réponse archivée sans choix valide (ancien format) ne permet pas de retrouver le genre.
    if (!a.correct && (a.chosen === 'm' || a.chosen === 'f')) wrongChoice.set(a.word, a.chosen);
  }
  let trap = null;
  for (const [word, stat] of book.entries()) {
    const misses = stat.seen - stat.correct;
    if (misses < TRAP_MISSES || stat.lastCorrect || !wrongChoice.has(word)) continue;
    if (!trap || misses > trap.misses || (misses === trap.misses && word.localeCompare(trap.word) < 0)) trap = { word, misses };
  }
  return trap && { kind: InsightKind.TRAP_WORD, ...trap, gender: Gender.fromCode(wrongChoice.get(trap.word)).opposite };
}

/** Temps de réponse moyen des dernières parties nettement plus court qu'au début de la chronologie. */
function faster(timeline) {
  if (timeline.length < 2 * INSIGHT_RECENT) return null;
  const perWord = games => {
    const times = games.flatMap(g => g.answers.map(a => a.timeMs));
    return times.every(t => t > 0) ? mean(times) : null;
  };
  const before = perWord(timeline.slice(0, INSIGHT_RECENT));
  const now = perWord(timeline.slice(-INSIGHT_RECENT));
  if (!before || !now || now > before * (1 - SPEEDUP_RATIO)) return null;
  return { kind: InsightKind.FASTER, beforeMs: Math.round(before), nowMs: Math.round(now) };
}

Object.assign(LeOuLa, {
  PROGRESS_UNLOCK_GAMES, TIMELINE_SIZE, RECENT_SIZE, TREND_WINDOW_DAYS, STEADY_THRESHOLD,
  TrendWindow, InsightKind, ProgressReport,
});
})(globalThis.LeOuLa ??= {});
