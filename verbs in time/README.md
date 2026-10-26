# Verbes dans le temps

Jeu mobile pour apprendre la conjugaison des verbes français, inspiré de « Le ou la ? » mais entièrement autonome : aucun fichier n'est partagé avec un autre projet. Il est écrit en JavaScript pur, sans dépendance ni service externe. Tout est stocké dans le navigateur, et les polices (Young Serif, Manrope — licence SIL OFL 1.1) sont hébergées dans `fonts/`.

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
- **Révisions** : environ 30 % des tirages reviennent sur une conjugaison faible (verbe + temps déjà raté et pas encore acquis ; acquis = au moins 3 réponses, la dernière juste, 80 % de réussite). En fin de partie, « Rejouer mes erreurs » repose les questions ratées.
- **Réglages** (⚙ sur l'accueil) : choisir les temps et les types de verbes à travailler ; il en reste toujours au moins un de chaque.
- Le joueur tape la forme conjuguée. Le pronom sujet est facultatif (« finirons » vaut « nous finirons »), sauf pour un verbe pronominal avec nous ou vous : « nous levons » serait un oubli du pronom réfléchi, il faut taper « nous nous levons ». La casse, les espaces et le type d'apostrophe ne comptent pas. Les accents comptent : une réponse fausse seulement à cause des accents est signalée par « Presque ».
- Passé composé avec *être* : le participe s'accorde avec le sujet. Comme le genre de je, tu, nous et vous n'est pas connu, toutes les formes possibles sont acceptées (« je suis allé » et « je suis allée »). Pour il, elle, ils et elles, l'accord doit être exact.
- Après chaque réponse, l'écran d'explication montre :
  - la forme attendue, **découpée en couleurs** (radical, terminaison, auxiliaire, accord), et un bouton 🔊 qui la lit (synthèse vocale du navigateur, masqué si absente) ;
  - après une erreur, **ce qui ne va pas** : forme d'un autre temps, d'une autre personne, mauvais auxiliaire, accord oublié, pronom réfléchi manquant, mauvaise terminaison, ou accents ; et l'**écart lettre à lettre** entre la réponse et la forme juste ;
  - après une erreur, un champ pour **recopier la bonne forme** : « Continuer » ne se débloque qu'une fois la forme recopiée (les accents n'y sont pas exigés) ;
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

Les dépendances vont toujours vers le centre : l'interface connaît l'application, l'application connaît le domaine, et le domaine ne connaît personne. Les fichiers sont des scripts classiques (pas des modules ES, que les navigateurs refusent de charger en `file://`) qui publient leurs exports dans l'espace de noms global `Conjugo`. `index.html` les charge dans l'ordre des dépendances, et les tests (`tests/game.js`) suivent ce même ordre.

```
src/
├── data/verbs.js                Types de verbes et 20 verbes (présent, participe, radicaux irréguliers, modèles, note)
├── domain/
│   ├── errors.js                DomainError
│   ├── conjugation.js           Person, Tense (règles, expressions de temps), Verb.conjugate (formes découpées),
│   │                            Conjugation.check, Question, VerbBank
│   ├── diagnosis.js             diagnose : nature d'une erreur (autre temps, autre personne, auxiliaire…)
│   ├── calendar.js              dayKey, addDays, ActivityCalendar (série quotidienne)
│   ├── answerStats.js           AnswerStat, AnswerStatsBook : réussites par verbe et par temps, conjugaisons faibles
│   ├── gameRecord.js            GameRecord : partie terminée, archivée
│   ├── gameSession.js           GameSession : partie en cours (5 tours, réponse saisie)
│   ├── questionSelection.js     QuestionPicker : triplet aléatoire, révisions, réglages
│   ├── playerProfile.js         PlayerProfile : joueur
│   ├── holidays.js              jours de fête (succès cachés)
│   ├── achievements.js          succès et paliers Bronze / Argent / Or
│   ├── progressReport.js        chronologie, tendance, conjugaison « piège », grille de maîtrise
│   └── gameSummary.js           verdict et bilan de fin de partie
├── application/
│   ├── stateMachine.js          moteur d'automate générique
│   ├── useCases.js              cas d'utilisation (orchestrent domaine + ports)
│   └── appMachine.js            automate de l'application
├── infrastructure/
│   ├── storage.js               localStorage ou mémoire, JSON tolérant, PreferenceStore
│   ├── localStorageRepository.js  profil et préférences (clés conjugo.*)
│   ├── webAudioSound.js         sons synthétisés
│   └── speech.js                lecture à voix haute
├── ui/
│   ├── textFormat.js            mise en forme générique (dates, durées, écart lettre à lettre, succès)
│   ├── format.js                verdicts, commentaires de la chronologie, diagnostics
│   ├── views.js                 une vue par état, HTML pur
│   ├── renderer.js              rendu complet ou ciblé selon la transition
│   ├── controller.js            clics, saisie, recopie → événements
│   └── effects.js               sons et vibrations selon les transitions
└── main.js                      point d'assemblage
```

Seuls le présent, le participe passé et les radicaux irréguliers sont stockés. Les autres formes sont calculées :

- **imparfait** : radical de « nous » au présent, auquel on ajoute -ais… (commençons → commençais, mais commencions) ;
- **futur simple** : radical du futur, auquel on ajoute -ai… ;
- **futur proche** : *aller* au présent, suivi de l'infinitif ;
- **passé composé** : auxiliaire au présent, suivi du participe passé, accordé avec *être* ;
- l'élision j’ / m’ / t’ / s’ est appliquée partout.

## Ajouter un verbe

Ajouter une entrée dans `src/data/verbs.js`. Le présent et le participe se déduisent pour le 1er et le 2e groupe réguliers, et doivent être donnés pour les autres verbes. Il faut aussi préciser `futureStem` ou `imperfectStem` quand ils sont irréguliers. Au chargement, `VerbBank.fromData` refuse les doublons, les types inconnus, un présent incomplet ou un type sans verbe.
