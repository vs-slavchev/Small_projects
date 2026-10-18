import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LeOuLa } from './game.js';

const { Difficulty, WordStat, WordStatsBook } = LeOuLa;

test('la difficulté démarre à 0, monte et baisse, sans sortir de [0, 100]', () => {
  const d = Difficulty.initial();
  assert.equal(d.value, 0);
  assert.equal(d.afterAnswer(false).value, 0);
  assert.equal(d.afterAnswer(true).value, Difficulty.STEP_UP);
  assert.equal(Difficulty.of(99).afterAnswer(true).value, 100);
  assert.equal(Difficulty.of(50).afterAnswer(false).value, 50 - Difficulty.STEP_DOWN);
});

test('tirage supérieur à la difficulté → mot régulier, sinon exception', () => {
  const d = Difficulty.of(30);
  assert.equal(d.callsForException(31), false);
  assert.equal(d.callsForException(30), true);
  assert.equal(d.callsForException(5), true);
  assert.equal(Difficulty.of(100).callsForException(99.9), true);
});

test('une statistique refuse plus de réussites que de passages', () => {
  assert.throws(() => new WordStat(1, 2));
});

test('les mots les plus faibles excluent les mots jamais vus et ceux à 80 % ou plus', () => {
  const book = new WordStatsBook();
  book.record('a', false);              // 0 %
  book.record('b', true); book.record('b', false); // 50 %
  book.record('c', true);              // 100 % → exclu
  book.record('d', false); for (let i = 0; i < 4; i++) book.record('d', true); // 80 % → exclu
  book.record('e', false); for (let i = 0; i < 3; i++) book.record('e', true); // 75 % → gardé
  assert.deepEqual(book.weakest(['a', 'b', 'c', 'd', 'e', 'jamais-vu'], 20), ['a', 'b', 'e']);
  assert.deepEqual(book.weakest(['a', 'b'], 1), ['a']);
  assert.equal(book.get('a').lastCorrect, false);
});
