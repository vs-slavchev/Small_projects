(function (Conjugo) {
'use strict';

const { Verdict, ErrorKind, escapeHtml } = Conjugo;

const VERDICT_TEXT = Object.freeze({
  [Verdict.PERFECT]: 'Parfait&nbsp;!',
  [Verdict.WEEK_BEST]: 'Record de la semaine&nbsp;!',
  [Verdict.STRONG]: 'Joli&nbsp;!',
  [Verdict.FAIR]: 'Bien joué.',
  [Verdict.KEEP_GOING]: 'Ça vient.',
});

function diagnosisText(diagnosis, { tense, person, verb, expected }) {
  switch (diagnosis.kind) {
    case ErrorKind.ACCENTS:
      return 'Toutes les lettres sont là : seuls les accents sont faux.';
    case ErrorKind.OTHER_TENSE:
      return `Tu as écrit la forme <b>${diagnosis.tense.withPreposition}</b> ; la question demandait ${tense.withPreposition}.`;
    case ErrorKind.OTHER_PERSON:
    {
      const [of, here] = tense.hasSubject ? ['de', 'le sujet est'] : ['pour', 'on s’adresse à'];
      return `C’est la forme ${of} «&nbsp;<b>${escapeHtml(diagnosis.person.subject)}</b>&nbsp;» ; ici, ${here} «&nbsp;${escapeHtml(person.subject)}&nbsp;».`;
    }
    case ErrorKind.SUBJECT:
      return `On ne met pas de sujet ${tense.withPreposition} : <b>${escapeHtml(expected.display)}</b>.`;
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
