import { addDays } from './calendar.js';

export const PROGRESS_UNLOCK_GAMES = 3;
export const TIMELINE_SIZE = 12;
export const RECENT_SIZE = 5;
export const TREND_WINDOW_DAYS = 14;
export const STEADY_THRESHOLD = 70;

export const TrendWindow = Object.freeze({ TWO_WEEKS: 'twoWeeks', SINCE_START: 'sinceStart' });
export const InsightKind = Object.freeze({ STEADY: 'steady', ABOVE_AVERAGE: 'aboveAverage', KEEP_PRACTICING: 'keepPracticing' });

const mean = values => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

/**
 * Lecture de la progression du joueur : la chronologie s'affiche
 * une fois les 3 premières parties terminées.
 */
export class ProgressReport {
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
  get averageAccuracy() { return Math.round(mean(this.#games.map(g => g.accuracy))); }

  /**
   * Évolution de la réussite moyenne : les 2 dernières semaines contre les précédentes
   * ou, faute d'historique assez ancien, la seconde moitié des parties contre la première.
   */
  get trend() {
    const cutoff = addDays(this.#now, -TREND_WINDOW_DAYS);
    const recent = this.#games.filter(g => g.endedAt >= cutoff);
    const older = this.#games.filter(g => g.endedAt < cutoff);
    if (recent.length && older.length) {
      return { delta: Math.round(mean(recent.map(g => g.accuracy)) - mean(older.map(g => g.accuracy))), window: TrendWindow.TWO_WEEKS };
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

  /** Message d'encouragement adapté à l'historique. */
  get insight() {
    const games = this.#games;
    if (!games.length) return { kind: InsightKind.KEEP_PRACTICING };
    let steady = 0;
    for (let i = games.length - 1; i >= 0 && games[i].accuracy >= STEADY_THRESHOLD; i--) steady++;
    if (steady >= 2) return { kind: InsightKind.STEADY, count: steady, threshold: STEADY_THRESHOLD, all: steady === games.length };
    const last = games[games.length - 1].accuracy;
    if (last > this.averageAccuracy) return { kind: InsightKind.ABOVE_AVERAGE, accuracy: last };
    return { kind: InsightKind.KEEP_PRACTICING };
  }
}
