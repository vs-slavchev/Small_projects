// Données brutes : les verbes travaillés dans les niveaux (voir levels.js).
//
// Champs d'un verbe :
// - infinitive  : infinitif, sans « se » pour un verbe pronominal ;
// - type        : identifiant du type (voir VERB_TYPES) ;
// - present     : les 6 formes du présent (je, tu, il/elle, nous, vous, ils/elles).
//                 Facultatif pour les 1er et 2e groupes réguliers, qui se déduisent de l'infinitif ;
// - participle  : participe passé (facultatif pour les 1er et 2e groupes réguliers) ;
// - auxiliary   : 'avoir' (par défaut) ou 'être' ; un verbe pronominal prend toujours « être » ;
// - futureStem  : radical du futur, avant -ai, -as… Par défaut l'infinitif (sans le e final des verbes en -re).
//                 Une liste accepte plusieurs orthographes, la première est affichée ;
// - imperfectStem : radical de l'imparfait, si ce n'est pas celui de « nous » au présent (être : ét-) ;
// - pronominal  : true pour un verbe pronominal (aucun dans la banque actuelle) ;
// - irregularPresent : true si le présent ne se découpe pas en radical + terminaison (aller ; être et avoir le sont d'office) ;
// - alsoLike    : verbes fréquents qui se conjuguent sur le même modèle (montrés après la réponse) ;
// - note        : particularité expliquée après la réponse (HTML voulu).

(function (Conjugo) {
'use strict';

const VERB_TYPES = Object.freeze([
  { id: 'first', label: '1er groupe', rule: 'Verbes en <b>-er</b> : le radical ne change pas, seules les terminaisons varient.' },
  { id: 'firstSpelling', label: '1er groupe à particularité', rule: 'Verbes en <b>-er</b> dont le radical change un peu pour garder la bonne prononciation.' },
  { id: 'second', label: '2e groupe', rule: 'Verbes en <b>-ir</b> dont le participe présent est en <b>-issant</b> (finissant) : <b>-iss-</b> apparaît au pluriel du présent et à l’imparfait.' },
  { id: 'third', label: '3e groupe', rule: 'Tous les autres verbes (en -ir, -re, -oir, et aller) : radicaux et terminaisons à apprendre verbe par verbe.' },
  { id: 'auxiliary', label: 'Auxiliaires', rule: '<b>Être</b> et <b>avoir</b> servent à former les temps composés. Ils sont entièrement irréguliers.' },
]);

const VERB_DATA = Object.freeze([
  { infinitive: 'parler', alsoLike: ['chanter', 'aimer', 'travailler'], type: 'first', translation: 'to speak',
    note: 'Modèle du 1er groupe : radical <b>parl-</b> + terminaisons.' },
  { infinitive: 'habiter', alsoLike: ['aimer', 'écouter', 'arriver'], type: 'first', translation: 'to live (somewhere)',
    note: 'Commence par un h muet : <b>je</b> s’élide en <b>j’</b> (j’habite, j’habitais).' },
  { infinitive: 'commencer', alsoLike: ['placer', 'lancer', 'avancer'], type: 'firstSpelling', translation: 'to begin',
    present: ['commence', 'commences', 'commence', 'commençons', 'commencez', 'commencent'],
    note: 'Verbes en <b>-cer</b> : le c prend une cédille devant a et o pour garder le son [s] (nous commençons, je commençais).' },
  { infinitive: 'manger', alsoLike: ['nager', 'voyager', 'changer'], type: 'firstSpelling', translation: 'to eat',
    present: ['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent'],
    note: 'Verbes en <b>-ger</b> : on garde un e devant a et o pour garder le son [ʒ] (nous mangeons, je mangeais).' },
  { infinitive: 'acheter', alsoLike: ['mener', 'peser', 'emmener'], type: 'firstSpelling', translation: 'to buy',
    present: ['achète', 'achètes', 'achète', 'achetons', 'achetez', 'achètent'], futureStem: 'achèter',
    note: 'Le e devient <b>è</b> devant une syllabe muette : j’achète, j’achèterai, mais nous achetons.' },
  { infinitive: 'préférer', alsoLike: ['espérer', 'répéter', 'compléter'], type: 'firstSpelling', translation: 'to prefer',
    present: ['préfère', 'préfères', 'préfère', 'préférons', 'préférez', 'préfèrent'], futureStem: ['préférer', 'préfèrer'],
    note: 'Le é devient <b>è</b> devant une syllabe muette au présent : je préfère, mais nous préférons. Au futur, « préférerai » et « préfèrerai » (orthographe rectifiée) sont acceptés.' },
  { infinitive: 'finir', alsoLike: ['choisir', 'réussir', 'grandir'], type: 'second', translation: 'to finish',
    note: 'Modèle du 2e groupe : je finis, nous fin<b>iss</b>ons, je fin<b>iss</b>ais, j’ai fini.' },
  { infinitive: 'venir', alsoLike: ['tenir', 'devenir', 'revenir'], type: 'third', translation: 'to come', auxiliary: 'être',
    present: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'], participle: 'venu', futureStem: 'viendr',
    note: 'Radical <b>vien-</b> / <b>ven-</b> / <b>vienn-</b> au présent, futur irrégulier <b>viendr-</b>. Passé composé avec <b>être</b>.' },
  { infinitive: 'prendre', alsoLike: ['apprendre', 'comprendre', 'surprendre'], type: 'third', translation: 'to take',
    present: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'], participle: 'pris',
    note: 'Le d disparaît au pluriel du présent (nous prenons, ils prennent). Participe passé : <b>pris</b>.' },
  { infinitive: 'pouvoir', alsoLike: ['vouloir (je veux, nous voulons)'], type: 'third', translation: 'to be able to',
    present: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'], participle: 'pu', futureStem: 'pourr',
    note: 'Verbes en <b>-oir</b> : je peu<b>x</b>, tu peu<b>x</b> (comme vouloir). Futur irrégulier : <b>pourr-</b>.' },
  { infinitive: 'vouloir', alsoLike: ['pouvoir (je peux, nous pouvons)'], type: 'third', translation: 'to want',
    present: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'], participle: 'voulu', futureStem: 'voudr',
    note: 'Radical <b>veu-</b> / <b>voul-</b> / <b>veul-</b> au présent : je veu<b>x</b>, nous voulons, ils veulent. Futur irrégulier : <b>voudr-</b>.' },
  { infinitive: 'devoir', alsoLike: ['recevoir (je reçois, j’ai reçu)', 'apercevoir'], type: 'third', translation: 'to have to, must',
    present: ['dois', 'dois', 'doit', 'devons', 'devez', 'doivent'], participle: 'dû', futureStem: 'devr',
    note: 'Radical <b>doi-</b> / <b>dev-</b> / <b>doiv-</b> au présent. Participe passé <b>dû</b>, avec un accent circonflexe. Futur irrégulier : <b>devr-</b>.' },
  { infinitive: 'faire', alsoLike: ['refaire', 'défaire', 'satisfaire'], type: 'third', translation: 'to do, to make',
    present: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'], participle: 'fait', futureStem: 'fer',
    note: 'Formes irrégulières : vous <b>faites</b>, ils <b>font</b>, futur <b>fer-</b>.' },
  { infinitive: 'aller', irregularPresent: true, type: 'third', translation: 'to go', auxiliary: 'être',
    present: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], participle: 'allé', futureStem: 'ir',
    note: 'Seul verbe en -er du 3e groupe : je vais, j’<b>irai</b>, je suis allé(e). Son présent sert aussi à former le futur proche.' },
  { infinitive: 'être', type: 'auxiliary', translation: 'to be',
    present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], participle: 'été', futureStem: 'ser', imperfectStem: 'ét',
    note: 'Seul verbe dont l’imparfait ne vient pas de « nous » au présent : j’<b>étais</b>. Futur : <b>ser-</b>. Passé composé : j’ai été.' },
  { infinitive: 'avoir', type: 'auxiliary', translation: 'to have',
    present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], participle: 'eu', futureStem: 'aur',
    note: 'Auxiliaire de la plupart des verbes au passé composé. Futur : <b>aur-</b>. Passé composé : j’ai eu.' },
]);

Object.assign(Conjugo, { VERB_TYPES, VERB_DATA });
})(globalThis.Conjugo ??= {});
