# Le ou la ?

Jeu mobile pour apprendre le genre des noms français. JavaScript pur (modules ES), aucune dépendance, aucun service externe : tout est stocké dans le navigateur, et les polices (Young Serif, Manrope — licence SIL OFL 1.1) sont hébergées dans `fonts/`.

```sh
npm start   # sert le dossier sur http://localhost:8000 (les modules ES ne se chargent pas en file://)
npm test    # 52 tests, avec le lanceur intégré de Node (≥ 20)
```

## Architecture

Les dépendances vont toujours vers le centre : l'interface connaît l'application, l'application connaît le domaine, le domaine ne connaît personne.

```
src/
├── data/words.js              Données brutes : 25 groupes, 66 mots
├── domain/                    Règles du jeu, sans DOM ni stockage
│   ├── gender.js              Gender           objet valeur (le / la)
│   ├── wordBank.js            WordGroup, Word, WordBank   invariant régulier / exception
│   ├── difficulty.js          Difficulty       0 → 100, +4 / −6 par réponse
│   ├── wordStats.js           WordStat, WordStatsBook     taux de réussite par mot
│   ├── wordSelection.js       WordSelectionPolicy         tirage 20 / 30 / 50 %
│   ├── gameSession.js         GameSession      agrégat « partie en cours »
│   ├── gameRecord.js          GameRecord       partie terminée, archivée
│   ├── playerProfile.js       PlayerProfile    agrégat « joueur »
│   ├── calendar.js            ActivityCalendar série quotidienne
│   ├── achievements.js        succès et paliers Bronze / Argent / Or
│   ├── progressReport.js      chronologie, tendance, message du coach
│   └── gameSummary.js         verdict et bilan de fin de partie
├── application/
│   ├── useCases.js            cas d'utilisation (orchestrent domaine + ports)
│   ├── stateMachine.js        moteur d'automate générique
│   └── appMachine.js          automate de l'application
├── infrastructure/            Adaptateurs des ports
│   ├── localStorageRepository.js   profil + préférences, migration v1 → v2
│   └── webAudioSound.js            sons de xylophone synthétisés
├── ui/                        Abonnés et pilotes de l'automate
│   ├── views.js               une vue par état, HTML pur
│   ├── renderer.js            rendu complet ou ciblé selon la transition
│   ├── controller.js          clics, survol, clavier → événements
│   ├── effects.js             sons et vibrations selon les transitions
│   └── format.js              textes français (dates, durées, messages)
└── main.js                    point d'assemblage
```

## Automate de l'application

```mermaid
stateDiagram-v2
    [*] --> home
    home --> question: START
    countdown --> question: START · TICK (à 0)
    countdown --> home: CANCEL
    question --> revealing: ANSWER
    revealing --> feedback: REVEALED (après 420 / 520 ms)
    feedback --> question: CONTINUE [reste des mots]
    feedback --> results: CONTINUE [dernier mot] / finishGame
    question --> home: QUIT
    revealing --> home: QUIT
    feedback --> home: QUIT
    results --> question: START
    results --> progress: NAVIGATE
    home --> progress: NAVIGATE
    home --> achievements: NAVIGATE
    progress --> countdown: NAVIGATE(home) [retour de partie]
    progress --> home: NAVIGATE(home)
    achievements --> countdown: NAVIGATE(home) [retour de partie]
```

- Tout événement sans transition dans l'état courant est **ignoré** : un double appui, un « Continuer » tardif ou une touche du clavier hors contexte ne peuvent pas corrompre une partie.
- `countdown` émet `TICK` chaque seconde (`every`), `revealing` émet `REVEALED` après un délai (`after`). Les minuteries sont annulées à la sortie de l'état.
- Transitions internes (sans changement d'état) : `TICK` tant qu'il reste du temps, `SELECT_BADGE`, `CLOSE_BADGE`, `TOGGLE_SOUND` (global). L'interface les traite par une mise à jour ciblée, sans redessiner l'écran.
- Les événements envoyés pendant une transition sont mis en file (« run-to-completion »).

## Règles métier, où les trouver

| Règle | Emplacement |
|---|---|
| Un mot régulier a le genre de son groupe, une exception le genre opposé | `Word` (constructeur) |
| 20 % hasard · 30 % parmi les 20 mots les plus faibles (hors mots déjà vus dans la partie et mots à 100 %) · 50 % difficulté | `WordSelectionPolicy.pick` |
| Tirage 0-100 > difficulté → mot régulier, sinon exception | `Difficulty.callsForException` |
| La difficulté monte de 4, baisse de 6, persiste entre les parties | `Difficulty`, `PlayerProfile.recordGame` |
| Le chrono ne compte que le temps de réflexion | `GameSession.thinkingTime` |
| Une partie abandonnée n'est pas enregistrée | `useCases.abandonGame`, `PlayerProfile` |
| Chaque partie archive : date et heure de fin, durée, % de réussite, difficulté, réponses | `GameRecord.toSnapshot` |
| La chronologie s'affiche à partir de 3 parties | `ProgressReport.isUnlocked` |
| Après une partie, l'accueil lance la suivante dans 5 s | `appMachine` (`returningFromGame`, état `countdown`) |

## Ajouter des mots

Ajouter une entrée dans `src/data/words.js`. Au chargement, `WordBank.fromData` vérifie les doublons, les groupes inconnus et la cohérence régulier / exception, et le test `wordBank.test.js` vérifie que chaque groupe garde au moins deux mots réguliers et au plus une exception.
