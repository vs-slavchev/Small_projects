import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/domain/calendar.js';
import '../src/ui/format.js';

const { diffChars, similarity } = globalThis.JeuxFr;

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
