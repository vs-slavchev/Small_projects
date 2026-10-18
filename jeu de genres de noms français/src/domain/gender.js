import { DomainError } from './errors.js';

/**
 * Genre grammatical d'un nom. Objet valeur : seules deux instances existent,
 * on peut donc les comparer par identité.
 */
export class Gender {
  /** @param {'m'|'f'} code @param {string} article @param {string} label */
  constructor(code, article, label) {
    this.code = code;
    this.article = article;
    this.label = label;
    Object.freeze(this);
  }

  static MASCULINE = new Gender('m', 'le', 'masculin');
  static FEMININE = new Gender('f', 'la', 'féminin');

  /** @param {string} code */
  static fromCode(code) {
    if (code === 'm') return Gender.MASCULINE;
    if (code === 'f') return Gender.FEMININE;
    throw new DomainError(`Genre inconnu : « ${code} ».`);
  }

  get opposite() {
    return this === Gender.MASCULINE ? Gender.FEMININE : Gender.MASCULINE;
  }

  equals(other) {
    return other === this;
  }

  toString() {
    return this.code;
  }
}
