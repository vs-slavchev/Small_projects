/**
 * Petit moteur d'automate à états finis, sans dépendance.
 *
 * Définition :
 *   {
 *     initial: 'a',
 *     context: {},                       // données étendues, modifiées uniquement par les actions
 *     on: { EVENT: handler },            // transitions globales (valables dans tous les états)
 *     states: {
 *       a: {
 *         entry: [fn], exit: [fn],       // actions d'entrée / de sortie : fn(context, event)
 *         on: { EVENT: handler },
 *         after: { delay, event },       // événement émis une fois après `delay` ms (nombre ou fn(context))
 *         every: { interval, event },    // événement émis périodiquement tant qu'on reste dans l'état
 *       },
 *     },
 *   }
 *
 * Un `handler` est un nom d'état, un objet { target?, guard?, actions? } ou une liste de ces objets :
 * la première transition dont la garde est vraie l'emporte.
 * - avec `target` : transition externe (sortie, actions, entrée) — même vers l'état courant ;
 * - sans `target` : transition interne (actions seulement, pas de sortie ni d'entrée).
 * Un événement sans transition applicable est ignoré : c'est ce qui protège le jeu
 * des doubles appuis et des événements arrivés trop tard.
 *
 * Les événements envoyés pendant une transition sont mis en file et traités ensuite
 * (sémantique « run-to-completion »).
 */

const INIT_EVENT = Object.freeze({ type: '@@init' });

const defaultScheduler = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: id => clearTimeout(id),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: id => clearInterval(id),
};

function normalize(handler) {
  if (handler === undefined) return [];
  const list = Array.isArray(handler) ? handler : [handler];
  return list.map(h => (typeof h === 'string' ? { target: h } : h));
}

function validate(definition) {
  const { states, initial } = definition;
  if (!states || !states[initial]) throw new Error(`Automate : état initial inconnu « ${initial} ».`);
  const check = (handlers, where) => {
    for (const [type, handler] of Object.entries(handlers ?? {})) {
      for (const t of normalize(handler)) {
        if (t.target !== undefined && !states[t.target]) {
          throw new Error(`Automate : ${where}, l'événement ${type} vise un état inconnu « ${t.target} ».`);
        }
      }
    }
  };
  check(definition.on, 'transition globale');
  for (const [name, state] of Object.entries(states)) check(state.on, `état « ${name} »`);
}

/**
 * @template C
 * @param {{ initial: string, context: C, on?: object, states: Record<string, object> }} definition
 * @param {{ scheduler?: typeof defaultScheduler }} [options]
 */
export function createMachine(definition, { scheduler = defaultScheduler } = {}) {
  validate(definition);
  const context = definition.context;
  const listeners = new Set();
  const queue = [];
  let state = null;
  let timers = [];
  let processing = false;

  const run = (actions, event) => {
    for (const action of actions ?? []) action(context, event);
  };

  function enter(name, event) {
    const node = definition.states[name];
    run(node.entry, event);
    if (node.after) {
      const delay = typeof node.after.delay === 'function' ? node.after.delay(context) : node.after.delay;
      const id = scheduler.setTimeout(() => send(node.after.event), delay);
      timers.push(() => scheduler.clearTimeout(id));
    }
    if (node.every) {
      const id = scheduler.setInterval(() => send(node.every.event), node.every.interval);
      timers.push(() => scheduler.clearInterval(id));
    }
  }

  function exit(name, event) {
    for (const cancel of timers) cancel();
    timers = [];
    run(definition.states[name].exit, event);
  }

  function select(event) {
    const local = definition.states[state].on?.[event.type];
    const handlers = local !== undefined ? local : definition.on?.[event.type];
    return normalize(handlers).find(t => !t.guard || t.guard(context, event)) ?? null;
  }

  function notify(snapshot) {
    for (const listener of [...listeners]) listener(snapshot);
  }

  function step(event) {
    const transition = select(event);
    if (!transition) return;
    const previous = state;
    const external = transition.target !== undefined;
    if (external) exit(previous, event);
    run(transition.actions, event);
    if (external) {
      state = transition.target;
      enter(state, event);
    }
    notify(Object.freeze({ state, previous, event, context, changed: external }));
  }

  /**
   * Envoie un événement. Retourne l'état courant après traitement.
   * @param {string} type @param {object} [payload]
   */
  function send(type, payload = {}) {
    if (state === null) throw new Error('Automate : démarre-le avant de lui envoyer des événements.');
    queue.push(Object.freeze({ ...payload, type }));
    if (processing) return state;
    processing = true;
    try {
      while (queue.length) step(queue.shift());
    } catch (error) {
      queue.length = 0;
      throw error;
    } finally {
      processing = false;
    }
    return state;
  }

  return {
    get state() { return state; },
    /** Données étendues : à lire seulement, les actions sont seules à les modifier. */
    get context() { return context; },
    matches: (...names) => names.includes(state),
    /** Indique si l'événement déclencherait une transition dans l'état courant. */
    can: (type, payload = {}) => state !== null && select({ ...payload, type }) !== null,
    send,
    /** @param {(snapshot: { state: string, previous: string|null, event: object, context: C, changed: boolean }) => void} listener */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (state !== null) return state;
      state = definition.initial;
      enter(state, INIT_EVENT);
      notify(Object.freeze({ state, previous: null, event: INIT_EVENT, context, changed: true }));
      return state;
    },
    stop() {
      for (const cancel of timers) cancel();
      timers = [];
      listeners.clear();
    },
  };
}
