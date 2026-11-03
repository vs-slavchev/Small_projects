(function (Conjugo) {
'use strict';

const { Tense, Person, normalizeAnswer } = Conjugo;

const ErrorKind = Object.freeze({
  ACCENTS: 'accents',
  OTHER_TENSE: 'otherTense',
  OTHER_PERSON: 'otherPerson',
  AUXILIARY: 'auxiliary',
  AGREEMENT: 'agreement',
  MISSING_REFLEXIVE: 'missingReflexive',
  SUBJECT: 'subject',
  ENDING: 'ending',
});

function diagnose(question, given) {
  const { verb, tense, person, expected } = question;
  const result = expected.check(given);
  if (result.correct) return null;
  if (result.accentsOnly) return { kind: ErrorKind.ACCENTS };
  // Le sujet tapé peut lui-même être faux (« il parlais ») : on compare aussi la forme sans lui.
  const withoutSubject = given.trim().replace(/^(je|j['’]\s*|tu|il|elle|nous|vous|ils|elles)\s+/i, '').replace(/^j['’]\s*/i, '');
  const matches = conjugation => conjugation.check(given).correct || conjugation.check(withoutSubject).correct;
  const tries = (t, p) => verb.canConjugate(t, p) && matches(verb.conjugate(t, p));

  // À l'impératif, la bonne forme précédée d'un sujet (« tu parle ») : seul le sujet est en trop.
  if (!tense.hasSubject && expected.check(withoutSubject).correct) return { kind: ErrorKind.SUBJECT };

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
  // L'impératif n'est jamais proposé comme autre temps : « tu parle » au présent est un s oublié, pas un impératif.
  const otherTense = Tense.ALL.find(t => t !== tense && t !== Tense.IMPERATIVE && tries(t, person));
  if (otherTense) return { kind: ErrorKind.OTHER_TENSE, tense: otherTense };
  const otherPerson = Person.ALL.find(p => p.index !== person.index && tries(tense, p));
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
