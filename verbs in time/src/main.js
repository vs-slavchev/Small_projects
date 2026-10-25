// Point d'assemblage : relie le domaine, les cas d'utilisation, l'automate et les adaptateurs.

(function (Conjugo) {
'use strict';

const {
  VerbBank, createUseCases, createAppMachine, LocalStorageProfileRepository,
  LocalStoragePreferences, browserStorage, WebAudioSound, VIEWS, createRenderer, createEffects, bindController,
} = Conjugo;

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
}));
bindController(root, machine);
machine.start();

})(globalThis.Conjugo ??= {});
