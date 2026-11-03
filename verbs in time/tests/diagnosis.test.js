import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, engineBank } from './helpers.js';
import { Conjugo } from './game.js';

const { Question, Tense, Person, ErrorKind, diagnose, diagnosisText } = Conjugo;

const bank = engineBank();
const ask = (verb, tense, person) => new Question({ verb: bank.verb(verb), tense, person });
const kindOf = (q, given) => diagnose(q, given)?.kind ?? null;
/** Forme découpée, lisible : « [s]fin|[e]issons ». */
const cut = (verb, tense, person) => bank.verb(verb).conjugate(tense, person).segments
  .filter(s => s.kind !== 'space').map(s => `${s.kind}:${s.text}`).join(' ');

test('formes découpées : radical, terminaison, auxiliaire, pronom, accord', () => {
  assert.equal(cut('finir', Tense.PRESENT, Person.NOUS), 'subject:nous stem:fin ending:issons');
  assert.equal(cut('commencer', Tense.IMPERFECT, Person.NOUS), 'subject:nous stem:commenc ending:ions');
  assert.equal(cut('manger', Tense.PASSE_COMPOSE, Person.JE), 'subject:j’ aux:ai participle:mangé');
  assert.equal(cut('aller', Tense.PASSE_COMPOSE, Person.ELLES), 'subject:elles aux:sont participle:allé agreement:es');
  assert.equal(cut('lever', Tense.PRESENT, Person.JE), 'subject:je pronoun:me stem:lèv ending:e');
  assert.equal(cut('lever', Tense.FUTUR_PROCHE, Person.TU), 'subject:tu aux:vas pronoun:te infinitive:lever');
  assert.equal(cut('voir', Tense.FUTUR_SIMPLE, Person.ILS), 'subject:ils stem:verr ending:ont');
  assert.equal(cut('être', Tense.PRESENT, Person.NOUS), 'subject:nous stem:sommes', 'présent irrégulier : non découpé');
  assert.equal(cut('faire', Tense.PRESENT, Person.ILS), 'subject:ils stem:font', 'radical trop court : non découpé');
});

test('la forme découpée et la forme affichée sont la même', () => {
  for (const verb of bank.verbs) {
    for (const tense of Tense.ALL) {
      for (const person of Person.ALL.filter(p => verb.canConjugate(tense, p))) {
        const c = verb.conjugate(tense, person);
        assert.equal(c.segments.map(s => s.text).join(''), c.display);
      }
    }
  }
});

test('diagnostic : chaque type d’erreur est reconnu', () => {
  assert.equal(kindOf(ask('acheter', Tense.FUTUR_SIMPLE, Person.JE), 'j’acheterai'), ErrorKind.ACCENTS);
  const otherTense = diagnose(ask('finir', Tense.IMPERFECT, Person.NOUS), 'nous finissons');
  assert.deepEqual([otherTense.kind, otherTense.tense], [ErrorKind.OTHER_TENSE, Tense.PRESENT]);
  const otherPerson = diagnose(ask('parler', Tense.IMPERFECT, Person.IL), 'il parlais');
  assert.equal(otherPerson.kind, ErrorKind.OTHER_PERSON);
  assert.equal(otherPerson.person.index, 0);
  assert.deepEqual(diagnose(ask('aller', Tense.PASSE_COMPOSE, Person.JE), 'j’ai allé'), { kind: ErrorKind.AUXILIARY, auxiliary: 'être' });
  assert.deepEqual(diagnose(ask('prendre', Tense.PASSE_COMPOSE, Person.NOUS), 'nous sommes pris'), { kind: ErrorKind.AUXILIARY, auxiliary: 'avoir' });
  assert.equal(kindOf(ask('aller', Tense.PASSE_COMPOSE, Person.ELLE), 'elle est allé'), ErrorKind.AGREEMENT);
  assert.equal(kindOf(ask('lever', Tense.PRESENT, Person.JE), 'je lève'), ErrorKind.MISSING_REFLEXIVE);
  assert.equal(kindOf(ask('lever', Tense.PRESENT, Person.NOUS), 'levons'), ErrorKind.MISSING_REFLEXIVE);
  assert.deepEqual(diagnose(ask('parler', Tense.IMPERFECT, Person.IL), 'il parlerait'), { kind: ErrorKind.ENDING, stem: 'parl', ending: 'ait' });
  const imperativeS = diagnose(ask('parler', Tense.IMPERATIVE, Person.TU), 'parles');
  assert.deepEqual([imperativeS.kind, imperativeS.tense], [ErrorKind.OTHER_TENSE, Tense.PRESENT], 'impératif : le s de tu en trop');
  assert.equal(diagnose(ask('finir', Tense.IMPERATIVE, Person.NOUS), 'finissez').kind, ErrorKind.OTHER_PERSON);
  assert.deepEqual(diagnose(ask('parler', Tense.IMPERATIVE, Person.TU), 'tu parle'), { kind: ErrorKind.SUBJECT, accents: false, wrongPerson: null }, 'impératif : sujet en trop');
  assert.equal(diagnose(ask('parler', Tense.IMPERATIVE, Person.TU), 'vous parle').wrongPerson, Person.VOUS, 'sujet en trop et faux');
  assert.equal(diagnose(ask('parler', Tense.IMPERATIVE, Person.NOUS), 'on parlons').wrongPerson, Person.ON, '« on » reconnu comme sujet');
  assert.equal(diagnose(ask('acheter', Tense.IMPERATIVE, Person.TU), 'tu achete').accents, true, 'sujet en trop et accent oublié');
  assert.equal(kindOf(ask('parler', Tense.PRESENT, Person.ON), 'on parle'), null, 'présent : « on parle » reste juste');
  const onNous = diagnose(ask('parler', Tense.PRESENT, Person.IL), 'on parlons');
  assert.deepEqual([onNous.kind, onNous.person.index], [ErrorKind.OTHER_PERSON, 3], 'présent : « on parlons » est la forme de nous');
  assert.notEqual(diagnose(ask('parler', Tense.PRESENT, Person.TU), 'tu parle')?.tense, Tense.IMPERATIVE,
    'présent : « tu parle » est un s oublié, pas un impératif');
  assert.equal(kindOf(ask('parler', Tense.PRESENT, Person.JE), 'je mange'), null, 'erreur sans nom');
  assert.equal(kindOf(ask('parler', Tense.PRESENT, Person.JE), 'je parle'), null, 'réponse juste');
});

test('le diagnostic est gardé avec la réponse', () => {
  const { GameSession } = Conjugo;
  const q = ask('finir', Tense.IMPERFECT, Person.NOUS);
  const s = GameSession.start({ length: 1, drawQuestion: () => q, now: 0 });
  assert.equal(s.answer('nous finissons', 1).diagnosis.kind, ErrorKind.OTHER_TENSE);
});

test('message « sujet en trop » : sujet faux et accents signalés en plus', () => {
  const q = ask('acheter', Tense.IMPERATIVE, Person.TU);
  assert.equal(diagnosisText(diagnose(q, 'tu achete'), q), 'On ne met pas de sujet à l’impératif : <b>achète</b>. Attention aussi aux accents.');
  assert.equal(diagnosisText(diagnose(q, 'vous achète'), q),
    'On ne met pas de sujet à l’impératif : <b>achète</b>. Et ici, on s’adresse à «&nbsp;tu&nbsp;», pas à «&nbsp;vous&nbsp;».');
});
