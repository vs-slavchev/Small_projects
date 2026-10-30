(function (Conjugo) {
'use strict';

const { DomainError, Person, Tense, comboKey, LEVEL_DATA } = Conjugo;

/** Une forme à acquérir : un verbe, à un temps, dans une case de personne. */
const combo = (verb, tense, slot) => Object.freeze({ verb, tense, slot, key: comboKey(verb.infinitive, tense.id, slot) });

const VERB_LIST = new Intl.ListFormat('fr', { type: 'conjunction' });

/** Part entière en pourcentage : 2 sur 6 → 33. */
const percentOf = (part, total) => Math.round((part / total) * 100);

/**
 * Niveau du parcours : un temps, quelques verbes, et les six cases de personne de chacun.
 * Il est terminé quand toutes ses formes sont acquises (voir `AnswerStat.isMastered`).
 */
class Level {
  /** @param {{ number: number, tense: Tense, verbs: import('./conjugation.js').Verb[], label: string }} props */
  constructor({ number, tense, verbs, label }) {
    if (!Number.isInteger(number) || number < 1) throw new DomainError(`Numéro de niveau invalide : ${number}.`);
    if (!(tense instanceof Tense)) throw new DomainError(`Niveau ${number} : temps invalide.`);
    if (!verbs.length) throw new DomainError(`Niveau ${number} : aucun verbe.`);
    this.number = number;
    this.tense = tense;
    this.verbs = Object.freeze([...verbs]);
    this.label = label;
    this.combos = Object.freeze(this.verbs.flatMap(verb => Person.SLOTS.map((_, slot) => combo(verb, tense, slot))));
    Object.freeze(this);
  }

  /** Verbes du niveau, à l'infinitif : « être, avoir ». */
  get title() {
    return this.verbs.map(v => v.label).join(', ');
  }

  /** Verbes du niveau en une phrase : « être et avoir », « aller, faire et prendre ». */
  get verbList() {
    return VERB_LIST.format(this.verbs.map(v => v.label));
  }

  /** Première et dernière formes du niveau, à afficher : « je finis » … « elles finissent ». */
  get span() {
    const [first] = Person.SLOTS[0];
    const last = Person.SLOTS.at(-1).at(-1);
    return Object.freeze({
      from: this.verbs[0].conjugate(this.tense, first).display,
      to: this.verbs.at(-1).conjugate(this.tense, last).display,
    });
  }

  /**
   * Formes acquises du niveau ; il est terminé quand toutes le sont.
   * @param {import('./answerStats.js').AnswerStatsBook} practice @returns {{ mastered: number, total: number }}
   */
  progress(practice) {
    const mastered = this.combos.filter(c => practice.get(c.key).isMastered).length;
    return Object.freeze({ mastered, total: this.combos.length });
  }
}

/** Les niveaux, dans l'ordre du parcours. Valide les données au chargement. */
class LevelLadder {
  #levels;
  #keys;

  /** @param {Level[]} levels */
  constructor(levels) {
    if (!levels.length) throw new DomainError('Aucun niveau.');
    this.#levels = Object.freeze([...levels]);
    this.#keys = Object.freeze([...new Set(levels.flatMap(l => l.combos.map(c => c.key)))]);
  }

  /** @param {import('./conjugation.js').VerbBank} bank */
  static fromData(bank, data = LEVEL_DATA) {
    return new LevelLadder(data.map((d, i) => {
      const tense = Tense.ALL.find(t => t.id === d.tense);
      if (!tense) throw new DomainError(`Niveau ${i + 1} : temps inconnu « ${d.tense} ».`);
      const verbs = d.verbs.map(infinitive => {
        const verb = bank.verb(infinitive);
        if (!verb) throw new DomainError(`Niveau ${i + 1} : verbe inconnu « ${infinitive} ».`);
        return verb;
      });
      return new Level({ number: i + 1, tense, verbs, label: d.label });
    }));
  }

  get levels() { return this.#levels; }
  get count() { return this.#levels.length; }
  /** Clés de toutes les formes du parcours, sans doublon (une forme peut revenir dans plusieurs niveaux). */
  get keys() { return this.#keys; }

  /** @param {number} number de 1 à `count` @returns {Level} */
  level(number) {
    const level = this.#levels[number - 1];
    if (!level) throw new DomainError(`Niveau inconnu : ${number}.`);
    return level;
  }

  /** Le parcours a-t-il un niveau `number` ? */
  has(number) {
    return Number.isInteger(number) && number >= 1 && number <= this.#levels.length;
  }

  /** Niveaux qui précèdent le niveau `number`. @returns {Level[]} */
  before(number) {
    return this.#levels.slice(0, Math.max(0, number - 1));
  }
}

Object.assign(Conjugo, { percentOf, Level, LevelLadder });
})(globalThis.Conjugo ??= {});
