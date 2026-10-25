import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/infrastructure/storage.js';

const { MemoryStorage, PreferenceStore, writeJson } = globalThis.JeuxFr;

test('préférences : seules les valeurs du bon type sont reprises', () => {
  const storage = new MemoryStorage();
  const store = new PreferenceStore({ storage, key: 'prefs' });
  assert.deepEqual(store.load(), { soundEnabled: true });
  store.save({ soundEnabled: false });
  assert.deepEqual(store.load(), { soundEnabled: false });
  for (const raw of ['"on"', '{"soundEnabled":"no"}', '[1]', '{ pas du json']) {
    storage.setItem('prefs', raw);
    assert.deepEqual(store.load(), { soundEnabled: true }, raw);
  }
});

test('préférences : repli sur un ancien format quand rien n’est stocké', () => {
  const store = new PreferenceStore({ storage: new MemoryStorage(), key: 'prefs', fallback: () => ({ soundEnabled: false }) });
  assert.deepEqual(store.load(), { soundEnabled: false });
});

test('un stockage plein n’empêche pas de jouer', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {} };
  assert.equal(writeJson(full, 'k', {}), false);
});
