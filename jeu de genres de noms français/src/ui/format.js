// Textes propres au jeu (verdicts, commentaires de la chronologie) ; le reste de la mise en forme est commun.

(function (JeuxFr) {
'use strict';

const { InsightKind, Verdict, escapeHtml, formatSeconds } = JeuxFr;

const VERDICT_TEXT = Object.freeze({
  [Verdict.PERFECT]: 'Sans faute. Impeccable.',
  [Verdict.WEEK_BEST]: 'Ton meilleur score de la semaine.',
  [Verdict.STRONG]: 'Très solide. Les règles sont là.',
  [Verdict.FAIR]: "Bonne base. Les règles s'installent.",
  [Verdict.KEEP_GOING]: 'Chaque erreur, c’est une règle de plus en mémoire.',
});

function insightText(insight) {
  switch (insight.kind) {
    case InsightKind.RECORD:
      return `Nouveau record : ${insight.accuracy} %, contre ${insight.previous} % au mieux jusqu’ici.`;
    case InsightKind.RISING:
      return `Ça monte : tes ${insight.count} dernières parties (${insight.accuracy} % en moyenne) font ${insight.delta} pts de mieux que les précédentes.`;
    case InsightKind.DIP:
      return `Petit creux (${insight.accuracy} %), mais ta moyenne tient à ${insight.average} %. Les mots ratés vont revenir.`;
    case InsightKind.TRAP_WORD:
      return `« ${escapeHtml(insight.word)} » t’a piégé ${insight.misses} fois : ce mot est ${insight.gender.label}. Il reviendra vite.`;
    case InsightKind.FASTER:
      return `Tu réponds plus vite : ${formatSeconds(insight.nowMs)} par mot, contre ${formatSeconds(insight.beforeMs)} au début.`;
    case InsightKind.STEADY:
      return insight.all
        ? `Toutes tes parties sont à ${insight.threshold} % ou plus. Belle régularité.`
        : `Tes ${insight.count} dernières parties sont toutes à ${insight.threshold} % ou plus.`;
    case InsightKind.ABOVE_AVERAGE:
      return `Ta dernière partie (${insight.accuracy} %) dépasse ta moyenne. Continue comme ça.`;
    default:
      return 'Les mots ratés reviennent plus souvent : chaque partie t’aide à les fixer.';
  }
}

Object.assign(JeuxFr, { VERDICT_TEXT, insightText });
})(globalThis.JeuxFr ??= {});
