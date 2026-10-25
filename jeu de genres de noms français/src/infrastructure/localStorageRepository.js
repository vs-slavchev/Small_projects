(function (JeuxFr) {
'use strict';

const { PlayerProfile, browserStorage, readJson, writeJson, PreferenceStore } = JeuxFr;

const PROFILE_KEY = 'lela.profile.v2';
const PREFERENCES_KEY = 'lela.preferences.v1';
/** Format de la première version du jeu, migré au premier chargement. */
const LEGACY_KEY = 'lela.v1';
const SCHEMA_VERSION = 2;

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

/** Préférences du jeu ; à défaut, le réglage « muet » de la version 1 est repris. */
class LocalStoragePreferences extends PreferenceStore {
  constructor({ storage = browserStorage() } = {}) {
    super({
      storage,
      key: PREFERENCES_KEY,
      fallback: () => {
        const legacy = readJson(storage, LEGACY_KEY);
        return legacy && 'muted' in legacy ? { soundEnabled: !legacy.muted } : null;
      },
    });
  }
}

Object.assign(JeuxFr, { PROFILE_KEY, PREFERENCES_KEY, LEGACY_KEY, migrateLegacyProfile, LocalStorageProfileRepository, LocalStoragePreferences });
})(globalThis.JeuxFr ??= {});
