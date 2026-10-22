import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, sequence, seededRandom } from './helpers.js';
import { LeOuLa } from './game.js';

const { WordSelectionPolicy, SelectionStrategy, WordStatsBook, Difficulty } = LeOuLa;

const bank = realBank();
const policy = (random, stats = new WordStatsBook()) => new WordSelectionPolicy({ bank, stats, random });

test('tirage < 0,6 → mot au hasard', () => {
  const { strategy } = policy(sequence(0.1, 0.5)).pick({ difficulty: Difficulty.initial() });
  assert.equal(strategy, SelectionStrategy.RANDOM);
});

test('tirage dans [0,6 ; 0,9) → un des mots les plus faibles, hors mots déjà proposés', () => {
  const stats = new WordStatsBook();
  stats.record('squelette', false);
  stats.record('musée', false);
  const { word, strategy } = policy(sequence(0.7, 0), stats).pick({ excluded: new Set(['musée']), difficulty: Difficulty.initial() });
  assert.equal(strategy, SelectionStrategy.WEAKEST);
  assert.equal(word.text, 'squelette');
});

test('sans mot faible disponible, on se rabat sur le hasard', () => {
  const stats = new WordStatsBook();
  stats.record('baguette', true); // maîtrisé (80 % ou plus) → exclu
  const { strategy } = policy(sequence(0.7, 0), stats).pick({ difficulty: Difficulty.initial() });
  assert.equal(strategy, SelectionStrategy.RANDOM);
});

test('stratégie difficulté : à 0, toujours un mot qui suit sa règle ; à 100, toujours une exception ou un mot sans règle', () => {
  const random = seededRandom(7);
  for (let i = 0; i < 200; i++) {
    const roll = () => { const r = random(); return r === 0 ? 0.5 : r; };
    const low = policy(sequence(0.95, roll(), roll())).pick({ difficulty: Difficulty.of(0) });
    if (low.strategy === SelectionStrategy.DIFFICULTY) assert.equal(low.word.followsRule, true);
    const high = policy(sequence(0.95, roll(), roll())).pick({ difficulty: Difficulty.of(100) });
    assert.equal(high.strategy, SelectionStrategy.DIFFICULTY);
    assert.equal(high.word.followsRule, false);
  }
});

test('la répartition des stratégies suit 60 / 30 / 10 %', () => {
  const stats = new WordStatsBook();
  for (const w of bank.words.slice(0, 30)) stats.record(w.text, false);
  const p = policy(seededRandom(1), stats);
  const counts = { random: 0, weakest: 0, difficulty: 0 };
  const n = 20000;
  for (let i = 0; i < n; i++) counts[p.pick({ difficulty: Difficulty.of(50) }).strategy]++;
  assert.ok(Math.abs(counts.random / n - 0.6) < 0.02, JSON.stringify(counts));
  assert.ok(Math.abs(counts.weakest / n - 0.3) < 0.02, JSON.stringify(counts));
  assert.ok(Math.abs(counts.difficulty / n - 0.1) < 0.02, JSON.stringify(counts));
});

test('aucun candidat → erreur explicite', () => {
  const excluded = new Set(bank.words.map(w => w.text));
  assert.throws(() => policy(Math.random).pick({ excluded, difficulty: Difficulty.initial() }), /Plus aucun mot/);
});
