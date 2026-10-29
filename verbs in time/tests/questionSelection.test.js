import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, seededRandom, sequence } from './helpers.js';
import { Conjugo } from './game.js';

const {
  QuestionPicker, Person, Tense, AnswerStatsBook, LevelLadder, QUESTION_MIX, CURRENT_MISTAKE_POOL, PREVIOUS_MISTAKE_POOL,
} = Conjugo;

const ladder = LevelLadder.fromData(realBank());
const keyOf = q => `${q.verb.infinitive}|${q.tense.id}|${q.person.index}`;
const draw = (picker, n) => {
  const asked = [];
  for (let i = 0; i < n; i++) asked.push(picker.pick({ asked }));
  return asked;
};
/** Carnet où chaque clé a été ratée `misses` fois sur `seen`. */
function statsWith(entries) {
  const stats = new AnswerStatsBook();
  for (const [key, seen, misses] of entries) {
    for (let i = 0; i < seen; i++) stats.record(key, i >= misses);
  }
  return stats;
}

test('répartition : 60 % niveau en cours, 20 % ses erreurs, 10 % erreurs passées, 10 % révision', () => {
  assert.deepEqual(QUESTION_MIX, { current: 0.6, currentMistakes: 0.2, previousMistakes: 0.1, previousReview: 0.1 });
  assert.equal(Object.values(QUESTION_MIX).reduce((a, b) => a + b, 0), 1);
});

test('au niveau 1, tout vient du niveau en cours, aux six cases de personne', () => {
  const picker = new QuestionPicker({ ladder, level: 1, random: seededRandom(7) });
  const picks = Array.from({ length: 500 }, () => picker.pick());
  assert.ok(picks.every(q => q.tense === Tense.PRESENT && ['parler', 'habiter'].includes(q.verb.infinitive)));
  assert.equal(new Set(picks.map(q => q.person.index)).size, 6);
  assert.equal(new Set(picks.map(q => q.person)).size, Person.ALL.length, 'il, elle et on sont tous posés');
  assert.ok(picks.every(q => q.tense.markers.includes(q.marker)));
});

test('les paniers : les erreurs sont retirées des formes ordinaires, et limitées à 20 et 10', () => {
  const level = ladder.level(9);
  const previous = ladder.before(9).flatMap(l => l.combos);
  const stats = statsWith([
    ...level.combos.slice(0, 3).map(c => [c.key, 2, 1]),
    ...previous.slice(0, 15).map(c => [c.key, 3, 1]),
  ]);
  const b = new QuestionPicker({ ladder, level: 9, stats }).buckets();
  assert.equal(b.currentMistakes.length, 3);
  assert.equal(b.current.length, level.combos.length - 3);
  assert.ok(b.current.every(c => !b.currentMistakes.includes(c)));
  assert.equal(b.previousMistakes.length, PREVIOUS_MISTAKE_POOL);
  assert.equal(b.previousReview.length, previous.length - PREVIOUS_MISTAKE_POOL);
  assert.ok(b.previousReview.every(c => !b.previousMistakes.includes(c)));

  const many = ladder.level(22);
  const crowded = statsWith(many.combos.map(c => [c.key, 2, 1]));
  assert.equal(new QuestionPicker({ ladder, level: 22, stats: crowded }).buckets().currentMistakes.length, CURRENT_MISTAKE_POOL);
});

test('chaque panier est choisi selon le tirage', () => {
  const level = ladder.level(9);
  const previous = ladder.before(9).flatMap(l => l.combos);
  const stats = statsWith([[level.combos[4].key, 1, 1], [previous[7].key, 1, 1]]);
  // tirage du panier, puis forme dans le panier (première), sujet, expression
  const pick = roll => keyOf(new QuestionPicker({ ladder, level: 9, stats, random: sequence(roll, 0, 0, 0) }).pick());
  assert.equal(pick(0.59), level.combos[0].key, 'niveau en cours');
  assert.equal(pick(0.6), level.combos[4].key, 'erreur du niveau en cours');
  assert.equal(pick(0.85), previous[7].key, 'erreur d’un niveau précédent');
  assert.equal(pick(0.95), previous[0].key, 'révision d’un niveau précédent');
});

test('un panier vide renvoie au niveau en cours, puis aux niveaux précédents', () => {
  const pick = roll => new QuestionPicker({ ladder, level: 1, random: sequence(roll, 0, 0, 0) }).pick();
  assert.equal(keyOf(pick(0.95)), 'parler|present|0', 'pas de niveau précédent au niveau 1');
  assert.equal(keyOf(pick(0.7)), 'parler|present|0', 'pas encore d’erreur');
});

test('les proportions se retrouvent sur de nombreux tirages', () => {
  const level = ladder.level(9);
  const previous = ladder.before(9).flatMap(l => l.combos);
  const stats = statsWith([[level.combos[0].key, 2, 2], [previous[0].key, 2, 2]]);
  const picker = new QuestionPicker({ ladder, level: 9, stats, random: seededRandom(11) });
  const picks = Array.from({ length: 4000 }, () => keyOf(picker.pick()));
  const share = test => picks.filter(test).length / picks.length;
  const currentKeys = new Set(level.combos.map(c => c.key));
  assert.ok(Math.abs(share(k => k === level.combos[0].key) - 0.2) < 0.03, 'erreur du niveau en cours ≈ 20 %');
  assert.ok(Math.abs(share(k => k === previous[0].key) - 0.1) < 0.02, 'erreur passée ≈ 10 %');
  assert.ok(Math.abs(share(k => currentKeys.has(k)) - 0.8) < 0.03, 'niveau en cours ≈ 80 % en tout');
});

test('une même forme n’est jamais posée deux fois dans une partie', () => {
  const asked = draw(new QuestionPicker({ ladder, level: 6, random: seededRandom(5) }), 30);
  assert.equal(new Set(asked.map(keyOf)).size, 30, 'au-delà des six formes de finir, les niveaux précédents prennent le relais');
  const single = LevelLadder.fromData(realBank(), [{ tense: 'present', verbs: ['finir'], label: 'Verbes en -ir' }]);
  const picker = new QuestionPicker({ ladder: single, level: 1, random: seededRandom(5) });
  const all = draw(picker, QuestionPicker.MIN_CAPACITY);
  assert.equal(new Set(all.map(keyOf)).size, 6);
  assert.throws(() => picker.pick({ asked: all }), /Plus aucune question/);
});
