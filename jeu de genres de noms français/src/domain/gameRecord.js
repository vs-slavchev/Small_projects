import { DomainError } from './errors.js';

/**
 * Partie terminée, telle qu'elle est archivée : date et heure de fin, durée,
 * réponses données et difficulté. Le pourcentage de réussite en est dérivé.
 * Les mots sont référencés par leur texte pour rester indépendants de la banque.
 */
export class GameRecord {
  /**
   * @param {{ endedAt: Date, durationMs: number, difficultyStart: number, difficultyEnd: number,
   *           maxCombo: number, answers: { word: string, chosen: 'm'|'f', correct: boolean, timeMs: number }[] }} props
   */
  constructor({ endedAt, durationMs, difficultyStart, difficultyEnd, maxCombo, answers }) {
    const date = new Date(endedAt);
    if (Number.isNaN(date.getTime())) throw new DomainError('Date de fin de partie invalide.');
    if (!Array.isArray(answers) || !answers.length) throw new DomainError('Une partie terminée doit contenir des réponses.');
    this.endedAt = date;
    this.durationMs = Math.max(0, Math.round(Number(durationMs) || 0));
    this.difficultyStart = Number(difficultyStart) || 0;
    this.difficultyEnd = Number(difficultyEnd) || 0;
    this.maxCombo = Math.max(0, Number(maxCombo) || 0);
    this.answers = Object.freeze(answers.map(a => Object.freeze({
      word: String(a.word),
      chosen: a.chosen,
      correct: Boolean(a.correct),
      timeMs: Math.max(0, Math.round(Number(a.timeMs) || 0)),
    })));
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

  /** Textes des mots ratés, dans l'ordre de la partie. */
  get missedWords() {
    return this.answers.filter(a => !a.correct).map(a => a.word);
  }

  toSnapshot() {
    return {
      endedAt: this.endedAt.toISOString(),
      durationMs: this.durationMs,
      accuracy: this.accuracy,
      difficultyStart: this.difficultyStart,
      difficultyEnd: this.difficultyEnd,
      maxCombo: this.maxCombo,
      answers: this.answers.map(a => ({ ...a })),
    };
  }

  static fromSnapshot(snapshot) {
    return new GameRecord({ ...snapshot, endedAt: new Date(snapshot.endedAt) });
  }
}
