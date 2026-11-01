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

/** Bilan présenté au joueur à la fin d'une partie. */
class GameSummary {
  /**
   * @param {{ record: import('./gameRecord.js').GameRecord, verdict: string,
   *           unlocked: import('./achievements.js').AchievementProgress[],
   *           missed: { question: import('./conjugation.js').Question, given: string }[], streak: number,
   *           level: import('./levels.js').Level, newlyMastered: import('./conjugation.js').Question[],
   *           newlyLost?: import('./conjugation.js').Question[], inProgress?: number,
   *           levelCompleted: boolean, levelsPlayed: number, nextLevel: number }} props
   *   `levelsPlayed` : niveaux terminés en jouant (hors placement) ; `nextLevel` : niveau du joueur après la partie
   */
  constructor({ record, verdict, unlocked, missed, streak, level, newlyMastered, newlyLost = [], inProgress = 0, levelCompleted, levelsPlayed, nextLevel }) {
    this.record = record;
    this.verdict = verdict;
    this.unlocked = Object.freeze([...unlocked]);
    /** Questions ratées et réponse donnée, dans l'ordre de la partie. */
    this.missed = Object.freeze([...missed]);
    this.streak = streak;
    /** Niveau dans lequel la partie a été jouée ; les formes acquises avant et après la partie sont dans `record`. */
    this.level = level;
    /** Formes devenues acquises pendant la partie, dans l'ordre où elles ont été posées. */
    this.newlyMastered = Object.freeze([...newlyMastered]);
    /** Formes du niveau qui étaient acquises avant la partie et ne le sont plus (à revoir). */
    this.newlyLost = Object.freeze([...newlyLost]);
    /** Formes du niveau travaillées mais pas encore acquises après la partie. */
    this.inProgress = inProgress;
    this.levelCompleted = levelCompleted;
    this.levelsPlayed = levelsPlayed;
    this.nextLevel = nextLevel;
    Object.freeze(this);
  }
}

Object.assign(Conjugo, { Verdict, rateGame, GameSummary });
})(globalThis.Conjugo ??= {});
