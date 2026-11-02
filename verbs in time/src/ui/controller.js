(function (Conjugo) {
'use strict';

const { AppEvent } = Conjugo;

/** Durée minimale de l'état « en lecture » d'un bouton écouter, pour que l'appui se voie. */
const MIN_SPEAKING_MS = 400;

/**
 * Traduit les gestes du joueur en événements de l'automate.
 * Les éléments interactifs portent `data-event` (et éventuellement `data-to`, `data-index`).
 * Un formulaire (réponse, test de placement, recopie après une erreur) porte lui aussi `data-event` :
 * à l'envoi, la valeur de son champ part avec l'événement (`text`). Les boutons `data-speak` font lire une forme à voix haute (`speak`) :
 * le bouton reste inactif (classe `speaking`, `aria-disabled`) jusqu'à la fin de la lecture.
 * L'automate ignore de lui-même les événements
 * qui n'ont pas de sens dans l'état courant : le contrôleur n'a pas à le vérifier.
 *
 * @param {HTMLElement} root
 * @param {ReturnType<typeof import('../application/stateMachine.js').createMachine>} machine
 * @param {{ confirm?: (message: string) => boolean, speak?: (text: string) => Promise<void> | void }} [options]
 */
function bindController(root, machine, { confirm = message => globalThis.confirm(message), speak = () => {} } = {}) {
  const payloadOf = el => {
    const { to, index, id } = el.dataset;
    if (to) return { to };
    if (id) return { id };
    if (index !== undefined) return { index: Number(index) };
    return {};
  };

  const confirmQuit = () => {
    const { session, placement } = machine.context;
    if (session) return !session.answers.length || confirm('Quitter la partie ? Elle ne sera pas enregistrée.');
    if (placement) return placement.position <= 1 || confirm('Quitter le test ? Il faudra le recommencer.');
    return true;
  };

  root.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    const input = form.querySelector('input');
    if (form.dataset.event && input) machine.send(form.dataset.event, { text: input.value });
  });

  // Inactif pendant la lecture (sans `disabled`, qui ferait perdre le focus clavier) :
  // l'appui se voit même si la voix tarde à démarrer.
  const say = button => {
    if (button.classList.contains('speaking')) return;
    const setSpeaking = on => {
      button.classList.toggle('speaking', on);
      button.setAttribute('aria-disabled', String(on));
    };
    setSpeaking(true);
    const minimum = new Promise(resolve => setTimeout(resolve, MIN_SPEAKING_MS));
    Promise.all([Promise.resolve(speak(button.dataset.speak)).catch(() => {}), minimum]).then(() => setSpeaking(false));
  };

  // Un appui sur un bouton ne lui donne pas le focus (le clavier, lui, le peut toujours) : le champ de saisie
  // le garde, et la mise en page compacte liée à son focus (clavier ouvert) ne se défait pas sous le doigt.
  root.addEventListener('mousedown', event => {
    if (event.target.closest('button')) event.preventDefault();
  });

  root.addEventListener('click', event => {
    const spoken = event.target.closest('[data-speak]');
    if (spoken) {
      say(spoken);
      return;
    }
    // Un formulaire porte aussi data-event, mais il n'agit qu'à l'envoi (voir `submit`).
    const el = event.target.closest('[data-event]:not(form)');
    if (!el || !root.contains(el)) return;
    const type = el.dataset.event;
    if (type === AppEvent.QUIT && !confirmQuit()) return;
    machine.send(type, payloadOf(el));
  });

  // Survol à la souris : la description d'un badge s'affiche sans clic.
  if (globalThis.matchMedia?.('(hover: hover)').matches) {
    root.addEventListener('mouseover', event => {
      const badge = event.target.closest(`[data-event="${AppEvent.SELECT_BADGE}"]`);
      if (badge) machine.send(AppEvent.PREVIEW_BADGE, payloadOf(badge));
    });
  }

  // Clavier : Entrée ou Espace pour continuer (hors champ de saisie et hors touche maintenue), Échap pour fermer un badge.
  // L'automate refuse de lui-même de quitter une explication qui vient de s'afficher.
  root.ownerDocument.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement) return;
    switch (event.key) {
      case 'Escape': machine.send(AppEvent.CLOSE_BADGE); break;
      case 'Enter':
      case ' ':
        if (machine.can(AppEvent.CONTINUE)) {
          event.preventDefault();
          if (!event.repeat) machine.send(AppEvent.CONTINUE);
        }
        break;
    }
  });
}

Object.assign(Conjugo, { bindController });
})(globalThis.Conjugo ??= {});
