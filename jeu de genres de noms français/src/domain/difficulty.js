import { DomainError } from './errors.js';

/**
 * Niveau de difficulté adaptatif, de 0 à 100. Il monte à chaque bonne réponse,
 * baisse à chaque erreur et persiste d'une partie à l'autre. Objet valeur immuable.
 */
export class Difficulty {
  static MIN = 0;
  static MAX = 100;
  static STEP_UP = 4;
  static STEP_DOWN = 6;

  /** @param {number} value */
  constructor(value) {
    if (!Number.isFinite(value)) throw new DomainError(`Difficulté invalide : ${value}.`);
    this.value = Math.min(Difficulty.MAX, Math.max(Difficulty.MIN, value));
    Object.freeze(this);
  }

  static initial() {
    return new Difficulty(Difficulty.MIN);
  }

  static of(value) {
    return new Difficulty(Number(value));
  }

  /** @param {boolean} correct @returns {Difficulty} */
  afterAnswer(correct) {
    return new Difficulty(this.value + (correct ? Difficulty.STEP_UP : -Difficulty.STEP_DOWN));
  }

  /**
   * Règle de tirage : si le nombre tiré (0-100) est supérieur au niveau,
   * on propose un mot régulier ; sinon une exception.
   * @param {number} roll nombre entre 0 et 100
   */
  callsForException(roll) {
    return !(roll > this.value);
  }

  equals(other) {
    return other instanceof Difficulty && other.value === this.value;
  }
}
