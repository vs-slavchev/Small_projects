// Point d'assemblage : relie le domaine, les cas d'utilisation, l'automate et les adaptateurs.

(function (LeOuLa) {
'use strict';

const {
  WORD_DATA, WordBank, createUseCases, createAppMachine, LocalStorageProfileRepository,
  LocalStoragePreferences, browserStorage, WebAudioSound, createSpeaker, VIEWS, createRenderer, createEffects, bindController,
} = LeOuLa;

const clock = { now: () => Date.now() };
const storage = browserStorage();

const useCases = createUseCases({
  bank: WordBank.fromData(WORD_DATA),
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
}));
const speaker = createSpeaker();
// Sans synthèse vocale ni voix française, les boutons « écouter » sont masqués.
const syncSpeech = () => document.documentElement.classList.toggle('no-speech', !speaker.available);
speaker.onAvailabilityChange(syncSpeech);
syncSpeech();
bindController(root, machine, { speak: speaker.speak });
machine.start();

})(globalThis.LeOuLa ??= {});
