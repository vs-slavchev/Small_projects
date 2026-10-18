import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Gender } from '../src/domain/gender.js';
import { Word, WordGroup, WordBank } from '../src/domain/wordBank.js';
import { DomainError } from '../src/domain/errors.js';
import { realBank } from './helpers.js';

const ette = new WordGroup({ id: 'ette', suffix: '-ette', gender: Gender.FEMININE, rule: '' });

test('la banque réelle respecte les invariants du domaine', () => {
  const bank = realBank();
  assert.equal(bank.groups.length, 25);
  for (const group of bank.groups) {
    const words = bank.words.filter(w => w.group === group);
    assert.ok(words.filter(w => !w.isException).length >= 2, `${group.suffix} : au moins 2 mots réguliers`);
    assert.ok(words.filter(w => w.isException).length <= 1, `${group.suffix} : au plus une exception`);
  }
});

test('les mots ne commencent ni par une voyelle ni par un h muet (pas d’élision « l’ »)', () => {
  for (const w of realBank().words) assert.doesNotMatch(w.text, /^[aeiouyàâéèêëîïôûh]/i, w.text);
});

test('un mot régulier doit avoir le genre de son groupe', () => {
  assert.throws(() => new Word({ text: 'squelette', gender: Gender.MASCULINE, group: ette }), DomainError);
  assert.ok(new Word({ text: 'squelette', gender: Gender.MASCULINE, group: ette, isException: true }));
});

test('une exception doit avoir le genre opposé à son groupe', () => {
  assert.throws(() => new Word({ text: 'baguette', gender: Gender.FEMININE, group: ette, isException: true }), DomainError);
});

test('la banque refuse les doublons et les groupes inconnus', () => {
  const w = new Word({ text: 'baguette', gender: Gender.FEMININE, group: ette });
  assert.throws(() => new WordBank([ette], [w, w]), /double/);
  const other = new WordGroup({ id: 'age', suffix: '-age', gender: Gender.MASCULINE, rule: '' });
  assert.throws(() => new WordBank([other], [w]), /inconnu/);
});

test('un mot connaît son article et vérifie une réponse', () => {
  const w = realBank().word('baguette');
  assert.equal(w.withArticle, 'la baguette');
  assert.ok(w.isCorrect(Gender.FEMININE));
  assert.ok(!w.isCorrect(Gender.MASCULINE));
});
