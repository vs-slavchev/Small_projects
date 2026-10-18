import { PlayerProfile } from '../domain/playerProfile.js';

export const PROFILE_KEY = 'lela.profile.v2';
export const PREFERENCES_KEY = 'lela.preferences.v1';
/** Format de la première version du jeu, migré au premier chargement. */
export const LEGACY_KEY = 'lela.v1';
const SCHEMA_VERSION = 2;

/** Stockage en mémoire, utilisé quand localStorage est indisponible (navigation privée stricte, etc.). */
export class MemoryStorage {
  #items = new Map();
  getItem(key) { return this.#items.has(key) ? this.#items.get(key) : null; }
  setItem(key, value) { this.#items.set(key, String(value)); }
  removeItem(key) { this.#items.delete(key); }
}

export function browserStorage() {
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

/** Convertit les données de la version 1 vers l'instantané du profil. */
export function migrateLegacyProfile(legacy) {
  return {
    games: (legacy.games ?? []).map(g => ({
      endedAt: g.end,
      durationMs: g.dur,
      difficultyStart: g.diff,
      difficultyEnd: g.diffEnd ?? g.diff,
      maxCombo: g.combo,
      answers: (g.answers ?? []).map(a => ({ word: a.w, chosen: a.choice, correct: a.ok, timeMs: a.ms })),
    })),
    wordStats: Object.fromEntries(Object.entries(legacy.words ?? {})
      .map(([text, s]) => [text, { seen: s.seen, correct: s.ok, lastCorrect: s.last ?? null }])),
    difficulty: legacy.difficulty ?? 0,
    anecdotesRead: legacy.counters?.anecdotes ?? 0,
    recoveries: legacy.counters?.retour ?? 0,
  };
}

/** Dépôt du profil joueur dans le stockage local du navigateur. */
export class LocalStorageProfileRepository {
  #storage;
  #onError;

  /** @param {{ storage?: Storage, onError?: (error: unknown) => void }} [options] */
  constructor({ storage = browserStorage(), onError = () => {} } = {}) {
    this.#storage = storage;
    this.#onError = onError;
  }

  /** @returns {PlayerProfile} un profil vide si rien n'est stocké ou si les données sont illisibles. */
  load() {
    try {
      const current = readJson(this.#storage, PROFILE_KEY);
      if (current?.version === SCHEMA_VERSION) return PlayerProfile.fromSnapshot(current.profile);
      const legacy = readJson(this.#storage, LEGACY_KEY);
      if (legacy && Array.isArray(legacy.games)) {
        const profile = PlayerProfile.fromSnapshot(migrateLegacyProfile(legacy));
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
export class LocalStoragePreferences {
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
