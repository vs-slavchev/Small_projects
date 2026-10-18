import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession } from '../src/domain/gameSession.js';
import { Difficulty } from '../src/domain/difficulty.js';
import { Gender } from '../src/domain/gender.js';
import { DomainError } from '../src/domain/errors.js';
import { realBank } from './helpers.js';

const bank = realBank();
/** Distribue les mots de la banque dans l'ordre, en respectant les exclusions. */
const inOrder = ({ excluded }) => bank.words.find(w => !excluded.has(w.text));
const start = (length = 3) => GameSession.start({ length, difficulty: Difficulty.initial(), drawWord: inOrder, now: 0 });
const right = w => w.gender;
const wrong = w => w.gender.opposite;

test('une partie présente un mot, attend la réponse, puis passe au suivant', () => {
  const s = start();
  assert.equal(s.position, 1);
  assert.ok(s.isAwaitingAnswer);
  const { answer, combo, isLastWord } = s.answer(right(s.currentWord), 1000);
  assert.ok(answer.correct);
  assert.equal(combo, 1);
  assert.equal(isLastWord, false);
  s.next(5000);
  assert.equal(s.position, 2);
});

test('on ne peut ni répondre deux fois, ni passer un mot sans répondre', () => {
  const s = start();
  assert.throws(() => s.next(10), DomainError);
  s.answer(Gender.MASCULINE, 10);
  assert.throws(() => s.answer(Gender.MASCULINE, 20), DomainError);
});

test('le combo compte les bonnes réponses d’affilée et retombe à 0 sur une erreur', () => {
  const s = start(4);
  s.answer(right(s.currentWord), 1); s.next(1);
  s.answer(right(s.currentWord), 2); s.next(2);
  assert.equal(s.combo, 2);
  s.answer(wrong(s.currentWord), 3); s.next(3);
  assert.equal(s.combo, 0);
  s.answer(right(s.currentWord), 4);
  assert.equal(s.maxCombo, 2);
});

test('le chrono ne compte que le temps de réflexion', () => {
  const s = start(2);
  s.answer(right(s.currentWord), 3000);      // 3 s de réflexion
  assert.equal(s.thinkingTime(60_000), 3000); // la lecture de l'explication ne compte pas
  s.next(60_000);
  assert.equal(s.thinkingTime(62_000), 5000);
  s.answer(right(s.currentWord), 64_000);
  assert.equal(s.finish(64_000).durationMs, 7000);
});

test('la difficulté évolue à chaque réponse pendant la partie', () => {
  const s = start(2);
  s.answer(right(s.currentWord), 1); s.next(1);
  assert.equal(s.difficulty.value, Difficulty.STEP_UP);
  s.answer(wrong(s.currentWord), 2);
  assert.equal(s.difficulty.value, 0);
});

test('un mot ne revient jamais dans la même partie', () => {
  const s = start(10);
  const seen = new Set([s.currentWord.text]);
  for (let i = 1; i < 10; i++) { s.answer(Gender.MASCULINE, i); s.next(i); seen.add(s.currentWord.text); }
  assert.equal(seen.size, 10);
  const cheating = GameSession.start({ length: 2, difficulty: Difficulty.initial(), drawWord: () => bank.words[0], now: 0 });
  cheating.answer(Gender.MASCULINE, 1);
  assert.throws(() => cheating.next(2), /même partie/);
});

test('la partie ne se clôt qu’une fois tous les mots répondus', () => {
  const s = start(2);
  s.answer(right(s.currentWord), 1);
  assert.throws(() => s.finish(1), DomainError);
  s.next(1);
  s.answer(wrong(s.currentWord), 2);
  assert.ok(s.isComplete);
  assert.throws(() => s.next(3), /terminée/);
  const record = s.finish(10);
  assert.equal(record.accuracy, 50);
  assert.deepEqual(record.missedWords, [bank.words[1].text]);
  assert.equal(record.endedAt.getTime(), 10);
});
