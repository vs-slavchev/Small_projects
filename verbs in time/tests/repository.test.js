import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryStorage } from './helpers.js';
import { JeuxFr } from './game.js';

const { LocalStorageProfileRepository, LocalStoragePreferences, PROFILE_KEY, PlayerProfile, GameRecord } = JeuxFr;

const record = (endedAt = new Date(2026, 9, 18, 9)) => new GameRecord({
  endedAt, durationMs: 41_000, maxCombo: 1,
  answers: [{ verb: 'finir', tense: 'futurSimple', person: 'nous', given: 'finirons', correct: true, timeMs: 900 }],
});

test('aller-retour : le profil enregistré est relu à l’identique', () => {
  const storage = memoryStorage();
  const repo = new LocalStorageProfileRepository({ storage });
  const profile = PlayerProfile.empty();
  profile.recordGame(record());
  repo.save(profile);
  const stored = JSON.parse(storage.getItem(PROFILE_KEY));
  assert.equal(stored.version, 1);
  assert.equal(stored.profile.games[0].accuracy, 100, 'le pourcentage de réussite est enregistré');
  assert.deepEqual(repo.load().toSnapshot(), profile.toSnapshot());
});

test('des données illisibles donnent un profil vide, sans planter', () => {
  const storage = memoryStorage();
  storage.setItem(PROFILE_KEY, '{ pas du json');
  assert.equal(new LocalStorageProfileRepository({ storage }).load().gameCount, 0);
  const errors = [];
  storage.setItem(PROFILE_KEY, JSON.stringify({ version: 1, profile: { games: [{ endedAt: 'n’importe quoi', answers: [] }] } }));
  assert.equal(new LocalStorageProfileRepository({ storage, onError: e => errors.push(e) }).load().gameCount, 0);
  assert.equal(errors.length, 1);
});

test('un enregistrement invalide est ignoré, le reste de l’historique est conservé', () => {
  const storage = memoryStorage();
  const repo = new LocalStorageProfileRepository({ storage });
  const profile = PlayerProfile.empty();
  profile.recordGame(record());
  repo.save(profile);

  const stored = JSON.parse(storage.getItem(PROFILE_KEY));
  stored.profile.games.push({ endedAt: '2026-10-18T09:00:00.000Z', answers: [] });   // partie vide
  stored.profile.games.push({ endedAt: '2026-10-18T10:00:00.000Z', answers: [{}] }); // réponse incomplète
  stored.profile.practice['voir|present'] = { seen: 1, correct: 5 };                  // plus de réussites que de passages
  stored.profile.practice['faire|present'] = { seen: 1, correct: 0, lastCorrect: 'false' }; // dernière réponse illisible
  storage.setItem(PROFILE_KEY, JSON.stringify(stored));

  const errors = [];
  const loaded = new LocalStorageProfileRepository({ storage, onError: e => errors.push(e) }).load();
  assert.equal(loaded.gameCount, 1);
  assert.equal(loaded.practice.get('finir|futurSimple').seen, 1);
  assert.equal(loaded.practice.get('voir|present').seen, 0);
  assert.equal(loaded.practice.get('faire|present').seen, 0);
  assert.equal(errors.length, 4);
});

test('les préférences sont conservées à part', () => {
  const storage = memoryStorage();
  const prefs = new LocalStoragePreferences({ storage });
  assert.equal(prefs.load().soundEnabled, true);
  prefs.save({ soundEnabled: false });
  assert.equal(new LocalStoragePreferences({ storage }).load().soundEnabled, false);
});

test('des préférences illisibles reviennent aux réglages par défaut', () => {
  const storage = memoryStorage();
  for (const raw of ['"on"', '{"soundEnabled":"no"}', '[1]']) {
    storage.setItem(JeuxFr.PREFERENCES_KEY, raw);
    assert.deepEqual(new LocalStoragePreferences({ storage }).load(), { soundEnabled: true, tenses: null, types: null }, raw);
  }
  for (const tenses of ['present', [1], { a: 1 }]) {
    storage.setItem(JeuxFr.PREFERENCES_KEY, JSON.stringify({ soundEnabled: false, tenses }));
    assert.deepEqual(new LocalStoragePreferences({ storage }).load(), { soundEnabled: false, tenses: null, types: null }, JSON.stringify(tenses));
  }
});

test('un stockage plein n’empêche pas de jouer', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {} };
  assert.doesNotThrow(() => new LocalStorageProfileRepository({ storage: full }).save(PlayerProfile.empty()));
});
