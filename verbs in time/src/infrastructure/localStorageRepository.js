(function (JeuxFr) {
'use strict';

const { PlayerProfile, browserStorage, readJson, writeJson, PreferenceStore } = JeuxFr;

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

/** Préférences du jeu. */
class LocalStoragePreferences extends PreferenceStore {
  constructor({ storage } = {}) {
    super({ storage, key: PREFERENCES_KEY });
  }
}

Object.assign(JeuxFr, { PROFILE_KEY, PREFERENCES_KEY, LocalStorageProfileRepository, LocalStoragePreferences });
})(globalThis.JeuxFr ??= {});
