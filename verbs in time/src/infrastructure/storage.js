(function (Conjugo) {
'use strict';

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

/** Même type que la valeur par défaut ; un tableau n'est pas un objet ordinaire. */
const sameShape = (value, fallback) => typeof value === typeof fallback && Array.isArray(value) === Array.isArray(fallback);

class PreferenceStore {
  static DEFAULTS = Object.freeze({ soundEnabled: true });
  #storage;
  #key;
  #fallback;
  #defaults;
  #valid;

  constructor({ storage = browserStorage(), key, fallback = () => null, defaults = PreferenceStore.DEFAULTS, validators = {} }) {
    this.#storage = storage;
    this.#key = key;
    this.#fallback = fallback;
    this.#defaults = defaults;
    this.#valid = (name, value) => (validators[name] ?? (v => sameShape(v, defaults[name])))(value);
  }

  load() {
    const stored = readJson(this.#storage, this.#key) ?? this.#fallback();
    return Object.fromEntries(Object.entries(this.#defaults)
      .map(([name, value]) => [name, stored !== null && typeof stored === 'object' && this.#valid(name, stored[name]) ? stored[name] : value]));
  }

  save(preferences) {
    writeJson(this.#storage, this.#key, preferences);
  }
}

Object.assign(Conjugo, { MemoryStorage, browserStorage, readJson, writeJson, PreferenceStore });
})(globalThis.Conjugo ??= {});
