// Point d'assemblage : relie le domaine, les cas d'utilisation, l'automate et les adaptateurs.

(function (JeuxFr) {
'use strict';

const {
  VerbBank, createUseCases, createAppMachine, LocalStorageProfileRepository,
  LocalStoragePreferences, browserStorage, WebAudioSound, createSpeaker, VIEWS, AppState, AppEvent, createRenderer, createEffects, bindController,
} = JeuxFr;

const clock = { now: () => Date.now() };
const storage = browserStorage();

const useCases = createUseCases({
  bank: VerbBank.fromData(),
  profiles: new LocalStorageProfileRepository({ storage, onError: error => console.warn('Profil illisible, nouveau départ.', error) }),
  preferences: new LocalStoragePreferences({ storage }),
  clock,
});

const machine = createAppMachine(useCases);
const root = document.getElementById('app');

machine.subscribe(createRenderer(root, { views: VIEWS, now: clock.now }));
machine.subscribe(createEffects({
  sound: new WebAudioSound({ enabled: useCases.isSoundEnabled() }),
  vibrate: ms => navigator.vibrate?.(ms),
  AppState,
  AppEvent,
  extraTapEvents: [AppEvent.START_REVIEW, AppEvent.TOGGLE_TENSE, AppEvent.TOGGLE_TYPE, AppEvent.RETYPE],
}));
const speaker = createSpeaker();
// Sans synthèse vocale, les boutons « écouter » sont masqués.
document.documentElement.classList.toggle('no-speech', !speaker.available);
bindController(root, machine, { speak: speaker.speak });
machine.start();

})(globalThis.JeuxFr ??= {});
