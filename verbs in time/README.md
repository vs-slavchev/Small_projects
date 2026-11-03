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
- **Je connais déjà un peu** : un **test de placement** cherche son niveau. C'est une recherche dichotomique sur le parcours : le niveau du milieu de l'intervalle restant est testé sur une forme ; juste, on cherche plus haut, sinon plus bas. Le test pose 5 questions au plus. « Je ne sais pas » compte comme une erreur. Les réponses ne sont pas corrigées à l'écran et n'entrent pas dans les statistiques. Le joueur commence au premier niveau non prouvé ; les niveaux précédents sont validés, et les suivants partent de zéro. La règle de choix des questions est séparée du test : une autre règle (fonctions `next`, `result` et `remaining` sur l'historique des réponses ; `remaining` compte les questions restantes au plus, question en cours comprise, et vaut 0 quand `next` renvoie `null`) se branche via `createUseCases({ placementStrategy })`.

### Niveaux

Chaque niveau travaille un temps sur quelques verbes, aux **six cases de personne** : je, tu, il / elle / on, nous, vous, ils / elles. Il, elle et on comptent comme une seule case, ils et elles aussi ; la question montre l'un des sujets de la case, au hasard. L'**impératif** n'a que trois cases (tu, nous, vous). Un niveau compte **18 formes au plus** (trois verbes à six cases) : `LevelLadder.fromData` refuse un niveau plus gros. Chaque temps passe par tous les groupes de verbes.

| Niveaux | Temps | Verbes |
|---|---|---|
| 1 – 8 | présent | parler, habiter · manger · être, avoir · aller, faire, prendre · pouvoir, vouloir, devoir · finir · venir · commencer, acheter, préférer |
| 9 – 17 | passé composé | les mêmes groupes, avec aller seul (il prend *être*) puis faire, prendre |
| 18 – 19 | futur proche | parler, finir, prendre · être, avoir, manger |
| 20 – 22 | impératif | parler, manger, commencer, acheter (tu sans s) · finir, prendre, faire, venir · aller, être, avoir |
| 23 – 26 | imparfait | parler, finir · manger, commencer · faire, prendre, venir · être, avoir |
| 27 – 30 | futur simple | parler, finir · acheter, préférer · être, avoir, aller · faire, pouvoir, venir |

Une **forme** (verbe + temps + case de personne) est **acquise** quand sa dernière réponse est juste et qu'au moins 60 % de ses réponses le sont. Un niveau est terminé quand toutes ses formes sont acquises : un écran de fête le célèbre, sans décrire le niveau suivant, et la partie d'après s'y joue. Les niveaux à venir ne sont jamais listés.

### Parties

- Une partie compte **5 tours**. Chaque question est tirée dans l'un de quatre paniers :
  - **60 %** : une forme du niveau en cours, hors de ses formes à revoir ;
  - **20 %** : une des 20 formes du niveau en cours au plus faible taux de réussite (déjà ratées au moins une fois) ;
  - **10 %** : une des 10 formes des niveaux précédents au plus faible taux de réussite ;
  - **10 %** : une forme des niveaux précédents, hors de ces formes à revoir.

  Un panier vide renvoie au niveau en cours, puis aux niveaux précédents. Une même forme ne revient pas dans une partie.
- La question est une phrase à trou, située par une expression de temps (« Hier, nous ___ ___. », « L’année prochaine, je ___. ») : le temps se comprend par son usage, pas seulement par son nom. Un trait par mot attendu. Tout est en français : aucune traduction. À l'impératif, il n'y a pas de sujet : la personne à qui l'on parle est indiquée entre parenthèses (« Vite, (nous) ___ ! »), et seule la forme nue est acceptée (« parle », pas « tu parle »).
- Le joueur tape la forme conjuguée. Le pronom sujet est facultatif (« finirons » vaut « nous finirons »). La casse, les espaces et le type d'apostrophe ne comptent pas. Les accents comptent : une réponse fausse seulement à cause des accents est signalée par « Presque ».
- Passé composé avec *être* : le participe s'accorde avec le sujet. Comme le genre de je, tu, nous, vous et on n'est pas connu, toutes les formes possibles sont acceptées (« je suis allé » et « je suis allée »). Pour il, elle, ils et elles, l'accord doit être exact.
- Après chaque réponse, l'écran d'explication montre :
  - la forme attendue, **découpée en couleurs** (radical, terminaison, auxiliaire, participe, accord ; la légende ne montre que les morceaux présents), et un bouton 🔊 qui la lit (synthèse vocale du navigateur, masqué si absente) ;
  - en bas, le **verdict** (« Exact. », « Pas cette fois. », « Presque. ») ; après une erreur, **ce qui ne va pas** : forme d'un autre temps, d'une autre personne, mauvais auxiliaire, accord oublié, mauvaise terminaison, ou accents ; et la réponse donnée, lettres en trop barrées. Pour « Presque », les lettres à accentuer sont soulignées dans la forme et dans la réponse ;
  - après une erreur, un champ pour **recopier la bonne forme** : « Continuer » ne se débloque qu'une fois la forme recopiée (les accents n'y sont pas exigés) ;
  - la particularité du verbe, et les verbes qui **se conjuguent comme lui**.
- Le **bilan** ne montre jamais « +0 » ni « −1 » :
  - formes gagnées : « +3 », la barre du niveau et les réponses justes ;
  - aucune forme gagnée : les formes acquises du niveau (« 8/12, rien de perdu ») et, en pointillés, celles qui ont avancé ;
  - formes perdues (acquises avant la partie, plus après) : un segment « à revoir » et la liste de ces formes ;
  - aucune réponse juste : « 5 formes recopiées — Recopier, c'est déjà progresser ».

  Les succès débloqués y sont présentés sur une carte (palier en couleur, ce qui est récompensé), la même que sur l'écran de niveau terminé. Rien n'annonce le contenu de la prochaine partie : les questions sont tirées au hasard.

### Accueil et progrès

L'accueil ne montre jamais « +0 forme » : son accroche dépend du dernier jour joué.

| État | Quand | Accroche |
|---|---|---|
| joué aujourd'hui | une partie aujourd'hui | le gain du jour, en ambre sur la barre du niveau |
| pas encore aujourd'hui | dernière partie hier (ou aucune) | ce qu'une partie rapporterait, en pointillé |
| retour | 1 à 6 jours sans jouer | rien n'est perdu |
| longue absence | une semaine ou plus | le chemin déjà parcouru |

Il montre aussi la série, le niveau en cours sur un chemin (puis les deux derniers niveaux terminés et un lien vers les autres), les formes acquises aujourd'hui, et le nombre de parties restantes, estimé d'après les 5 dernières parties du niveau (2 formes par partie, faute d'historique).

La barre d'onglets compte trois entrées : **Progrès**, **Jouer** (au centre : lance une partie depuis l'accueil, ramène à l'accueil depuis les autres onglets) et **Succès**. L'onglet **Progrès** montre le niveau en cours ; ses statistiques (formes acquises, temps de pratique, niveaux maîtrisés) s'ouvrent après 3 parties.

## Verbes

| Type | Verbes | Ce qu'ils illustrent |
|---|---|---|
| 1er groupe | parler, habiter | modèle -er ; élision devant un h muet (j’habite) |
| 1er groupe à particularité | commencer, manger, acheter, préférer | -cer (ç), -ger (ge), e → è, é → è |
| 2e groupe | finir | -iss- au pluriel et à l’imparfait |
| 3e groupe | venir, prendre, pouvoir, vouloir, devoir, faire, aller | radicaux qui changent au présent ; futurs irréguliers ; auxiliaire *être* (venir, aller) |
| Auxiliaires | être, avoir | imparfait irrégulier (j’étais) ; futurs ser- / aur- ; impératifs sois / aie |

Pouvoir et devoir n'ont pas d'impératif en usage : ils n'apparaissent pas dans les niveaux d'impératif.

## Architecture

Les dépendances vont toujours vers le centre : l'interface connaît l'application, l'application connaît le domaine, et le domaine ne connaît personne. Les fichiers sont des scripts classiques (pas des modules ES, que les navigateurs refusent de charger en `file://`) qui publient leurs exports dans l'espace de noms global `Conjugo`. `index.html` les charge dans l'ordre des dépendances, et les tests (`tests/game.js`) suivent ce même ordre.

```
src/
├── data/
│   ├── verbs.js                 Types de verbes et 16 verbes (présent, participe, radicaux irréguliers, modèles, note)
│   └── levels.js                Les 30 niveaux : temps, verbes, nom
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
│   ├── homeOverview.js          homeOverview : état de l'accueil, gain du jour, rythme, parcours
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

Seuls le présent, le participe passé, les radicaux irréguliers et les impératifs irréguliers sont stockés. Les autres formes sont calculées :

- **imparfait** : radical de « nous » au présent, auquel on ajoute -ais… (commençons → commençais, mais commencions) ;
- **futur simple** : radical du futur, auquel on ajoute -ai… ;
- **futur proche** : *aller* au présent, suivi de l'infinitif ;
- **impératif** : tu, nous et vous du présent, sans sujet ; le s de « tu » tombe après un e (tu parles → parle, tu achètes → achète). Aller (va), être (sois), avoir (aie) et vouloir (veuille) ont leur impératif donné ;
- **passé composé** : auxiliaire au présent, suivi du participe passé, accordé avec *être* ;
- l'élision j’ / m’ / t’ / s’ est appliquée partout.

## Ajouter un verbe

Ajouter une entrée dans `src/data/verbs.js`, puis l'inscrire dans un niveau de `src/data/levels.js` pour qu'il soit posé. Le présent et le participe se déduisent pour le 1er et le 2e groupe réguliers, et doivent être donnés pour les autres verbes. Il faut aussi préciser `futureStem`, `imperfectStem` ou `imperative` (tu, nous, vous) quand ils sont irréguliers ; `imperative: null` signale un verbe sans impératif. Au chargement, `VerbBank.fromData` refuse les doublons, les types inconnus, un présent incomplet ou un type sans verbe, et `LevelLadder.fromData` un temps ou un verbe inconnu.
