import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank } from './helpers.js';
import { LeOuLa } from './game.js';

const {
  PlayerProfile, GameRecord, ActivityCalendar, ProgressReport, InsightKind, TrendWindow, rateGame, Verdict,
  AchievementFacts, evaluateAchievements, newlyUnlocked, totalSteps, earnedSteps,
} = LeOuLa;

const bank = realBank();
const day = (d, h = 14) => new Date(2026, 9, d, h, 0);

/** Partie de 10 mots dont `correct` justes. */
function game({ endedAt = day(18), correct = 10, words = bank.words.slice(0, 10), durationMs = 40_000, maxCombo = correct, readMs } = {}) {
  return new GameRecord({
    endedAt, durationMs, difficultyStart: 0, difficultyEnd: correct * 4, maxCombo,
    answers: words.map((w, i) => ({ word: w.text, chosen: i < correct ? w.gender.code : w.gender.opposite.code, correct: i < correct, timeMs: 1000, readMs })),
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
  assert.equal(rateGame(game({ correct: 6 }), earlier), Verdict.FAIR, 'égaler son score n\u2019est pas un record');
  assert.equal(rateGame(game({ correct: 3 }), [game({ endedAt: day(17), correct: 3 })]), Verdict.KEEP_GOING);
  assert.equal(rateGame(game({ correct: 5 }), earlier), Verdict.FAIR);
  assert.equal(rateGame(game({ correct: 2 }), []), Verdict.KEEP_GOING);
});

test('succès : 50 paliers au total, paliers franchis détectés', () => {
  const profile = PlayerProfile.empty();
  const before = evaluateAchievements(AchievementFacts.collect(profile, bank));
  assert.equal(totalSteps(before), 50);
  assert.equal(earnedSteps(before), 0);
  profile.recordGame(game({ correct: 10, durationMs: 12_000 }), bank);
  const after = evaluateAchievements(AchievementFacts.collect(profile, bank));
  const unlocked = newlyUnlocked(before, after).map(p => `${p.id}:${p.reached}`);
  assert.deepEqual(unlocked.sort(), ['combo:3', 'flawless:1', 'groupMaster:1', 'lightning:2'].sort());
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

/** Succès `id` après avoir archivé `games` dans un profil vide. */
function progressAfter(id, games) {
  const profile = PlayerProfile.empty();
  for (const g of games) profile.recordGame(g, bank);
  return evaluateAchievements(AchievementFacts.collect(profile, bank)).find(p => p.id === id);
}

test('Lève-tôt : une partie finie entre 5 h et 8 h', () => {
  assert.equal(progressAfter('earlyBird', [game({ endedAt: day(18, 6) })]).reached, 1);
  assert.equal(progressAfter('earlyBird', [game({ endedAt: day(18, 8) })]).reached, 0);
  assert.equal(progressAfter('earlyBird', [game({ endedAt: day(18, 4) })]).reached, 0, 'avant 5 h, c’est Noctambule');
});

test('Habitué : nombre de parties jouées', () => {
  const p = progressAfter('regular', Array.from({ length: 10 }, (_, i) => game({ endedAt: day(1 + i) })));
  assert.equal(p.value, 10);
  assert.equal(p.tierName, 'Bronze');
});

test('Précision : la plus longue série de parties à 90 % ou plus', () => {
  const at = (d, correct) => game({ endedAt: day(d), correct });
  assert.equal(progressAfter('precision', [at(1, 9), at(2, 10), at(3, 8), at(4, 9), at(5, 9)]).value, 2);
  assert.equal(progressAfter('precision', [at(1, 9), at(2, 10), at(3, 9)]).reached, 1);
});

test('Persévérant : faire mieux juste après une partie sous 70 %', () => {
  const failed = game({ endedAt: day(18, 14), correct: 5 });
  assert.equal(progressAfter('persistent', [failed, game({ endedAt: new Date(2026, 9, 18, 14, 10), correct: 8 })]).value, 1);
  assert.equal(progressAfter('persistent', [failed, game({ endedAt: new Date(2026, 9, 18, 14, 30), correct: 8 })]).value, 0, 'trop tard');
  assert.equal(progressAfter('persistent', [failed, game({ endedAt: new Date(2026, 9, 18, 14, 10), correct: 5 })]).value, 0, 'pas mieux');
});

test('Équilibriste : 90 % sur chaque genre, sur 10 parties d’affilée', () => {
  const games = correct => Array.from({ length: 10 }, (_, i) => game({ endedAt: day(1 + i), correct }));
  assert.equal(progressAfter('balanced', games(10).slice(0, 9)).value, 0, 'moins de 10 parties');
  assert.equal(progressAfter('balanced', games(10)).reached, 1);
  assert.equal(progressAfter('balanced', games(8)).reached, 0);
});

test('Sans hâte : chaque anecdote affichée au moins 5 s', () => {
  assert.equal(progressAfter('unhurried', [game({ readMs: 6000 })]).value, 1);
  assert.equal(progressAfter('unhurried', [game({ readMs: 1000 })]).value, 0);
  assert.equal(progressAfter('unhurried', [game()]).value, 0, 'temps de lecture inconnu pour les anciennes parties');
});

test('Maître du groupe : la dernière réponse à chaque mot du groupe est juste', () => {
  const ette = bank.words.filter(w => w.group.id === 'ette');
  assert.equal(progressAfter('groupMaster', [game({ words: ette, correct: ette.length })]).value, 1);
  assert.equal(progressAfter('groupMaster', [game({ words: ette, correct: ette.length - 1 })]).value, 0);
  const p = progressAfter('groupMaster', [game({ words: ette, correct: ette.length }), game({ endedAt: day(19), words: ette, correct: 0 })]);
  assert.equal(p.value, 1, 'un groupe maîtrisé reste acquis');
});

test('Le h muet : réussir chaque mot en h', () => {
  const hWords = bank.words.filter(w => /^h/.test(w.text));
  const p = progressAfter('silentH', [game({ words: hWords, correct: hWords.length })]);
  assert.equal(p.value, hWords.length);
  assert.ok(p.isComplete);
});
