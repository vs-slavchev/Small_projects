(function (Conjugo) {
'use strict';

const { PlayerProfile } = Conjugo;

const PROFILE_KEY = 'conjugo.profile.v1';
const PREFERENCES_KEY = 'conjugo.preferences.v1';
const SCHEMA_VERSION = 1;

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
    const probe = '__conjugo_probe__';
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

/** Dépôt du profil joueur dans le stockage local du navigateur. */
class LocalStorageProfileRepository {
  #storage;
  #onError;

  /** @param {{ storage?: Storage, onError?: (error: unknown) => void }} [options] */
  constructor({ storage = browserStorage(), onError = () => {} } = {}) {
    this.#storage = storage;
    this.#onError = onError;
  }

  /**
   * Les enregistrements invalides sont ignorés un par un (et signalés à `onError`) :
   * le reste de l'historique est conservé.
   * @returns {PlayerProfile} un profil vide si rien n'est stocké.
   */
  load() {
    try {
      const current = readJson(this.#storage, PROFILE_KEY);
      if (current?.version === SCHEMA_VERSION && current.profile) return PlayerProfile.fromSnapshot(current.profile, { onInvalid: this.#onError });
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
    return { ...LocalStoragePreferences.DEFAULTS, ...readJson(this.#storage, PREFERENCES_KEY) };
  }

  save(preferences) {
    writeJson(this.#storage, PREFERENCES_KEY, preferences);
  }
}

Object.assign(Conjugo, { PROFILE_KEY, PREFERENCES_KEY, MemoryStorage, browserStorage, LocalStorageProfileRepository, LocalStoragePreferences });
})(globalThis.Conjugo ??= {});
