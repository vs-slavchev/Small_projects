import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LeOuLa } from './game.js';

const { pickRandom } = LeOuLa;

test('pickRandom : null pour une liste vide, sinon un élément dans les bornes', () => {
  assert.equal(pickRandom([], () => 0.5), null);
  assert.equal(pickRandom(['a', 'b'], () => 0), 'a');
  assert.equal(pickRandom(['a', 'b'], () => 0.999), 'b');
  assert.equal(pickRandom(['a', 'b'], () => 1), 'b', 'un random() qui renvoie 1 ne sort pas de la liste');
});
