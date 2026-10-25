import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, seededRandom, sequence } from './helpers.js';
import { Conjugo } from './game.js';

const { QuestionPicker, Tense, Person, DomainError } = Conjugo;

const bank = realBank();

test('le tirage couvre les trois dimensions', () => {
  const picker = new QuestionPicker({ bank, random: seededRandom(7) });
  const verbs = new Set(), tenses = new Set(), persons = new Set();
  for (let i = 0; i < 2000; i++) {
    const q = picker.pick();
    verbs.add(q.verb); tenses.add(q.tense); persons.add(q.person);
  }
  assert.equal(verbs.size, bank.verbs.length);
  assert.equal(tenses.size, Tense.ALL.length);
  assert.equal(persons.size, Person.ALL.length);
});

test('chaque dimension est tirée indépendamment', () => {
  const q = new QuestionPicker({ bank, random: sequence(0, 0.99, 0.5) }).pick();
  assert.equal(q.verb, bank.verbs[0]);
  assert.equal(q.tense, Tense.ALL.at(-1));
  assert.equal(q.person, Person.ALL[4]);
});

test('un verbe déjà proposé n’est pas repris', () => {
  const picker = new QuestionPicker({ bank, random: () => 0 });
  const excludedVerbs = new Set([bank.verbs[0].infinitive]);
  assert.equal(picker.pick({ excludedVerbs }).verb, bank.verbs[1]);
  assert.throws(() => picker.pick({ excludedVerbs: new Set(bank.verbs.map(v => v.infinitive)) }), DomainError);
});
