import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conjugo } from './game.js';

const { AnswerStat, AnswerStatsBook, DomainError } = Conjugo;

test('une statistique compte passages et réussites, et retient la dernière réponse', () => {
  const s = AnswerStat.EMPTY.record(true).record(false);
  assert.deepEqual([s.seen, s.correct, s.lastCorrect, s.accuracy], [2, 1, false, 0.5]);
  assert.equal(AnswerStat.EMPTY.accuracy, null);
});

test('une statistique incohérente est refusée', () => {
  assert.throws(() => new AnswerStat(1, 2), DomainError);
  assert.throws(() => new AnswerStat(1, 0, 'false'), DomainError);
  assert.throws(() => new AnswerStat(0, 0, true), DomainError);
  assert.doesNotThrow(() => new AnswerStat(3, 1, null), 'dernière réponse inconnue (ancien format)');
});

test('un carnet produit les statistiques de sa sous-classe', () => {
  class Tagged extends AnswerStat { get tag() { return 'ok'; } }
  class TaggedBook extends AnswerStatsBook { static Stat = Tagged; }
  const book = new TaggedBook();
  assert.equal(book.get('x').tag, 'ok');
  book.record('x', true);
  assert.ok(book.get('x') instanceof Tagged);
  assert.equal(book.get('x').seen, 1);
});

test('acquis : la dernière réponse juste et au moins 60 % de réussite', () => {
  const after = (...answers) => answers.reduce((s, correct) => s.record(correct), AnswerStat.EMPTY);
  assert.equal(AnswerStat.EMPTY.isMastered, false);
  assert.equal(after(true).isMastered, true, 'une seule bonne réponse suffit');
  assert.equal(after(true, false).isMastered, false, 'dernière réponse fausse');
  assert.equal(after(false, true).isMastered, false, '50 % seulement');
  assert.equal(after(true, false, true).isMastered, true, '67 % et dernière juste');
  assert.equal(after(false, false, true, true, true).isMastered, true, 'pile 60 %');
});

test('formes à revoir : déjà ratées, les plus faibles d’abord', () => {
  const book = new AnswerStatsBook();
  const play = (key, ...answers) => answers.forEach(c => book.record(key, c));
  play('jamais-ratée', true, true);
  play('moitié', true, false);
  play('moitié-rattrapée', false, true);
  play('un-tiers', false, true, false);
  play('jamais-réussie', false);
  assert.deepEqual(book.weakest(['jamais-ratée', 'moitié', 'moitié-rattrapée', 'un-tiers', 'jamais-réussie', 'inconnue'], 10),
    ['jamais-réussie', 'un-tiers', 'moitié', 'moitié-rattrapée'], 'à taux égal, la dernière réponse fausse d’abord');
  assert.deepEqual(book.weakest(['moitié', 'jamais-réussie', 'un-tiers'], 2), ['jamais-réussie', 'un-tiers']);
  assert.equal(book.get('moitié').hasMistake, true);
  assert.equal(book.get('jamais-ratée').hasMistake, false);
});
