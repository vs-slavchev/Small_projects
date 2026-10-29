(function (Conjugo) {
'use strict';

const { addDays, GameRecord } = Conjugo;

/** Appréciation d'une partie, du meilleur au moins bon. */
const Verdict = Object.freeze({
  PERFECT: 'perfect',
  WEEK_BEST: 'weekBest',
  STRONG: 'strong',
  FAIR: 'fair',
  KEEP_GOING: 'keepGoing',
});

/**
 * @param {import('./gameRecord.js').GameRecord} record
 * @param {import('./gameRecord.js').GameRecord[]} earlierGames parties terminées avant celle-ci
 */
function rateGame(record, earlierGames) {
  if (record.isPerfect) return Verdict.PERFECT;
  const weekAgo = addDays(record.endedAt, -7);
  const thisWeek = earlierGames.filter(g => g.endedAt >= weekAgo);
  if (thisWeek.length && record.accuracy > GameRecord.bestAccuracy(thisWeek)) return Verdict.WEEK_BEST;
  if (record.accuracy >= 80) return Verdict.STRONG;
  if (record.accuracy >= 50) return Verdict.FAIR;
  return Verdict.KEEP_GOING;
}

const percentOf = ({ mastered, total }) => Math.round((mastered / total) * 100);

/** Bilan présenté au joueur à la fin d'une partie. */
class GameSummary {
  /**
   * @param {{ record: import('./gameRecord.js').GameRecord, verdict: string,
   *           unlocked: import('./achievements.js').AchievementProgress[],
   *           missed: { question: import('./conjugation.js').Question, given: string }[], streak: number,
   *           level: import('./levels.js').Level, before: { mastered: number, total: number },
   *           after: { mastered: number, total: number }, newlyMastered?: import('./conjugation.js').Question[],
   *           levelCompleted?: boolean, nextLevel?: number, gamesLeft?: number, nextGamePercent?: number }} props
   *   `before` / `after` : formes acquises du niveau avant et après la partie ;
   *   `nextLevel` : niveau du joueur après la partie ; `nextGamePercent` : gain estimé d'une prochaine partie
   */
  constructor({ record, verdict, unlocked, missed, streak, level, before, after, newlyMastered = [], levelCompleted = false,
    nextLevel = level.number, gamesLeft = 0, nextGamePercent = 1 }) {
    this.record = record;
    this.verdict = verdict;
    this.unlocked = Object.freeze([...unlocked]);
    /** Questions ratées et réponse donnée, dans l'ordre de la partie. */
    this.missed = Object.freeze([...missed]);
    this.streak = streak;
    /** Niveau dans lequel la partie a été jouée. */
    this.level = level;
    this.percentBefore = percentOf(before);
    this.percentAfter = percentOf(after);
    /** Formes devenues acquises pendant la partie, dans l'ordre où elles ont été posées. */
    this.newlyMastered = Object.freeze([...newlyMastered]);
    this.levelCompleted = levelCompleted;
    this.nextLevel = nextLevel;
    this.gamesLeft = gamesLeft;
    this.nextGamePercent = nextGamePercent;
    Object.freeze(this);
  }

  /** Points de pourcentage gagnés dans le niveau (négatif si des formes ont été perdues). */
  get gainPercent() {
    return this.percentAfter - this.percentBefore;
  }
}

Object.assign(Conjugo, { Verdict, rateGame, GameSummary });
})(globalThis.Conjugo ??= {});
