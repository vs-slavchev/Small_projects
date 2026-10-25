// Textes propres au jeu (verdicts, commentaires de la chronologie) ; le reste de la mise en forme est commun.

(function (JeuxFr) {
'use strict';

const { InsightKind, Verdict, Tense, ErrorKind, escapeHtml, formatSeconds } = JeuxFr;

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

/**
 * Phrase qui explique une erreur (voir `diagnose`).
 * @param {{ kind: string }} diagnosis @param {import('../domain/conjugation.js').Question} question
 */
function diagnosisText(diagnosis, { tense, person, verb }) {
  switch (diagnosis.kind) {
    case ErrorKind.ACCENTS:
      return 'Toutes les lettres sont là : seuls les accents sont faux.';
    case ErrorKind.OTHER_TENSE:
      return `Tu as écrit la forme <b>${diagnosis.tense.withPreposition}</b> ; la question demandait ${tense.withPreposition}.`;
    case ErrorKind.OTHER_PERSON:
      return `C’est la forme de «&nbsp;<b>${escapeHtml(diagnosis.person.subject)}</b>&nbsp;» ; ici, le sujet est «&nbsp;${escapeHtml(person.subject)}&nbsp;».`;
    case ErrorKind.AUXILIARY:
      return `${escapeHtml(verb.label)} se conjugue avec <b>${diagnosis.auxiliary}</b> au passé composé${diagnosis.auxiliary === 'être' ? ' (verbes de mouvement et verbes pronominaux)' : ''}.`;
    case ErrorKind.AGREEMENT:
      return `Avec être, le participe s’accorde avec le sujet : <b>+e</b> au féminin, <b>+s</b> au pluriel.`;
    case ErrorKind.MISSING_REFLEXIVE:
      return 'Le pronom réfléchi (me, te, se, nous, vous) fait partie du verbe : il ne doit pas manquer.';
    case ErrorKind.ENDING:
      return `Le radical <b>${escapeHtml(diagnosis.stem)}-</b> est juste ; c’est la terminaison qui change : <b>-${escapeHtml(diagnosis.ending)}</b>.`;
    default:
      return '';
  }
}

/** « au futur simple », « à l’imparfait » ; l'identifiant brut si le temps n'existe plus. */
const tenseWithPreposition = id => Tense.ALL.find(t => t.id === id)?.withPreposition ?? escapeHtml(id);

Object.assign(JeuxFr, { VERDICT_TEXT, insightText, diagnosisText });
})(globalThis.JeuxFr ??= {});
