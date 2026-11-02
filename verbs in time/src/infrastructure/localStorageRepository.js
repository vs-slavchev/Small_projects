(function (Conjugo) {
'use strict';

const { PlayerProfile, browserStorage, readJson, writeJson, PreferenceStore } = Conjugo;

const PROFILE_KEY = 'conjugo.profile.v1';
const PREFERENCES_KEY = 'conjugo.preferences.v1';
const SCHEMA_VERSION = 1;

class LocalStorageProfileRepository {
  #storage;
  #onError;

  constructor({ storage = browserStorage(), onError = () => {} } = {}) {
    this.#storage = storage;
    this.#onError = onError;
  }

  load() {
    try {
      const current = readJson(this.#storage, PROFILE_KEY);
      if (current?.version === SCHEMA_VERSION && current.profile) return PlayerProfile.fromSnapshot(current.profile, { onInvalid: this.#onError });
    } catch (error) {
      this.#onError(error);
    }
    return PlayerProfile.empty();
  }

  save(profile) {
    writeJson(this.#storage, PROFILE_KEY, { version: SCHEMA_VERSION, profile: profile.toSnapshot() });
  }
}

class LocalStoragePreferences extends PreferenceStore {
  static DEFAULTS = PreferenceStore.DEFAULTS;

  constructor({ storage } = {}) {
    super({ storage, key: PREFERENCES_KEY, defaults: LocalStoragePreferences.DEFAULTS });
  }
}

Object.assign(Conjugo, { PROFILE_KEY, PREFERENCES_KEY, LocalStorageProfileRepository, LocalStoragePreferences });
})(globalThis.Conjugo ??= {});
