(function (Conjugo) {
'use strict';

const DEFAULT_THEME = '--paper';

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

Object.assign(Conjugo, { createRenderer });
})(globalThis.Conjugo ??= {});
