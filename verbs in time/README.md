# Verbes dans le temps

Jeu mobile pour apprendre la conjugaison des verbes français, dérivé de « Le ou la ? » (`../jeu de genres de noms français`). Il est écrit en JavaScript pur, sans dépendance ni service externe. Tout est stocké dans le navigateur, et les polices (Young Serif, Manrope — licence SIL OFL 1.1) sont hébergées dans `../jeux-francais-commun/fonts/`.

Pour jouer, ouvrir `index.html` dans le navigateur : ni serveur ni Node ne sont nécessaires.

```sh
npm test    # lanceur de tests intégré de Node (≥ 20)
```

## Règles

- Une partie compte **5 tours**.
- À chaque tour, trois dimensions sont tirées au hasard, indépendamment :
  - **personne** : je, tu, il, elle, nous, vous, ils, elles ;
  - **verbe** : un des 20 verbes de la banque, sans répétition dans une partie (tant que les réglages le permettent) ;
  - **temps** : présent, imparfait, passé composé, futur proche, futur simple.
- La question est située par une expression de temps (« Hier, nous … », « L’année prochaine, je … ») : le temps se comprend par son usage, pas seulement par son nom.
- **Révisions** : environ 30 % des tirages reviennent sur une conjugaison faible (verbe + temps déjà raté et pas encore acquis). En fin de partie, « Rejouer mes erreurs » repose les questions ratées.
- **Réglages** (⚙ sur l'accueil) : choisir les temps et les types de verbes à travailler ; il en reste toujours au moins un de chaque.
- Le joueur tape la forme conjuguée. Le pronom sujet est facultatif (« finirons » vaut « nous finirons »), sauf pour un verbe pronominal avec nous ou vous : « nous levons » serait un oubli du pronom réfléchi, il faut taper « nous nous levons ». La casse, les espaces et le type d'apostrophe ne comptent pas. Les accents comptent : une réponse fausse seulement à cause des accents est signalée par « Presque ». Des touches d'accent (é è ê à â ç î ï ô û ù ë ’) sont affichées sous le champ.
- Passé composé avec *être* : le participe s'accorde avec le sujet. Comme le genre de je, tu, nous et vous n'est pas connu, toutes les formes possibles sont acceptées (« je suis allé » et « je suis allée »). Pour il, elle, ils et elles, l'accord doit être exact.
- Après chaque réponse, l'écran d'explication montre :
  - la forme attendue, **découpée en couleurs** (radical, terminaison, auxiliaire, accord), et un bouton 🔊 qui la lit (synthèse vocale du navigateur, masqué si absente) ;
  - après une erreur, **ce qui ne va pas** : forme d'un autre temps, d'une autre personne, mauvais auxiliaire, accord oublié, pronom réfléchi manquant, mauvaise terminaison, ou accents ; et l'**écart lettre à lettre** entre la réponse et la forme juste ;
  - après une erreur, un champ pour **recopier la bonne forme** : « Continuer » ne se débloque qu'une fois la forme recopiée ;
  - la règle du temps (avec ce que l'oral ne distingue pas : parle / parles / parlent), la particularité du verbe, les verbes qui **se conjuguent comme lui**, et la conjugaison complète du verbe à ce temps, découpée elle aussi.
- **Progrès** : en plus de la chronologie, une grille de maîtrise verbe × temps (pas encore vu, à revoir, en cours, acquis).

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

L'architecture est celle de « Le ou la ? ». Les dépendances vont toujours vers le centre : l'interface connaît l'application, l'application connaît le domaine, et le domaine ne connaît personne. Le moteur commun aux deux jeux vit dans `../jeux-francais-commun/` (voir son README) : le dossier doit rester à côté de celui-ci. Les fichiers sont des scripts classiques qui publient leurs exports dans l'espace de noms global commun `JeuxFr`. `index.html` les charge dans l'ordre des dépendances, et les tests (`tests/game.js`) suivent ce même ordre.

```
src/
├── data/verbs.js                Types de verbes et 20 verbes (présent, participe, radicaux irréguliers, note)
├── domain/
│   ├── conjugation.js           Person, Tense (règles, expressions de temps), Verb.conjugate (formes découpées),
│   │                            Conjugation.check, Question, VerbBank
│   ├── diagnosis.js             diagnose : nature d'une erreur (autre temps, autre personne, auxiliaire…)
│   ├── questionSelection.js     QuestionPicker : triplet aléatoire, révisions, réglages
│   ├── gameSession.js           GameSession : partie en cours (5 tours, réponse saisie)
│   ├── gameRecord.js            GameRecord : partie terminée, archivée
│   ├── playerProfile.js         PlayerProfile : joueur
│   ├── achievements.js          succès et paliers Bronze / Argent / Or
│   ├── progressReport.js        chronologie, tendance, conjugaison « piège », grille de maîtrise
│   └── gameSummary.js           verdict et bilan de fin de partie
├── application/                 cas d'utilisation et automate de l'application (ANSWER porte { text })
├── infrastructure/              stockage local (clés conjugo.*), synthèse vocale
└── ui/                          vues, contrôleur (saisie, recopie, touches d'accent), verdicts, diagnostics
```

Seuls le présent, le participe passé et les radicaux irréguliers sont stockés. Les autres formes sont calculées :

- **imparfait** : radical de « nous » au présent, auquel on ajoute -ais… (commençons → commençais, mais commencions) ;
- **futur simple** : radical du futur, auquel on ajoute -ai… ;
- **futur proche** : *aller* au présent, suivi de l'infinitif ;
- **passé composé** : auxiliaire au présent, suivi du participe passé, accordé avec *être* ;
- l'élision j’ / m’ / t’ / s’ est appliquée partout.

## Ajouter un verbe

Ajouter une entrée dans `src/data/verbs.js`. Le présent et le participe se déduisent pour le 1er et le 2e groupe réguliers, et doivent être donnés pour les autres verbes. Il faut aussi préciser `futureStem` ou `imperfectStem` quand ils sont irréguliers. Au chargement, `VerbBank.fromData` refuse les doublons, les types inconnus, un présent incomplet ou un type sans verbe.
