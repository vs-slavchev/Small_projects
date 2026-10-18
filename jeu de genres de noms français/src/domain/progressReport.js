(function (LeOuLa) {
'use strict';

const { addDays, GameRecord, Gender } = LeOuLa;

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

  /**
   * Commentaire de la chronologie : le constat le plus parlant, par ordre de priorité —
   * record, montée récente, creux, mot piège, gain de vitesse, régularité, puis encouragement.
   */
  get insight() {
    const games = this.#games;
    if (!games.length) return { kind: InsightKind.KEEP_PRACTICING };
    return this.#record() ?? this.#rising() ?? this.#dip() ?? this.#trapWord() ?? this.#faster()
      ?? this.#steady() ?? this.#aboveAverage() ?? { kind: InsightKind.KEEP_PRACTICING };
  }

  /** La dernière partie bat strictement toutes les précédentes. */
  #record() {
    const games = this.#games;
    if (games.length < 2) return null;
    const last = games[games.length - 1].accuracy;
    const best = Math.max(...games.slice(0, -1).map(g => g.accuracy));
    return last > best ? { kind: InsightKind.RECORD, accuracy: last, previous: best } : null;
  }

  /** Les dernières parties de la chronologie dépassent nettement celles d'avant. */
  #rising() {
    const timeline = this.timeline;
    if (timeline.length < INSIGHT_RECENT + 2) return null;
    const recent = mean(timeline.slice(-INSIGHT_RECENT).map(g => g.accuracy));
    const delta = Math.round(recent - mean(timeline.slice(0, -INSIGHT_RECENT).map(g => g.accuracy)));
    return delta >= INSIGHT_SWING ? { kind: InsightKind.RISING, count: INSIGHT_RECENT, accuracy: Math.round(recent), delta } : null;
  }

  /** La dernière partie est nettement sous la moyenne. */
  #dip() {
    const last = this.#games[this.#games.length - 1].accuracy;
    const average = this.averageAccuracy;
    return average - last >= INSIGHT_SWING ? { kind: InsightKind.DIP, accuracy: last, average } : null;
  }

  /** Mot le plus souvent raté sur la chronologie, s'il l'a encore été à sa dernière apparition. */
  #trapWord() {
    const words = new Map();
    for (const game of this.timeline) {
      for (const a of game.answers) {
        const w = words.get(a.word) ?? { misses: 0 };
        if (!a.correct) {
          w.misses += 1;
          w.gender = Gender.fromCode(a.chosen).opposite;
        }
        w.lastCorrect = a.correct;
        words.set(a.word, w);
      }
    }
    const [word, trap] = [...words].filter(([, w]) => w.misses >= TRAP_MISSES && !w.lastCorrect)
      .sort(([ta, a], [tb, b]) => b.misses - a.misses || ta.localeCompare(tb))[0] ?? [];
    return word ? { kind: InsightKind.TRAP_WORD, word, misses: trap.misses, gender: trap.gender } : null;
  }

  /** Temps de réponse moyen des dernières parties nettement plus court qu'au début de la chronologie. */
  #faster() {
    const timeline = this.timeline;
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

  /** Série de parties consécutives au-dessus du seuil de régularité. */
  #steady() {
    const steady = GameRecord.accuracyRuns(this.#games, STEADY_THRESHOLD).at(-1);
    return steady >= 2 ? { kind: InsightKind.STEADY, count: steady, threshold: STEADY_THRESHOLD, all: steady === this.#games.length } : null;
  }

  #aboveAverage() {
    const last = this.#games[this.#games.length - 1].accuracy;
    return last > this.averageAccuracy ? { kind: InsightKind.ABOVE_AVERAGE, accuracy: last } : null;
  }
}

Object.assign(LeOuLa, {
  PROGRESS_UNLOCK_GAMES, TIMELINE_SIZE, RECENT_SIZE, TREND_WINDOW_DAYS, STEADY_THRESHOLD,
  INSIGHT_RECENT, INSIGHT_SWING, TRAP_MISSES, TrendWindow, InsightKind, ProgressReport,
});
})(globalThis.LeOuLa ??= {});
