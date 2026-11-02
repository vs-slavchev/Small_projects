(function (Conjugo) {
'use strict';

const level = (tense, verbs, label) => ({ tense, verbs, label });

const LEVEL_DATA = Object.freeze([
  level('present', ['parler', 'habiter'], 'Verbes en -er'),
  level('present', ['manger'], 'Verbes en -ger'),
  level('present', ['être', 'avoir'], 'Les incontournables'),
  level('present', ['aller', 'faire', 'prendre'], 'Irréguliers fréquents'),
  level('present', ['pouvoir', 'vouloir', 'devoir'], 'Verbes modaux'),
  level('present', ['finir'], 'Verbes en -ir'),
  level('present', ['venir'], 'Venir'),
  level('present', ['commencer', 'acheter', 'préférer'], 'Changements d’orthographe'),
  level('passeCompose', ['parler', 'habiter'], 'Verbes en -er'),
  level('passeCompose', ['manger'], 'Verbes en -ger'),
  level('passeCompose', ['être', 'avoir'], 'Les incontournables'),
  level('passeCompose', ['aller'], 'Aller, avec être'),
  level('passeCompose', ['faire', 'prendre'], 'Faire et prendre'),
  level('passeCompose', ['pouvoir', 'vouloir', 'devoir'], 'Verbes modaux'),
  level('passeCompose', ['finir'], 'Verbes en -ir'),
  level('passeCompose', ['venir'], 'Venir, avec être'),
  level('passeCompose', ['commencer', 'acheter', 'préférer'], 'Changements d’orthographe'),
  level('futurProche', ['parler', 'finir', 'prendre'], 'Aller + infinitif'),
  level('futurProche', ['être', 'avoir', 'manger'], 'Les incontournables'),
  level('imperative', ['parler', 'manger', 'commencer', 'acheter'], 'Verbes en -er : tu sans s'),
  level('imperative', ['finir', 'prendre', 'faire', 'venir'], 'Finir et irréguliers'),
  level('imperative', ['aller', 'être', 'avoir'], 'Va, sois, aie'),
  level('imperfect', ['parler', 'finir'], 'Forme régulière'),
  level('imperfect', ['manger', 'commencer'], 'Verbes en -ger et -cer'),
  level('imperfect', ['faire', 'prendre', 'venir'], '3e groupe'),
  level('imperfect', ['être', 'avoir'], 'Les incontournables'),
  level('futurSimple', ['parler', 'finir'], 'Forme régulière'),
  level('futurSimple', ['acheter', 'préférer'], 'Changements d’orthographe'),
  level('futurSimple', ['être', 'avoir', 'aller'], 'Auxiliaires et aller'),
  level('futurSimple', ['faire', 'pouvoir', 'venir'], 'Radicaux irréguliers'),
].map(Object.freeze));

Object.assign(Conjugo, { LEVEL_DATA });
})(globalThis.Conjugo ??= {});
