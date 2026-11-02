(function (Conjugo) {
'use strict';

const { DomainError, Person, Tense, comboKey, LEVEL_DATA } = Conjugo;

const combo = (verb, tense, slot) => Object.freeze({ verb, tense, slot, key: comboKey(verb.infinitive, tense.id, slot) });

const FRENCH_LIST = new Intl.ListFormat('fr', { type: 'conjunction' });
const frenchList = items => FRENCH_LIST.format(items);

class Level {
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

  get title() {
    return this.verbs.map(v => v.label).join(', ');
  }

  get verbList() {
    return frenchList(this.verbs.map(v => v.label));
  }

  get span() {
    const [first] = Person.SLOTS[0];
    const last = Person.SLOTS.at(-1).at(-1);
    return Object.freeze({
      from: this.verbs[0].conjugate(this.tense, first).display,
      to: this.verbs.at(-1).conjugate(this.tense, last).display,
    });
  }

  progress(practice) {
    const mastered = this.combos.filter(c => practice.get(c.key).isMastered).length;
    return Object.freeze({ mastered, total: this.combos.length });
  }
}

class LevelLadder {
  #levels;
  #keys;

  constructor(levels) {
    if (!levels.length) throw new DomainError('Aucun niveau.');
    this.#levels = Object.freeze([...levels]);
    this.#keys = Object.freeze([...new Set(levels.flatMap(l => l.combos.map(c => c.key)))]);
  }

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
  get keys() { return this.#keys; }

  level(number) {
    const level = this.#levels[number - 1];
    if (!level) throw new DomainError(`Niveau inconnu : ${number}.`);
    return level;
  }

  has(number) {
    return Number.isInteger(number) && number >= 1 && number <= this.#levels.length;
  }

  before(number) {
    return this.#levels.slice(0, Math.max(0, number - 1));
  }
}

Object.assign(Conjugo, { frenchList, Level, LevelLadder });
})(globalThis.Conjugo ??= {});
