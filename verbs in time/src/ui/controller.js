(function (Conjugo) {
'use strict';

const { AppEvent } = Conjugo;

const MIN_SPEAKING_MS = 400;
const OWN_KEYS = 'input, textarea, select, button, a[href], [role="button"], [contenteditable]';

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

  if (globalThis.matchMedia?.('(hover: hover)').matches) {
    root.addEventListener('mouseover', event => {
      const badge = event.target.closest(`[data-event="${AppEvent.SELECT_BADGE}"]`);
      if (badge) machine.send(AppEvent.PREVIEW_BADGE, payloadOf(badge));
    });
  }

  root.ownerDocument.addEventListener('keydown', event => {
    // Un élément interactif qui a le focus garde ses touches : Entrée sur « écouter » doit lire, pas continuer.
    if (event.target.closest?.(OWN_KEYS)) return;
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
