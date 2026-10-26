(function (Conjugo) {
'use strict';

const { DomainError } = Conjugo;

/** Historique des réponses à un élément (un verbe à un temps). Objet valeur immuable. */
class AnswerStat {
  /** Statistique vide de la classe appelante (AnswerStat ou une sous-classe). */
  static get EMPTY() {
    return new this();
  }

  /** Taux de réussite à partir duquel un élément est considéré comme acquis. */
  static MASTERY_ACCURACY = 0.8;

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

  /**
   * Élément acquis : dernière réponse juste et taux de réussite d'au moins MASTERY_ACCURACY.
   * Une erreur ancienne, suivie d'assez de bonnes réponses, ne le fait plus revenir en révision ;
   * une erreur toute récente, si.
   */
  get isMastered() {
    return this.lastCorrect === true && this.accuracy >= AnswerStat.MASTERY_ACCURACY;
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

  /**
   * Parmi `candidates`, les clés déjà vues et pas encore acquises (voir `AnswerStat.isMastered`),
   * du plus faible taux de réussite au plus élevé.
   * @param {string[]} candidates @param {number} limit @returns {string[]}
   */
  weakest(candidates, limit) {
    return candidates
      .map(key => [key, this.get(key)])
      .filter(([, s]) => s.seen > 0 && !s.isMastered)
      .sort(([ka, a], [kb, b]) => a.accuracy - b.accuracy || b.seen - a.seen || ka.localeCompare(kb))
      .slice(0, limit)
      .map(([key]) => key);
  }
}

Object.assign(Conjugo, { AnswerStat, AnswerStatsBook });
})(globalThis.Conjugo ??= {});
