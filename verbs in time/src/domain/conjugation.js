(function (JeuxFr) {
'use strict';

const { DomainError, VERB_TYPES, VERB_DATA } = JeuxFr;

/** Apostrophe typographique des formes affichées : « j’habite ». */
const APOSTROPHE = '’';
// Le h est traité comme muet : aucun verbe de la banque ne commence par un h aspiré.
const STARTS_WITH_VOWEL = /^[aeiouàâäéèêëîïôöùûüæœh]/i;
/** Pronoms qui s'élident devant une voyelle ou un h muet. */
const ELIDABLE = new Set(['je', 'me', 'te', 'se']);

/** « je » + « ai » → « j’ai » ; « je » + « vais » → « je vais ». */
function joinElided(pronoun, rest) {
  return ELIDABLE.has(pronoun) && STARTS_WITH_VOWEL.test(rest) ? `${pronoun.slice(0, -1)}${APOSTROPHE}${rest}` : `${pronoun} ${rest}`;
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
  /** @param {{ id: string, label: string, withPreposition: string, rule: string }} props */
  constructor({ id, label, withPreposition, rule }) {
    this.id = id;
    this.label = label;
    this.withPreposition = withPreposition;
    this.rule = rule;
    Object.freeze(this);
  }

  static PRESENT = new Tense({ id: 'present', label: 'présent', withPreposition: 'au présent',
    rule: 'Radical + terminaisons. 1er groupe : <b>-e, -es, -e, -ons, -ez, -ent</b>. 2e groupe : <b>-is, -is, -it, -issons, -issez, -issent</b>. 3e groupe : le plus souvent <b>-s, -s, -t</b> au singulier.' });
  static IMPERFECT = new Tense({ id: 'imperfect', label: 'imparfait', withPreposition: 'à l’imparfait',
    rule: 'Radical de « nous » au présent, sans -ons, + <b>-ais, -ais, -ait, -ions, -iez, -aient</b>. Seule exception : être (j’étais).' });
  static PASSE_COMPOSE = new Tense({ id: 'passeCompose', label: 'passé composé', withPreposition: 'au passé composé',
    rule: 'Auxiliaire <b>avoir</b> ou <b>être</b> au présent + participe passé. Avec être, le participe s’accorde avec le sujet : elle est allé<b>e</b>, ils sont allé<b>s</b>.' });
  static FUTUR_PROCHE = new Tense({ id: 'futurProche', label: 'futur proche', withPreposition: 'au futur proche',
    rule: '<b>Aller</b> au présent + infinitif : je vais parler, nous allons finir.' });
  static FUTUR_SIMPLE = new Tense({ id: 'futurSimple', label: 'futur simple', withPreposition: 'au futur simple',
    rule: 'Infinitif (sans le e final des verbes en -re) + <b>-ai, -as, -a, -ons, -ez, -ont</b>. Certains radicaux sont irréguliers : ser-, aur-, ir-, fer-, viendr-, verr-, pourr-.' });
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
   *           pronominal?: boolean, note?: string }} props
   */
  constructor({ infinitive, type, translation = '', present, participle, auxiliary = 'avoir', futureStem, imperfectStem, pronominal = false, note = '' }) {
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
    this.note = note;
    Object.freeze(this);
  }

  /** Infinitif affiché : « se lever ». */
  get label() {
    return this.pronominal ? joinElided('se', this.infinitive) : this.infinitive;
  }

  /**
   * @param {Tense} tense @param {Person} person
   * @returns {Conjugation}
   */
  conjugate(tense, person) {
    if (!(tense instanceof Tense)) throw new DomainError('Temps invalide.');
    if (!(person instanceof Person)) throw new DomainError('Personne invalide.');
    const i = person.index;
    const reflexive = rest => (this.pronominal ? joinElided(REFLEXIVE[i], rest) : rest);
    let variants;
    let spellings = [];
    let shown;
    switch (tense) {
      case Tense.PRESENT:
        variants = [reflexive(this.present[i])];
        break;
      case Tense.IMPERFECT:
        variants = [reflexive(imperfectForm(this.imperfectStem, IMPERFECT_ENDINGS[i]))];
        break;
      case Tense.FUTUR_SIMPLE:
        [variants, spellings] = splitFirst(this.futureStems.map(s => reflexive(s + FUTURE_ENDINGS[i])));
        break;
      case Tense.FUTUR_PROCHE:
        variants = [`${ALLER_PRESENT[i]} ${reflexive(this.infinitive)}`];
        break;
      case Tense.PASSE_COMPOSE: {
        const auxiliary = AUXILIARY_PRESENT[this.auxiliary][i];
        const agrees = this.auxiliary === 'être';
        variants = (agrees ? person.agreements : ['']).map(e => reflexive(`${auxiliary} ${agree(this.participle, e)}`));
        if (agrees) shown = reflexive(`${auxiliary} ${this.participle}${person.agreementLabel}`);
        break;
      }
      default:
        throw new DomainError(`Temps non géré : ${tense.label}.`);
    }
    return new Conjugation({ subject: person.subject, variants, spellings, shown });
  }
}

/** [premier élément dans une liste, reste] */
const splitFirst = list => [list.slice(0, 1), list.slice(1)];

/** Imparfait : le ç et le ge du radical ne sont utiles que devant a (commençais, mais commencions). */
function imperfectForm(stem, ending) {
  if (!ending.startsWith('i')) return stem + ending;
  if (stem.endsWith('ç')) return `${stem.slice(0, -1)}c${ending}`;
  if (stem.endsWith('ge')) return `${stem.slice(0, -1)}${ending}`;
  return stem + ending;
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
 * (accords possibles, orthographe rectifiée) ; `display` est celle qu'on montre au joueur.
 * Le joueur peut aussi répondre sans le pronom sujet (« finirai » vaut « je finirai »), sauf si la forme
 * commence par un pronom identique au sujet (« nous nous levons ») : voir le constructeur.
 */
class Conjugation {
  #accepted;

  /**
   * @param {{ subject: string, variants: string[], spellings?: string[], shown?: string }} props
   *   formes sans sujet : accords possibles, autres orthographes, forme à afficher (par défaut la première)
   */
  constructor({ subject, variants, spellings = [], shown = variants[0] }) {
    const withSubject = rest => joinElided(subject, rest);
    const bare = [...variants, ...spellings];
    this.forms = Object.freeze(bare.map(withSubject));
    this.display = withSubject(shown);
    /** Autres écritures acceptées, à signaler après la réponse. */
    this.others = Object.freeze(this.forms.slice(variants.length));
    // Quand la forme commence par un pronom identique au sujet (« nous nous levons »), la réponse
    // sans sujet (« nous levons ») ne se distingue pas d'un oubli du pronom réfléchi : le sujet est alors obligatoire.
    const subjectRequired = bare.some(rest => rest.startsWith(`${subject} `));
    this.#accepted = [...this.forms, ...(subjectRequired ? [] : bare)].map(normalizeAnswer);
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

/** Question d'un tour : un verbe, un temps, une personne. */
class Question {
  /** @param {{ verb: Verb, tense: Tense, person: Person }} props */
  constructor({ verb, tense, person }) {
    if (!(verb instanceof Verb) || !(tense instanceof Tense) || !(person instanceof Person)) throw new DomainError('Question incomplète.');
    this.verb = verb;
    this.tense = tense;
    this.person = person;
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
}

Object.assign(JeuxFr, { Person, Tense, Verb, Question, VerbBank });
})(globalThis.JeuxFr ??= {});
