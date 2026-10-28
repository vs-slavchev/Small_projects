(function (LeOuLa) {
'use strict';

const DEFAULT_THEME = '--paper';

/**
 * Réduit la police d'un élément `data-fit="<taille max>"` pour qu'il tienne sur une ligne
 * dans la largeur de son parent : un mot long ne déborde jamais de la carte.
 */
function fitToWidth(el) {
  const max = Number(el.dataset.fit);
  const box = el.parentElement;
  const style = getComputedStyle(box);
  const room = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  el.style.fontSize = `${max}px`;
  const width = el.scrollWidth;
  if (width > room) el.style.fontSize = `${Math.floor((max * room) / width)}px`;
}

/**
 * Ajuste les éléments `data-fit` de l'écran avant son premier affichage, puis quand la largeur
 * change ou que les polices finissent de charger. Retourne la fonction qui arrête le suivi.
 */
function fitText(root) {
  const els = root.querySelectorAll('[data-fit]');
  if (!els.length) return null;
  let fittedWidth = null;
  let stopped = false;
  const fit = (force = false) => {
    if (stopped || (!force && root.clientWidth === fittedWidth)) return;
    fittedWidth = root.clientWidth;
    els.forEach(fitToWidth);
  };
  const fonts = root.ownerDocument.fonts;
  if (fonts && fonts.status !== 'loaded') fonts.ready.then(() => fit(true));
  // L'observateur se déclenche une première fois avant l'affichage : c'est l'ajustement initial.
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  if (observer) observer.observe(root);
  else fit();
  return () => { stopped = true; observer?.disconnect(); };
}

/**
 * Abonné de l'automate qui affiche la vue de l'état courant. Il ne connaît aucun état
 * en particulier : tout ce qui est propre à un écran passe par les crochets de sa vue,
 * sauf l'ajustement des textes marqués `data-fit`, commun à tous les écrans.
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
    const unmount = view.mounted?.(root, snapshot, env);
    const unfit = fitText(root);
    cleanup = () => { unmount?.(); unfit?.(); };
    screen = view.screen;
    if (themeMeta) themeMeta.content = rootStyle.getPropertyValue(view.theme ?? DEFAULT_THEME).trim();
  };
}

Object.assign(LeOuLa, { createRenderer });
})(globalThis.LeOuLa ??= {});
