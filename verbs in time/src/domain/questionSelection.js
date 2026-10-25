(function (JeuxFr) {
'use strict';

const { DomainError, Person, Tense, Question, GameRecord, AnswerStatsBook } = JeuxFr;

/** Part des tirages consacrée aux révisions, et nombre de conjugaisons faibles parmi lesquelles choisir. */
const REVIEW_SHARE = 0.3;
const REVIEW_POOL = 10;

const pairKey = ({ verb, tense }) => GameRecord.practiceKeyOf({ verb: verb.infinitive, tense: tense.id });
const tripletKey = q => `${pairKey(q)}|${q.person.subject}`;

/**
 * Tirage d'une question : un verbe, un temps et une personne au hasard, parmi les temps et les types
 * de verbes choisis dans les réglages (tous par défaut).
 * - 30 % des tirages révisent une conjugaison faible (verbe + temps déjà raté et pas encore acquis) ;
 * - dans une partie, un verbe ne revient pas tant qu'il en reste d'autres ; s'il le faut, il revient
 *   à un autre temps, puis à une autre personne. Une même question n'est jamais posée deux fois.
 */
class QuestionPicker {
  /** Nombre de questions différentes garanti, quels que soient les réglages : un verbe, un temps, huit personnes. */
  static MIN_CAPACITY = Person.ALL.length;

  #random;
  #stats;
  #verbs;
  #tenses;

  /**
   * @param {{ bank: import('./conjugation.js').VerbBank, random?: () => number, stats?: AnswerStatsBook,
   *           tenses?: string[] | null, types?: string[] | null }} deps
   *   `tenses` / `types` : identifiants retenus ; null, vide ou inconnus → tous
   */
  constructor({ bank, random = Math.random, stats = new AnswerStatsBook(), tenses = null, types = null }) {
    this.#random = random;
    this.#stats = stats;
    const verbs = bank.verbs.filter(v => types?.includes(v.type.id));
    this.#verbs = verbs.length ? verbs : bank.verbs;
    const chosenTenses = Tense.ALL.filter(t => tenses?.includes(t.id));
    this.#tenses = chosenTenses.length ? chosenTenses : Tense.ALL;
  }

  /** @param {{ asked?: Question[] }} [request] questions déjà posées dans la partie @returns {Question} */
  pick({ asked = [] } = {}) {
    const usedVerbs = new Set(asked.map(q => q.verb));
    const usedPairs = new Set(asked.map(pairKey));
    const usedTriplets = new Set(asked.map(tripletKey));
    const pairs = this.#verbs.flatMap(verb => this.#tenses.map(tense => ({ verb, tense })));
    const freshVerbs = pairs.filter(p => !usedVerbs.has(p.verb));
    const freshPairs = pairs.filter(p => !usedPairs.has(pairKey(p)));
    const candidates = freshVerbs.length ? freshVerbs : freshPairs.length ? freshPairs : pairs;
    const pair = this.#review(candidates) ?? this.#choose(candidates);
    const persons = Person.ALL.filter(person => !usedTriplets.has(tripletKey({ ...pair, person })));
    if (!persons.length) throw new DomainError('Plus aucune question disponible pour cette partie.');
    return new Question({ ...pair, person: this.#choose(persons), marker: this.#choose(pair.tense.markers) });
  }

  /** Une conjugaison faible parmi les candidates, une fois sur trois environ ; sinon null. */
  #review(candidates) {
    if (this.#random() >= REVIEW_SHARE) return null;
    const byKey = new Map(candidates.map(p => [pairKey(p), p]));
    const weak = this.#stats.weakest([...byKey.keys()], REVIEW_POOL);
    return weak.length ? byKey.get(this.#choose(weak)) : null;
  }

  #choose(list) {
    return list[Math.min(list.length - 1, Math.floor(this.#random() * list.length))];
  }
}

Object.assign(JeuxFr, { REVIEW_SHARE, QuestionPicker });
})(globalThis.JeuxFr ??= {});
