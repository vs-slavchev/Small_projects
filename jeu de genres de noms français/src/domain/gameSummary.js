import { addDays } from './calendar.js';

/** Appréciation d'une partie, du meilleur au moins bon. */
export const Verdict = Object.freeze({
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
export function rateGame(record, earlierGames) {
  if (record.isPerfect) return Verdict.PERFECT;
  const weekAgo = addDays(record.endedAt, -7);
  const thisWeek = earlierGames.filter(g => g.endedAt >= weekAgo).map(g => g.accuracy);
  if (thisWeek.length && record.accuracy > Math.max(...thisWeek)) return Verdict.WEEK_BEST;
  if (record.accuracy >= 80) return Verdict.STRONG;
  if (record.accuracy >= 50) return Verdict.FAIR;
  return Verdict.KEEP_GOING;
}

/** Bilan présenté au joueur à la fin d'une partie. */
export class GameSummary {
  /**
   * @param {{ record: import('./gameRecord.js').GameRecord, verdict: string,
   *           unlocked: import('./achievements.js').AchievementProgress[],
   *           missedWords: import('./wordBank.js').Word[], streak: number }} props
   */
  constructor({ record, verdict, unlocked, missedWords, streak }) {
    this.record = record;
    this.verdict = verdict;
    this.unlocked = Object.freeze([...unlocked]);
    this.missedWords = Object.freeze([...missedWords]);
    this.streak = streak;
    Object.freeze(this);
  }
}
