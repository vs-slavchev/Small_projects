(function (JeuxFr) {
'use strict';

const { DomainError } = JeuxFr;

/** Historique des réponses à un élément (mot, verbe à un temps…). Objet valeur immuable. */
class AnswerStat {
  /** Statistique vide de la classe appelante (AnswerStat ou une sous-classe). */
  static get EMPTY() {
    return new this();
  }

  /**
   * @param {number} seen @param {number} correct
   * @param {boolean | null} lastCorrect null si inconnue (jamais vu, ou ancien format)
   */
  constructor(seen = 0, correct = 0, lastCorrect = null) {
    if (!(Number.isInteger(seen) && Number.isInteger(correct) && seen >= 0 && correct >= 0 && correct <= seen)) {
      throw new DomainError(`Statistique incohérente : ${correct} / ${seen}.`);
    }
    if (lastCorrect !== null && typeof lastCorrect !== 'boolean') throw new DomainError(`Dernière réponse invalide : ${lastCorrect}.`);
    if (seen === 0 && lastCorrect !== null) throw new DomainError('Dernière réponse sans aucun passage.');
    this.seen = seen;
    this.correct = correct;
    this.lastCorrect = lastCorrect;
    Object.freeze(this);
  }

  /** Taux de réussite entre 0 et 1, ou null si jamais vu. */
  get accuracy() {
    return this.seen ? this.correct / this.seen : null;
  }

  /** @param {boolean} correct @returns {this} une statistique de la même classe */
  record(correct) {
    return new this.constructor(this.seen + 1, this.correct + (correct ? 1 : 0), correct);
  }
}

/** Statistiques indexées par clé. Une sous-classe choisit la classe de ses statistiques avec `static Stat`. */
class AnswerStatsBook {
  static Stat = AnswerStat;
  #stats;

  /** @param {Iterable<[string, AnswerStat]>} entries */
  constructor(entries = []) {
    this.#stats = new Map(entries);
  }

  /** @param {string} key @returns {AnswerStat} */
  get(key) {
    return this.#stats.get(key) ?? this.constructor.Stat.EMPTY;
  }

  /** @param {string} key @param {boolean} correct */
  record(key, correct) {
    this.#stats.set(key, this.get(key).record(correct));
  }

  entries() {
    return this.#stats.entries();
  }
}

Object.assign(JeuxFr, { AnswerStat, AnswerStatsBook });
})(globalThis.JeuxFr ??= {});
