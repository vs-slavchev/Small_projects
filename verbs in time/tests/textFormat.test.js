import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conjugo } from './game.js';

const { diffChars, similarity, durationText, minutesText, accentMarks } = Conjugo;

test('durée en toutes lettres : secondes, puis minutes et secondes', () => {
  assert.equal(durationText(45_000), '45 secondes');
  assert.equal(durationText(1_000), '1 seconde');
  assert.equal(durationText(89_000), '1 min 29 s');
  assert.equal(durationText(120_000), '2 minutes');
  assert.equal(durationText(150_000), '2 min 30 s');
});

test('écart lettre à lettre : lettres en trop et lettres manquantes', () => {
  assert.deepEqual(diffChars('il parlais', 'il parlait'), [
    { type: 'same', text: 'il parlai' }, { type: 'missing', text: 't' }, { type: 'extra', text: 's' },
  ]);
  assert.deepEqual(diffChars('abc', 'abc'), [{ type: 'same', text: 'abc' }]);
  const parts = diffChars('nous finisons', 'nous finissons');
  assert.equal(parts.filter(p => p.type === 'missing').map(p => p.text).join(''), 's');
  assert.equal(parts.filter(p => p.type !== 'missing').map(p => p.text).join(''), 'nous finisons', 'la réponse se relit dans l’ordre');
  assert.equal(parts.filter(p => p.type !== 'extra').map(p => p.text).join(''), 'nous finissons', 'la forme attendue aussi');
});

test('similarité : nombre de lettres communes dans l’ordre', () => {
  assert.equal(similarity('parlais', 'parlait'), 6);
  assert.ok(similarity('finirons', 'nous finirons') > similarity('finirons', 'tu finiras'));
});

test('lettres à accentuer : positions dans la forme juste et dans la réponse', () => {
  const marks = (given, target) => { const { target: t, given: g } = accentMarks(given, target); return { target: t, given: g }; };
  assert.deepEqual(marks('vous avez ete', 'vous avez été'), { target: [10, 12], given: [10, 12] });
  // Sujet omis : la réponse est alignée sur la fin de la forme.
  assert.deepEqual(marks('avez ete', 'vous avez été'), { target: [10, 12], given: [5, 7] });
  // Casse et apostrophe ne comptent pas.
  assert.deepEqual(marks("J'ai prefere", 'j’ai préféré'), { target: [7, 9, 11], given: [7, 9, 11] });
  // Espaces en trop ignorés : la réponse est alignée sans eux.
  assert.deepEqual(accentMarks(' vous  avez ete ', 'vous avez été'), { target: [10, 12], given: [10, 12], givenText: 'vous avez ete' });
  // Autre faute que les accents : rien à souligner.
  assert.deepEqual(marks('vous avez eu', 'vous avez été'), { target: [], given: [] });
});

test('minutes arrondies, au moins une', () => {
  assert.equal(minutesText(4_000), '1 min');
  assert.equal(minutesText(18 * 60_000 + 20_000), '18 min');
});
