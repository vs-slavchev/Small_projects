# Jeux français — moteur commun

Code partagé par « Le ou la ? » (`../jeu de genres de noms français`) et « Verbes dans le temps » (`../verbs in time`). Chaque jeu le charge depuis son `index.html` par un chemin relatif. Ce dossier doit donc rester à côté des deux jeux.

```
src/
├── application/stateMachine.js      moteur d'automate générique (run-to-completion, minuteries)
├── domain/errors.js                 DomainError
├── domain/calendar.js               dayKey, addDays, ActivityCalendar (série quotidienne)
├── domain/holidays.js               jours de fête, dates fixes ou calculées depuis Pâques
├── infrastructure/webAudioSound.js  sons de xylophone synthétisés
├── ui/renderer.js                   rendu complet ou ciblé selon la transition
└── ui/effects.js                    sons et vibrations selon les transitions
tests/
├── testKit.js                       hasard reproductible, horloge et planificateur manuels
└── stateMachine.test.js
```

Les fichiers sont des scripts classiques qui publient leurs exports dans l'espace de noms global `JeuxFr`, celui que les fichiers des deux jeux remplissent aussi. `effects.js` et `renderer.js` lisent `AppState`, `AppEvent` et les vues que chaque jeu y publie.

Une correction faite ici vaut pour les deux jeux. Après une modification, lancer `npm test` ici, puis dans chacun des deux jeux.
