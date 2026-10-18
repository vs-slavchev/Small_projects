(function (LeOuLa) {
'use strict';

const { DomainError } = LeOuLa;

const SelectionStrategy = Object.freeze({
  RANDOM: 'random',
  WEAKEST: 'weakest',
  DIFFICULTY: 'difficulty',
});

/**
 * Politique de choix du prochain mot :
 * - 20 % : un mot au hasard ;
 * - 30 % : un des 20 mots au plus faible taux de réussite
 *          (hors mots déjà proposés dans la partie et mots maîtrisés à 100 %) ;
 * - 50 % : tirage de 0 à 100 comparé à la difficulté → mot régulier ou exception.
 * Si une stratégie n'a aucun candidat, on se rabat sur le hasard.
 */
class WordSelectionPolicy {
  static DEFAULTS = Object.freeze({ randomShare: 0.2, weakestShare: 0.3, weakestPoolSize: 20 });

  #bank;
  #stats;
  #random;
  #options;

  /**
   * @param {{ bank: import('./wordBank.js').WordBank, stats: import('./wordStats.js').WordStatsBook,
   *           random?: () => number, options?: Partial<typeof WordSelectionPolicy.DEFAULTS> }} deps
   */
  constructor({ bank, stats, random = Math.random, options = {} }) {
    this.#bank = bank;
    this.#stats = stats;
    this.#random = random;
    this.#options = { ...WordSelectionPolicy.DEFAULTS, ...options };
  }

  /**
   * @param {{ excluded?: Set<string>, difficulty: import('./difficulty.js').Difficulty }} request
   * @returns {{ word: import('./wordBank.js').Word, strategy: string }}
   */
  pick({ excluded = new Set(), difficulty }) {
    const candidates = this.#bank.words.filter(w => !excluded.has(w.text));
    if (!candidates.length) throw new DomainError('Plus aucun mot disponible pour cette partie.');

    const { randomShare, weakestShare, weakestPoolSize } = this.#options;
    const roll = this.#random();

    if (roll >= randomShare && roll < randomShare + weakestShare) {
      const weak = this.#stats.weakest(candidates.map(w => w.text), weakestPoolSize);
      if (weak.length) return { word: this.#bank.word(this.#choose(weak)), strategy: SelectionStrategy.WEAKEST };
    } else if (roll >= randomShare + weakestShare) {
      const wantException = difficulty.callsForException(this.#random() * 100);
      const pool = candidates.filter(w => w.isException === wantException);
      if (pool.length) return { word: this.#choose(pool), strategy: SelectionStrategy.DIFFICULTY };
    }
    return { word: this.#choose(candidates), strategy: SelectionStrategy.RANDOM };
  }

  #choose(list) {
    return list[Math.min(list.length - 1, Math.floor(this.#random() * list.length))];
  }
}

Object.assign(LeOuLa, { SelectionStrategy, WordSelectionPolicy });
})(globalThis.LeOuLa ??= {});
