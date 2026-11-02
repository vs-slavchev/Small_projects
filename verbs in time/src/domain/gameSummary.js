(function (Conjugo) {
'use strict';

const { addDays, GameRecord } = Conjugo;

const Verdict = Object.freeze({
  PERFECT: 'perfect',
  WEEK_BEST: 'weekBest',
  STRONG: 'strong',
  FAIR: 'fair',
  KEEP_GOING: 'keepGoing',
});

function rateGame(record, earlierGames) {
  if (record.isPerfect) return Verdict.PERFECT;
  const weekAgo = addDays(record.endedAt, -7);
  const thisWeek = earlierGames.filter(g => g.endedAt >= weekAgo);
  if (thisWeek.length && record.accuracy > GameRecord.bestAccuracy(thisWeek)) return Verdict.WEEK_BEST;
  if (record.accuracy >= 80) return Verdict.STRONG;
  if (record.accuracy >= 50) return Verdict.FAIR;
  return Verdict.KEEP_GOING;
}

class GameSummary {
  constructor({ record, verdict, unlocked, missed, streak, level, newlyMastered, newlyLost = [], inProgress = 0, levelCompleted, levelsPlayed, nextLevel }) {
    this.record = record;
    this.verdict = verdict;
    this.unlocked = Object.freeze([...unlocked]);
    this.missed = Object.freeze([...missed]);
    this.streak = streak;
    this.level = level;
    this.newlyMastered = Object.freeze([...newlyMastered]);
    this.newlyLost = Object.freeze([...newlyLost]);
    this.inProgress = inProgress;
    this.levelCompleted = levelCompleted;
    this.levelsPlayed = levelsPlayed;
    this.nextLevel = nextLevel;
    Object.freeze(this);
  }
}

Object.assign(Conjugo, { Verdict, rateGame, GameSummary });
})(globalThis.Conjugo ??= {});
