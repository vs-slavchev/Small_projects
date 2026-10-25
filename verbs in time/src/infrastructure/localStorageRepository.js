(function (Conjugo) {
'use strict';

const { PlayerProfile, browserStorage, readJson, writeJson, PreferenceStore } = Conjugo;

const PROFILE_KEY = 'conjugo.profile.v1';
const PREFERENCES_KEY = 'conjugo.preferences.v1';
const SCHEMA_VERSION = 1;

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

const isIdList = value => value === null || (Array.isArray(value) && value.every(id => typeof id === 'string'));

/** Préférences du jeu : le son, et les temps et types de verbes à travailler (null : tous). */
class LocalStoragePreferences extends PreferenceStore {
  static DEFAULTS = Object.freeze({ ...PreferenceStore.DEFAULTS, tenses: null, types: null });

  constructor({ storage } = {}) {
    super({
      storage,
      key: PREFERENCES_KEY,
      defaults: LocalStoragePreferences.DEFAULTS,
      validators: { tenses: isIdList, types: isIdList },
    });
  }
}

Object.assign(Conjugo, { PROFILE_KEY, PREFERENCES_KEY, LocalStorageProfileRepository, LocalStoragePreferences });
})(globalThis.Conjugo ??= {});
