(function (Conjugo) {
'use strict';

const { DomainError, randomIndex, questionFor } = Conjugo;

const PROBES_PER_LEVEL = 1;

function binarySearchPlacement({ probesPerLevel = PROBES_PER_LEVEL } = {}) {
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
    remaining({ ladder, history }) {
      const { low, high, round } = replay(ladder, history);
      return Math.max(0, probesPerLevel * Math.ceil(Math.log2(high - low + 2)) - round.length);
    },
  });
}

class PlacementTest {
  #ladder;
  #random;
  #strategy;
  #history = Object.freeze([]);
  #current = null;

  constructor({ ladder, strategy = binarySearchPlacement(), random = Math.random }) {
    const missing = ['next', 'result', 'remaining'].filter(name => typeof strategy?.[name] !== 'function');
    if (missing.length) throw new DomainError(`Règle de placement incomplète : ${missing.join(', ')} manquant.`);
    this.#ladder = ladder;
    this.#strategy = strategy;
    this.#random = random;
    this.#advance();
  }

  get plannedLength() {
    const remaining = this.#strategy.remaining({ ladder: this.#ladder, history: this.#history });
    return Math.max(this.position, this.#history.length + (Number.isFinite(remaining) ? Math.max(0, remaining) : 0));
  }

  get history() { return this.#history; }
  get currentQuestion() { return this.#current?.question ?? null; }
  get position() { return this.#history.length + (this.isComplete ? 0 : 1); }
  get isComplete() { return this.#current === null; }

  get result() {
    if (!this.isComplete) throw new DomainError('Le test de placement n’est pas terminé.');
    const level = this.#strategy.result({ ladder: this.#ladder, history: this.#history });
    return Math.max(1, Math.min(level, this.#ladder.count));
  }

  isCorrect(given) {
    return this.#current.question.expected.check(given).correct;
  }

  answer(given) {
    this.#ensureOpen();
    this.#record(typeof given === 'string' && given.trim() !== '' && this.isCorrect(given));
  }

  skip() {
    this.#ensureOpen();
    this.#record(false);
  }

  #ensureOpen() {
    if (this.isComplete) throw new DomainError('Le test de placement est terminé.');
  }

  #record(correct) {
    this.#history = Object.freeze([...this.#history, Object.freeze({ ...this.#current, correct })]);
    this.#advance();
  }

  #advance() {
    const next = this.#strategy.next({ ladder: this.#ladder, history: this.#history, random: this.#random });
    this.#current = next && Object.freeze({ level: next.level, combo: next.combo, question: questionFor(next.combo, this.#random) });
  }
}

Object.assign(Conjugo, { PROBES_PER_LEVEL, binarySearchPlacement, PlacementTest });
})(globalThis.Conjugo ??= {});
