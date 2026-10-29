(function (Conjugo) {
'use strict';

const { DomainError, randomItem, questionFor } = Conjugo;

/** Formes posées par niveau testé : toutes justes, le niveau est connu. */
const PROBES_PER_LEVEL = 2;

/**
 * Test de placement (agrégat) : une recherche dichotomique sur le parcours.
 * Le niveau du milieu de l'intervalle restant est testé sur PROBES_PER_LEVEL formes au hasard :
 * toutes justes, le joueur le connaît et on cherche plus haut ; une erreur, on cherche plus bas.
 * Le résultat est le premier niveau qui n'a pas été prouvé.
 *
 * Les réponses ne sont ni corrigées à l'écran ni comptées dans les statistiques :
 * le test cherche un point de départ, il ne note pas.
 */
class PlacementTest {
  #ladder;
  #random;
  #low = 1;
  #high;
  #probes = [];
  #question = null;
  #asked = 0;

  /** @param {{ ladder: import('./levels.js').LevelLadder, random?: () => number }} deps */
  constructor({ ladder, random = Math.random }) {
    this.#ladder = ladder;
    this.#random = random;
    this.#high = ladder.count;
    this.#nextLevel();
  }

  /** Nombre de questions au plus : deux formes par étape de la recherche. */
  get maxLength() {
    return PROBES_PER_LEVEL * Math.ceil(Math.log2(this.#ladder.count + 1));
  }

  get currentQuestion() { return this.#question; }
  /** Rang de la question courante, à partir de 1. */
  get position() { return this.#asked; }
  get isComplete() { return this.#question === null; }

  /** Premier niveau non prouvé : le point de départ du joueur (le dernier, s'il les connaît tous). */
  get result() {
    if (!this.isComplete) throw new DomainError('Le test de placement n’est pas terminé.');
    return Math.min(this.#low, this.#ladder.count);
  }

  /** La réponse donnée est-elle juste ? @param {string} given */
  isCorrect(given) {
    return this.#question.expected.check(given).correct;
  }

  /** @param {string} given forme saisie ; vide ou absente, elle compte comme fausse */
  answer(given) {
    this.#ensureOpen();
    this.#step(typeof given === 'string' && given.trim() !== '' && this.isCorrect(given));
  }

  /** « Je ne sais pas » : compte comme une réponse fausse. */
  skip() {
    this.#ensureOpen();
    this.#step(false);
  }

  #ensureOpen() {
    if (this.isComplete) throw new DomainError('Le test de placement est terminé.');
  }

  #step(correct) {
    const mid = this.#mid();
    if (correct && this.#probes.length) {
      this.#ask(this.#probes.shift());
      return;
    }
    if (correct) this.#low = mid + 1;
    else this.#high = mid - 1;
    this.#nextLevel();
  }

  #mid() {
    return Math.floor((this.#low + this.#high) / 2);
  }

  #nextLevel() {
    if (this.#low > this.#high) {
      this.#question = null;
      return;
    }
    const pool = [...this.#ladder.level(this.#mid()).combos];
    const picks = [];
    while (picks.length < PROBES_PER_LEVEL && pool.length) picks.push(pool.splice(pool.indexOf(randomItem(pool, this.#random)), 1)[0]);
    this.#ask(picks.shift());
    this.#probes = picks;
  }

  #ask(combo) {
    this.#question = questionFor(combo, this.#random);
    this.#asked++;
  }
}

Object.assign(Conjugo, { PROBES_PER_LEVEL, PlacementTest });
})(globalThis.Conjugo ??= {});
