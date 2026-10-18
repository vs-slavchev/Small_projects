import { AppState } from '../application/appMachine.js';
import { formatClock } from './format.js';

const THEME_COLOR = Object.freeze({ results: '#1F2430', default: '#F4EFE6' });

/**
 * Abonné de l'automate qui affiche la vue de l'état courant.
 * - changement d'écran       → rendu complet avec animation d'entrée ;
 * - même écran, nouvel état  → rendu complet sans animation d'entrée (question → retour visuel) ;
 * - transition interne       → `patch` de la vue (compte à rebours, badge sélectionné, son) ;
 *                              sans `patch`, rien n'est redessiné.
 * Gère aussi le chrono affiché pendant les questions.
 *
 * @param {HTMLElement} root
 * @param {{ views: Record<string, object>, now: () => number }} options
 */
export function createRenderer(root, { views, now }) {
  const env = Object.freeze({ now });
  const themeMeta = root.ownerDocument.querySelector('meta[name="theme-color"]');
  let screen = null;
  let timerId = null;

  function syncTimer(snapshot) {
    const running = snapshot.state === AppState.QUESTION;
    if (running && timerId === null) {
      timerId = setInterval(() => {
        const el = root.querySelector('#timer');
        const session = snapshot.context.session;
        if (el && session) el.textContent = formatClock(session.thinkingTime(now()));
      }, 250);
    } else if (!running && timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  return function render(snapshot) {
    const view = views[snapshot.state];
    if (!view) throw new Error(`Aucune vue pour l'état « ${snapshot.state} ».`);

    if (!snapshot.changed) {
      view.patch?.(root, snapshot, env);
    } else {
      root.innerHTML = view.render(snapshot, env);
      if (view.screen !== screen) root.firstElementChild?.classList.add('enter');
      view.mounted?.(root, snapshot, env);
      screen = view.screen;
    }
    syncTimer(snapshot);
    if (themeMeta) themeMeta.content = THEME_COLOR[view.screen] ?? THEME_COLOR.default;
  };
}

