(function (LeOuLa) {
'use strict';

const { DomainError, Gender, Difficulty, GameRecord } = LeOuLa;

const DEFAULT_GAME_LENGTH = 10;

/** Réponse donnée à un mot. `readMs`, temps passé sur l'explication, est connu une fois l'explication quittée. */
class Answer {
  /** @param {{ word: import('./wordBank.js').Word, chosen: Gender, timeMs: number, readMs?: number | null }} props */
  constructor({ word, chosen, timeMs, readMs = null }) {
    this.word = word;
    this.chosen = chosen;
    this.timeMs = timeMs;
    this.readMs = readMs;
    this.correct = word.isCorrect(chosen);
    Object.freeze(this);
  }

  /** @param {number} readMs @returns {Answer} */
  withReadMs(readMs) {
    return new Answer({ word: this.word, chosen: this.chosen, timeMs: this.timeMs, readMs });
  }
}

/**
 * Partie en cours (agrégat). Elle alterne deux phases :
 * un mot attend une réponse → la réponse est donnée → mot suivant… jusqu'au dernier.
 *
 * Le chrono ne compte que le temps de réflexion : il s'arrête dès qu'une réponse
 * est donnée et ne reprend qu'au mot suivant. Le temps passé sur l'explication
 * (de la réponse au mot suivant ou à la fin) est noté à part, mot par mot.
 * Les instants (`now`) sont des millisecondes fournies par l'appelant (horloge injectée).
 */
class GameSession {
  #length;
  #drawWord;
  #words = [];
  #answers = [];
  #difficultyStart;
  #difficulty;
  #combo = 0;
  #maxCombo = 0;
  #thinkingMs = 0;
  #presentedAt = 0;
  #answeredAt = 0;

  /**
   * @param {{ length?: number, difficulty: Difficulty,
   *           drawWord: (req: { excluded: Set<string>, difficulty: Difficulty }) => import('./wordBank.js').Word }} props
   */
  constructor({ length = DEFAULT_GAME_LENGTH, difficulty, drawWord }) {
    if (!Number.isInteger(length) || length < 1) throw new DomainError(`Longueur de partie invalide : ${length}.`);
    if (!(difficulty instanceof Difficulty)) throw new DomainError('Une partie a besoin d’une difficulté.');
    if (typeof drawWord !== 'function') throw new DomainError('Une partie a besoin d’une source de mots.');
    this.#length = length;
    this.#drawWord = drawWord;
    this.#difficultyStart = difficulty;
    this.#difficulty = difficulty;
  }

  /** Crée une partie et présente immédiatement le premier mot. */
  static start({ now, ...props }) {
    const session = new GameSession(props);
    session.#present(now);
    return session;
  }

  get length() { return this.#length; }
  /** Rang du mot courant, à partir de 1. */
  get position() { return this.#words.length; }
  get currentWord() { return this.#words[this.#words.length - 1]; }
  get answers() { return Object.freeze([...this.#answers]); }
  get lastAnswer() { return this.#answers[this.#answers.length - 1] ?? null; }
  get combo() { return this.#combo; }
  get maxCombo() { return this.#maxCombo; }
  get difficulty() { return this.#difficulty; }
  get isAwaitingAnswer() { return this.#answers.length < this.#words.length; }
  get isComplete() { return this.#answers.length === this.#length; }

  /** Temps de réflexion cumulé, mot courant compris s'il attend encore sa réponse. */
  thinkingTime(now) {
    return this.#thinkingMs + (this.isAwaitingAnswer ? Math.max(0, now - this.#presentedAt) : 0);
  }

  /**
   * @param {Gender} gender @param {number} now
   * @returns {Answer} le combo et la difficulté à jour se lisent ensuite sur la partie
   */
  answer(gender, now) {
    if (!(gender instanceof Gender)) throw new DomainError('Réponse invalide.');
    if (!this.isAwaitingAnswer) throw new DomainError('Aucun mot n’attend de réponse.');
    const timeMs = Math.max(0, now - this.#presentedAt);
    const answer = new Answer({ word: this.currentWord, chosen: gender, timeMs });
    this.#answers.push(answer);
    this.#thinkingMs += timeMs;
    this.#answeredAt = now;
    this.#combo = answer.correct ? this.#combo + 1 : 0;
    this.#maxCombo = Math.max(this.#maxCombo, this.#combo);
    this.#difficulty = this.#difficulty.afterAnswer(answer.correct);
    return answer;
  }

  /** Passe au mot suivant. */
  next(now) {
    if (this.isComplete) throw new DomainError('La partie est terminée.');
    if (this.isAwaitingAnswer) throw new DomainError('Réponds au mot en cours avant de passer au suivant.');
    this.#endReading(now);
    this.#present(now);
  }

  /** Clôt la partie et produit l'enregistrement à archiver. */
  finish(now) {
    if (!this.isComplete) throw new DomainError('La partie n’est pas terminée.');
    this.#endReading(now);
    return new GameRecord({
      endedAt: new Date(now),
      durationMs: this.#thinkingMs,
      difficultyStart: this.#difficultyStart.value,
      difficultyEnd: this.#difficulty.value,
      maxCombo: this.#maxCombo,
      answers: this.#answers.map(a => ({ word: a.word.text, chosen: a.chosen.code, correct: a.correct, timeMs: a.timeMs, readMs: a.readMs })),
    });
  }

  /** Note le temps passé sur l'explication de la dernière réponse. */
  #endReading(now) {
    const last = this.#answers.length - 1;
    this.#answers[last] = this.#answers[last].withReadMs(Math.max(0, now - this.#answeredAt));
  }

  #present(now) {
    const excluded = new Set(this.#words.map(w => w.text));
    const word = this.#drawWord({ excluded, difficulty: this.#difficulty });
    if (!word || excluded.has(word.text)) throw new DomainError('Un mot ne peut pas revenir dans la même partie.');
    this.#words.push(word);
    this.#presentedAt = now;
  }
}

Object.assign(LeOuLa, { DEFAULT_GAME_LENGTH, Answer, GameSession });
})(globalThis.JeuxFr ??= {});
