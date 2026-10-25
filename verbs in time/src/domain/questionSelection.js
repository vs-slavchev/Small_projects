(function (JeuxFr) {
'use strict';

const { DomainError, Person, Tense, Question } = JeuxFr;

/**
 * Tirage d'une question : un triplet aléatoire verbe + temps + personne,
 * chaque dimension tirée indépendamment et uniformément.
 * Un verbe déjà proposé dans la partie n'est pas repris.
 */
class QuestionPicker {
  #bank;
  #random;

  /** @param {{ bank: import('./conjugation.js').VerbBank, random?: () => number }} deps */
  constructor({ bank, random = Math.random }) {
    this.#bank = bank;
    this.#random = random;
  }

  /** Nombre de questions possibles dans une partie : un verbe n'y revient pas. */
  get capacity() {
    return this.#bank.verbs.length;
  }

  /** @param {{ excludedVerbs?: Set<string> }} [request] @returns {Question} */
  pick({ excludedVerbs = new Set() } = {}) {
    const verbs = this.#bank.verbs.filter(v => !excludedVerbs.has(v.infinitive));
    if (!verbs.length) throw new DomainError('Plus aucun verbe disponible pour cette partie.');
    return new Question({ verb: this.#choose(verbs), tense: this.#choose(Tense.ALL), person: this.#choose(Person.ALL) });
  }

  #choose(list) {
    return list[Math.min(list.length - 1, Math.floor(this.#random() * list.length))];
  }
}

Object.assign(JeuxFr, { QuestionPicker });
})(globalThis.JeuxFr ??= {});
