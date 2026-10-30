import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conjugo } from './game.js';

const { diffChars, similarity, durationText } = Conjugo;

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
