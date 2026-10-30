// Textes du jeu (verdicts, diagnostics) ; la mise en forme générique est dans textFormat.js.

(function (Conjugo) {
'use strict';

const { Verdict, ErrorKind, escapeHtml } = Conjugo;

/** Mot d'encouragement du bilan, après « +3 formes en 2 minutes. » */
const VERDICT_TEXT = Object.freeze({
  [Verdict.PERFECT]: 'Parfait&nbsp;!',
  [Verdict.WEEK_BEST]: 'Record de la semaine&nbsp;!',
  [Verdict.STRONG]: 'Joli&nbsp;!',
  [Verdict.FAIR]: 'Bien joué.',
  [Verdict.KEEP_GOING]: 'Ça vient.',
});

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

Object.assign(Conjugo, { VERDICT_TEXT, diagnosisText });
})(globalThis.Conjugo ??= {});
