(function (JeuxFr) {
'use strict';

const { AnswerStat, AnswerStatsBook } = JeuxFr;

/** Historique des réponses à un mot. Objet valeur immuable. */
class WordStat extends AnswerStat {
  /** Taux de réussite à partir duquel un mot est considéré comme acquis. */
  static MASTERY_ACCURACY = 0.8;

  /**
   * Mot acquis : dernière réponse juste et taux de réussite d'au moins MASTERY_ACCURACY.
   * Une erreur ancienne, suivie d'assez de bonnes réponses, ne le fait plus revenir en révision ;
   * une erreur toute récente, si.
   * (À ne pas confondre avec « Maître du groupe », qui ne regarde que la dernière réponse,
   * pour chaque mot d'un groupe, sans seuil de réussite.)
   */
  get isMastered() {
    return this.lastCorrect === true && this.accuracy >= WordStat.MASTERY_ACCURACY;
  }
}

/** Statistiques de tous les mots rencontrés par le joueur, indexées par texte. */
class WordStatsBook extends AnswerStatsBook {
  static Stat = WordStat;

  /**
   * Parmi `candidates`, les mots déjà vus et pas encore maîtrisés (voir `WordStat.isMastered`),
   * du plus faible taux de réussite au plus élevé.
   * @param {string[]} candidates @param {number} limit @returns {string[]}
   */
  weakest(candidates, limit) {
    return candidates
      .map(text => [text, this.get(text)])
      .filter(([, s]) => s.seen > 0 && !s.isMastered)
      .sort(([ta, a], [tb, b]) => a.accuracy - b.accuracy || b.seen - a.seen || ta.localeCompare(tb))
      .slice(0, limit)
      .map(([text]) => text);
  }
}

Object.assign(JeuxFr, { WordStat, WordStatsBook });
})(globalThis.JeuxFr ??= {});
