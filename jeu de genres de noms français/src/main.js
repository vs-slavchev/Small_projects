// Point d'assemblage : relie le domaine, les cas d'utilisation, l'automate et les adaptateurs.

import { WORD_DATA } from './data/words.js';
import { WordBank } from './domain/wordBank.js';
import { createUseCases } from './application/useCases.js';
import { createAppMachine } from './application/appMachine.js';
import { LocalStorageProfileRepository, LocalStoragePreferences, browserStorage } from './infrastructure/localStorageRepository.js';
import { WebAudioSound } from './infrastructure/webAudioSound.js';
import { VIEWS } from './ui/views.js';
import { createRenderer } from './ui/renderer.js';
import { createEffects } from './ui/effects.js';
import { bindController } from './ui/controller.js';

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
bindController(root, machine);
machine.start();
