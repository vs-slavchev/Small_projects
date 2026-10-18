(function (LeOuLa) {
'use strict';

const { PlayerProfile } = LeOuLa;

const PROFILE_KEY = 'lela.profile.v2';
const PREFERENCES_KEY = 'lela.preferences.v1';
/** Format de la première version du jeu, migré au premier chargement. */
const LEGACY_KEY = 'lela.v1';
const SCHEMA_VERSION = 2;

/** Stockage en mémoire, utilisé quand localStorage est indisponible (navigation privée stricte, etc.). */
class MemoryStorage {
  #items = new Map();
  getItem(key) { return this.#items.has(key) ? this.#items.get(key) : null; }
  setItem(key, value) { this.#items.set(key, String(value)); }
  removeItem(key) { this.#items.delete(key); }
}

function browserStorage() {
  try {
    const storage = globalThis.localStorage;
    const probe = '__lela_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return new MemoryStorage();
  }
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota dépassé : le jeu continue, seule la sauvegarde est perdue
  }
}

const isObject = value => value !== null && typeof value === 'object';

/**
 * Convertit les données de la version 1 vers l'instantané du profil.
 * Les entrées qui ne sont même pas des objets sont écartées ici ; la validation fine
 * (une partie, une statistique à la fois) se fait dans PlayerProfile.fromSnapshot.
 */
function migrateLegacyProfile(legacy) {
  return {
    games: (legacy.games ?? []).filter(isObject).map(g => ({
      endedAt: g.end,
      durationMs: g.dur,
      difficultyStart: g.diff,
      difficultyEnd: g.diffEnd ?? g.diff,
      maxCombo: g.combo,
      answers: (Array.isArray(g.answers) ? g.answers : []).filter(isObject).map(a => ({ word: a.w, chosen: a.choice, correct: a.ok, timeMs: a.ms })),
    })),
    wordStats: Object.fromEntries(Object.entries(legacy.words ?? {})
      .filter(([, s]) => isObject(s))
      .map(([text, s]) => [text, { seen: s.seen, correct: s.ok, lastCorrect: s.last ?? null }])),
    difficulty: legacy.difficulty ?? 0,
    anecdotesRead: legacy.counters?.anecdotes ?? 0,
    recoveries: legacy.counters?.retour ?? 0,
  };
}

/** Dépôt du profil joueur dans le stockage local du navigateur. */
class LocalStorageProfileRepository {
  #storage;
  #onError;

  /** @param {{ storage?: Storage, onError?: (error: unknown) => void }} [options] */
  constructor({ storage = browserStorage(), onError = () => {} } = {}) {
    this.#storage = storage;
    this.#onError = onError;
  }

  /** @returns {PlayerProfile} un profil vide si rien n'est stocké ou si les données sont illisibles. */
  /**
   * Les enregistrements invalides sont ignorés un par un (et signalés à `onError`) :
   * le reste de l'historique est conservé.
   * @returns {PlayerProfile} un profil vide si rien n'est stocké.
   */
  load() {
    const options = { onInvalid: this.#onError };
    try {
      const current = readJson(this.#storage, PROFILE_KEY);
      if (current?.version === SCHEMA_VERSION && current.profile) return PlayerProfile.fromSnapshot(current.profile, options);
      const legacy = readJson(this.#storage, LEGACY_KEY);
      if (legacy && Array.isArray(legacy.games)) {
        const profile = PlayerProfile.fromSnapshot(migrateLegacyProfile(legacy), options);
        this.save(profile);
        return profile;
      }
    } catch (error) {
      this.#onError(error);
    }
    return PlayerProfile.empty();
  }

  /** @param {PlayerProfile} profile */
  save(profile) {
    writeJson(this.#storage, PROFILE_KEY, { version: SCHEMA_VERSION, profile: profile.toSnapshot() });
  }
}

/** Préférences d'affichage et de son, séparées du profil de jeu. */
class LocalStoragePreferences {
  static DEFAULTS = Object.freeze({ soundEnabled: true });
  #storage;

  constructor({ storage = browserStorage() } = {}) {
    this.#storage = storage;
  }

  load() {
    const stored = readJson(this.#storage, PREFERENCES_KEY);
    if (stored) return { ...LocalStoragePreferences.DEFAULTS, ...stored };
    const legacy = readJson(this.#storage, LEGACY_KEY);
    return { ...LocalStoragePreferences.DEFAULTS, ...(legacy && 'muted' in legacy ? { soundEnabled: !legacy.muted } : {}) };
  }

  save(preferences) {
    writeJson(this.#storage, PREFERENCES_KEY, preferences);
  }
}

Object.assign(LeOuLa, { PROFILE_KEY, PREFERENCES_KEY, LEGACY_KEY, MemoryStorage, browserStorage, migrateLegacyProfile, LocalStorageProfileRepository, LocalStoragePreferences });
})(globalThis.LeOuLa ??= {});
