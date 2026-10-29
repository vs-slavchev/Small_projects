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

const keyOf = q => `${q.verb.infinitive}|${q.tense.id}|${q.person.index}`;

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
    const current = this.#level.combos;
    const previous = this.#previous;
    const currentMistakes = this.#pool(current, CURRENT_MISTAKE_POOL);
    const previousMistakes = this.#pool(previous, PREVIOUS_MISTAKE_POOL);
    const outside = pool => c => !pool.includes(c);
    return {
      current: current.filter(outside(currentMistakes)),
      currentMistakes,
      previousMistakes,
      previousReview: previous.filter(outside(previousMistakes)),
    };
  }

  /** @param {{ asked?: Question[] }} [request] questions déjà posées dans la partie @returns {Question} */
  pick({ asked = [] } = {}) {
    const used = new Set(asked.map(keyOf));
    const buckets = Object.fromEntries(Object.entries(this.buckets()).map(([name, list]) => [name, list.filter(c => !used.has(c.key))]));
    const drawn = this.#roll();
    const name = [drawn, ...FALLBACK_ORDER].find(n => buckets[n].length);
    if (!name) throw new DomainError('Plus aucune question disponible pour cette partie.');
    const { verb, tense, slot } = this.#choose(buckets[name]);
    return new Question({ verb, tense, person: this.#choose(Person.SLOTS[slot]), marker: this.#choose(tense.markers) });
  }

  /** Formes déjà ratées parmi `combos`, les plus faibles d'abord (voir `AnswerStatsBook.weakest`). */
  #pool(combos, limit) {
    const byKey = new Map(combos.map(c => [c.key, c]));
    return this.#stats.weakest([...byKey.keys()], limit).map(key => byKey.get(key));
  }

  #roll() {
    let r = this.#random();
    for (const [name, share] of Object.entries(QUESTION_MIX)) {
      if (r < share) return name;
      r -= share;
    }
    return FALLBACK_ORDER[0];
  }

  #choose(list) {
    return list[Math.min(list.length - 1, Math.floor(this.#random() * list.length))];
  }
}

Object.assign(Conjugo, { QUESTION_MIX, CURRENT_MISTAKE_POOL, PREVIOUS_MISTAKE_POOL, QuestionPicker });
})(globalThis.Conjugo ??= {});
