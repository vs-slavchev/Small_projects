(function (Conjugo) {
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

/** Même type que la valeur par défaut ; un tableau n'est pas un objet ordinaire. */
const sameShape = (value, fallback) => typeof value === typeof fallback && Array.isArray(value) === Array.isArray(fallback);

/**
 * Préférences d'affichage et de son, séparées du profil de jeu. Une valeur stockée n'est reprise
 * que si elle passe son contrôle (par défaut : même type que sa valeur par défaut) ; sinon la valeur par défaut s'applique.
 */
class PreferenceStore {
  static DEFAULTS = Object.freeze({ soundEnabled: true });
  #storage;
  #key;
  #fallback;
  #defaults;
  #valid;

  /**
   * @param {{ storage?: Storage, key: string, fallback?: () => object | null,
   *           defaults?: object, validators?: Record<string, (value: unknown) => boolean> }} options
   *   `fallback` fournit des préférences quand rien n'est stocké sous `key` (ancien format, par exemple) ;
   *   `validators` remplace le contrôle de type pour les réglages qui en ont besoin.
   */
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
