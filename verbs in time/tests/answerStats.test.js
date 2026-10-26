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

test('acquis : au moins trois réponses, la dernière juste, 80 % de réussite', () => {
  const right = n => Array.from({ length: n }).reduce(s => s.record(true), AnswerStat.EMPTY);
  assert.equal(right(1).isMastered, false);
  assert.equal(right(2).isMastered, false);
  assert.equal(right(3).isMastered, true);
  assert.equal(right(3).record(false).isMastered, false);
});
