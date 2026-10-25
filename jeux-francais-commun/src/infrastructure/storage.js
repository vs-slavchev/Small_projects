(function (JeuxFr) {
'use strict';

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
    const probe = '__jeuxfr_probe__';
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

/**
 * Préférences d'affichage et de son, séparées du profil de jeu. Une valeur stockée n'est reprise
 * que si elle a le type de sa valeur par défaut ; sinon la valeur par défaut s'applique.
 */
class PreferenceStore {
  static DEFAULTS = Object.freeze({ soundEnabled: true });
  #storage;
  #key;
  #fallback;

  /**
   * @param {{ storage?: Storage, key: string, fallback?: () => object | null }} options
   *   `fallback` fournit des préférences quand rien n'est stocké sous `key` (ancien format, par exemple).
   */
  constructor({ storage = browserStorage(), key, fallback = () => null }) {
    this.#storage = storage;
    this.#key = key;
    this.#fallback = fallback;
  }

  load() {
    const stored = readJson(this.#storage, this.#key) ?? this.#fallback();
    return Object.fromEntries(Object.entries(PreferenceStore.DEFAULTS)
      .map(([name, value]) => [name, typeof stored?.[name] === typeof value ? stored[name] : value]));
  }

  save(preferences) {
    writeJson(this.#storage, this.#key, preferences);
  }
}

Object.assign(JeuxFr, { MemoryStorage, browserStorage, readJson, writeJson, PreferenceStore });
})(globalThis.JeuxFr ??= {});
