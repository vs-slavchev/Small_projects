import { Conjugo } from './game.js';

const { VerbBank, MemoryStorage, VERB_DATA, VERB_TYPES } = Conjugo;

export const realBank = () => VerbBank.fromData();

/**
 * Verbes absents des niveaux mais utiles pour éprouver le moteur de conjugaison :
 * doublement de consonne, y → i, verbes en -dre et -oir, auxiliaire être, verbe pronominal.
 */
const ENGINE_TYPES = [{ id: 'pronominal', label: 'Pronominal', rule: 'Pronom réfléchi à tous les temps.' }];
const ENGINE_VERBS = [
  { infinitive: 'appeler', type: 'firstSpelling', present: ['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent'], futureStem: 'appeller' },
  { infinitive: 'nettoyer', type: 'firstSpelling', present: ['nettoie', 'nettoies', 'nettoie', 'nettoyons', 'nettoyez', 'nettoient'], futureStem: 'nettoier' },
  { infinitive: 'partir', type: 'third', auxiliary: 'être', present: ['pars', 'pars', 'part', 'partons', 'partez', 'partent'], participle: 'parti' },
  { infinitive: 'attendre', type: 'third', present: ['attends', 'attends', 'attend', 'attendons', 'attendez', 'attendent'], participle: 'attendu' },
  { infinitive: 'voir', type: 'third', present: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'], participle: 'vu', futureStem: 'verr' },
  { infinitive: 'lever', type: 'pronominal', pronominal: true, present: ['lève', 'lèves', 'lève', 'levons', 'levez', 'lèvent'], futureStem: 'lèver' },
];

/** Banque du jeu, complétée des verbes de test du moteur. */
export const engineBank = () => VerbBank.fromData([...VERB_DATA, ...ENGINE_VERBS], [...VERB_TYPES, ...ENGINE_TYPES]);

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function seededRandom(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Retourne successivement les valeurs données, puis recommence. */
export function sequence(...values) {
  let i = 0;
  return () => values[i++ % values.length];
}

export function fakeClock(start = new Date(2026, 9, 18, 14, 0).getTime()) {
  let t = start;
  return { now: () => t, advance: ms => { t += ms; }, set: ms => { t = ms; } };
}

/** Planificateur manuel : le temps n'avance que via `advance`. */
export function fakeScheduler() {
  let now = 0;
  let nextId = 1;
  const tasks = new Map();
  const add = (fn, ms) => { const id = nextId++; tasks.set(id, { fn, at: now + ms }); return id; };
  return {
    setTimeout: add,
    clearTimeout: id => tasks.delete(id),
    get pending() { return tasks.size; },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...tasks.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, task] = due;
        now = task.at;
        tasks.delete(id);
        task.fn();
      }
      now = end;
    },
  };
}

export const memoryStorage = () => new MemoryStorage();
