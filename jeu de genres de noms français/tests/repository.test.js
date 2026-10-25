import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, memoryStorage } from './helpers.js';
import { JeuxFr } from './game.js';

const {
  LocalStorageProfileRepository, LocalStoragePreferences, PROFILE_KEY, LEGACY_KEY, PlayerProfile, GameRecord,
} = JeuxFr;

const bank = realBank();

test('aller-retour : le profil enregistré est relu à l’identique', () => {
  const storage = memoryStorage();
  const repo = new LocalStorageProfileRepository({ storage });
  const profile = PlayerProfile.empty();
  profile.recordGame(new GameRecord({
    endedAt: new Date(2026, 9, 18, 9), durationMs: 41_000, difficultyStart: 0, difficultyEnd: 12, maxCombo: 3,
    answers: [{ word: 'baguette', chosen: 'f', correct: true, timeMs: 900 }],
  }), bank);
  repo.save(profile);
  const stored = JSON.parse(storage.getItem(PROFILE_KEY));
  assert.equal(stored.version, 2);
  assert.equal(stored.profile.games[0].accuracy, 100, 'le pourcentage de réussite est enregistré');
  assert.deepEqual(repo.load().toSnapshot(), profile.toSnapshot());
});

test('les données de la première version sont migrées', () => {
  const storage = memoryStorage();
  storage.setItem(LEGACY_KEY, JSON.stringify({
    games: [{ end: '2026-10-17T10:00:00.000Z', dur: 30_000, pct: 50, ok: 1, n: 2, diff: 0, diffEnd: 2, combo: 1,
      answers: [{ w: 'baguette', ok: true, ms: 1000, choice: 'f' }, { w: 'squelette', ok: false, ms: 2000, choice: 'f' }] }],
    words: { baguette: { seen: 1, ok: 1, last: true }, squelette: { seen: 1, ok: 0, last: false } },
    difficulty: 2, counters: { anecdotes: 2, retour: 0 }, muted: true,
  }));
  const profile = new LocalStorageProfileRepository({ storage }).load();
  assert.equal(profile.gameCount, 1);
  assert.equal(profile.games[0].accuracy, 50);
  assert.equal(profile.wordStats.get('squelette').lastCorrect, false);
  assert.equal(profile.difficulty.value, 2);
  assert.ok(storage.getItem(PROFILE_KEY), 'réécrit au nouveau format');
  assert.equal(new LocalStoragePreferences({ storage }).load().soundEnabled, false);
});

test('des données illisibles donnent un profil vide, sans planter', () => {
  const storage = memoryStorage();
  storage.setItem(PROFILE_KEY, '{ pas du json');
  assert.equal(new LocalStorageProfileRepository({ storage }).load().gameCount, 0);
  const errors = [];
  storage.setItem(PROFILE_KEY, JSON.stringify({ version: 2, profile: { games: [{ endedAt: 'n’importe quoi', answers: [] }] } }));
  assert.equal(new LocalStorageProfileRepository({ storage, onError: e => errors.push(e) }).load().gameCount, 0);
  assert.equal(errors.length, 1);
});

test('un enregistrement invalide est ignoré, le reste de l\u2019historique est conservé', () => {
  const storage = memoryStorage();
  const repo = new LocalStorageProfileRepository({ storage });
  const profile = PlayerProfile.empty();
  profile.recordGame(new GameRecord({
    endedAt: new Date(2026, 9, 17, 9), durationMs: 30_000, difficultyStart: 0, difficultyEnd: 8, maxCombo: 1,
    answers: [{ word: 'baguette', chosen: 'f', correct: true, timeMs: 900 }],
  }), bank);
  repo.save(profile);

  const stored = JSON.parse(storage.getItem(PROFILE_KEY));
  stored.profile.games.push({ endedAt: '2026-10-18T09:00:00.000Z', answers: [] }); // partie vide : invalide
  stored.profile.wordStats.squelette = { seen: 1, correct: 5 };                  // plus de réussites que de passages
  stored.profile.difficulty = 'beaucoup';
  storage.setItem(PROFILE_KEY, JSON.stringify(stored));

  const errors = [];
  const loaded = new LocalStorageProfileRepository({ storage, onError: e => errors.push(e) }).load();
  assert.equal(loaded.gameCount, 1);
  assert.equal(loaded.wordStats.get('baguette').seen, 1);
  assert.equal(loaded.wordStats.get('squelette').seen, 0);
  assert.equal(loaded.difficulty.value, 0);
  assert.equal(errors.length, 3);
});

test('une entrée v1 malformée n\u2019empêche pas la migration du reste', () => {
  const storage = memoryStorage();
  storage.setItem(LEGACY_KEY, JSON.stringify({
    games: [null, { end: '2026-10-17T10:00:00.000Z', dur: 1000, diff: 0, combo: 1, answers: [null, { w: 'baguette', ok: true, ms: 1000, choice: 'f' }] }],
    words: { baguette: { seen: 1, ok: 1, last: true }, squelette: null },
  }));
  const profile = new LocalStorageProfileRepository({ storage }).load();
  assert.equal(profile.gameCount, 1);
  assert.equal(profile.games[0].total, 1);
  assert.equal(profile.wordStats.get('baguette').seen, 1);
});

test('un stockage plein n’empêche pas de jouer', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {} };
  assert.doesNotThrow(() => new LocalStorageProfileRepository({ storage: full }).save(PlayerProfile.empty()));
});
