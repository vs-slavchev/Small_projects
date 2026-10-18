import { DomainError } from './errors.js';
import { Gender } from './gender.js';

/** Groupe de noms partageant une terminaison et, en règle générale, un genre. */
export class WordGroup {
  /** @param {{ id: string, suffix: string, gender: Gender, rule: string }} props */
  constructor({ id, suffix, gender, rule }) {
    if (!id) throw new DomainError('Un groupe doit avoir un identifiant.');
    if (!(gender instanceof Gender)) throw new DomainError(`Groupe « ${id} » : genre invalide.`);
    this.id = id;
    this.suffix = suffix;
    this.gender = gender;
    this.rule = rule;
    Object.freeze(this);
  }
}

/**
 * Nom à deviner. Invariant : un mot régulier a le genre de son groupe,
 * une exception a le genre opposé.
 */
export class Word {
  /**
   * @param {{ text: string, gender: Gender, group: WordGroup, isException?: boolean,
   *           translation?: string, anecdote?: string | null }} props
   */
  constructor({ text, gender, group, isException = false, translation = '', anecdote = null }) {
    if (!text) throw new DomainError('Un mot doit avoir un texte.');
    if (!(gender instanceof Gender)) throw new DomainError(`« ${text} » : genre invalide.`);
    if (!(group instanceof WordGroup)) throw new DomainError(`« ${text} » : groupe invalide.`);
    if (isException === gender.equals(group.gender)) {
      throw new DomainError(isException
        ? `« ${text} » est marqué comme exception mais a le genre de son groupe ${group.suffix}.`
        : `« ${text} » n'a pas le genre de son groupe ${group.suffix} : c'est une exception.`);
    }
    this.text = text;
    this.gender = gender;
    this.group = group;
    this.isException = isException;
    this.translation = translation;
    this.anecdote = anecdote || null;
    Object.freeze(this);
  }

  get article() {
    return this.gender.article;
  }

  /** « la baguette » */
  get withArticle() {
    return `${this.article} ${this.text}`;
  }

  /** @param {Gender} gender */
  isCorrect(gender) {
    return this.gender.equals(gender);
  }
}

/** Catalogue immuable des groupes et des mots du jeu. */
export class WordBank {
  #groups;
  #words;
  #byText;

  /** @param {WordGroup[]} groups @param {Word[]} words */
  constructor(groups, words) {
    const groupIds = new Set();
    for (const g of groups) {
      if (groupIds.has(g.id)) throw new DomainError(`Groupe en double : ${g.id}.`);
      groupIds.add(g.id);
    }
    const byText = new Map();
    for (const w of words) {
      if (byText.has(w.text)) throw new DomainError(`Mot en double : ${w.text}.`);
      if (!groupIds.has(w.group.id)) throw new DomainError(`« ${w.text} » : groupe inconnu ${w.group.id}.`);
      byText.set(w.text, w);
    }
    if (!words.length) throw new DomainError('La banque de mots est vide.');
    this.#groups = Object.freeze([...groups]);
    this.#words = Object.freeze([...words]);
    this.#byText = byText;
  }

  /** Construit la banque depuis les données brutes de `data/words.js`. */
  static fromData({ groups, words }) {
    const groupList = groups.map(g => new WordGroup({ id: g.id, suffix: g.label, gender: Gender.fromCode(g.g), rule: g.rule }));
    const byId = new Map(groupList.map(g => [g.id, g]));
    const wordList = words.map(w => {
      const group = byId.get(w.grp);
      if (!group) throw new DomainError(`« ${w.w} » : groupe inconnu ${w.grp}.`);
      return new Word({
        text: w.w, gender: Gender.fromCode(w.g), group,
        isException: Boolean(w.exc), translation: w.en, anecdote: w.fun,
      });
    });
    return new WordBank(groupList, wordList);
  }

  get groups() { return this.#groups; }
  get words() { return this.#words; }
  get size() { return this.#words.length; }

  /** @param {string} text @returns {Word | undefined} */
  word(text) {
    return this.#byText.get(text);
  }

  /** @param {string} id */
  group(id) {
    return this.#groups.find(g => g.id === id);
  }
}
