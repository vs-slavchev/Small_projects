import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank } from './helpers.js';
import { LeOuLa } from './game.js';

const {
  PlayerProfile, GameRecord, ActivityCalendar, ProgressReport, InsightKind, TrendWindow, rateGame, Verdict,
  AchievementFacts, evaluateAchievements, newlyUnlocked, earnedSteps,
} = LeOuLa;

const bank = realBank();
const day = (d, h = 14, m = 0) => new Date(2026, 9, d, h, m);

/** Partie de 10 mots dont `correct` justes. */
function game({ endedAt = day(18), correct = 10, words = bank.words.slice(0, 10), durationMs = 40_000, maxCombo = correct, readMs, difficultyStart = 0 } = {}) {
  return new GameRecord({
    endedAt, durationMs, difficultyStart, difficultyEnd: correct * 4, maxCombo,
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
  assert.deepEqual(report.insight, { kind: InsightKind.RECORD, accuracy: 90, previous: 80 });
  assert.equal(report.recent[0].accuracy, 90);
  assert.equal(report.wordsSeen, 10, 'un mot revu ne compte qu’une fois');
  const more = new ProgressReport([...games, game({ words: bank.words.slice(5, 15) })], day(18));
  assert.equal(more.wordsSeen, 15);
});

test('commentaire de la chronologie : le constat le plus parlant l’emporte', () => {
  const words = bank.words.slice(0, 10);
  // Mots différents à chaque partie, pour qu'aucun piège ne ressorte.
  const fresh = i => bank.words.slice(10 * i, 10 * i + 10);
  const insight = (scores, wordsOf = fresh) => new ProgressReport(scores.map((correct, i) => game({ endedAt: day(1 + i), correct, words: wordsOf(i) })), day(18)).insight;

  assert.deepEqual(insight([5, 5, 5, 8, 8, 8]), { kind: InsightKind.RISING, count: 3, accuracy: 80, delta: 30 },
    'égaler son meilleur score n’est pas un record');
  assert.deepEqual(insight([9, 9, 9, 6]), { kind: InsightKind.DIP, accuracy: 60, average: 83 });

  // Le mot 10 est raté à chaque partie : c'est un piège, et son genre est rappelé.
  const trap = insight([9, 8, 9, 8], () => words);
  assert.equal(trap.kind, InsightKind.TRAP_WORD);
  assert.equal(trap.word, words[9].text);
  assert.equal(trap.misses, 4);
  assert.equal(trap.gender, words[9].gender);
  const noChoice = [0, 1].map(i => new GameRecord({
    endedAt: day(1 + i), durationMs: 40_000, difficultyStart: 0, difficultyEnd: 0, maxCombo: 0,
    answers: [{ word: words[0].text, chosen: undefined, correct: false, timeMs: 1000 }],
  }));
  assert.notEqual(new ProgressReport([...noChoice, noChoice[1]], day(18)).insight.kind, InsightKind.TRAP_WORD,
    'une réponse archivée sans choix ne fait pas planter le commentaire');

  // Sans piège (un mot raté différent à chaque partie), la vitesse ressort.
  const faster = Array.from({ length: 6 }, (_, i) => new GameRecord({
    endedAt: day(1 + i), durationMs: 40_000, difficultyStart: 0, difficultyEnd: 0, maxCombo: 9,
    answers: words.map((w, k) => ({ word: w.text, chosen: k === i ? w.gender.opposite.code : w.gender.code, correct: k !== i, timeMs: i < 3 ? 3000 : 2000 })),
  }));
  assert.deepEqual(new ProgressReport(faster, day(18)).insight, { kind: InsightKind.FASTER, beforeMs: 3000, nowMs: 2000 });

  assert.deepEqual(insight([8, 8, 8]), { kind: InsightKind.STEADY, count: 3, threshold: 70, all: true });
  assert.equal(insight([8, 8, 8], () => words).kind, InsightKind.TRAP_WORD, 'un piège passe avant la régularité');
  assert.deepEqual(insight([5, 4, 5]), { kind: InsightKind.ABOVE_AVERAGE, accuracy: 50 });
  assert.deepEqual(insight([5, 5, 5]), { kind: InsightKind.KEEP_PRACTICING });
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

test('succès : paliers franchis détectés', () => {
  const profile = PlayerProfile.empty();
  const before = evaluateAchievements(AchievementFacts.collect(profile, bank));
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

/** `n` parties identiques, une par jour à partir du jour `from` d'octobre. */
const series = (n, props, from = 1) => Array.from({ length: n }, (_, i) => game({ endedAt: day(from + i), ...props }));

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
  const p = progressAfter('regular', series(10));
  assert.equal(p.value, 10);
  assert.equal(p.tierName, 'Bronze');
});

test('Précision : la plus longue série de parties à 90 % ou plus', () => {
  const at = (d, correct) => game({ endedAt: day(d), correct });
  assert.equal(progressAfter('precision', [at(1, 9), at(2, 10), at(3, 8), at(4, 9), at(5, 9)]).value, 2);
  assert.equal(progressAfter('precision', [at(1, 9), at(2, 10), at(3, 9)]).reached, 1);
});

test('Persévérant : le plus grand nombre de parties jouées en une journée', () => {
  const sameDay = n => Array.from({ length: n }, (_, i) => game({ endedAt: day(18, 8, i) }));
  const p = progressAfter('persistent', [...sameDay(20), ...series(5)]);
  assert.equal(p.value, 20);
  assert.equal(p.tierName, 'Bronze');
  assert.equal(progressAfter('persistent', [...sameDay(19), game({ endedAt: day(19, 8) })]).reached, 0);
});

test('Équilibriste : 90 % sur chaque genre, sur 10 parties d’affilée', () => {
  assert.equal(progressAfter('balanced', series(9)).value, 0, 'moins de 10 parties');
  assert.equal(progressAfter('balanced', series(10)).reached, 1);
  assert.equal(progressAfter('balanced', series(10, { correct: 8 })).reached, 0);
});

test('Sans hâte : chaque anecdote affichée au moins 5 s', () => {
  assert.equal(progressAfter('unhurried', [game({ readMs: 6000 })]).value, 1);
  assert.equal(progressAfter('unhurried', [game({ readMs: 1000 })]).value, 0);
  assert.equal(progressAfter('unhurried', [game()]).value, 0, 'temps de lecture inconnu pour les anciennes parties');
});

test('Maître du groupe : la dernière réponse à chaque mot du groupe est juste', () => {
  const ette = bank.words.filter(w => w.group?.id === 'ette');
  assert.equal(progressAfter('groupMaster', [game({ words: ette, correct: ette.length })]).value, 1);
  assert.equal(progressAfter('groupMaster', [game({ words: ette, correct: ette.length - 1 })]).value, 0);
  const p = progressAfter('groupMaster', [game({ words: ette, correct: ette.length }), game({ endedAt: day(19), words: ette, correct: 0 })]);
  assert.equal(p.value, 1, 'un groupe maîtrisé reste acquis');
});

test('Le h muet : réussir chaque mot en h', () => {
  const hWords = bank.words.filter(w => w.startsWithH);
  const p = progressAfter('silentH', [game({ words: hWords, correct: hWords.length })]);
  assert.equal(p.value, hWords.length);
  assert.ok(p.isComplete);
});

test('Intouchable : 7 parties d’affilée sans faute commencées au-dessus de 95', () => {
  assert.equal(progressAfter('untouchable', series(7, { difficultyStart: 96 })).reached, 1);
  assert.equal(progressAfter('untouchable', series(6, { difficultyStart: 96 })).reached, 0);
  assert.equal(progressAfter('untouchable', series(7, { difficultyStart: 95 })).value, 0, 'il faut dépasser 95');
  assert.equal(progressAfter('untouchable', series(7, { difficultyStart: 100, correct: 9 })).value, 0, 'une erreur suffit');
  const broken = [...series(4, { difficultyStart: 96 }), game({ endedAt: day(5), correct: 9 }), ...series(4, { difficultyStart: 96 }, 6)];
  assert.equal(progressAfter('untouchable', broken).value, 4, 'une partie ratée au milieu remet la série à zéro');
});

test('Pâques et les fêtes mobiles', () => {
  const { easterSunday, holidaysOn } = LeOuLa;
  assert.equal(LeOuLa.dayKey(easterSunday(2024)), '2024-03-31');
  assert.equal(LeOuLa.dayKey(easterSunday(2025)), '2025-04-20');
  assert.equal(LeOuLa.dayKey(easterSunday(2026)), '2026-04-05');
  assert.deepEqual(holidaysOn(new Date(2026, 3, 6, 23, 59)), ['easterMonday']);
  assert.deepEqual(holidaysOn(new Date(2026, 4, 14)), ['ascension']);
  assert.deepEqual(holidaysOn(new Date(2026, 4, 25)), ['pentecost']);
  assert.deepEqual(holidaysOn(new Date(2026, 6, 14)), ['bastilleDay']);
  assert.deepEqual(holidaysOn(new Date(2026, 6, 15)), []);
});

test('succès cachés des jours de fête : invisibles tant qu’ils ne sont pas obtenus', () => {
  const october = progressAfter('holiday-christmas', [game({ endedAt: new Date(2026, 9, 18) })]);
  assert.equal(october.isVisible, false);
  const noel = progressAfter('holiday-christmas', [game({ endedAt: new Date(2025, 11, 25, 10) })]);
  assert.ok(noel.isVisible && noel.isComplete);
  assert.equal(noel.reachedGoal, 'Partie jouée le jour de Noël (25 décembre)');
  assert.ok(progressAfter('flawless', []).isVisible, 'un succès ordinaire reste visible');
});
