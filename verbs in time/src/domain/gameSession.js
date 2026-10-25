(function (Conjugo) {
'use strict';

const { DomainError, Question, GameRecord } = Conjugo;

const DEFAULT_GAME_LENGTH = 5;

/** Réponse saisie pour une question. `readMs`, temps passé sur l'explication, est connu une fois l'explication quittée. */
class Answer {
  /** @param {{ question: Question, given: string, timeMs: number, readMs?: number | null }} props */
  constructor({ question, given, timeMs, readMs = null }) {
    this.question = question;
    this.given = given;
    this.timeMs = timeMs;
    this.readMs = readMs;
    const { correct, accentsOnly } = question.expected.check(given);
    this.correct = correct;
    /** Faux uniquement à cause des accents. */
    this.accentsOnly = accentsOnly;
    Object.freeze(this);
  }

  /** @param {number} readMs @returns {Answer} */
  withReadMs(readMs) {
    return new Answer({ question: this.question, given: this.given, timeMs: this.timeMs, readMs });
  }
}

/**
 * Partie en cours (agrégat). Elle alterne deux phases :
 * une question attend sa réponse → la réponse est saisie → question suivante… jusqu'à la dernière.
 *
 * Le chrono ne compte que le temps de réflexion : il s'arrête dès qu'une réponse
 * est donnée et ne reprend qu'à la question suivante. Le temps passé sur l'explication
 * est noté à part, question par question.
 * Les instants (`now`) sont des millisecondes fournies par l'appelant (horloge injectée).
 */
class GameSession {
  #length;
  #drawQuestion;
  #questions = [];
  #answers = [];
  #combo = 0;
  #maxCombo = 0;
  #thinkingMs = 0;
  #presentedAt = 0;
  #answeredAt = 0;

  /**
   * @param {{ length?: number, drawQuestion: (req: { excludedVerbs: Set<string> }) => Question }} props
   */
  constructor({ length = DEFAULT_GAME_LENGTH, drawQuestion }) {
    if (!Number.isInteger(length) || length < 1) throw new DomainError(`Longueur de partie invalide : ${length}.`);
    if (typeof drawQuestion !== 'function') throw new DomainError('Une partie a besoin d’une source de questions.');
    this.#length = length;
    this.#drawQuestion = drawQuestion;
  }

  /** Crée une partie et présente immédiatement la première question. */
  static start({ now, ...props }) {
    const session = new GameSession(props);
    session.#present(now);
    return session;
  }

  get length() { return this.#length; }
  /** Rang de la question courante, à partir de 1. */
  get position() { return this.#questions.length; }
  get currentQuestion() { return this.#questions[this.#questions.length - 1]; }
  get answers() { return Object.freeze([...this.#answers]); }
  get lastAnswer() { return this.#answers[this.#answers.length - 1] ?? null; }
  get combo() { return this.#combo; }
  get maxCombo() { return this.#maxCombo; }
  get isAwaitingAnswer() { return this.#answers.length < this.#questions.length; }
  get isComplete() { return this.#answers.length === this.#length; }

  /** Temps de réflexion cumulé, question courante comprise si elle attend encore sa réponse. */
  thinkingTime(now) {
    return this.#thinkingMs + (this.isAwaitingAnswer ? Math.max(0, now - this.#presentedAt) : 0);
  }

  /**
   * @param {string} given forme saisie par le joueur @param {number} now
   * @returns {Answer}
   */
  answer(given, now) {
    if (typeof given !== 'string' || !given.trim()) throw new DomainError('Réponse vide.');
    if (!this.isAwaitingAnswer) throw new DomainError('Aucune question n’attend de réponse.');
    const timeMs = Math.max(0, now - this.#presentedAt);
    const answer = new Answer({ question: this.currentQuestion, given: given.trim(), timeMs });
    this.#answers.push(answer);
    this.#thinkingMs += timeMs;
    this.#answeredAt = now;
    this.#combo = answer.correct ? this.#combo + 1 : 0;
    this.#maxCombo = Math.max(this.#maxCombo, this.#combo);
    return answer;
  }

  /** Passe à la question suivante. */
  next(now) {
    if (this.isComplete) throw new DomainError('La partie est terminée.');
    if (this.isAwaitingAnswer) throw new DomainError('Réponds à la question en cours avant de passer à la suivante.');
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
      maxCombo: this.#maxCombo,
      answers: this.#answers.map(a => ({
        verb: a.question.verb.infinitive, tense: a.question.tense.id, person: a.question.person.subject,
        given: a.given, correct: a.correct, timeMs: a.timeMs, readMs: a.readMs,
      })),
    });
  }

  /** Note le temps passé sur l'explication de la dernière réponse. */
  #endReading(now) {
    const last = this.#answers.length - 1;
    this.#answers[last] = this.#answers[last].withReadMs(Math.max(0, now - this.#answeredAt));
  }

  #present(now) {
    const excludedVerbs = new Set(this.#questions.map(q => q.verb.infinitive));
    const question = this.#drawQuestion({ excludedVerbs });
    if (!(question instanceof Question)) throw new DomainError('Question invalide.');
    if (excludedVerbs.has(question.verb.infinitive)) throw new DomainError('Un verbe ne peut pas revenir dans la même partie.');
    this.#questions.push(question);
    this.#presentedAt = now;
  }
}

Object.assign(Conjugo, { DEFAULT_GAME_LENGTH, Answer, GameSession });
})(globalThis.Conjugo ??= {});
