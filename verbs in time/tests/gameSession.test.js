import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank } from './helpers.js';
import { JeuxFr } from './game.js';

const { GameSession, Question, Tense, Person, DomainError, DEFAULT_GAME_LENGTH } = JeuxFr;

const bank = realBank();
/** Distribue les verbes de la banque dans l'ordre, au présent avec « nous », en respectant les exclusions. */
const inOrder = ({ excludedVerbs }) => new Question({
  verb: bank.verbs.find(v => !excludedVerbs.has(v.infinitive)), tense: Tense.PRESENT, person: Person.NOUS,
});
const start = (length = 3) => GameSession.start({ length, drawQuestion: inOrder, now: 0 });
const right = s => s.currentQuestion.expected.forms[0];
const WRONG = 'xyz';

test('une partie compte 5 tours par défaut', () => {
  assert.equal(DEFAULT_GAME_LENGTH, 5);
  assert.equal(GameSession.start({ drawQuestion: inOrder, now: 0 }).length, 5);
});

test('une partie présente une question, attend la réponse saisie, puis passe à la suivante', () => {
  const s = start();
  assert.equal(s.position, 1);
  assert.ok(s.isAwaitingAnswer);
  const answer = s.answer(right(s), 1000);
  assert.ok(answer.correct);
  assert.equal(s.lastAnswer, answer);
  assert.equal(s.combo, 1);
  s.next(5000);
  assert.equal(s.position, 2);
});

test('la réponse saisie est vérifiée, sujet facultatif', () => {
  const s = start();
  assert.ok(s.answer('parlons', 1).correct);
  s.next(1);
  const a = s.answer('nous habitons ', 2);
  assert.ok(a.correct);
  assert.equal(a.given, 'nous habitons');
});

test('réponse vide refusée ; on ne peut ni répondre deux fois, ni passer sans répondre', () => {
  const s = start();
  assert.throws(() => s.answer('   ', 1), DomainError);
  assert.throws(() => s.next(10), DomainError);
  s.answer(WRONG, 10);
  assert.throws(() => s.answer(WRONG, 20), DomainError);
});

test('le combo compte les bonnes réponses d’affilée et retombe à 0 sur une erreur', () => {
  const s = start(4);
  s.answer(right(s), 1); s.next(1);
  s.answer(right(s), 2); s.next(2);
  assert.equal(s.combo, 2);
  s.answer(WRONG, 3); s.next(3);
  assert.equal(s.combo, 0);
  s.answer(right(s), 4);
  assert.equal(s.maxCombo, 2);
});

test('le chrono ne compte que le temps de réflexion', () => {
  const s = start(2);
  s.answer(right(s), 3000);
  assert.equal(s.thinkingTime(60_000), 3000);
  s.next(60_000);
  assert.equal(s.thinkingTime(62_000), 5000);
  s.answer(right(s), 64_000);
  assert.equal(s.finish(70_000).durationMs, 7000);
});

test('un verbe ne revient jamais dans la même partie', () => {
  const s = start(5);
  const seen = new Set([s.currentQuestion.verb]);
  for (let i = 1; i < 5; i++) { s.answer(WRONG, i); s.next(i); seen.add(s.currentQuestion.verb); }
  assert.equal(seen.size, 5);
  const same = () => new Question({ verb: bank.verbs[0], tense: Tense.PRESENT, person: Person.JE });
  const cheating = GameSession.start({ length: 2, drawQuestion: same, now: 0 });
  cheating.answer(WRONG, 1);
  assert.throws(() => cheating.next(2), /même partie/);
});

test('la partie ne se clôt qu’une fois toutes les questions répondues', () => {
  const s = start(2);
  s.answer(right(s), 1);
  assert.throws(() => s.finish(1), DomainError);
  s.next(1);
  s.answer('nous habitez', 2);
  assert.ok(s.isComplete);
  assert.throws(() => s.next(3), /terminée/);
  const record = s.finish(10);
  assert.equal(record.accuracy, 50);
  assert.deepEqual(record.missed.map(a => [a.verb, a.tense, a.person, a.given]), [['habiter', 'present', 'nous', 'nous habitez']]);
});
