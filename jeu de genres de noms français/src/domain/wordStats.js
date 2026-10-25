(function (JeuxFr) {
'use strict';

const { AnswerStat, AnswerStatsBook } = JeuxFr;

/**
 * Historique des réponses à un mot. Objet valeur immuable.
 * (« Acquis », `isMastered`, est à ne pas confondre avec « Maître du groupe », qui ne regarde que
 * la dernière réponse, pour chaque mot d'un groupe, sans seuil de réussite.)
 */
class WordStat extends AnswerStat {}

/** Statistiques de tous les mots rencontrés par le joueur, indexées par texte. */
class WordStatsBook extends AnswerStatsBook {
  static Stat = WordStat;
}

Object.assign(JeuxFr, { WordStat, WordStatsBook });
})(globalThis.JeuxFr ??= {});
