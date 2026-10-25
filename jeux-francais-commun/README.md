# Jeux français — moteur commun

Code partagé par « Le ou la ? » (`../jeu de genres de noms français`) et « Verbes dans le temps » (`../verbs in time`). Chaque jeu le charge depuis son `index.html` par un chemin relatif. Ce dossier doit donc rester à côté des deux jeux.

```
src/
├── application/stateMachine.js      moteur d'automate générique (run-to-completion, minuteries)
├── domain/errors.js                 DomainError
├── domain/calendar.js               dayKey, addDays, ActivityCalendar (série quotidienne)
├── domain/holidays.js               jours de fête, dates fixes ou calculées depuis Pâques
├── domain/answerStats.js            AnswerStat, AnswerStatsBook : réussites par élément (mot, verbe…)
├── infrastructure/storage.js        localStorage ou mémoire, JSON tolérant, PreferenceStore
├── infrastructure/webAudioSound.js  sons de xylophone synthétisés
├── ui/format.js                     textes français : dates, durées, pluriels, tendances, succès
├── ui/renderer.js                   rendu complet ou ciblé selon la transition
└── ui/effects.js                    sons et vibrations selon les transitions
fonts/                               Young Serif, Manrope (licence SIL OFL 1.1)
tests/
├── testKit.js                       chargement d'un jeu, hasard reproductible, horloge et planificateur manuels
└── *.test.js
```

Les fichiers sont des scripts classiques qui publient leurs exports dans l'espace de noms global `JeuxFr`, celui que les fichiers des deux jeux remplissent aussi. `createRenderer` et `createEffects` reçoivent du jeu ses vues, ses états et ses événements ; `format.js` lit `TrendWindow` dans le rapport de progression du jeu.

Une correction faite ici vaut pour les deux jeux. Après une modification, lancer `npm test` ici, puis dans chacun des deux jeux.
