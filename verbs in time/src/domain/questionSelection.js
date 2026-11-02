(function (Conjugo) {
'use strict';

const { DomainError, Person, Question, AnswerStatsBook } = Conjugo;

const QUESTION_MIX = Object.freeze({ current: 0.6, currentMistakes: 0.2, previousMistakes: 0.1, previousReview: 0.1 });
const CURRENT_MISTAKE_POOL = 20;
const PREVIOUS_MISTAKE_POOL = 10;
const FALLBACK_ORDER = Object.freeze(['current', 'currentMistakes', 'previousReview', 'previousMistakes']);

const randomIndex = (length, random) => Math.min(length - 1, Math.floor(random() * length));

const randomItem = (list, random) => list[randomIndex(list.length, random)];

const questionFor = ({ verb, tense, slot }, random) =>
  new Question({ verb, tense, person: randomItem(Person.SLOTS[slot], random), marker: randomItem(tense.markers, random) });

class QuestionPicker {
  static MIN_CAPACITY = Person.SLOTS.length;

  #random;
  #stats;
  #level;
  #previous;
  /** Les statistiques ne changent pas pendant une partie : les paniers sont calculés une fois. */
  #buckets = null;

  constructor({ ladder, level, random = Math.random, stats = new AnswerStatsBook() }) {
    this.#random = random;
    this.#stats = stats;
    this.#level = ladder.level(level);
    this.#previous = ladder.before(level).flatMap(l => l.combos);
  }

  buckets() {
    if (this.#buckets) return this.#buckets;
    const current = this.#level.combos;
    const previous = this.#previous;
    const currentMistakes = this.#pool(current, CURRENT_MISTAKE_POOL);
    const previousMistakes = this.#pool(previous, PREVIOUS_MISTAKE_POOL);
    const outside = pool => {
      const keys = new Set(pool.map(c => c.key));
      return c => !keys.has(c.key);
    };
    this.#buckets = Object.freeze({
      current: Object.freeze(current.filter(outside(currentMistakes))),
      currentMistakes: Object.freeze(currentMistakes),
      previousMistakes: Object.freeze(previousMistakes),
      previousReview: Object.freeze(previous.filter(outside(previousMistakes))),
    });
    return this.#buckets;
  }

  pick({ asked = [] } = {}) {
    const used = new Set(asked.map(q => q.key));
    const all = this.buckets();
    const fresh = name => all[name].filter(c => !used.has(c.key));
    for (const name of [this.#roll(), ...FALLBACK_ORDER]) {
      const list = fresh(name);
      if (list.length) return questionFor(randomItem(list, this.#random), this.#random);
    }
    throw new DomainError('Plus aucune question disponible pour cette partie.');
  }

  #pool(combos, limit) {
    const byKey = new Map(combos.map(c => [c.key, c]));
    return this.#stats.weakest([...byKey.keys()], limit).map(key => byKey.get(key));
  }

  #roll() {
    let r = this.#random();
    return Object.keys(QUESTION_MIX).find(name => (r -= QUESTION_MIX[name]) < 0) ?? FALLBACK_ORDER[0];
  }
}

Object.assign(Conjugo, { QUESTION_MIX, CURRENT_MISTAKE_POOL, PREVIOUS_MISTAKE_POOL, randomIndex, randomItem, questionFor, QuestionPicker });
})(globalThis.Conjugo ??= {});
