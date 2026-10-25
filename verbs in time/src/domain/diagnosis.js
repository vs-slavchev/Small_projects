(function (Conjugo) {
'use strict';

const { Tense, Person, normalizeAnswer } = Conjugo;

/** Nature d'une erreur, de la plus précise à la plus vague. */
const ErrorKind = Object.freeze({
  ACCENTS: 'accents',                   // juste, aux accents près
  OTHER_TENSE: 'otherTense',            // { tense } : la forme d'un autre temps, à la même personne
  OTHER_PERSON: 'otherPerson',          // { person } : la forme d'une autre personne, au même temps
  AUXILIARY: 'auxiliary',               // { auxiliary } : passé composé avec le mauvais auxiliaire
  AGREEMENT: 'agreement',               // participe mal accordé avec être
  MISSING_REFLEXIVE: 'missingReflexive', // pronom réfléchi oublié
  ENDING: 'ending',                     // { stem, ending } : bon radical, mauvaise terminaison
});

/**
 * Explique une réponse fausse en la comparant aux autres formes du même verbe.
 * Retourne null pour une réponse juste ou une erreur qu'on ne sait pas nommer.
 *
 * @param {import('./conjugation.js').Question} question @param {string} given
 * @returns {{ kind: string, tense?: object, person?: object, auxiliary?: string, stem?: string, ending?: string } | null}
 */
function diagnose(question, given) {
  const { verb, tense, person, expected } = question;
  const result = expected.check(given);
  if (result.correct) return null;
  if (result.accentsOnly) return { kind: ErrorKind.ACCENTS };
  // Le sujet tapé peut lui-même être faux (« il parlais ») : on compare aussi la forme sans lui.
  const withoutSubject = given.trim().replace(/^(je|j['’]\s*|tu|il|elle|nous|vous|ils|elles)\s+/i, '').replace(/^j['’]\s*/i, '');
  const matches = conjugation => conjugation.check(given).correct || conjugation.check(withoutSubject).correct;

  if (tense === Tense.PASSE_COMPOSE) {
    if (verb.auxiliary === 'être' && matches(verb.conjugate(tense, person, { anyAgreement: true }))) return { kind: ErrorKind.AGREEMENT };
    const other = verb.auxiliary === 'être' ? 'avoir' : 'être';
    if (!verb.pronominal && matches(verb.conjugate(tense, person, { auxiliary: other, anyAgreement: true }))) {
      return { kind: ErrorKind.AUXILIARY, auxiliary: verb.auxiliary };
    }
  }
  if (verb.pronominal && matches(verb.conjugate(tense, person, { pronominal: false, anyAgreement: true }))) {
    return { kind: ErrorKind.MISSING_REFLEXIVE };
  }
  const otherTense = Tense.ALL.find(t => t !== tense && matches(verb.conjugate(t, person)));
  if (otherTense) return { kind: ErrorKind.OTHER_TENSE, tense: otherTense };
  const otherPerson = Person.ALL.find(p => p.index !== person.index && matches(verb.conjugate(tense, p)));
  if (otherPerson) return { kind: ErrorKind.OTHER_PERSON, person: otherPerson };

  const stem = expected.segments.filter(s => s.kind === 'stem').map(s => s.text).join('');
  const ending = expected.segments.find(s => s.kind === 'ending')?.text;
  if (ending && stem.length >= 2) {
    const typed = normalizeAnswer(given);
    const word = typed.split(/[ ']/).at(-1);
    if (word.startsWith(normalizeAnswer(stem))) return { kind: ErrorKind.ENDING, stem, ending };
  }
  return null;
}

Object.assign(Conjugo, { ErrorKind, diagnose });
})(globalThis.Conjugo ??= {});
