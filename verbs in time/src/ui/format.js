// Textes propres au jeu (verdicts, commentaires de la chronologie) ; le reste de la mise en forme est commun.

(function (JeuxFr) {
'use strict';

const { InsightKind, Verdict, Tense, escapeHtml, formatSeconds } = JeuxFr;

const VERDICT_TEXT = Object.freeze({
  [Verdict.PERFECT]: 'Sans faute. Impeccable.',
  [Verdict.WEEK_BEST]: 'Ton meilleur score de la semaine.',
  [Verdict.STRONG]: 'Très solide. Les conjugaisons sont là.',
  [Verdict.FAIR]: "Bonne base. Les terminaisons s'installent.",
  [Verdict.KEEP_GOING]: 'Chaque erreur, c’est une forme de plus en mémoire.',
});

function insightText(insight) {
  switch (insight.kind) {
    case InsightKind.RECORD:
      return `Nouveau record : ${insight.accuracy} %, contre ${insight.previous} % au mieux jusqu’ici.`;
    case InsightKind.RISING:
      return `Ça monte : tes ${insight.count} dernières parties (${insight.accuracy} % en moyenne) font ${insight.delta} pts de mieux que les précédentes.`;
    case InsightKind.DIP:
      return `Petit creux (${insight.accuracy} %), mais ta moyenne tient à ${insight.average} %.`;
    case InsightKind.TRAP:
      return `« ${escapeHtml(insight.verb)} » ${tenseWithPreposition(insight.tense)} t’a piégé ${insight.misses} fois. Relis ses terminaisons à la prochaine occasion.`;
    case InsightKind.FASTER:
      return `Tu réponds plus vite : ${formatSeconds(insight.nowMs)} par verbe, contre ${formatSeconds(insight.beforeMs)} au début.`;
    case InsightKind.STEADY:
      return insight.all
        ? `Toutes tes parties sont à ${insight.threshold} % ou plus. Belle régularité.`
        : `Tes ${insight.count} dernières parties sont toutes à ${insight.threshold} % ou plus.`;
    case InsightKind.ABOVE_AVERAGE:
      return `Ta dernière partie (${insight.accuracy} %) dépasse ta moyenne. Continue comme ça.`;
    default:
      return 'Chaque partie t’aide à fixer les terminaisons des cinq temps.';
  }
}

/** « au futur simple », « à l’imparfait » ; l'identifiant brut si le temps n'existe plus. */
const tenseWithPreposition = id => Tense.ALL.find(t => t.id === id)?.withPreposition ?? escapeHtml(id);

Object.assign(JeuxFr, { VERDICT_TEXT, insightText });
})(globalThis.JeuxFr ??= {});
