(function (LeOuLa) {
'use strict';

const DEFAULT_THEME = '--paper';

/**
 * Abonné de l'automate qui affiche la vue de l'état courant. Il ne connaît aucun état
 * en particulier : tout ce qui est propre à un écran passe par les crochets de sa vue.
 * - changement d'écran       → rendu complet avec animation d'entrée ;
 * - même écran, nouvel état  → rendu complet sans animation d'entrée (question → retour visuel) ;
 * - transition interne       → `patch` de la vue (compte à rebours, badge sélectionné, son) ;
 *                              sans `patch`, rien n'est redessiné.
 *
 * @param {HTMLElement} root
 * @param {{ views: Record<string, object>, now: () => number }} options
 */
function createRenderer(root, { views, now }) {
  const env = Object.freeze({ now });
  const doc = root.ownerDocument;
  const themeMeta = doc.querySelector('meta[name="theme-color"]');
  const rootStyle = doc.defaultView.getComputedStyle(doc.documentElement);
  let screen = null;
  let cleanup = null;

  return function render(snapshot) {
    const view = views[snapshot.state];
    if (!view) throw new Error(`Aucune vue pour l'état « ${snapshot.state} ».`);

    if (!snapshot.changed) {
      view.patch?.(root, snapshot, env);
      return;
    }
    cleanup?.();
    root.innerHTML = view.render(snapshot, env);
    if (view.screen !== screen) root.firstElementChild?.classList.add('enter');
    cleanup = view.mounted?.(root, snapshot, env) ?? null;
    screen = view.screen;
    if (themeMeta) themeMeta.content = rootStyle.getPropertyValue(view.theme ?? DEFAULT_THEME).trim();
  };
}

Object.assign(LeOuLa, { createRenderer });
})(globalThis.LeOuLa ??= {});
