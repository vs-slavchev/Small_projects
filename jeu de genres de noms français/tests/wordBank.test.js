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

test('devant une voyelle ou un h muet, l’article s’élide et ne révèle plus le genre', () => {
  const bank = realBank();
  assert.equal(bank.word('idée').withArticle, 'l’idée');
  assert.equal(bank.word('église').withArticle, 'l’église');
  assert.equal(bank.word('horizon').withArticle, 'l’horizon');
  assert.equal(bank.word('héroïsme').article, 'l’');
  assert.equal(bank.word('baguette').elides, false);
});

test('un h aspiré empêche l’élision', () => {
  const w = realBank().word('hérisson');
  assert.equal(w.elides, false);
  assert.equal(w.withArticle, 'le hérisson');
  assert.throws(() => new Word({ text: 'baguette', gender: Gender.FEMININE, group: ette, aspiratedH: true }), /h aspiré/);
});

test('un mot en y- ne s\u2019élide pas (le yaourt, le yoga)', () => {
  const t = new WordGroup({ id: 't', suffix: '-t', gender: Gender.MASCULINE, rule: '' });
  const yaourt = new Word({ text: 'yaourt', gender: Gender.MASCULINE, group: t });
  assert.equal(yaourt.elides, false);
  assert.equal(yaourt.withArticle, 'le yaourt');
});

test('un mot en h doit déclarer si son h est aspiré ou muet', () => {
  const on = new WordGroup({ id: 'on', suffix: '-on', gender: Gender.MASCULINE, rule: '' });
  assert.throws(() => new Word({ text: 'haricot', gender: Gender.MASCULINE, group: on }), /aspiré \(asp: true\) ou muet/);
  assert.equal(new Word({ text: 'hameçon', gender: Gender.MASCULINE, group: on, aspiratedH: true }).withArticle, 'le hameçon');
  assert.equal(new Word({ text: 'horizon', gender: Gender.MASCULINE, group: on, aspiratedH: false }).withArticle, 'l\u2019horizon');
});

test('chaque groupe propose au moins un mot à article élidé', () => {
  const bank = realBank();
  for (const group of bank.groups) {
    assert.ok(bank.words.some(w => w.group === group && w.elides), `${group.suffix} : aucun mot en l’`);
  }
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
