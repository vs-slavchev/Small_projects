(function (Conjugo) {
'use strict';

const { AppEvent } = Conjugo;

/**
 * Traduit les gestes du joueur en événements de l'automate.
 * Les éléments interactifs portent `data-event` (et éventuellement `data-to`, `data-index`).
 * La réponse est saisie dans le champ `#answer` et envoyée par le formulaire ; les touches
 * `data-insert` ajoutent un caractère accentué au curseur. L'automate ignore de lui-même les événements
 * qui n'ont pas de sens dans l'état courant : le contrôleur n'a pas à le vérifier.
 *
 * @param {HTMLElement} root
 * @param {ReturnType<typeof import('../application/stateMachine.js').createMachine>} machine
 * @param {{ confirm?: (message: string) => boolean }} [options]
 */
function bindController(root, machine, { confirm = message => globalThis.confirm(message) } = {}) {
  const payloadOf = el => {
    const { to, index } = el.dataset;
    if (to) return { to };
    if (index !== undefined) return { index: Number(index) };
    return {};
  };

  const confirmQuit = () => {
    const session = machine.context.session;
    return !session || !session.answers.length || confirm('Quitter la partie ? Elle ne sera pas enregistrée.');
  };

  root.addEventListener('submit', event => {
    event.preventDefault();
    const input = event.target.querySelector('#answer');
    if (input) machine.send(AppEvent.ANSWER, { text: input.value });
  });

  // Une touche d'accent ne doit pas prendre le focus : le clavier du téléphone resterait fermé.
  root.addEventListener('mousedown', event => {
    if (event.target.closest('[data-insert]')) event.preventDefault();
  });

  root.addEventListener('click', event => {
    const key = event.target.closest('[data-insert]');
    if (key) {
      insertAtCursor(root.querySelector('#answer'), key.dataset.insert);
      return;
    }
    const el = event.target.closest('[data-event]');
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

  // Clavier : Entrée ou Espace pour continuer (hors champ de saisie), Échap pour fermer un badge.
  root.ownerDocument.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement) return;
    switch (event.key) {
      case 'Escape': machine.send(AppEvent.CLOSE_BADGE); break;
      case 'Enter':
      case ' ':
        if (machine.can(AppEvent.CONTINUE)) {
          event.preventDefault();
          machine.send(AppEvent.CONTINUE);
        }
        break;
    }
  });
}

/** Insère `text` à la place de la sélection du champ et garde le focus. */
function insertAtCursor(input, text) {
  if (!input || input.disabled) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  input.focus();
  input.setSelectionRange(start + text.length, start + text.length);
}

Object.assign(Conjugo, { bindController });
})(globalThis.Conjugo ??= {});
