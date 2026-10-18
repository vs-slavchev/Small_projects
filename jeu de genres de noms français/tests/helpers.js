import { WORD_DATA } from '../src/data/words.js';
import { WordBank } from '../src/domain/wordBank.js';
import { MemoryStorage } from '../src/infrastructure/localStorageRepository.js';

export const realBank = () => WordBank.fromData(WORD_DATA);

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
  const add = (fn, ms, repeat) => { const id = nextId++; tasks.set(id, { fn, at: now + ms, ms, repeat }); return id; };
  return {
    setTimeout: (fn, ms) => add(fn, ms, false),
    setInterval: (fn, ms) => add(fn, ms, true),
    clearTimeout: id => tasks.delete(id),
    clearInterval: id => tasks.delete(id),
    get pending() { return tasks.size; },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...tasks.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, task] = due;
        now = task.at;
        if (task.repeat) task.at += task.ms; else tasks.delete(id);
        task.fn();
      }
      now = end;
    },
  };
}

export const memoryStorage = () => new MemoryStorage();
