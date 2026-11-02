(function (Conjugo) {
'use strict';

const { DomainError } = Conjugo;

class AnswerStat {
  static get EMPTY() {
    return new this();
  }

  static MASTERY_ACCURACY = 0.6;

  constructor(seen = 0, correct = 0, lastCorrect = null) {
    if (!(Number.isInteger(seen) && Number.isInteger(correct) && seen >= 0 && correct >= 0 && correct <= seen)) {
      throw new DomainError(`Statistique incohérente : ${correct} / ${seen}.`);
    }
    if (lastCorrect !== null && typeof lastCorrect !== 'boolean') throw new DomainError(`Dernière réponse invalide : ${lastCorrect}.`);
    if (seen === 0 && lastCorrect !== null) throw new DomainError('Dernière réponse sans aucun passage.');
    this.seen = seen;
    this.correct = correct;
    this.lastCorrect = lastCorrect;
    Object.freeze(this);
  }

  get accuracy() {
    return this.seen ? this.correct / this.seen : null;
  }

  get isMastered() {
    return this.lastCorrect === true && this.accuracy >= AnswerStat.MASTERY_ACCURACY;
  }

  get hasMistake() {
    return this.correct < this.seen;
  }

  record(correct) {
    return new this.constructor(this.seen + 1, this.correct + (correct ? 1 : 0), correct);
  }
}

class AnswerStatsBook {
  static Stat = AnswerStat;
  #stats;

  constructor(entries = []) {
    this.#stats = new Map(entries);
  }

  get(key) {
    return this.#stats.get(key) ?? this.constructor.Stat.EMPTY;
  }

  record(key, correct) {
    this.#stats.set(key, this.get(key).record(correct));
  }

  entries() {
    return this.#stats.entries();
  }

  with(answers) {
    const copy = new this.constructor(this.#stats);
    for (const [key, correct] of answers) copy.record(key, correct);
    return copy;
  }

  weakest(candidates, limit) {
    const recentMiss = s => (s.lastCorrect === false ? 0 : 1);
    return candidates
      .map(key => [key, this.get(key)])
      .filter(([, s]) => s.hasMistake && !s.isMastered)
      .sort(([ka, a], [kb, b]) => a.accuracy - b.accuracy || recentMiss(a) - recentMiss(b) || b.seen - a.seen || ka.localeCompare(kb))
      .slice(0, limit)
      .map(([key]) => key);
  }
}

Object.assign(Conjugo, { AnswerStat, AnswerStatsBook });
})(globalThis.Conjugo ??= {});
