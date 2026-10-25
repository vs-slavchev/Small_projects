(function (JeuxFr) {
'use strict';

const { AppEvent } = JeuxFr;

/**
 * Traduit les gestes du joueur en événements de l'automate.
 * Les éléments interactifs portent `data-event` (et éventuellement `data-to`, `data-index`).
 * La réponse est saisie dans le champ `#answer` et envoyée par le formulaire ; après une erreur,
 * la bonne forme est recopiée dans `#retype`. Les touches `data-insert` ajoutent un caractère accentué
 * au curseur, les boutons `data-speak` font lire une forme à voix haute (`speak`). L'automate ignore de lui-même les événements
 * qui n'ont pas de sens dans l'état courant : le contrôleur n'a pas à le vérifier.
 *
 * @param {HTMLElement} root
 * @param {ReturnType<typeof import('../../../jeux-francais-commun/src/application/stateMachine.js').createMachine>} machine
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
    const answer = event.target.querySelector('#answer');
    const retype = event.target.querySelector('#retype');
    if (answer) machine.send(AppEvent.ANSWER, { text: answer.value });
    else if (retype) machine.send(AppEvent.RETYPE, { text: retype.value });
  });

  // Une touche d'accent ne doit pas prendre le focus : le clavier du téléphone resterait fermé.
  root.addEventListener('mousedown', event => {
    if (event.target.closest('[data-insert]')) event.preventDefault();
  });

  root.addEventListener('click', event => {
    const key = event.target.closest('[data-insert]');
    if (key) {
      insertAtCursor(key.closest('form')?.querySelector('input'), key.dataset.insert);
      return;
    }
    const spoken = event.target.closest('[data-speak]');
    if (spoken) {
      speak(spoken.dataset.speak);
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

/** Insère `text` à la place de la sélection du champ et garde le focus. */
function insertAtCursor(input, text) {
  if (!input || input.disabled) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  input.focus();
  input.setSelectionRange(start + text.length, start + text.length);
}

Object.assign(JeuxFr, { bindController });
})(globalThis.JeuxFr ??= {});
