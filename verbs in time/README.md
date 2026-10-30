# Verbes dans le temps

Jeu mobile pour apprendre la conjugaison des verbes français, inspiré de « Le ou la ? » mais entièrement autonome : aucun fichier n'est partagé avec un autre projet. Il est écrit en JavaScript pur, sans dépendance ni service externe. Tout est stocké dans le navigateur, et les polices (Young Serif, Manrope — licence SIL OFL 1.1) sont hébergées dans `fonts/`.

Pour jouer, ouvrir `index.html` dans le navigateur : ni serveur ni Node ne sont nécessaires.

```sh
npm test    # lanceur de tests intégré de Node (≥ 20)
```

## Règles

### Premier lancement

Le joueur choisit son point de départ :

- **Je débute** : il commence au niveau 1 ;
- **Je connais déjà un peu** : un **test de placement** cherche son niveau. C'est une recherche dichotomique sur le parcours : le niveau du milieu de l'intervalle restant est testé sur deux formes ; toutes deux justes, on cherche plus haut, sinon plus bas. Le test pose 10 questions au plus. « Je ne sais pas » compte comme une erreur. Les réponses ne sont pas corrigées à l'écran et n'entrent pas dans les statistiques. Le joueur commence au premier niveau non prouvé ; les niveaux précédents sont validés, et les suivants partent de zéro. La règle de choix des questions est séparée du test : une autre règle (fonctions `next`, `result`, `maxLength` sur l'historique des réponses) se branche via `createUseCases({ placementStrategy })`.

### Niveaux

Chaque niveau travaille un temps sur quelques verbes, aux **six cases de personne** : je, tu, il / elle / on, nous, vous, ils / elles. Il, elle et on comptent comme une seule case, ils et elles aussi ; la question montre l'un des sujets de la case, au hasard.

| Niveaux | Temps | Verbes |
|---|---|---|
| 1 – 8 | présent | parler, habiter · manger · être, avoir · aller, faire, prendre · pouvoir, vouloir, devoir · finir · venir · commencer, acheter, préférer |
| 9 – 17 | passé composé | les mêmes groupes, avec aller seul (il prend *être*) puis faire, prendre |
| 18 | futur proche | parler, finir, prendre |
| 19 – 20 | imparfait | forme régulière (parler, manger, finir, commencer) · être |
| 21 – 22 | futur simple | forme régulière (parler, finir) · radicaux irréguliers (être, avoir, aller, faire, pouvoir, venir) |

Une **forme** (verbe + temps + case de personne) est **acquise** quand sa dernière réponse est juste et qu'au moins 60 % de ses réponses le sont. Un niveau est terminé quand toutes ses formes sont acquises : un écran de fête le célèbre, sans décrire le niveau suivant, et la partie d'après s'y joue. Les niveaux à venir ne sont jamais listés.

### Parties

- Une partie compte **5 tours**. Chaque question est tirée dans l'un de quatre paniers :
  - **60 %** : une forme du niveau en cours, hors de ses formes à revoir ;
  - **20 %** : une des 20 formes du niveau en cours au plus faible taux de réussite (déjà ratées au moins une fois) ;
  - **10 %** : une des 10 formes des niveaux précédents au plus faible taux de réussite ;
  - **10 %** : une forme des niveaux précédents, hors de ces formes à revoir.

  Un panier vide renvoie au niveau en cours, puis aux niveaux précédents. Une même forme ne revient pas dans une partie.
- La question est située par une expression de temps (« Hier, nous … », « L’année prochaine, je … ») : le temps se comprend par son usage, pas seulement par son nom.
- Le joueur tape la forme conjuguée. Le pronom sujet est facultatif (« finirons » vaut « nous finirons »). La casse, les espaces et le type d'apostrophe ne comptent pas. Les accents comptent : une réponse fausse seulement à cause des accents est signalée par « Presque ».
- Passé composé avec *être* : le participe s'accorde avec le sujet. Comme le genre de je, tu, nous, vous et on n'est pas connu, toutes les formes possibles sont acceptées (« je suis allé » et « je suis allée »). Pour il, elle, ils et elles, l'accord doit être exact.
- Après chaque réponse, l'écran d'explication montre :
  - la forme attendue, **découpée en couleurs** (radical, terminaison, auxiliaire, accord), et un bouton 🔊 qui la lit (synthèse vocale du navigateur, masqué si absente) ;
  - après une erreur, **ce qui ne va pas** : forme d'un autre temps, d'une autre personne, mauvais auxiliaire, accord oublié, mauvaise terminaison, ou accents ; et l'**écart lettre à lettre** entre la réponse et la forme juste ;
  - après une erreur, un champ pour **recopier la bonne forme** : « Continuer » ne se débloque qu'une fois la forme recopiée (les accents n'y sont pas exigés) ;
  - la particularité du verbe, et les verbes qui **se conjuguent comme lui**.
- Le **bilan** met en avant le gain du niveau (« +13 % »), les formes devenues acquises et ce qu'apporterait une partie de plus.

### Accueil et progrès

L'accueil ne montre jamais « +0 % » : son accroche dépend du dernier jour joué.

| État | Quand | Accroche |
|---|---|---|
| joué aujourd'hui | une partie aujourd'hui | le gain du jour, en ambre sur la barre du niveau |
| pas encore aujourd'hui | dernière partie hier (ou aucune) | ce qu'une partie rapporterait, en pointillé |
| retour | 1 à 6 jours sans jouer | rien n'est perdu ; une nouvelle série commence |
| longue absence | une semaine ou plus | le chemin déjà parcouru |

Il montre aussi les formes acquises en tout, le niveau en cours, et le nombre de parties restantes, estimé d'après les 5 dernières parties du niveau (2 formes par partie, faute d'historique). L'onglet **Progrès** montre le niveau en cours et les niveaux terminés.

## Verbes

| Type | Verbes | Ce qu'ils illustrent |
|---|---|---|
| 1er groupe | parler, habiter | modèle -er ; élision devant un h muet (j’habite) |
| 1er groupe à particularité | commencer, manger, acheter, préférer | -cer (ç), -ger (ge), e → è, é → è |
| 2e groupe | finir | -iss- au pluriel et à l’imparfait |
| 3e groupe | venir, prendre, pouvoir, vouloir, devoir, faire, aller | radicaux qui changent au présent ; futurs irréguliers ; auxiliaire *être* (venir, aller) |
| Auxiliaires | être, avoir | imparfait irrégulier (j’étais) ; futurs ser- / aur- |

## Architecture

Les dépendances vont toujours vers le centre : l'interface connaît l'application, l'application connaît le domaine, et le domaine ne connaît personne. Les fichiers sont des scripts classiques (pas des modules ES, que les navigateurs refusent de charger en `file://`) qui publient leurs exports dans l'espace de noms global `Conjugo`. `index.html` les charge dans l'ordre des dépendances, et les tests (`tests/game.js`) suivent ce même ordre.

```
src/
├── data/
│   ├── verbs.js                 Types de verbes et 16 verbes (présent, participe, radicaux irréguliers, modèles, note)
│   └── levels.js                Les 22 niveaux : temps, verbes, nom
├── domain/
│   ├── errors.js                DomainError
│   ├── conjugation.js           Person (six cases), Tense (expressions de temps), Verb.conjugate (formes découpées),
│   │                            Conjugation.check, Question, VerbBank
│   ├── diagnosis.js             diagnose : nature d'une erreur (autre temps, autre personne, auxiliaire…)
│   ├── calendar.js              dayKey, addDays, ActivityCalendar (série quotidienne)
│   ├── answerStats.js           AnswerStat, AnswerStatsBook : réussites par forme, forme acquise, formes à revoir
│   ├── gameRecord.js            GameRecord : partie terminée, archivée, avec son niveau et ses formes acquises
│   ├── levels.js                Level, LevelLadder : formes d'un niveau, progression, niveau terminé
│   ├── gameSession.js           GameSession : partie en cours (5 tours, réponse saisie)
│   ├── questionSelection.js     QuestionPicker : quatre paniers (niveau en cours, erreurs, révision)
│   ├── placementTest.js         PlacementTest (historique, réponses) + règle de choix des questions (binarySearchPlacement par défaut)
│   ├── playerProfile.js         PlayerProfile : joueur, niveau en cours, niveaux terminés
│   ├── holidays.js              jours de fête (succès cachés)
│   ├── achievements.js          succès et paliers Bronze / Argent / Or
│   ├── homeOverview.js          homeOverview : état de l'accueil, gain du jour, rythme, semaine, parcours
│   └── gameSummary.js           verdict et bilan de fin de partie (gain du niveau, formes acquises)
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
│   ├── format.js                verdicts, diagnostics
│   ├── views.js                 une vue par état, HTML pur
│   ├── renderer.js              rendu complet ou ciblé selon la transition
│   ├── controller.js            clics, saisie (partie et test de placement), recopie → événements
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

Ajouter une entrée dans `src/data/verbs.js`, puis l'inscrire dans un niveau de `src/data/levels.js` pour qu'il soit posé. Le présent et le participe se déduisent pour le 1er et le 2e groupe réguliers, et doivent être donnés pour les autres verbes. Il faut aussi préciser `futureStem` ou `imperfectStem` quand ils sont irréguliers. Au chargement, `VerbBank.fromData` refuse les doublons, les types inconnus, un présent incomplet ou un type sans verbe, et `LevelLadder.fromData` un temps ou un verbe inconnu.
