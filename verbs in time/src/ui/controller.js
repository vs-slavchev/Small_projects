(function (Conjugo) {
'use strict';

const { AppEvent } = Conjugo;

/**
 * Traduit les gestes du joueur en événements de l'automate.
 * Les éléments interactifs portent `data-event` (et éventuellement `data-to`, `data-index`).
 * Un formulaire (réponse, test de placement, recopie après une erreur) porte lui aussi `data-event` :
 * à l'envoi, la valeur de son champ part avec l'événement (`text`). Les boutons `data-speak` font lire une forme à voix haute (`speak`).
 * L'automate ignore de lui-même les événements
 * qui n'ont pas de sens dans l'état courant : le contrôleur n'a pas à le vérifier.
 *
 * @param {HTMLElement} root
 * @param {ReturnType<typeof import('../application/stateMachine.js').createMachine>} machine
 * @param {{ confirm?: (message: string) => boolean, speak?: (text: string) => void }} [options]
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
    const session = machine.context.session;
    return !session || !session.answers.length || confirm('Quitter la partie ? Elle ne sera pas enregistrée.');
  };

  root.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    const input = form.querySelector('input');
    if (form.dataset.event && input) machine.send(form.dataset.event, { text: input.value });
  });

  root.addEventListener('click', event => {
    const spoken = event.target.closest('[data-speak]');
    if (spoken) {
      speak(spoken.dataset.speak);
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
