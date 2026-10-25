(function (Conjugo) {
'use strict';

const { DomainError } = Conjugo;

/** Historique des réponses à un verbe à un temps donné. Objet valeur immuable. */
class PracticeStat {
  static EMPTY = new PracticeStat();

  /** @param {number} seen @param {number} correct @param {boolean | null} lastCorrect */
  constructor(seen = 0, correct = 0, lastCorrect = null) {
    if (!(Number.isInteger(seen) && Number.isInteger(correct) && seen >= 0 && correct >= 0 && correct <= seen)) {
      throw new DomainError(`Statistique incohérente : ${correct} / ${seen}.`);
    }
    if (lastCorrect !== null && typeof lastCorrect !== 'boolean') throw new DomainError(`Dernière réponse invalide : ${lastCorrect}.`);
    if ((lastCorrect === null) !== (seen === 0)) throw new DomainError('Dernière réponse incohérente avec le nombre de passages.');
    this.seen = seen;
    this.correct = correct;
    this.lastCorrect = lastCorrect;
    Object.freeze(this);
  }

  /** Taux de réussite entre 0 et 1, ou null si jamais vu. */
  get accuracy() {
    return this.seen ? this.correct / this.seen : null;
  }

  /** @param {boolean} correct @returns {PracticeStat} */
  record(correct) {
    return new PracticeStat(this.seen + 1, this.correct + (correct ? 1 : 0), correct);
  }
}

/** Statistiques de chaque couple verbe + temps rencontré (clé `GameRecord.practiceKeyOf`). */
class PracticeStatsBook {
  #stats;

  /** @param {Iterable<[string, PracticeStat]>} entries */
  constructor(entries = []) {
    this.#stats = new Map(entries);
  }

  /** @param {string} key @returns {PracticeStat} */
  get(key) {
    return this.#stats.get(key) ?? PracticeStat.EMPTY;
  }

  /** @param {string} key @param {boolean} correct */
  record(key, correct) {
    this.#stats.set(key, this.get(key).record(correct));
  }

  entries() {
    return this.#stats.entries();
  }
}

Object.assign(Conjugo, { PracticeStat, PracticeStatsBook });
})(globalThis.JeuxFr ??= {});
