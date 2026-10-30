// Point d'assemblage : relie le domaine, les cas d'utilisation, l'automate et les adaptateurs.

(function (Conjugo) {
'use strict';

const {
  VerbBank, createUseCases, createAppMachine, LocalStorageProfileRepository,
  LocalStoragePreferences, browserStorage, WebAudioSound, createSpeaker, VIEWS, AppState, AppEvent, createRenderer, createEffects, bindController,
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
  AppState,
  AppEvent,
  extraTapEvents: [AppEvent.RETYPE, AppEvent.CHOOSE_BEGINNER, AppEvent.START_PLACEMENT, AppEvent.PLACEMENT_ANSWER, AppEvent.PLACEMENT_SKIP],
}));
const speaker = createSpeaker();
// Sans synthèse vocale, les boutons « écouter » sont masqués.
document.documentElement.classList.toggle('no-speech', !speaker.available);
bindController(root, machine, { speak: speaker.speak });

// Clavier du téléphone ouvert : l'application épouse la zone visible, pour que la question reste à l'écran.
// Pendant un zoom à deux doigts, on laisse faire le navigateur.
const viewport = globalThis.visualViewport;
if (viewport) {
  const fit = () => {
    if (viewport.scale > 1.01) {
      root.style.height = root.style.transform = '';
      return;
    }
    if (globalThis.scrollY) globalThis.scrollTo(0, 0);
    root.style.height = `${viewport.height}px`;
    root.style.transform = viewport.offsetTop ? `translateY(${viewport.offsetTop}px)` : '';
  };
  viewport.addEventListener('resize', fit);
  viewport.addEventListener('scroll', fit);
  fit();
}
machine.start();

})(globalThis.Conjugo ??= {});
