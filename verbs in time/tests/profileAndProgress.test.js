import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank } from './helpers.js';
import { Conjugo } from './game.js';

const {
  PlayerProfile, GameRecord, ActivityCalendar, ProgressReport, InsightKind, TrendWindow, rateGame, Verdict,
  AchievementFacts, evaluateAchievements, newlyUnlocked, totalSteps, earnedSteps, ACHIEVEMENTS, Tense,
} = Conjugo;

const bank = realBank();
const day = (d, h = 14, m = 0) => new Date(2026, 9, d, h, m);

/** Question archivée : par défaut, les 5 premiers verbes au présent avec « je ». */
const ask = (verb, tense = 'present', person = 'je') => ({ verb, tense, person });
const firstFive = bank.verbs.slice(0, 5).map(v => ask(v.infinitive));

/** Partie de 5 questions dont `correct` justes (les premières). */
function game({ endedAt = day(18), correct = 5, questions = firstFive, durationMs = 40_000, maxCombo = correct, timeMs = 1000 } = {}) {
  return new GameRecord({
    endedAt, durationMs, maxCombo,
    answers: questions.map((q, i) => ({ ...q, given: i < correct ? 'ok' : 'faux', correct: i < correct, timeMs })),
  });
}

test('archiver une partie met à jour statistiques et compteurs', () => {
  const profile = PlayerProfile.empty();
  profile.recordGame(game({ correct: 0 }));
  profile.recordGame(game({ correct: 5 }));
  assert.equal(profile.gameCount, 2);
  const stat = profile.practice.get('parler|present');
  assert.equal(stat.seen, 2);
  assert.equal(stat.accuracy, 0.5);
  assert.equal(profile.recoveries, 5, 'chaque conjugaison ratée puis réussie compte');
});

test('le profil se reconstruit à l’identique depuis son instantané', () => {
  const profile = PlayerProfile.empty();
  profile.recordGame(game({ correct: 3 }));
  const copy = PlayerProfile.fromSnapshot(JSON.parse(JSON.stringify(profile.toSnapshot())));
  assert.deepEqual(copy.toSnapshot(), profile.toSnapshot());
  assert.equal(copy.games[0].accuracy, 60);
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
  const report = new ProgressReport([game({ correct: 3 })], day(18));
  assert.equal(report.isUnlocked, false);
  assert.equal(report.gamesUntilUnlock, 2);
  assert.deepEqual(report.firstAccuracies, [60]);
});

test('rapport de progression : moyenne, tendance et message', () => {
  const games = [game({ endedAt: day(1), correct: 2 }), game({ endedAt: day(15), correct: 4 }), game({ endedAt: day(18), correct: 5 })];
  const report = new ProgressReport(games, day(18));
  assert.ok(report.isUnlocked);
  assert.equal(report.averageAccuracy, 73);
  assert.deepEqual(report.trend, { delta: 50, window: TrendWindow.TWO_WEEKS });
  assert.deepEqual(report.insight, { kind: InsightKind.RECORD, accuracy: 100, previous: 80 });
  assert.equal(report.recent[0].accuracy, 100);
  assert.equal(report.questionsSeen, 15);
});

test('commentaire de la chronologie : le constat le plus parlant l’emporte', () => {
  // Verbes différents à chaque partie, pour qu'aucun piège ne ressorte.
  const fresh = i => Array.from({ length: 5 }, (_, k) => ask(bank.verbs[(5 * i + k) % bank.verbs.length].infinitive, Tense.ALL[i % 5].id));
  const insight = (scores, questionsOf = fresh) =>
    new ProgressReport(scores.map((correct, i) => game({ endedAt: day(1 + i), correct, questions: questionsOf(i) })), day(18)).insight;

  assert.deepEqual(insight([2, 2, 2, 4, 4, 4]), { kind: InsightKind.RISING, count: 3, accuracy: 80, delta: 40 });
  assert.deepEqual(insight([5, 5, 5, 3]), { kind: InsightKind.DIP, accuracy: 60, average: 90 });

  // La 5e question (avoir… au présent) est ratée à chaque partie : c'est un piège.
  const trap = insight([4, 4, 4, 4], () => firstFive);
  assert.equal(trap.kind, InsightKind.TRAP);
  assert.equal(trap.verb, firstFive[4].verb);
  assert.equal(trap.tense, 'present');
  assert.equal(trap.misses, 4);

  const faster = Array.from({ length: 6 }, (_, i) => game({ endedAt: day(1 + i), correct: 4, questions: fresh(i), timeMs: i < 3 ? 3000 : 2000 }));
  assert.deepEqual(new ProgressReport(faster, day(18)).insight, { kind: InsightKind.FASTER, beforeMs: 3000, nowMs: 2000 });

  assert.deepEqual(insight([4, 4, 4]), { kind: InsightKind.STEADY, count: 3, threshold: 70, all: true });
  assert.equal(insight([4, 4, 4], () => firstFive).kind, InsightKind.TRAP, 'un piège passe avant la régularité');
  assert.deepEqual(insight([3, 2, 3]), { kind: InsightKind.ABOVE_AVERAGE, accuracy: 60 });
  assert.deepEqual(insight([3, 3, 3]), { kind: InsightKind.KEEP_PRACTICING });
});

test('verdict de fin de partie', () => {
  const earlier = [game({ endedAt: day(16), correct: 3 })];
  assert.equal(rateGame(game({ correct: 5 }), earlier), Verdict.PERFECT);
  assert.equal(rateGame(game({ correct: 4 }), earlier), Verdict.WEEK_BEST);
  assert.equal(rateGame(game({ correct: 3 }), earlier), Verdict.FAIR, 'égaler son score n\u2019est pas un record');
  assert.equal(rateGame(game({ correct: 1 }), [game({ endedAt: day(17), correct: 1 })]), Verdict.KEEP_GOING);
  assert.equal(rateGame(game({ correct: 2 }), []), Verdict.KEEP_GOING);
});

test('succès : paliers franchis détectés après une partie', () => {
  const profile = PlayerProfile.empty();
  const before = evaluateAchievements(AchievementFacts.collect(profile, bank));
  assert.equal(earnedSteps(before), 0);
  assert.equal(totalSteps(before), ACHIEVEMENTS.reduce((n, a) => n + (typeof a.thresholds === 'function' ? a.thresholds({ typeCount: 0, verbCount: 0 }).length : a.thresholds.length), 0));
  profile.recordGame(game({ correct: 5, durationMs: 50_000 }));
  const after = evaluateAchievements(AchievementFacts.collect(profile, bank));
  const unlocked = newlyUnlocked(before, after).map(p => `${p.id}:${p.reached}`);
  assert.deepEqual(unlocked.sort(), ['collector:1', 'combo:3', 'flawless:1', 'lightning:2'].sort());
  const lightning = after.find(p => p.id === 'lightning');
  assert.equal(lightning.tierName, 'Argent');
  assert.equal(lightning.nextThreshold, 35);
});

test('succès à palier unique : obtenu → affiché en Or', () => {
  const profile = PlayerProfile.empty();
  profile.recordGame(game({ endedAt: day(18, 1) })); // 1 h du matin
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
  for (const g of games) profile.recordGame(g);
  return evaluateAchievements(AchievementFacts.collect(profile, bank)).find(p => p.id === id);
}

test('Éclair : seules les parties à 80 % ou plus comptent', () => {
  assert.equal(progressAfter('lightning', [game({ correct: 3, durationMs: 10_000 })]).value, null);
  assert.equal(progressAfter('lightning', [game({ correct: 4, durationMs: 10_000 })]).reached, 3);
});

test('Lève-tôt : une partie finie entre 5 h et 8 h', () => {
  assert.equal(progressAfter('earlyBird', [game({ endedAt: day(18, 6) })]).reached, 1);
  assert.equal(progressAfter('earlyBird', [game({ endedAt: day(18, 8) })]).reached, 0);
  assert.equal(progressAfter('earlyBird', [game({ endedAt: day(18, 4) })]).reached, 0, 'avant 5 h, c’est Noctambule');
});

test('Précision : la plus longue série de parties à 80 % ou plus', () => {
  const at = (d, correct) => game({ endedAt: day(d), correct });
  assert.equal(progressAfter('precision', [at(1, 4), at(2, 5), at(3, 3), at(4, 4), at(5, 4)]).value, 2);
  assert.equal(progressAfter('precision', [at(1, 4), at(2, 5), at(3, 4)]).reached, 1);
});

test('Persévérant : le plus grand nombre de parties jouées en une journée', () => {
  const sameDay = n => Array.from({ length: n }, (_, i) => game({ endedAt: day(18, 8, i) }));
  assert.equal(progressAfter('persistent', [...sameDay(5), ...series(3)]).tierName, 'Bronze');
  assert.equal(progressAfter('persistent', sameDay(4)).reached, 0);
});

test('Explorateur : un verbe réussi dans chaque groupe', () => {
  const oneOfEach = bank.types.map(t => ask(bank.verbs.find(v => v.type === t).infinitive));
  assert.ok(progressAfter('explorer', [game({ questions: oneOfEach, correct: oneOfEach.length })]).isComplete);
  assert.equal(progressAfter('explorer', [game({ questions: oneOfEach, correct: 1 })]).value, 1);
});

test('Voyageur du temps : compté sur le temps le moins réussi', () => {
  const allTenses = Tense.ALL.map(t => ask('parler', t.id));
  assert.equal(progressAfter('timeTraveler', series(3, { questions: allTenses })).reached, 1);
  assert.equal(progressAfter('timeTraveler', series(3, { questions: allTenses, correct: 4 })).value, 0);
});

test('Polyvalent : 80 % à chaque temps, sur 10 parties d’affilée', () => {
  const allTenses = Tense.ALL.map(t => ask('finir', t.id));
  assert.equal(progressAfter('balanced', series(9, { questions: allTenses })).value, 0, 'moins de 10 parties');
  assert.equal(progressAfter('balanced', series(10, { questions: allTenses })).reached, 1);
  assert.equal(progressAfter('balanced', series(10, { questions: allTenses, correct: 4 })).reached, 0);
});

test('Miroir, Accord parfait et Dompteur : selon le type de verbe et l’auxiliaire', () => {
  const q = [ask('lever', 'passeCompose', 'elle'), ask('aller', 'passeCompose'), ask('être'), ask('parler', 'passeCompose'), ask('faire')];
  const games = series(3, { questions: q });
  assert.equal(progressAfter('mirror', games).value, 3);
  assert.equal(progressAfter('agreement', games).value, 6, 'se lever et aller, avec être');
  assert.equal(progressAfter('tamer', games).value, 9, 'aller, être, faire');
});

test('Pâques et les fêtes mobiles', () => {
  const { easterSunday, holidaysOn } = Conjugo;
  assert.equal(Conjugo.dayKey(easterSunday(2024)), '2024-03-31');
  assert.equal(Conjugo.dayKey(easterSunday(2025)), '2025-04-20');
  assert.equal(Conjugo.dayKey(easterSunday(2026)), '2026-04-05');
  assert.deepEqual(holidaysOn(new Date(2026, 3, 6, 23, 59)), ['easterMonday']);
  assert.deepEqual(holidaysOn(new Date(2026, 4, 14)), ['ascension']);
  assert.deepEqual(holidaysOn(new Date(2026, 4, 25)), ['pentecost']);
  assert.deepEqual(holidaysOn(new Date(2026, 6, 14)), ['bastilleDay']);
  assert.deepEqual(holidaysOn(new Date(2026, 6, 15)), []);
});

test('succès cachés : 18 jours de fête, invisibles tant qu’ils ne sont pas obtenus', () => {
  const hidden = Conjugo.ACHIEVEMENTS.filter(a => a.hidden);
  assert.equal(hidden.length, Conjugo.HOLIDAYS.length);
  const october = progressAfter('holiday-christmas', [game({ endedAt: new Date(2026, 9, 18) })]);
  assert.equal(october.isVisible, false);
  const noel = progressAfter('holiday-christmas', [game({ endedAt: new Date(2025, 11, 25, 10) })]);
  assert.ok(noel.isVisible && noel.isComplete);
  assert.equal(noel.reachedGoal, 'Partie jouée le jour de Noël (25 décembre)');
  assert.ok(progressAfter('flawless', []).isVisible, 'un succès ordinaire reste visible');
});
