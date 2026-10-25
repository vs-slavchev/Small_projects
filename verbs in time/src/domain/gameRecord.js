(function (JeuxFr) {
'use strict';

const { DomainError } = JeuxFr;

/**
 * Partie terminée, telle qu'elle est archivée : date et heure de fin, durée et réponses.
 * Le pourcentage de réussite en est dérivé.
 * Les questions sont référencées par infinitif, identifiant de temps et pronom sujet,
 * pour rester indépendantes de la banque de verbes.
 */
class GameRecord {
  /**
   * @param {{ endedAt: Date, durationMs: number, maxCombo: number,
   *           answers: { verb: string, tense: string, person: string, given: string, correct: boolean,
   *                      timeMs: number }[] }} props
   */
  constructor({ endedAt, durationMs, maxCombo, answers }) {
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
    Object.freeze(this);
  }

  get total() {
    return this.answers.length;
  }

  /** Pourcentage de réussite, entier de 0 à 100. */
  get accuracy() {
    return Math.round((this.correctCount / this.total) * 100);
  }

  get isPerfect() {
    return this.correctCount === this.total;
  }

  /** Réponses ratées, dans l'ordre de la partie. */
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
    };
  }

  static fromSnapshot(snapshot) {
    return new GameRecord({ ...snapshot, endedAt: new Date(snapshot.endedAt) });
  }

  /** Clé de suivi des statistiques : un verbe à un temps, toutes personnes confondues. */
  static practiceKeyOf(answer) {
    return `${answer.verb}|${answer.tense}`;
  }

  /** Meilleur pourcentage de réussite parmi `games` (-Infinity si aucune). @param {GameRecord[]} games */
  static bestAccuracy(games) {
    return games.reduce((best, g) => Math.max(best, g.accuracy), -Infinity);
  }

  /**
   * Pour chaque partie, longueur de la série de parties consécutives vérifiant `test` qui s'y termine.
   * @param {GameRecord[]} games dans l'ordre chronologique @param {(g: GameRecord) => boolean} test @returns {number[]}
   */
  static runs(games, test) {
    let run = 0;
    return games.map(g => (run = test(g) ? run + 1 : 0));
  }

  /** Séries de parties consécutives à `threshold` % ou plus. @param {GameRecord[]} games @param {number} threshold */
  static accuracyRuns(games, threshold) {
    return GameRecord.runs(games, g => g.accuracy >= threshold);
  }
}

Object.assign(JeuxFr, { GameRecord });
})(globalThis.JeuxFr ??= {});
