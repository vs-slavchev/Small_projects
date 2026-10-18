(function (LeOuLa) {
'use strict';

const { DomainError } = LeOuLa;

/** Historique des réponses à un mot. Objet valeur immuable. */
class WordStat {
  static EMPTY = new WordStat();

  /** @param {number} seen @param {number} correct @param {boolean | null} lastCorrect */
  constructor(seen = 0, correct = 0, lastCorrect = null) {
    if (!(Number.isInteger(seen) && Number.isInteger(correct) && seen >= 0 && correct >= 0 && correct <= seen)) {
      throw new DomainError(`Statistique incohérente : ${correct} / ${seen}.`);
    }
    this.seen = seen;
    this.correct = correct;
    this.lastCorrect = lastCorrect;
    Object.freeze(this);
  }

  /** Taux de réussite entre 0 et 1, ou null si le mot n'a jamais été vu. */
  get accuracy() {
    return this.seen ? this.correct / this.seen : null;
  }

  get isMastered() {
    return this.seen > 0 && this.correct === this.seen;
  }

  /** @param {boolean} correct @returns {WordStat} */
  record(correct) {
    return new WordStat(this.seen + 1, this.correct + (correct ? 1 : 0), correct);
  }
}

/** Statistiques de tous les mots rencontrés par le joueur, indexées par texte. */
class WordStatsBook {
  #stats;

  /** @param {Iterable<[string, WordStat]>} entries */
  constructor(entries = []) {
    this.#stats = new Map(entries);
  }

  /** @param {string} text @returns {WordStat} */
  get(text) {
    return this.#stats.get(text) ?? WordStat.EMPTY;
  }

  /** @param {string} text @param {boolean} correct */
  record(text, correct) {
    this.#stats.set(text, this.get(text).record(correct));
  }

  entries() {
    return this.#stats.entries();
  }

  /**
   * Parmi `candidates`, les mots déjà vus et pas encore maîtrisés,
   * du plus faible taux de réussite au plus élevé.
   * @param {string[]} candidates @param {number} limit @returns {string[]}
   */
  weakest(candidates, limit) {
    return candidates
      .map(text => [text, this.get(text)])
      .filter(([, s]) => s.seen > 0 && !s.isMastered)
      .sort(([ta, a], [tb, b]) => a.accuracy - b.accuracy || b.seen - a.seen || ta.localeCompare(tb))
      .slice(0, limit)
      .map(([text]) => text);
  }
}

Object.assign(LeOuLa, { WordStat, WordStatsBook });
})(globalThis.LeOuLa ??= {});
