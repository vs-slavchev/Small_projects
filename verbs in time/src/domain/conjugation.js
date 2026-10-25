(function (Conjugo) {
'use strict';

const { DomainError, VERB_TYPES, VERB_DATA } = Conjugo;

/** Apostrophe typographique des formes affichées : « j’habite ». */
const APOSTROPHE = '’';
// Le h est traité comme muet : aucun verbe de la banque ne commence par un h aspiré.
const STARTS_WITH_VOWEL = /^[aeiouàâäéèêëîïôöùûüæœh]/i;
/** Pronoms qui s'élident devant une voyelle ou un h muet. */
const ELIDABLE = new Set(['je', 'me', 'te', 'se']);

/**
 * Morceau d'une forme conjuguée, pour la montrer découpée :
 * subject, pronoun (réfléchi), aux (auxiliaire ou aller), stem (radical), ending (terminaison),
 * participle, agreement (accord du participe), infinitive ou space.
 */
const segment = (kind, text) => Object.freeze({ kind, text });
const SPACE = segment('space', ' ');
const textOf = segments => segments.map(s => s.text).join('');

/** Pronom devant une forme : « j’ » + « ai » (élision devant une voyelle ou un h muet), sinon « je » + espace. */
function withPronoun(kind, pronoun, segments) {
  return ELIDABLE.has(pronoun) && STARTS_WITH_VOWEL.test(textOf(segments))
    ? [segment(kind, `${pronoun.slice(0, -1)}${APOSTROPHE}`), ...segments]
    : [segment(kind, pronoun), SPACE, ...segments];
}

/**
 * Personne grammaticale. Objet valeur : les huit instances sont fixes, on les compare par identité.
 * `index` est le rang de la forme verbale (0 à 5) : il et elle, ils et elles partagent la leur.
 * `agreements` liste les terminaisons acceptées pour un participe accordé avec « être » :
 * le genre de je, tu, nous et vous n'est pas connu, toutes les possibilités sont justes.
 */
class Person {
  /** @param {string} subject @param {number} index @param {string[]} agreements @param {string} agreementLabel */
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
  static ILS = new Person('ils', 5, ['s'], 's');
  static ELLES = new Person('elles', 5, ['es'], 'es');
  static ALL = Object.freeze([Person.JE, Person.TU, Person.IL, Person.ELLE, Person.NOUS, Person.VOUS, Person.ILS, Person.ELLES]);

}

/** Temps de conjugaison. Objet valeur : les cinq instances sont fixes. */
class Tense {
  /**
   * @param {{ id: string, label: string, withPreposition: string, rule: string, markers: string[] }} props
   *   `markers` : expressions de temps qui situent la phrase (« Hier, »), pour donner un sens au temps demandé.
   */
  constructor({ id, label, withPreposition, rule, markers }) {
    this.id = id;
    this.label = label;
    this.withPreposition = withPreposition;
    this.rule = rule;
    this.markers = Object.freeze([...markers]);
    Object.freeze(this);
  }

  static PRESENT = new Tense({ id: 'present', label: 'présent', withPreposition: 'au présent',
    rule: 'Radical + terminaisons. 1er groupe : <b>-e, -es, -e, -ons, -ez, -ent</b>. 2e groupe : <b>-is, -is, -it, -issons, -issez, -issent</b>. 3e groupe : le plus souvent <b>-s, -s, -t</b> au singulier. À l’oral, je parl<b>e</b>, tu parl<b>es</b>, il parl<b>e</b> et ils parl<b>ent</b> se prononcent pareil : seule l’orthographe les distingue.',
    markers: ['En ce moment,', 'Aujourd’hui,', 'Tous les jours,'] });
  static IMPERFECT = new Tense({ id: 'imperfect', label: 'imparfait', withPreposition: 'à l’imparfait',
    rule: 'Radical de « nous » au présent, sans -ons, + <b>-ais, -ais, -ait, -ions, -iez, -aient</b>. Seule exception : être (j’étais). Il décrit une habitude ou un décor du passé. À l’oral, -ais, -ait et -aient se prononcent pareil.',
    markers: ['Autrefois,', 'À l’époque,', 'Chaque été, avant,'] });
  static PASSE_COMPOSE = new Tense({ id: 'passeCompose', label: 'passé composé', withPreposition: 'au passé composé',
    rule: 'Auxiliaire <b>avoir</b> ou <b>être</b> au présent + participe passé. Avec être, le participe s’accorde avec le sujet : elle est allé<b>e</b>, ils sont allé<b>s</b>. Il raconte une action terminée.',
    markers: ['Hier,', 'La semaine dernière,', 'Ce matin,'] });
  static FUTUR_PROCHE = new Tense({ id: 'futurProche', label: 'futur proche', withPreposition: 'au futur proche',
    rule: '<b>Aller</b> au présent + infinitif : je vais parler, nous allons finir. Il annonce ce qui va arriver bientôt.',
    markers: ['Tout à l’heure,', 'Ce soir,', 'Dans cinq minutes,'] });
  static FUTUR_SIMPLE = new Tense({ id: 'futurSimple', label: 'futur simple', withPreposition: 'au futur simple',
    rule: 'Infinitif (sans le e final des verbes en -re) + <b>-ai, -as, -a, -ons, -ez, -ont</b>. Certains radicaux sont irréguliers : ser-, aur-, ir-, fer-, viendr-, verr-, pourr-. Il situe l’action dans un avenir plus lointain.',
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
/** Terminaisons reconnues pour découper un présent donné tel quel (3e groupe) ; sinon la forme reste entière. */
const OTHER_PRESENT_ENDINGS = Object.freeze([['s', 'x'], ['s', 'x'], ['t'], ['ons'], ['ez'], ['ent']]);
const ALL_AGREEMENTS = Object.freeze(['', 'e', 's', 'es']);

/** Type de conjugaison (1er groupe, 2e groupe…). */
class VerbType {
  /** @param {{ id: string, label: string, rule: string }} props */
  constructor({ id, label, rule }) {
    this.id = id;
    this.label = label;
    this.rule = rule;
    Object.freeze(this);
  }
}

/**
 * Verbe et ses radicaux. Les formes des 1er et 2e groupes réguliers se déduisent de l'infinitif ;
 * celles des autres verbes sont données. Tout le reste (imparfait, futur, temps composés) se calcule.
 */
class Verb {
  /**
   * @param {{ infinitive: string, type: VerbType, translation?: string, present?: string[], participle?: string,
   *           auxiliary?: 'avoir'|'être', futureStem?: string|string[], imperfectStem?: string,
   *           pronominal?: boolean, irregularPresent?: boolean, alsoLike?: string[], note?: string }} props
   */
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
    // Un verbe pronominal se conjugue toujours avec « être » aux temps composés.
    this.auxiliary = pronominal ? 'être' : auxiliary;
    const futureStems = [futureStem ?? (infinitive.endsWith('re') ? infinitive.slice(0, -1) : infinitive)].flat();
    this.futureStems = Object.freeze(futureStems);
    this.imperfectStem = imperfectStem ?? this.present[3].slice(0, -3);
    this.pronominal = pronominal;
    /** Présent sans radical régulier à montrer (être, avoir, aller) : la forme n'est pas découpée. */
    this.splitsPresent = type.id !== 'auxiliary' && !irregularPresent;
    /** Verbes fréquents qui se conjuguent sur le même modèle. */
    this.alsoLike = Object.freeze([...alsoLike]);
    this.note = note;
    Object.freeze(this);
  }

  /** Infinitif affiché : « se lever ». */
  get label() {
    return this.pronominal ? textOf(withPronoun('pronoun', 'se', [segment('infinitive', this.infinitive)])) : this.infinitive;
  }

  /**
   * @param {Tense} tense @param {Person} person
   * @param {{ auxiliary?: 'avoir'|'être', pronominal?: boolean, anyAgreement?: boolean }} [variation]
   *   conjugaison volontairement modifiée, pour reconnaître une erreur (mauvais auxiliaire, pronom oublié, accord)
   * @returns {Conjugation}
   */
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

  /** Présent découpé en radical + terminaison quand la terminaison est reconnue ; sinon la forme entière. */
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

/** [premier élément dans une liste, reste] */
const splitFirst = list => [list.slice(0, 1), list.slice(1)];

/** Imparfait : le ç et le ge du radical ne sont utiles que devant a (commençais, mais commencions). */
function imperfectParts(stem, ending) {
  if (!ending.startsWith('i')) return [stem, ending];
  if (stem.endsWith('ç')) return [`${stem.slice(0, -1)}c`, ending];
  if (stem.endsWith('ge')) return [stem.slice(0, -1), ending];
  return [stem, ending];
}

/** Participe suivi de son accord, s'il y en a un. */
function participle(text, ending) {
  const agreement = agree(text, ending).slice(text.length);
  return agreement ? [segment('participle', text), segment('agreement', agreement)] : [segment('participle', text)];
}

/** Accord du participe : « pris » + s reste « pris ». */
const agree = (participle, ending) => (ending === 's' && participle.endsWith('s') ? participle : participle + ending);

/** Forme saisie ramenée à une écriture comparable : casse, espaces et apostrophes. */
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

/**
 * Forme conjuguée attendue. `forms` liste toutes les écritures justes avec leur sujet
 * (accords possibles, orthographe rectifiée) ; `display` est celle qu'on montre au joueur,
 * et `segments` la même, découpée (sujet, radical, terminaison…).
 * Le joueur peut aussi répondre sans le pronom sujet (« finirai » vaut « je finirai »), sauf si la forme
 * commence par un pronom identique au sujet (« nous nous levons ») : voir le constructeur.
 */
class Conjugation {
  #accepted;

  /**
   * @param {{ subject: string, variants: object[][], spellings?: object[][], shown?: object[] }} props
   *   formes sans sujet, découpées : accords possibles, autres orthographes, forme à afficher (par défaut la première)
   */
  constructor({ subject, variants, spellings = [], shown = variants[0] }) {
    const withSubject = segments => withPronoun('subject', subject, segments);
    const bare = [...variants, ...spellings].map(textOf);
    this.forms = Object.freeze([...variants, ...spellings].map(v => textOf(withSubject(v))));
    this.segments = Object.freeze(withSubject(shown));
    this.display = textOf(this.segments);
    /** Autres écritures acceptées, à signaler après la réponse. */
    this.others = Object.freeze(this.forms.slice(variants.length));
    // Quand la forme commence par un pronom identique au sujet (« nous nous levons »), la réponse
    // sans sujet (« nous levons ») ne se distingue pas d'un oubli du pronom réfléchi : le sujet est alors obligatoire.
    const subjectRequired = bare.some(rest => rest.startsWith(`${subject} `));
    /** Écritures acceptées telles qu'on les montre, avec ou sans sujet. */
    this.accepted = Object.freeze([...this.forms, ...(subjectRequired ? [] : bare)]);
    this.#accepted = this.accepted.map(normalizeAnswer);
    Object.freeze(this);
  }

  /**
   * @param {string} input
   * @returns {{ correct: boolean, accentsOnly: boolean }} `accentsOnly` : faux uniquement à cause des accents.
   */
  check(input) {
    const given = normalizeAnswer(input);
    if (this.#accepted.includes(given)) return { correct: true, accentsOnly: false };
    const bare = stripAccents(given);
    return { correct: false, accentsOnly: this.#accepted.some(a => stripAccents(a) === bare) };
  }
}

/** Question d'un tour : un verbe, un temps, une personne, et une expression de temps qui situe la phrase. */
class Question {
  /** @param {{ verb: Verb, tense: Tense, person: Person, marker?: string | null }} props */
  constructor({ verb, tense, person, marker = null }) {
    if (!(verb instanceof Verb) || !(tense instanceof Tense) || !(person instanceof Person)) throw new DomainError('Question incomplète.');
    this.verb = verb;
    this.tense = tense;
    this.person = person;
    this.marker = marker;
    this.expected = verb.conjugate(tense, person);
    Object.freeze(this);
  }
}

/** Banque des verbes. Valide les données au chargement. */
class VerbBank {
  #verbs;
  #byInfinitive;
  #types;

  /** @param {VerbType[]} types @param {Verb[]} verbs */
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

  /** @param {string} infinitive @returns {Verb | undefined} */
  verb(infinitive) {
    return this.#byInfinitive.get(infinitive);
  }

  /** @param {string} id @returns {VerbType | undefined} */
  type(id) {
    return this.#types.find(t => t.id === id);
  }
}

Object.assign(Conjugo, { Person, Tense, Verb, Question, VerbBank, normalizeAnswer, stripAccents });
})(globalThis.Conjugo ??= {});
