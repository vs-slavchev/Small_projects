import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank } from './helpers.js';
import { Conjugo } from './game.js';

const { Tense, Person, Question, VerbBank, VERB_DATA, VERB_TYPES, DomainError } = Conjugo;

const bank = realBank();
const form = (infinitive, tense, person) => bank.verb(infinitive).conjugate(tense, person).display;
const { PRESENT, IMPERFECT, PASSE_COMPOSE, FUTUR_PROCHE, FUTUR_SIMPLE } = Tense;
const { JE, TU, IL, ELLE, NOUS, VOUS, ILS, ELLES } = Person;

test('chaque type de verbe a au moins un exemple', () => {
  for (const type of bank.types) assert.ok(bank.verbs.some(v => v.type === type), type.label);
  assert.equal(bank.types.length, VERB_TYPES.length);
});

test('1er et 2e groupes réguliers : formes déduites de l’infinitif', () => {
  assert.equal(form('parler', PRESENT, NOUS), 'nous parlons');
  assert.equal(form('parler', PASSE_COMPOSE, ILS), 'ils ont parlé');
  assert.equal(form('finir', PRESENT, ILS), 'ils finissent');
  assert.equal(form('finir', IMPERFECT, NOUS), 'nous finissions');
  assert.equal(form('finir', PASSE_COMPOSE, ELLE), 'elle a fini');
});

test('particularités du 1er groupe', () => {
  assert.equal(form('commencer', IMPERFECT, JE), 'je commençais');
  assert.equal(form('commencer', IMPERFECT, NOUS), 'nous commencions', 'pas de cédille devant i');
  assert.equal(form('manger', IMPERFECT, IL), 'il mangeait');
  assert.equal(form('manger', IMPERFECT, VOUS), 'vous mangiez');
  assert.equal(form('acheter', FUTUR_SIMPLE, TU), 'tu achèteras');
  assert.equal(form('appeler', FUTUR_SIMPLE, ELLES), 'elles appelleront');
  assert.equal(form('nettoyer', PRESENT, ILS), 'ils nettoient');
  assert.equal(form('nettoyer', IMPERFECT, NOUS), 'nous nettoyions');
});

test('3e groupe et auxiliaires : radicaux irréguliers', () => {
  assert.equal(form('venir', FUTUR_SIMPLE, NOUS), 'nous viendrons');
  assert.equal(form('voir', FUTUR_SIMPLE, JE), 'je verrai');
  assert.equal(form('aller', FUTUR_SIMPLE, JE), 'j’irai');
  assert.equal(form('faire', PRESENT, VOUS), 'vous faites');
  assert.equal(form('prendre', FUTUR_SIMPLE, IL), 'il prendra', 'le e final des verbes en -re tombe');
  assert.equal(form('être', IMPERFECT, JE), 'j’étais');
  assert.equal(form('être', PASSE_COMPOSE, NOUS), 'nous avons été');
  assert.equal(form('avoir', PASSE_COMPOSE, JE), 'j’ai eu');
});

test('futur proche : aller au présent + infinitif', () => {
  assert.equal(form('finir', FUTUR_PROCHE, NOUS), 'nous allons finir');
  assert.equal(form('habiter', FUTUR_PROCHE, JE), 'je vais habiter');
  assert.equal(form('lever', FUTUR_PROCHE, TU), 'tu vas te lever');
});

test('passé composé avec être : accord avec le sujet', () => {
  assert.equal(form('aller', PASSE_COMPOSE, ELLE), 'elle est allée');
  assert.equal(form('partir', PASSE_COMPOSE, ILS), 'ils sont partis');
  assert.equal(form('venir', PASSE_COMPOSE, NOUS), 'nous sommes venu(e)s');
  const je = bank.verb('aller').conjugate(PASSE_COMPOSE, JE);
  assert.ok(je.check('je suis allé').correct && je.check('je suis allée').correct);
  assert.equal(bank.verb('aller').conjugate(PASSE_COMPOSE, IL).check('il est allée').correct, false);
  assert.equal(bank.verb('aller').conjugate(PASSE_COMPOSE, ELLES).check('elles sont allés').correct, false);
});

test('verbe pronominal : pronom réfléchi élidé, auxiliaire être', () => {
  const verb = bank.verb('lever');
  assert.equal(verb.label, 'se lever');
  assert.equal(verb.auxiliary, 'être');
  assert.equal(form('lever', PRESENT, NOUS), 'nous nous levons');
  assert.equal(form('lever', PASSE_COMPOSE, TU), 'tu t’es levé(e)');
  assert.equal(form('lever', PASSE_COMPOSE, ELLE), 'elle s’est levée');
});

test('élision de « je » devant une voyelle ou un h muet', () => {
  assert.equal(form('habiter', PRESENT, JE), 'j’habite');
  assert.equal(form('attendre', IMPERFECT, JE), 'j’attendais');
  assert.equal(form('parler', PRESENT, JE), 'je parle');
});

test('saisie : casse, espaces, apostrophes et sujet facultatif', () => {
  const c = bank.verb('habiter').conjugate(PRESENT, JE);
  for (const input of ['j’habite', "J'habite", "j' habite", '  habite  ', 'habite.']) assert.ok(c.check(input).correct, input);
  assert.equal(c.check('habites').correct, false);
  assert.ok(bank.verb('lever').conjugate(PRESENT, JE).check('me lève').correct);
  assert.equal(bank.verb('lever').conjugate(PRESENT, JE).check('lève').correct, false, 'le pronom réfléchi est obligatoire');
  const nous = bank.verb('lever').conjugate(PRESENT, NOUS);
  assert.ok(nous.check('nous nous levons').correct);
  assert.equal(nous.check('nous levons').correct, false, 'avec nous et vous, le sujet est obligatoire');
  assert.equal(bank.verb('lever').conjugate(PASSE_COMPOSE, VOUS).check('vous êtes levés').correct, false);
  assert.ok(bank.verb('finir').conjugate(PRESENT, NOUS).check('finissons').correct, 'verbe non pronominal : sujet facultatif');
});

test('accents : réponse fausse, mais signalée comme presque juste', () => {
  const c = bank.verb('acheter').conjugate(FUTUR_SIMPLE, JE);
  assert.deepEqual(c.check('j’acheterai'), { correct: false, accentsOnly: true });
  assert.deepEqual(c.check('j’achetrai'), { correct: false, accentsOnly: false });
});

test('orthographe rectifiée acceptée et signalée', () => {
  const c = bank.verb('préférer').conjugate(FUTUR_SIMPLE, JE);
  assert.equal(c.display, 'je préférerai');
  assert.deepEqual(c.others, ['je préfèrerai']);
  assert.ok(c.check('je préfèrerai').correct);
});

test('données invalides refusées au chargement', () => {
  assert.throws(() => VerbBank.fromData([...VERB_DATA, VERB_DATA[0]]), /double/);
  assert.throws(() => VerbBank.fromData([{ infinitive: 'tenir', type: 'third' }]), DomainError);
  assert.throws(() => VerbBank.fromData([{ infinitive: 'x', type: 'inconnu' }]), /type inconnu/);
  assert.throws(() => VerbBank.fromData(VERB_DATA.filter(v => v.type !== 'pronominal')), /Aucun verbe/);
});

test('une question calcule sa forme attendue', () => {
  const q = new Question({ verb: bank.verb('finir'), tense: FUTUR_SIMPLE, person: NOUS });
  assert.equal(q.expected.display, 'nous finirons');
  assert.throws(() => new Question({ verb: bank.verb('finir'), tense: FUTUR_SIMPLE }), DomainError);
});
