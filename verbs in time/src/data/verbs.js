// Données brutes : un verbe par type de conjugaison.
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
// - pronominal  : true pour un verbe pronominal (se lever) ;
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
  { id: 'pronominal', label: 'Pronominal', rule: 'Le pronom réfléchi (me, te, se, nous, vous, se) accompagne le verbe à tous les temps ; aux temps composés, l’auxiliaire est toujours <b>être</b>.' },
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
  { infinitive: 'appeler', alsoLike: ['jeter', 'rappeler', 'épeler'], type: 'firstSpelling', translation: 'to call',
    present: ['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent'], futureStem: 'appeller',
    note: 'Verbes en <b>-eler</b> / <b>-eter</b> : la consonne double devant une syllabe muette (j’appelle, j’appellerai).' },
  { infinitive: 'nettoyer', alsoLike: ['envoyer (sauf au futur : j’enverrai)', 'employer', 'essuyer'], type: 'firstSpelling', translation: 'to clean',
    present: ['nettoie', 'nettoies', 'nettoie', 'nettoyons', 'nettoyez', 'nettoient'], futureStem: 'nettoier',
    note: 'Verbes en <b>-oyer</b> / <b>-uyer</b> : le y devient <b>i</b> devant un e muet (je nettoie, je nettoierai).' },
  { infinitive: 'finir', alsoLike: ['choisir', 'réussir', 'grandir'], type: 'second', translation: 'to finish',
    note: 'Modèle du 2e groupe : je finis, nous fin<b>iss</b>ons, je fin<b>iss</b>ais, j’ai fini.' },
  { infinitive: 'partir', alsoLike: ['sortir', 'dormir', 'sentir'], type: 'third', translation: 'to leave', auxiliary: 'être',
    present: ['pars', 'pars', 'part', 'partons', 'partez', 'partent'], participle: 'parti',
    note: 'En -ir mais pas du 2e groupe (nous partons, sans -iss-). Verbe de mouvement : passé composé avec <b>être</b>, le participe s’accorde avec le sujet.' },
  { infinitive: 'venir', alsoLike: ['tenir', 'devenir', 'revenir'], type: 'third', translation: 'to come', auxiliary: 'être',
    present: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'], participle: 'venu', futureStem: 'viendr',
    note: 'Radical <b>vien-</b> / <b>ven-</b> / <b>vienn-</b> au présent, futur irrégulier <b>viendr-</b>. Passé composé avec <b>être</b>.' },
  { infinitive: 'prendre', alsoLike: ['apprendre', 'comprendre', 'surprendre'], type: 'third', translation: 'to take',
    present: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'], participle: 'pris',
    note: 'Le d disparaît au pluriel du présent (nous prenons, ils prennent). Participe passé : <b>pris</b>.' },
  { infinitive: 'attendre', alsoLike: ['vendre', 'répondre', 'entendre'], type: 'third', translation: 'to wait',
    present: ['attends', 'attends', 'attend', 'attendons', 'attendez', 'attendent'], participle: 'attendu',
    note: 'Verbes en <b>-dre</b> réguliers : pas de -t à la 3e personne (il attend). Participe passé en <b>-u</b>.' },
  { infinitive: 'voir', alsoLike: ['revoir', 'prévoir (sauf au futur : je prévoirai)'], type: 'third', translation: 'to see',
    present: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'], participle: 'vu', futureStem: 'verr',
    note: 'Le i devient y devant une voyelle prononcée (nous voyons, je voyais). Futur irrégulier : <b>verr-</b>.' },
  { infinitive: 'pouvoir', alsoLike: ['vouloir (je veux, nous voulons)'], type: 'third', translation: 'to be able to',
    present: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'], participle: 'pu', futureStem: 'pourr',
    note: 'Verbes en <b>-oir</b> : je peu<b>x</b>, tu peu<b>x</b> (comme vouloir). Futur irrégulier : <b>pourr-</b>.' },
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
  { infinitive: 'lever', alsoLike: ['se promener', 's’élever', 'se soulever'], type: 'pronominal', translation: 'to get up', pronominal: true,
    present: ['lève', 'lèves', 'lève', 'levons', 'levez', 'lèvent'], futureStem: 'lèver',
    note: 'Le pronom se place avant le verbe, et avant l’infinitif au futur proche (je vais <b>me</b> lever). Le e devient <b>è</b> devant une syllabe muette.' },
]);

Object.assign(Conjugo, { VERB_TYPES, VERB_DATA });
})(globalThis.Conjugo ??= {});
