import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, seededRandom, sequence } from './helpers.js';
import { JeuxFr } from './game.js';

const { QuestionPicker, Question, Tense, Person, AnswerStatsBook, REVIEW_SHARE } = JeuxFr;

const bank = realBank();
const draw = (picker, n) => {
  const asked = [];
  for (let i = 0; i < n; i++) asked.push(picker.pick({ asked }));
  return asked;
};

test('le tirage couvre les trois dimensions et propose une expression de temps', () => {
  const picker = new QuestionPicker({ bank, random: seededRandom(7) });
  const verbs = new Set(), tenses = new Set(), persons = new Set();
  for (let i = 0; i < 2000; i++) {
    const q = picker.pick();
    verbs.add(q.verb); tenses.add(q.tense); persons.add(q.person);
    assert.ok(q.tense.markers.includes(q.marker));
  }
  assert.equal(verbs.size, bank.verbs.length);
  assert.equal(tenses.size, Tense.ALL.length);
  assert.equal(persons.size, Person.ALL.length);
});

test('sans révision, chaque dimension est tirée indépendamment', () => {
  // révision (au-dessus de la part) · couple verbe × temps · personne · expression
  const q = new QuestionPicker({ bank, random: sequence(0.99, 0, 0.5, 0) }).pick();
  assert.equal(q.verb, bank.verbs[0]);
  assert.equal(q.tense, Tense.ALL[0]);
  assert.equal(q.person, Person.ALL[4]);
  assert.equal(q.marker, Tense.ALL[0].markers[0]);
});

test('un verbe ne revient pas tant qu’il en reste d’autres', () => {
  const asked = draw(new QuestionPicker({ bank, random: seededRandom(3) }), 5);
  assert.equal(new Set(asked.map(q => q.verb)).size, 5);
});

test('avec un seul verbe et un seul temps, les personnes changent et rien ne se répète', () => {
  const picker = new QuestionPicker({ bank, random: seededRandom(5), tenses: ['futurSimple'], types: ['pronominal'] });
  const asked = draw(picker, QuestionPicker.MIN_CAPACITY);
  assert.ok(asked.every(q => q.verb.pronominal && q.tense === Tense.FUTUR_SIMPLE));
  assert.equal(new Set(asked.map(q => q.person)).size, QuestionPicker.MIN_CAPACITY);
  assert.throws(() => picker.pick({ asked }), /Plus aucune question/);
});

test('réglages vides ou inconnus : tous les temps et tous les verbes', () => {
  const picker = new QuestionPicker({ bank, random: seededRandom(9), tenses: [], types: ['inconnu'] });
  const asked = Array.from({ length: 500 }, () => picker.pick());
  assert.equal(new Set(asked.map(q => q.tense)).size, Tense.ALL.length);
  assert.equal(new Set(asked.map(q => q.verb)).size, bank.verbs.length);
});

test('révision : une partie des tirages revient sur une conjugaison faible', () => {
  const stats = new AnswerStatsBook();
  stats.record('voir|imperfect', false);
  stats.record('parler|present', true); // acquise : jamais révisée
  const picker = new QuestionPicker({ bank, random: seededRandom(11), stats });
  const picks = Array.from({ length: 1000 }, () => picker.pick());
  const reviewed = picks.filter(q => q.verb.infinitive === 'voir' && q.tense === Tense.IMPERFECT).length / picks.length;
  assert.ok(Math.abs(reviewed - REVIEW_SHARE) < 0.05, `part révisée : ${reviewed}`);
});
