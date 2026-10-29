(function (Conjugo) {
'use strict';

const { DomainError, Person, comboKey } = Conjugo;

/** Entier positif ou nul, sinon `fallback` : lecture tolérante d'un compte enregistré. */
const nonNegativeInt = (value, fallback) => (Number.isInteger(value) && value >= 0 ? value : fallback);

/**
 * Partie terminée, telle qu'elle est archivée : date et heure de fin, durée et réponses.
 * Le pourcentage de réussite en est dérivé.
 * Les questions sont référencées par infinitif, identifiant de temps et pronom sujet,
 * pour rester indépendantes de la banque de verbes.
 * Une partie jouée dans un niveau garde ce niveau et le nombre de formes acquises du niveau
 * avant et après elle : on en tire le gain du jour et le rythme du joueur.
 */
class GameRecord {
  /**
   * @param {{ endedAt: Date, durationMs: number, maxCombo: number,
   *           answers: { verb: string, tense: string, person: string, given: string, correct: boolean,
   *                      timeMs: number }[],
   *           level?: number | null, masteredBefore?: number | null, masteredAfter?: number | null }} props
   */
  constructor({ endedAt, durationMs, maxCombo, answers, level = null, masteredBefore = null, masteredAfter = null }) {
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
    this.level = nonNegativeInt(level, null);
    const before = nonNegativeInt(masteredBefore, null);
    const after = nonNegativeInt(masteredAfter, null);
    // Les deux comptes vont ensemble : un seul ne permet pas de mesurer un gain.
    [this.masteredBefore, this.masteredAfter] = this.level !== null && before !== null && after !== null ? [before, after] : [null, null];
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

  /** Formes acquises gagnées pendant la partie dans son niveau (négatif si des formes ont été perdues), ou null. */
  get masteredGain() {
    return this.masteredBefore === null ? null : this.masteredAfter - this.masteredBefore;
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
      ...(this.level === null ? {} : { level: this.level, masteredBefore: this.masteredBefore, masteredAfter: this.masteredAfter }),
    };
  }

  static fromSnapshot(snapshot) {
    return new GameRecord({ ...snapshot, endedAt: new Date(snapshot.endedAt) });
  }

  /** Clé de suivi d'une réponse archivée (voir `comboKey`) : il, elle et on comptent ensemble, ils et elles aussi. */
  static practiceKeyOf(answer) {
    return comboKey(answer.verb, answer.tense, Person.of(answer.person)?.index ?? answer.person);
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

Object.assign(Conjugo, { nonNegativeInt, GameRecord });
})(globalThis.Conjugo ??= {});
