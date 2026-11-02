(function (Conjugo) {
'use strict';

const { DomainError, Person, comboKey } = Conjugo;

const nonNegativeInt = (value, fallback) => (Number.isInteger(value) && value >= 0 ? value : fallback);

class GameRecord {
  constructor({ endedAt, durationMs, maxCombo, answers, level = null, masteredBefore = null, masteredAfter = null, masteredKeys = [] }) {
    const date = new Date(endedAt);
    if (Number.isNaN(date.getTime())) throw new DomainError('Date de fin de partie invalide.');
    if (!Array.isArray(answers) || !answers.length) throw new DomainError('Une partie terminée doit contenir des réponses.');
    this.endedAt = date;
    this.durationMs = Math.max(0, Math.round(Number(durationMs) || 0));
    this.maxCombo = Math.max(0, Number(maxCombo) || 0);
    this.answers = Object.freeze(answers.map(a => {
      if (!a || !a.verb || !a.tense || !a.person) throw new DomainError('Réponse archivée incomplète.');
      return Object.freeze({
        verb: String(a.verb),
        tense: String(a.tense),
        person: String(a.person),
        given: String(a.given ?? ''),
        correct: Boolean(a.correct),
        timeMs: Math.max(0, Math.round(Number(a.timeMs) || 0)),
      });
    }));
    this.correctCount = this.answers.filter(a => a.correct).length;
    this.masteredKeys = Object.freeze(Array.isArray(masteredKeys) ? masteredKeys.map(String) : []);
    this.level = Number.isInteger(level) && level >= 1 ? level : null;
    const before = nonNegativeInt(masteredBefore, null);
    const after = nonNegativeInt(masteredAfter, null);
    // Les deux comptes vont ensemble : un seul ne permet pas de mesurer un gain.
    [this.masteredBefore, this.masteredAfter] = this.level !== null && before !== null && after !== null ? [before, after] : [null, null];
    Object.freeze(this);
  }

  get total() {
    return this.answers.length;
  }

  get accuracy() {
    return Math.round((this.correctCount / this.total) * 100);
  }

  get isPerfect() {
    return this.correctCount === this.total;
  }

  get masteredGain() {
    return this.masteredBefore === null ? null : this.masteredAfter - this.masteredBefore;
  }

  get missed() {
    return this.answers.filter(a => !a.correct);
  }

  toSnapshot() {
    return {
      endedAt: this.endedAt.toISOString(),
      durationMs: this.durationMs,
      accuracy: this.accuracy,
      maxCombo: this.maxCombo,
      answers: this.answers.map(a => ({ ...a })),
      ...(this.level === null ? {} : { level: this.level, masteredBefore: this.masteredBefore, masteredAfter: this.masteredAfter }),
      ...(this.masteredKeys.length ? { masteredKeys: [...this.masteredKeys] } : {}),
    };
  }

  static fromSnapshot(snapshot) {
    return new GameRecord({ ...snapshot, endedAt: new Date(snapshot.endedAt) });
  }

  static practiceKeyOf(answer) {
    return comboKey(answer.verb, answer.tense, Person.of(answer.person)?.index ?? answer.person);
  }

  static bestAccuracy(games) {
    return games.reduce((best, g) => Math.max(best, g.accuracy), -Infinity);
  }

  static runs(games, test) {
    let run = 0;
    return games.map(g => (run = test(g) ? run + 1 : 0));
  }

  static accuracyRuns(games, threshold) {
    return GameRecord.runs(games, g => g.accuracy >= threshold);
  }
}

Object.assign(Conjugo, { nonNegativeInt, GameRecord });
})(globalThis.Conjugo ??= {});
