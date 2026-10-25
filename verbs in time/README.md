# Verbes dans le temps

Jeu mobile pour apprendre la conjugaison des verbes français, dérivé de « Le ou la ? » (`../jeu de genres de noms français`). Il est écrit en JavaScript pur, sans dépendance ni service externe. Tout est stocké dans le navigateur, et les polices (Young Serif, Manrope — licence SIL OFL 1.1) sont hébergées dans `fonts/`.

Pour jouer, ouvrir `index.html` dans le navigateur : ni serveur ni Node ne sont nécessaires.

```sh
npm test    # lanceur de tests intégré de Node (≥ 20)
```

## Règles

- Une partie compte **5 tours**.
- À chaque tour, trois dimensions sont tirées au hasard, indépendamment :
  - **personne** : je, tu, il, elle, nous, vous, ils, elles ;
  - **verbe** : un des 20 verbes de la banque, sans répétition dans une partie ;
  - **temps** : présent, imparfait, passé composé, futur proche, futur simple.
- Le joueur tape la forme conjuguée. Le pronom sujet est facultatif (« finirons » vaut « nous finirons »), sauf pour un verbe pronominal avec nous ou vous : « nous levons » serait un oubli du pronom réfléchi, il faut taper « nous nous levons ». La casse, les espaces et le type d'apostrophe ne comptent pas. Les accents comptent : une réponse fausse seulement à cause des accents est signalée par « Presque ». Des touches d'accent (é è ê à â ç î ï ô û ù ë ’) sont affichées sous le champ.
- Passé composé avec *être* : le participe s'accorde avec le sujet. Comme le genre de je, tu, nous et vous n'est pas connu, toutes les formes possibles sont acceptées (« je suis allé » et « je suis allée »). Pour il, elle, ils et elles, l'accord doit être exact.
- Après chaque réponse, l'écran d'explication montre la forme attendue, la règle du temps, la particularité du verbe et la conjugaison complète du verbe à ce temps.

## Un verbe par type de conjugaison

| Type | Verbes | Ce qu'ils illustrent |
|---|---|---|
| 1er groupe | parler, habiter | modèle -er ; élision devant un h muet (j’habite) |
| 1er groupe à particularité | commencer, manger, acheter, préférer, appeler, nettoyer | -cer (ç), -ger (ge), e → è, é → è, -eler (ll), -oyer (y → i) |
| 2e groupe | finir | -iss- au pluriel et à l’imparfait |
| 3e groupe | partir, venir, prendre, attendre, voir, pouvoir, faire, aller | -ir sans -iss-, -re, -oir ; futurs irréguliers ; auxiliaire *être* (partir, venir, aller) |
| Auxiliaires | être, avoir | imparfait irrégulier (j’étais) ; futurs ser- / aur- |
| Pronominal | se lever | pronom réfléchi, *être* au passé composé, futur proche « je vais me lever » |

## Architecture

L'architecture est celle de « Le ou la ? ». Les dépendances vont toujours vers le centre : l'interface connaît l'application, l'application connaît le domaine, et le domaine ne connaît personne. Le moteur commun aux deux jeux (automate, calendrier et série, jours de fête, sons, rendu, effets, erreurs du domaine) vit dans `../jeux-francais-commun/` : le dossier doit rester à côté de celui-ci. Les fichiers sont des scripts classiques qui publient leurs exports dans l'espace de noms global commun `JeuxFr` (nommé `Conjugo` à l'intérieur des fichiers). `index.html` les charge dans l'ordre des dépendances, et les tests (`tests/game.js`) suivent ce même ordre.

```
src/
├── data/verbs.js                Types de verbes et 20 verbes (présent, participe, radicaux irréguliers, note)
├── domain/
│   ├── conjugation.js           Person, Tense, Verb.conjugate, Conjugation.check, Question, VerbBank
│   ├── questionSelection.js     QuestionPicker : triplet aléatoire verbe × temps × personne
│   ├── practiceStats.js         statistiques par verbe et par temps
│   ├── gameSession.js           GameSession : partie en cours (5 tours, réponse saisie)
│   ├── gameRecord.js            GameRecord : partie terminée, archivée
│   ├── playerProfile.js         PlayerProfile : joueur
│   ├── achievements.js          succès et paliers Bronze / Argent / Or
│   ├── progressReport.js        chronologie, tendance, conjugaison « piège »
│   └── gameSummary.js           verdict et bilan de fin de partie
├── application/                 cas d'utilisation et automate de l'application (ANSWER porte { text })
├── infrastructure/              stockage local (clés conjugo.*)
└── ui/                          vues, contrôleur (saisie et touches d'accent), textes
```

Seuls le présent, le participe passé et les radicaux irréguliers sont stockés. Les autres formes sont calculées :

- **imparfait** : radical de « nous » au présent, auquel on ajoute -ais… (commençons → commençais, mais commencions) ;
- **futur simple** : radical du futur, auquel on ajoute -ai… ;
- **futur proche** : *aller* au présent, suivi de l'infinitif ;
- **passé composé** : auxiliaire au présent, suivi du participe passé, accordé avec *être* ;
- l'élision j’ / m’ / t’ / s’ est appliquée partout.

## Ajouter un verbe

Ajouter une entrée dans `src/data/verbs.js`. Le présent et le participe se déduisent pour le 1er et le 2e groupe réguliers, et doivent être donnés pour les autres verbes. Il faut aussi préciser `futureStem` ou `imperfectStem` quand ils sont irréguliers. Au chargement, `VerbBank.fromData` refuse les doublons, les types inconnus, un présent incomplet ou un type sans verbe.
