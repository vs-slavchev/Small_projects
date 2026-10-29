// Données brutes : les niveaux, dans l'ordre où le joueur les traverse.
// Un niveau travaille un temps sur quelques verbes, aux six personnes (voir Person.SLOTS).
//
// Champs d'un niveau :
// - tense : identifiant du temps (voir Tense) ;
// - verbs : infinitifs des verbes travaillés, présents dans VERB_DATA ;
// - label : nom court du niveau, montré dans le parcours.

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
  level('imperfect', ['parler', 'manger', 'finir', 'commencer'], 'Forme régulière'),
  level('imperfect', ['être'], 'Être'),
  level('futurSimple', ['parler', 'finir'], 'Forme régulière'),
  level('futurSimple', ['être', 'avoir', 'aller', 'faire', 'pouvoir', 'venir'], 'Radicaux irréguliers'),
].map(Object.freeze));

Object.assign(Conjugo, { LEVEL_DATA });
})(globalThis.Conjugo ??= {});
