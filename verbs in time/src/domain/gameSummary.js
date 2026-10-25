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
   *           missed: { question: import('./conjugation.js').Question, given: string }[], streak: number }} props
   */
  constructor({ record, verdict, unlocked, missed, streak }) {
    this.record = record;
    this.verdict = verdict;
    this.unlocked = Object.freeze([...unlocked]);
    /** Questions ratées et réponse donnée, dans l'ordre de la partie. */
    this.missed = Object.freeze([...missed]);
    this.streak = streak;
    Object.freeze(this);
  }
}

Object.assign(Conjugo, { Verdict, rateGame, GameSummary });
})(globalThis.JeuxFr ??= {});
