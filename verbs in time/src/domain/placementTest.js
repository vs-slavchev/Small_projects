(function (Conjugo) {
'use strict';

const { DomainError, randomIndex, questionFor } = Conjugo;

/** Formes posées par niveau testé : toutes justes, le niveau est connu. */
const PROBES_PER_LEVEL = 1;

/**
 * Règle de placement : décide de la prochaine question et du niveau de départ à partir de tout l'historique.
 * Une règle ne garde aucun état : elle recalcule tout depuis `history`, ce qui la rend simple à remplacer et à tester.
 *
 * @typedef {{ level: number, combo: object, question: import('./conjugation.js').Question, correct: boolean }} PlacementEntry
 * @typedef {{
 *   next(args: { ladder: import('./levels.js').LevelLadder, history: readonly PlacementEntry[], random: () => number }):
 *     { level: number, combo: object } | null,
 *   result(args: { ladder: import('./levels.js').LevelLadder, history: readonly PlacementEntry[] }): number,
 *   maxLength(ladder: import('./levels.js').LevelLadder): number,
 *   remaining?(args: { ladder: import('./levels.js').LevelLadder, history: readonly PlacementEntry[] }): number,
 * }} PlacementStrategy
 *   `next` : niveau et forme à poser, ou null pour terminer ; `result` : niveau de départ ;
 *   `maxLength` : nombre de questions au plus ; `remaining` (facultatif) : questions restantes au plus,
 *   question en cours comprise (sans elle, la barre de progression compte `maxLength` segments)
 */

/**
 * Recherche dichotomique sur le parcours : le niveau du milieu de l'intervalle restant est testé
 * sur `probesPerLevel` formes au hasard ; toutes justes, le joueur le connaît et on cherche plus haut ;
 * une erreur, on cherche plus bas. Le résultat est le premier niveau qui n'a pas été prouvé.
 * @returns {PlacementStrategy}
 */
function binarySearchPlacement({ probesPerLevel = PROBES_PER_LEVEL } = {}) {
  /** Rejoue l'historique : intervalle restant, et formes déjà posées au niveau en cours d'essai. */
  const replay = (ladder, history) => {
    let low = 1;
    let high = ladder.count;
    let round = [];
    for (const entry of history) {
      round.push(entry);
      const mid = Math.floor((low + high) / 2);
      const needed = Math.min(probesPerLevel, ladder.level(mid).combos.length);
      if (!entry.correct) high = mid - 1;
      else if (round.length >= needed) low = mid + 1;
      else continue;
      round = [];
    }
    return { low, high, round };
  };

  return Object.freeze({
    next({ ladder, history, random }) {
      const { low, high, round } = replay(ladder, history);
      if (low > high) return null;
      const level = Math.floor((low + high) / 2);
      const asked = new Set(round.map(e => e.combo.key));
      const pool = ladder.level(level).combos.filter(c => !asked.has(c.key));
      return { level, combo: pool[randomIndex(pool.length, random)] };
    },
    result({ ladder, history }) {
      return replay(ladder, history).low;
    },
    maxLength(ladder) {
      return probesPerLevel * Math.ceil(Math.log2(ladder.count + 1));
    },
    remaining({ ladder, history }) {
      const { low, high, round } = replay(ladder, history);
      return Math.max(0, probesPerLevel * Math.ceil(Math.log2(high - low + 2)) - round.length);
    },
  });
}

/**
 * Test de placement (agrégat) : pose les questions qu'une règle de placement choisit
 * (par défaut `binarySearchPlacement`) et garde l'historique des réponses.
 *
 * Les réponses ne sont ni corrigées à l'écran ni comptées dans les statistiques :
 * le test cherche un point de départ, il ne note pas.
 */
class PlacementTest {
  #ladder;
  #random;
  #strategy;
  #history = [];
  #current = null;

  /** @param {{ ladder: import('./levels.js').LevelLadder, strategy?: PlacementStrategy, random?: () => number }} deps */
  constructor({ ladder, strategy = binarySearchPlacement(), random = Math.random }) {
    this.#ladder = ladder;
    this.#strategy = strategy;
    this.#random = random;
    this.#advance();
  }

  /** Nombre de questions au plus, selon la règle. */
  get maxLength() {
    return this.#strategy.maxLength(this.#ladder);
  }

  /** Longueur prévue d'après les réponses déjà données : se raccourcit quand la recherche se resserre plus vite. */
  get plannedLength() {
    if (!this.#strategy.remaining) return this.maxLength;
    return this.#history.length + this.#strategy.remaining({ ladder: this.#ladder, history: this.history });
  }

  /** Questions déjà répondues, dans l'ordre. @returns {readonly PlacementEntry[]} */
  get history() { return Object.freeze([...this.#history]); }
  get currentQuestion() { return this.#current?.question ?? null; }
  /** Rang de la question courante, à partir de 1. */
  get position() { return this.#history.length + (this.isComplete ? 0 : 1); }
  get isComplete() { return this.#current === null; }

  /** Niveau de départ du joueur, ramené dans le parcours. */
  get result() {
    if (!this.isComplete) throw new DomainError('Le test de placement n’est pas terminé.');
    const level = this.#strategy.result({ ladder: this.#ladder, history: this.history });
    return Math.max(1, Math.min(level, this.#ladder.count));
  }

  /** La réponse donnée est-elle juste ? @param {string} given */
  isCorrect(given) {
    return this.#current.question.expected.check(given).correct;
  }

  /** @param {string} given forme saisie ; vide ou absente, elle compte comme fausse */
  answer(given) {
    this.#ensureOpen();
    this.#record(typeof given === 'string' && given.trim() !== '' && this.isCorrect(given));
  }

  /** « Je ne sais pas » : compte comme une réponse fausse. */
  skip() {
    this.#ensureOpen();
    this.#record(false);
  }

  #ensureOpen() {
    if (this.isComplete) throw new DomainError('Le test de placement est terminé.');
  }

  #record(correct) {
    this.#history.push(Object.freeze({ ...this.#current, correct }));
    this.#advance();
  }

  #advance() {
    const next = this.#strategy.next({ ladder: this.#ladder, history: this.history, random: this.#random });
    this.#current = next && Object.freeze({ level: next.level, combo: next.combo, question: questionFor(next.combo, this.#random) });
  }
}

Object.assign(Conjugo, { PROBES_PER_LEVEL, binarySearchPlacement, PlacementTest });
})(globalThis.Conjugo ??= {});
