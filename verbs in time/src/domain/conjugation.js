(function (Conjugo) {
'use strict';

const { DomainError, VERB_TYPES, VERB_DATA } = Conjugo;

const APOSTROPHE = '’';
// Le h est traité comme muet : aucun verbe de la banque ne commence par un h aspiré.
const STARTS_WITH_VOWEL = /^[aeiouàâäéèêëîïôöùûüæœh]/i;
const ELIDABLE = new Set(['je', 'me', 'te', 'se']);

const segment = (kind, text) => Object.freeze({ kind, text });
const SPACE = segment('space', ' ');
const textOf = segments => segments.map(s => s.text).join('');

function withPronoun(kind, pronoun, segments) {
  return ELIDABLE.has(pronoun) && STARTS_WITH_VOWEL.test(textOf(segments))
    ? [segment(kind, `${pronoun.slice(0, -1)}${APOSTROPHE}`), ...segments]
    : [segment(kind, pronoun), SPACE, ...segments];
}

class Person {
  constructor(subject, index, agreements, agreementLabel) {
    this.subject = subject;
    this.index = index;
    this.agreements = Object.freeze(agreements);
    this.agreementLabel = agreementLabel;
    Object.freeze(this);
  }

  static JE = new Person('je', 0, ['', 'e'], '(e)');
  static TU = new Person('tu', 1, ['', 'e'], '(e)');
  static IL = new Person('il', 2, [''], '');
  static ELLE = new Person('elle', 2, ['e'], 'e');
  static NOUS = new Person('nous', 3, ['s', 'es'], '(e)s');
  static VOUS = new Person('vous', 4, ['', 'e', 's', 'es'], '(e)(s)');
  static ON = new Person('on', 2, ['', 'e', 's', 'es'], '(e)(s)');
  static ILS = new Person('ils', 5, ['s'], 's');
  static ELLES = new Person('elles', 5, ['es'], 'es');
  static ALL = Object.freeze([Person.JE, Person.TU, Person.IL, Person.ELLE, Person.ON, Person.NOUS, Person.VOUS, Person.ILS, Person.ELLES]);
  static SLOTS = Object.freeze([0, 1, 2, 3, 4, 5].map(i => Object.freeze(Person.ALL.filter(p => p.index === i))));

  static of(subject) {
    return Person.ALL.find(p => p.subject === subject);
  }
}

class Tense {
  constructor({ id, label, withPreposition, markers }) {
    this.id = id;
    this.label = label;
    this.withPreposition = withPreposition;
    this.markers = Object.freeze([...markers]);
    Object.freeze(this);
  }

  static PRESENT = new Tense({ id: 'present', label: 'présent', withPreposition: 'au présent',
    markers: ['En ce moment,', 'Aujourd’hui,', 'Tous les jours,'] });
  static IMPERFECT = new Tense({ id: 'imperfect', label: 'imparfait', withPreposition: 'à l’imparfait',
    markers: ['Autrefois,', 'À l’époque,', 'Chaque été, avant,'] });
  static PASSE_COMPOSE = new Tense({ id: 'passeCompose', label: 'passé composé', withPreposition: 'au passé composé',
    markers: ['Hier,', 'La semaine dernière,', 'Ce matin,'] });
  static FUTUR_PROCHE = new Tense({ id: 'futurProche', label: 'futur proche', withPreposition: 'au futur proche',
    markers: ['Tout à l’heure,', 'Ce soir,', 'Dans cinq minutes,'] });
  static FUTUR_SIMPLE = new Tense({ id: 'futurSimple', label: 'futur simple', withPreposition: 'au futur simple',
    markers: ['L’année prochaine,', 'Un jour,', 'Dans dix ans,'] });
  static ALL = Object.freeze([Tense.PRESENT, Tense.IMPERFECT, Tense.PASSE_COMPOSE, Tense.FUTUR_PROCHE, Tense.FUTUR_SIMPLE]);
}

const REFLEXIVE = Object.freeze(['me', 'te', 'se', 'nous', 'vous', 'se']);
const AUXILIARY_PRESENT = Object.freeze({
  avoir: Object.freeze(['ai', 'as', 'a', 'avons', 'avez', 'ont']),
  être: Object.freeze(['suis', 'es', 'est', 'sommes', 'êtes', 'sont']),
});
const ALLER_PRESENT = Object.freeze(['vais', 'vas', 'va', 'allons', 'allez', 'vont']);
const IMPERFECT_ENDINGS = Object.freeze(['ais', 'ais', 'ait', 'ions', 'iez', 'aient']);
const FUTURE_ENDINGS = Object.freeze(['ai', 'as', 'a', 'ons', 'ez', 'ont']);
const REGULAR_PRESENT_ENDINGS = Object.freeze({
  first: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
  second: ['is', 'is', 'it', 'issons', 'issez', 'issent'],
});
const OTHER_PRESENT_ENDINGS = Object.freeze([['s', 'x'], ['s', 'x'], ['t'], ['ons'], ['ez'], ['ent']]);
const ALL_AGREEMENTS = Object.freeze(['', 'e', 's', 'es']);

class VerbType {
  constructor({ id, label, rule }) {
    this.id = id;
    this.label = label;
    this.rule = rule;
    Object.freeze(this);
  }
}

class Verb {
  constructor({ infinitive, type, translation = '', present, participle, auxiliary = 'avoir', futureStem, imperfectStem,
    pronominal = false, irregularPresent = false, alsoLike = [], note = '' }) {
    if (!infinitive) throw new DomainError('Un verbe doit avoir un infinitif.');
    if (!(type instanceof VerbType)) throw new DomainError(`« ${infinitive} » : type invalide.`);
    if (!(auxiliary in AUXILIARY_PRESENT)) throw new DomainError(`« ${infinitive} » : auxiliaire inconnu « ${auxiliary} ».`);
    const regular = REGULAR_PRESENT_ENDINGS[type.id];
    const stem = infinitive.slice(0, -2);
    if (!present && !regular) throw new DomainError(`« ${infinitive} » : le présent doit être donné.`);
    this.present = Object.freeze(present ?? regular.map(ending => stem + ending));
    if (this.present.length !== 6 || this.present.some(f => !f)) throw new DomainError(`« ${infinitive} » : le présent doit avoir 6 formes.`);
    const defaultParticiple = infinitive.endsWith('er') ? `${stem}é` : type.id === 'second' ? `${stem}i` : null;
    if (!participle && !defaultParticiple) throw new DomainError(`« ${infinitive} » : le participe passé doit être donné.`);
    if (!imperfectStem && !this.present[3].endsWith('ons')) throw new DomainError(`« ${infinitive} » : radical de l’imparfait introuvable.`);

    this.infinitive = infinitive;
    this.type = type;
    this.translation = translation;
    this.participle = participle ?? defaultParticiple;
    this.auxiliary = pronominal ? 'être' : auxiliary;
    const futureStems = [futureStem ?? (infinitive.endsWith('re') ? infinitive.slice(0, -1) : infinitive)].flat();
    this.futureStems = Object.freeze(futureStems);
    this.imperfectStem = imperfectStem ?? this.present[3].slice(0, -3);
    this.pronominal = pronominal;
    this.splitsPresent = type.id !== 'auxiliary' && !irregularPresent;
    this.alsoLike = Object.freeze([...alsoLike]);
    this.note = note;
    Object.freeze(this);
  }

  get label() {
    return this.pronominal ? textOf(withPronoun('pronoun', 'se', [segment('infinitive', this.infinitive)])) : this.infinitive;
  }

  conjugate(tense, person, { auxiliary = this.auxiliary, pronominal = this.pronominal, anyAgreement = false } = {}) {
    if (!(tense instanceof Tense)) throw new DomainError('Temps invalide.');
    if (!(person instanceof Person)) throw new DomainError('Personne invalide.');
    const i = person.index;
    const reflexive = segments => (pronominal ? withPronoun('pronoun', REFLEXIVE[i], segments) : segments);
    const stemAndEnding = (stem, ending) => [segment('stem', stem), segment('ending', ending)];
    let variants;
    let spellings = [];
    let shown;
    switch (tense) {
      case Tense.PRESENT:
        variants = [reflexive(this.#presentSegments(i))];
        break;
      case Tense.IMPERFECT:
        variants = [reflexive(stemAndEnding(...imperfectParts(this.imperfectStem, IMPERFECT_ENDINGS[i])))];
        break;
      case Tense.FUTUR_SIMPLE:
        [variants, spellings] = splitFirst(this.futureStems.map(s => reflexive(stemAndEnding(s, FUTURE_ENDINGS[i]))));
        break;
      case Tense.FUTUR_PROCHE:
        variants = [[segment('aux', ALLER_PRESENT[i]), SPACE, ...reflexive([segment('infinitive', this.infinitive)])]];
        break;
      case Tense.PASSE_COMPOSE: {
        const agrees = auxiliary === 'être';
        const compound = ending => reflexive([segment('aux', AUXILIARY_PRESENT[auxiliary][i]), SPACE, ...participle(this.participle, ending)]);
        variants = (anyAgreement ? ALL_AGREEMENTS : agrees ? person.agreements : ['']).map(compound);
        if (agrees && !anyAgreement) shown = compound(person.agreementLabel);
        break;
      }
      default:
        throw new DomainError(`Temps non géré : ${tense.label}.`);
    }
    return new Conjugation({ subject: person.subject, variants, spellings, shown });
  }

  #presentSegments(i) {
    const form = this.present[i];
    if (!this.splitsPresent) return [segment('stem', form)];
    const endings = this.type.id === 'second' ? [REGULAR_PRESENT_ENDINGS.second[i]]
      : this.infinitive.endsWith('er') && this.type.id !== 'third' ? [REGULAR_PRESENT_ENDINGS.first[i]]
        : OTHER_PRESENT_ENDINGS[i];
    // Un radical d'au moins deux lettres : « f|ont » ne serait pas un découpage parlant.
    const ending = endings.find(e => form.endsWith(e) && form.length - e.length >= 2);
    return ending ? [segment('stem', form.slice(0, -ending.length)), segment('ending', ending)] : [segment('stem', form)];
  }
}

const splitFirst = list => [list.slice(0, 1), list.slice(1)];

/** Imparfait : le ç et le ge du radical ne sont utiles que devant a (commençais, mais commencions). */
function imperfectParts(stem, ending) {
  if (!ending.startsWith('i')) return [stem, ending];
  if (stem.endsWith('ç')) return [`${stem.slice(0, -1)}c`, ending];
  if (stem.endsWith('ge')) return [stem.slice(0, -1), ending];
  return [stem, ending];
}

function participle(text, ending) {
  const agreement = agree(text, ending).slice(text.length);
  return agreement ? [segment('participle', text), segment('agreement', agreement)] : [segment('participle', text)];
}

const agree = (participle, ending) => (ending === 's' && participle.endsWith('s') ? participle : participle + ending);

function normalizeAnswer(text) {
  return String(text)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s*'\s*/g, "'")
    .replace(/[.!]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const stripAccents = text => text.normalize('NFD').replace(/\p{M}/gu, '');

class Conjugation {
  #accepted;

  constructor({ subject, variants, spellings = [], shown = variants[0] }) {
    const withSubject = segments => withPronoun('subject', subject, segments);
    const bare = [...variants, ...spellings].map(textOf);
    this.forms = Object.freeze([...variants, ...spellings].map(v => textOf(withSubject(v))));
    this.segments = Object.freeze(withSubject(shown));
    this.display = textOf(this.segments);
    this.others = Object.freeze(this.forms.slice(variants.length));
    this.accepted = Object.freeze([...this.forms, ...bare]);
    this.#accepted = this.accepted.map(normalizeAnswer);
    Object.freeze(this);
  }

  check(input) {
    const given = normalizeAnswer(input);
    if (this.#accepted.includes(given)) return { correct: true, accentsOnly: false };
    const bare = stripAccents(given);
    return { correct: false, accentsOnly: this.#accepted.some(a => stripAccents(a) === bare) };
  }
}

const comboKey = (verb, tense, slot) => `${verb}|${tense}|${slot}`;

class Question {
  constructor({ verb, tense, person, marker = null }) {
    if (!(verb instanceof Verb) || !(tense instanceof Tense) || !(person instanceof Person)) throw new DomainError('Question incomplète.');
    this.verb = verb;
    this.tense = tense;
    this.person = person;
    this.marker = marker;
    this.expected = verb.conjugate(tense, person);
    Object.freeze(this);
  }

  get key() {
    return comboKey(this.verb.infinitive, this.tense.id, this.person.index);
  }
}

class VerbBank {
  #verbs;
  #byInfinitive;
  #types;

  constructor(types, verbs) {
    this.#types = Object.freeze([...types]);
    this.#verbs = Object.freeze([...verbs]);
    this.#byInfinitive = new Map();
    for (const verb of verbs) {
      if (this.#byInfinitive.has(verb.infinitive)) throw new DomainError(`Verbe en double : « ${verb.infinitive} ».`);
      this.#byInfinitive.set(verb.infinitive, verb);
    }
    for (const type of types) {
      if (!verbs.some(v => v.type === type)) throw new DomainError(`Aucun verbe pour le type « ${type.label} ».`);
    }
  }

  static fromData(data = VERB_DATA, typeData = VERB_TYPES) {
    const types = typeData.map(t => new VerbType(t));
    const byId = new Map(types.map(t => [t.id, t]));
    const verbs = data.map(d => {
      const type = byId.get(d.type);
      if (!type) throw new DomainError(`« ${d.infinitive} » : type inconnu « ${d.type} ».`);
      return new Verb({ ...d, type });
    });
    return new VerbBank(types, verbs);
  }

  get verbs() { return this.#verbs; }
  get types() { return this.#types; }

  verb(infinitive) {
    return this.#byInfinitive.get(infinitive);
  }

  type(id) {
    return this.#types.find(t => t.id === id);
  }
}

Object.assign(Conjugo, { Person, Tense, Verb, Question, VerbBank, comboKey, normalizeAnswer, stripAccents });
})(globalThis.Conjugo ??= {});
