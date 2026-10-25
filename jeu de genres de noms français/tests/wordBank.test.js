import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank } from './helpers.js';
import { JeuxFr } from './game.js';

const { Gender, Word, WordGroup, WordBank, DomainError } = JeuxFr;

const ette = new WordGroup({ id: 'ette', suffix: '-ette', gender: Gender.FEMININE, rule: '' });

test('la banque réelle respecte les invariants du domaine', () => {
  const bank = realBank();
  assert.equal(bank.groups.length, 34);
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
  assert.equal(bank.word('hôpital').article, 'l’');
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

test('un mot sans règle n’a pas de groupe et n’est pas une exception', () => {
  const bank = realBank();
  const lit = bank.word('lit');
  assert.equal(lit.group, null);
  assert.equal(lit.isException, false);
  assert.equal(lit.followsRule, false);
  assert.equal(bank.word('école').withArticle, 'l’école');
  assert.equal(bank.word('baguette').followsRule, true);
  assert.equal(bank.word('squelette').followsRule, false);
  assert.throws(() => new Word({ text: 'mer', gender: Gender.FEMININE, group: null, isException: true }), /pas de groupe/);
  assert.throws(() => WordBank.fromData({ groups: [], words: [{ w: 'mer', g: 'f', grp: 'inconnu' }] }), /groupe inconnu/);
  assert.equal(WordBank.fromData({ groups: [], words: [{ w: 'mer', g: 'f', grp: null }] }).word('mer').group, null);
  assert.equal(new Word({ text: 'mer', gender: Gender.FEMININE }).group, null);
});

test('un mot sans règle ne suit pas la règle d’un groupe à terminaison', () => {
  // Un mot qui a la terminaison ET le genre d'un groupe suit sa règle : il doit en faire partie.
  // Une simple coïncidence de terminaison avec l'autre genre reste permise.
  // Les groupes qui ne sont pas des terminaisons (pays) ne peuvent pas se vérifier ainsi.
  const bank = realBank();
  const endingGroups = bank.groups.filter(g => g.isEnding);
  for (const w of bank.words.filter(w => !w.group)) {
    const group = endingGroups.find(g => w.text.endsWith(g.suffix.slice(1)) && g.gender === w.gender);
    assert.equal(group, undefined, `« ${w.text} » est ${w.gender.label} et finit par ${group?.suffix} : il suit la règle de ce groupe`);
  }
});

test('un mot connaît son article et vérifie une réponse', () => {
  const w = realBank().word('baguette');
  assert.equal(w.withArticle, 'la baguette');
  assert.ok(w.isCorrect(Gender.FEMININE));
  assert.ok(!w.isCorrect(Gender.MASCULINE));
});
