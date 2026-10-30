(function (Conjugo) {
'use strict';

const { DomainError, Person, Question, AnswerStatsBook } = Conjugo;

/**
 * Répartition des tirages entre les quatre paniers, dans l'ordre où le tirage les parcourt.
 * - current          : une forme du niveau en cours, hors de ses formes à revoir ;
 * - currentMistakes  : une des formes du niveau en cours les plus ratées ;
 * - previousMistakes : une des formes des niveaux précédents les plus ratées ;
 * - previousReview   : une forme des niveaux précédents, hors de leurs formes à revoir.
 */
const QUESTION_MIX = Object.freeze({ current: 0.6, currentMistakes: 0.2, previousMistakes: 0.1, previousReview: 0.1 });
/** Nombre de formes ratées retenues pour la révision : dans le niveau en cours, et dans les niveaux précédents. */
const CURRENT_MISTAKE_POOL = 20;
const PREVIOUS_MISTAKE_POOL = 10;
/** Panier de repli quand celui tiré est vide : le niveau en cours d'abord, puis les précédents. */
const FALLBACK_ORDER = Object.freeze(['current', 'currentMistakes', 'previousReview', 'previousMistakes']);

/** Rang au hasard dans une liste de `length` éléments. @param {number} length @param {() => number} random */
const randomIndex = (length, random) => Math.min(length - 1, Math.floor(random() * length));

/** Élément de `list` au hasard. @template T @param {T[]} list @param {() => number} random @returns {T} */
const randomItem = (list, random) => list[randomIndex(list.length, random)];

/**
 * Question sur une forme à acquérir : un sujet de sa case (il, elle ou on…) et une expression de temps, au hasard.
 * @param {{ verb: import('./conjugation.js').Verb, tense: import('./conjugation.js').Tense, slot: number }} combo
 * @param {() => number} random @returns {Question}
 */
const questionFor = ({ verb, tense, slot }, random) =>
  new Question({ verb, tense, person: randomItem(Person.SLOTS[slot], random), marker: randomItem(tense.markers, random) });

/**
 * Tirage d'une question dans le niveau du joueur : une forme (verbe, temps, case de personne) prise
 * dans l'un des quatre paniers de `QUESTION_MIX`, puis un sujet de cette case (il, elle ou on…)
 * et une expression de temps au hasard. Une même forme n'est jamais posée deux fois dans une partie.
 */
class QuestionPicker {
  /** Nombre de questions différentes garanti dans un niveau : un verbe aux six cases de personne. */
  static MIN_CAPACITY = Person.SLOTS.length;

  #random;
  #stats;
  #level;
  #previous;
  /** Les statistiques ne changent pas pendant une partie : les paniers sont calculés une fois. */
  #buckets = null;

  /**
   * @param {{ ladder: import('./levels.js').LevelLadder, level: number, random?: () => number, stats?: AnswerStatsBook }} deps
   *   `level` : numéro du niveau en cours
   */
  constructor({ ladder, level, random = Math.random, stats = new AnswerStatsBook() }) {
    this.#random = random;
    this.#stats = stats;
    this.#level = ladder.level(level);
    this.#previous = ladder.before(level).flatMap(l => l.combos);
  }

  /** Les quatre paniers, avant d'écarter les formes déjà posées. */
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

  /** @param {{ asked?: Question[] }} [request] questions déjà posées dans la partie @returns {Question} */
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

  /** Formes déjà ratées parmi `combos`, les plus faibles d'abord (voir `AnswerStatsBook.weakest`). */
  #pool(combos, limit) {
    const byKey = new Map(combos.map(c => [c.key, c]));
    return this.#stats.weakest([...byKey.keys()], limit).map(key => byKey.get(key));
  }

  /** Panier tiré selon `QUESTION_MIX`. */
  #roll() {
    let r = this.#random();
    return Object.keys(QUESTION_MIX).find(name => (r -= QUESTION_MIX[name]) < 0) ?? FALLBACK_ORDER[0];
  }
}

Object.assign(Conjugo, { QUESTION_MIX, CURRENT_MISTAKE_POOL, PREVIOUS_MISTAKE_POOL, randomIndex, randomItem, questionFor, QuestionPicker });
})(globalThis.Conjugo ??= {});
