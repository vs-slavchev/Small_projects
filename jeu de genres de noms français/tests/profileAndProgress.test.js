import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlayerProfile } from '../src/domain/playerProfile.js';
import { GameRecord } from '../src/domain/gameRecord.js';
import { ActivityCalendar } from '../src/domain/calendar.js';
import { ProgressReport, InsightKind, TrendWindow } from '../src/domain/progressReport.js';
import { rateGame, Verdict } from '../src/domain/gameSummary.js';
import { AchievementFacts, evaluateAchievements, newlyUnlocked, totalSteps, earnedSteps } from '../src/domain/achievements.js';
import { realBank } from './helpers.js';

const bank = realBank();
const day = (d, h = 14) => new Date(2026, 9, d, h, 0);

/** Partie de 10 mots dont `correct` justes. */
function game({ endedAt = day(18), correct = 10, words = bank.words.slice(0, 10), durationMs = 40_000, maxCombo = correct } = {}) {
  return new GameRecord({
    endedAt, durationMs, difficultyStart: 0, difficultyEnd: correct * 4, maxCombo,
    answers: words.map((w, i) => ({ word: w.text, chosen: i < correct ? w.gender.code : w.gender.opposite.code, correct: i < correct, timeMs: 1000 })),
  });
}

test('archiver une partie met à jour statistiques, difficulté et compteurs', () => {
  const profile = PlayerProfile.empty();
  const words = bank.words.slice(0, 10);
  profile.recordGame(game({ correct: 0, words }), bank);
  profile.recordGame(game({ correct: 10, words }), bank);
  assert.equal(profile.gameCount, 2);
  assert.equal(profile.wordStats.get(words[0].text).seen, 2);
  assert.equal(profile.wordStats.get(words[0].text).accuracy, 0.5);
  assert.equal(profile.recoveries, 10, 'chaque mot raté puis réussi compte');
  assert.equal(profile.anecdotesRead, 2 * words.filter(w => w.anecdote).length);
  assert.equal(profile.difficulty.value, 40);
});

test('le profil se reconstruit à l’identique depuis son instantané', () => {
  const profile = PlayerProfile.empty();
  profile.recordGame(game({ correct: 7 }), bank);
  const copy = PlayerProfile.fromSnapshot(JSON.parse(JSON.stringify(profile.toSnapshot())));
  assert.deepEqual(copy.toSnapshot(), profile.toSnapshot());
  assert.equal(copy.games[0].accuracy, 70);
});

test('série quotidienne : en cours jusqu’à hier, la plus longue est conservée', () => {
  const cal = new ActivityCalendar([day(10), day(11), day(12), day(16), day(17)]);
  assert.equal(cal.currentStreak(day(18)), 2, 'pas encore joué aujourd’hui : la série tient');
  assert.equal(cal.currentStreak(day(19)), 0);
  assert.equal(cal.longestStreak(), 3);
  const week = cal.week(day(18)); // dimanche 18 octobre 2026
  assert.equal(week.length, 7);
  assert.equal(week[0].date.getDay(), 1, 'la semaine commence lundi');
  assert.ok(week[6].isToday);
  assert.deepEqual(week.map(d => d.played), [true, false, false, false, true, true, false]);
});

test('la chronologie est verrouillée avant 3 parties', () => {
  const report = new ProgressReport([game({ correct: 7 })], day(18));
  assert.equal(report.isUnlocked, false);
  assert.equal(report.gamesUntilUnlock, 2);
  assert.deepEqual(report.firstAccuracies, [70]);
});

test('rapport de progression : moyenne, tendance et message', () => {
  const games = [game({ endedAt: day(1), correct: 4 }), game({ endedAt: day(15), correct: 8 }), game({ endedAt: day(18), correct: 9 })];
  const report = new ProgressReport(games, day(18));
  assert.ok(report.isUnlocked);
  assert.equal(report.averageAccuracy, 70);
  assert.deepEqual(report.trend, { delta: 45, window: TrendWindow.TWO_WEEKS });
  assert.deepEqual(report.insight, { kind: InsightKind.STEADY, count: 2, threshold: 70, all: false });
  assert.equal(report.recent[0].accuracy, 90);
  assert.equal(report.wordsSeen, 30);
});

test('verdict de fin de partie', () => {
  const earlier = [game({ endedAt: day(16), correct: 6 })];
  assert.equal(rateGame(game({ correct: 10 }), earlier), Verdict.PERFECT);
  assert.equal(rateGame(game({ correct: 7 }), earlier), Verdict.WEEK_BEST);
  assert.equal(rateGame(game({ correct: 5 }), earlier), Verdict.FAIR);
  assert.equal(rateGame(game({ correct: 2 }), []), Verdict.KEEP_GOING);
});

test('succès : 32 paliers au total, paliers franchis détectés', () => {
  const profile = PlayerProfile.empty();
  const before = evaluateAchievements(AchievementFacts.collect(profile, bank));
  assert.equal(totalSteps(before), 32);
  assert.equal(earnedSteps(before), 0);
  profile.recordGame(game({ correct: 10, durationMs: 12_000 }), bank);
  const after = evaluateAchievements(AchievementFacts.collect(profile, bank));
  const unlocked = newlyUnlocked(before, after).map(p => `${p.id}:${p.reached}`);
  assert.deepEqual(unlocked.sort(), ['combo:3', 'flawless:1', 'lightning:2'].sort());
  const lightning = after.find(p => p.id === 'lightning');
  assert.equal(lightning.tierName, 'Argent');
  assert.equal(lightning.nextThreshold, 8);
});

test('succès à palier unique : obtenu → affiché en Or', () => {
  const profile = PlayerProfile.empty();
  profile.recordGame(game({ endedAt: day(18, 1) }), bank); // 1 h du matin
  const owl = evaluateAchievements(AchievementFacts.collect(profile, bank)).find(p => p.id === 'nightOwl');
  assert.equal(owl.reached, 1);
  assert.equal(owl.tier, 3);
  assert.ok(owl.isComplete);
});
