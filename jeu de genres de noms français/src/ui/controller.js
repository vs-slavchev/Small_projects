(function (LeOuLa) {
'use strict';

const { AppEvent, Gender } = LeOuLa;

/**
 * Traduit les gestes du joueur en événements de l'automate.
 * Les éléments interactifs portent `data-event` (et éventuellement `data-to`,
 * `data-gender`, `data-index`). L'automate ignore de lui-même les événements
 * qui n'ont pas de sens dans l'état courant : le contrôleur n'a pas à le vérifier.
 *
 * @param {HTMLElement} root
 * @param {ReturnType<typeof import('../application/stateMachine.js').createMachine>} machine
 * @param {{ confirm?: (message: string) => boolean }} [options]
 */
function bindController(root, machine, { confirm = message => globalThis.confirm(message) } = {}) {
  const payloadOf = el => {
    const { to, gender, index } = el.dataset;
    if (to) return { to };
    if (gender) return { gender: Gender.fromCode(gender) };
    if (index !== undefined) return { index: Number(index) };
    return {};
  };

  const confirmQuit = () => {
    const session = machine.context.session;
    return !session || !session.answers.length || confirm('Quitter la partie ? Elle ne sera pas enregistrée.');
  };

  root.addEventListener('click', event => {
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

  // Clavier : ← le, → la, Entrée ou Espace pour continuer, Échap pour fermer un badge.
  root.ownerDocument.addEventListener('keydown', event => {
    switch (event.key) {
      case 'ArrowLeft': machine.send(AppEvent.ANSWER, { gender: Gender.MASCULINE }); break;
      case 'ArrowRight': machine.send(AppEvent.ANSWER, { gender: Gender.FEMININE }); break;
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

Object.assign(LeOuLa, { bindController });
})(globalThis.LeOuLa ??= {});
