import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, sequence, seededRandom } from './helpers.js';
import { Conjugo } from './game.js';

const {
  LevelLadder, LEVEL_DATA, Tense, AnswerStatsBook, PlacementTest, PlayerProfile, GameRecord, homeOverview, levelPace, HomeState, DomainError,
} = Conjugo;

const bank = realBank();
const ladder = LevelLadder.fromData(bank);
const day = (d, h = 14) => new Date(2026, 9, d, h);

test('22 niveaux : présent, passé composé, futur proche, imparfait, futur simple', () => {
  assert.equal(ladder.count, 22);
  const tenses = ladder.levels.map(l => l.tense.id);
  assert.deepEqual([...new Set(tenses)], ['present', 'passeCompose', 'futurProche', 'imperfect', 'futurSimple']);
  assert.equal(ladder.level(6).title, 'finir');
  assert.equal(ladder.level(12).title, 'aller', 'aller seul au passé composé : il prend être');
  assert.equal(ladder.level(13).title, 'faire, prendre');
  assert.equal(ladder.level(1).combos.length, 12, 'deux verbes × six cases');
  assert.deepEqual(ladder.before(3).map(l => l.number), [1, 2]);
  assert.throws(() => ladder.level(23), DomainError);
  assert.deepEqual(ladder.level(6).span, { from: 'je finis', to: 'elles finissent' });
  assert.deepEqual(ladder.level(13).span, { from: 'j’ai fait', to: 'elles ont pris' });
  assert.equal(ladder.level(4).verbList, 'aller, faire et prendre');
  assert.equal(ladder.level(3).verbList, 'être et avoir');
  assert.equal(ladder.level(6).verbList, 'finir');
  assert.deepEqual(levelPace([], ladder.level(6), 6), { gamesLeft: 0, nextGamePercent: 0 }, 'niveau acquis : rien à gagner');
});

test('données de niveau invalides refusées au chargement', () => {
  assert.throws(() => LevelLadder.fromData(bank, [{ tense: 'present', verbs: ['lever'], label: 'x' }]), /verbe inconnu/);
  assert.throws(() => LevelLadder.fromData(bank, [{ tense: 'subjonctif', verbs: ['parler'], label: 'x' }]), /temps inconnu/);
  assert.throws(() => LevelLadder.fromData(bank, []), /Aucun niveau/);
  assert.equal(LEVEL_DATA.length, 22);
});

test('progression d’un niveau : formes acquises sur formes du niveau', () => {
  const level = ladder.level(6);
  const stats = new AnswerStatsBook();
  assert.deepEqual(level.progress(stats), { mastered: 0, total: 6 });
  level.combos.slice(0, 3).forEach(c => stats.record(c.key, true));
  stats.record(level.combos[3].key, false);
  assert.equal(level.progress(stats).mastered, 3);
  level.combos.forEach(c => stats.record(c.key, true));
  assert.equal(level.progress(stats).mastered, 5, '50 % : la forme ratée n’est pas encore acquise');
  stats.record(level.combos[3].key, true);
  assert.equal(level.progress(stats).mastered, level.progress(stats).total, 'niveau terminé');
});

/** Test de placement où le joueur connaît tout jusqu'au niveau `known` inclus. */
function runPlacement(known, random = seededRandom(3)) {
  const placement = new PlacementTest({ ladder, random });
  let questions = 0;
  while (!placement.isComplete) {
    const q = placement.currentQuestion;
    const level = ladder.levels.findIndex(l => l.tense === q.tense && l.verbs.includes(q.verb)) + 1;
    // Une forme appartient parfois à plusieurs niveaux : on se fie à la position du niveau testé.
    const right = level <= known;
    if (right) placement.answer(q.expected.forms[0]);
    else placement.skip();
    questions++;
  }
  return { result: placement.result, questions, maxLength: placement.maxLength };
}

test('placement : la recherche trouve le premier niveau non connu, en 10 questions au plus', () => {
  for (const known of [0, 1, 5, 8, 13, 21, 22]) {
    const { result, questions, maxLength } = runPlacement(known);
    assert.equal(result, Math.min(known + 1, 22), `connu jusqu’au niveau ${known}`);
    assert.ok(questions <= maxLength && maxLength === 10, `${questions} questions`);
  }
});

test('placement : une erreur ou « je ne sais pas » fait chercher plus bas, sans rien enregistrer', () => {
  const placement = new PlacementTest({ ladder, random: sequence(0) });
  assert.equal(placement.currentQuestion.tense, ladder.level(11).tense, 'premier niveau testé : le milieu du parcours');
  placement.answer('xyz');
  assert.equal(placement.position, 2);
  assert.throws(() => placement.result, /pas terminé/);
});

test('placement : deux formes justes du même niveau avant de monter', () => {
  const placement = new PlacementTest({ ladder, random: sequence(0) });
  const first = placement.currentQuestion;
  placement.answer(first.expected.forms[0]);
  const second = placement.currentQuestion;
  assert.equal(second.tense, first.tense, 'même niveau');
  assert.notEqual(`${second.verb.infinitive}|${second.person.index}`, `${first.verb.infinitive}|${first.person.index}`);
});

/** Profil au niveau `level`, avec des parties datées et leurs gains de formes. */
function profileWith({ level = 6, games = [], mastered = 0 } = {}) {
  const profile = PlayerProfile.empty();
  profile.startAt(level, day(1));
  const current = ladder.level(level);
  for (const [d, before, after] of games) {
    profile.recordGame(new GameRecord({
      endedAt: day(d), durationMs: 1, maxCombo: 0, level, masteredBefore: before, masteredAfter: after,
      answers: [{ verb: current.verbs[0].infinitive, tense: current.tense.id, person: 'je', given: 'x', correct: true, timeMs: 1 }],
    }));
  }
  // Formes acquises au moment de l'accueil.
  current.combos.forEach((c, i) => profile.practice.record(c.key, i < mastered));
  return profile;
}

test('accueil : l’état dépend du dernier jour joué', () => {
  const at = (games, now) => homeOverview(profileWith({ games }), ladder, now).state;
  assert.equal(at([[18, 0, 1]], day(18, 20)), HomeState.PLAYED_TODAY);
  assert.equal(at([[17, 0, 1]], day(18)), HomeState.NOT_YET_TODAY);
  assert.equal(at([], day(18)), HomeState.NOT_YET_TODAY, 'tout juste placé');
  assert.equal(at([[16, 0, 1]], day(18)), HomeState.BACK, '1 jour sans jouer');
  assert.equal(at([[11, 0, 1]], day(18)), HomeState.BACK, '6 jours sans jouer');
  assert.equal(at([[10, 0, 1]], day(18)), HomeState.AWAY, 'une semaine');
  assert.equal(at([[19, 0, 1]], day(18)), HomeState.PLAYED_TODAY, 'horloge reculée : pas de « Content de vous revoir »');
});

test('accueil : gain du jour, rythme et parties restantes', () => {
  // Niveau 6 (finir, 6 formes) : 2 formes acquises aujourd'hui, 4 en tout.
  const profile = profileWith({ games: [[17, 0, 2], [18, 2, 3], [18, 3, 4]], mastered: 4 });
  const home = homeOverview(profile, ladder, day(18, 20));
  assert.equal(home.percent, 67);
  assert.equal(home.todayPercent, 33, 'deux formes sur six, arrondi une seule fois');
  assert.equal(home.formsToday, 2);
  assert.equal(home.formsMastered, ladder.before(6).reduce((n, l) => n + l.combos.length, 0) + 4, 'niveaux validés + formes du niveau');
  assert.equal(home.gamesLeft, 2, '2 formes restantes, 4/3 de forme par partie');
  assert.equal(home.nextGamePercent, 22);
  assert.equal(home.week.find(d => d.isToday).gainPercent, 33);
  assert.deepEqual(home.journey.map(h => h.level.number), [5, 4, 3, 2, 1], 'du plus récent au plus ancien');
});

test('accueil : sans partie dans le niveau, une partie est estimée à deux formes', () => {
  const home = homeOverview(profileWith(), ladder, day(18));
  assert.equal(home.gamesLeft, 3);
  assert.equal(home.nextGamePercent, 33);
  assert.equal(home.todayPercent, 0);
  assert.equal(home.isLevelComplete, false);
});

test('placement : réponse absente comptée fausse ; après la fin, une erreur claire', () => {
  const placement = new PlacementTest({ ladder, random: sequence(0) });
  placement.answer(undefined);
  assert.equal(placement.position, 2, 'réponse absente : fausse, question suivante');
  while (!placement.isComplete) placement.skip();
  assert.throws(() => placement.answer('je parle'), /terminé/);
  assert.throws(() => placement.skip(), /terminé/);
});

test('accueil : une partie d’un niveau qui n’existe plus, ou aux comptes impossibles, est ignorée', () => {
  const profile = profileWith({ games: [[18, 0, 2]] });
  profile.recordGame(new GameRecord({
    endedAt: day(18), durationMs: 1, maxCombo: 0, level: 40, masteredBefore: 0, masteredAfter: 3,
    answers: [{ verb: 'finir', tense: 'present', person: 'je', given: 'x', correct: true, timeMs: 1 }],
  }));
  profile.recordGame(new GameRecord({
    endedAt: day(18), durationMs: 1, maxCombo: 0, level: 6, masteredBefore: 0, masteredAfter: 999,
    answers: [{ verb: 'finir', tense: 'present', person: 'je', given: 'x', correct: true, timeMs: 1 }],
  }));
  const home = homeOverview(profile, ladder, day(18, 20));
  assert.equal(home.todayPercent, 33, 'comptes plus grands que le niveau : partie ignorée');
  assert.equal(ladder.has(40), false);
  assert.ok(ladder.has(22));
});
