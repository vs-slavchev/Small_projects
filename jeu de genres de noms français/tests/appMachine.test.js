import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, seededRandom, fakeClock, fakeScheduler, memoryStorage } from './helpers.js';
import { LeOuLa } from './game.js';

const {
  createAppMachine, AppState, AppEvent, Destination, COUNTDOWN_SECONDS, REVEAL_DELAY_MS, createUseCases,
  LocalStorageProfileRepository, LocalStoragePreferences,
} = LeOuLa;

function setup({ storage = memoryStorage(), seed = 3 } = {}) {
  const clock = fakeClock();
  const scheduler = fakeScheduler();
  const profiles = new LocalStorageProfileRepository({ storage });
  const useCases = createUseCases({
    bank: realBank(), profiles, preferences: new LocalStoragePreferences({ storage }), clock, random: seededRandom(seed),
  });
  const machine = createAppMachine(useCases, { scheduler });
  machine.start();
  return { machine, clock, scheduler, storage, profiles };
}

/** Répond à un mot (juste ou faux), laisse passer le retour visuel et attend l'explication. */
function answerWord({ machine, clock, scheduler }, correct) {
  const word = machine.context.session.currentWord;
  clock.advance(2000);
  machine.send(AppEvent.ANSWER, { gender: correct ? word.gender : word.gender.opposite });
  assert.equal(machine.state, AppState.REVEALING);
  scheduler.advance(correct ? REVEAL_DELAY_MS.correct : REVEAL_DELAY_MS.wrong);
  assert.equal(machine.state, AppState.FEEDBACK);
}

function playGame(env, pattern = Array(10).fill(true)) {
  env.machine.send(AppEvent.START);
  pattern.forEach((correct, i) => {
    answerWord(env, correct);
    env.machine.send(AppEvent.CONTINUE);
    assert.equal(env.machine.state, i === pattern.length - 1 ? AppState.RESULTS : AppState.QUESTION);
  });
}

test('déroulé complet d’une partie jusqu’au bilan', () => {
  const env = setup();
  assert.equal(env.machine.state, AppState.HOME);
  playGame(env, [true, true, false, true, true, true, true, true, true, false]);
  const { summary } = env.machine.context;
  assert.equal(summary.record.accuracy, 80);
  assert.equal(summary.record.durationMs, 20_000, '10 × 2 s de réflexion');
  assert.equal(summary.missedWords.length, 2);
  assert.equal(summary.streak, 1);
  assert.equal(env.profiles.load().gameCount, 1, 'partie archivée');
});

test('un double appui sur une réponse est ignoré', () => {
  const env = setup();
  env.machine.send(AppEvent.START);
  const word = env.machine.context.session.currentWord;
  env.machine.send(AppEvent.ANSWER, { gender: word.gender });
  env.machine.send(AppEvent.ANSWER, { gender: word.gender.opposite });
  assert.equal(env.machine.context.session.answers.length, 1);
  assert.ok(env.machine.context.session.lastAnswer.correct);
});

test('retour à l’accueil après une partie : compte à rebours de 5 s puis nouvelle partie', () => {
  const env = setup();
  playGame(env);
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.HOME });
  assert.equal(env.machine.state, AppState.COUNTDOWN);
  assert.equal(env.machine.context.countdown, COUNTDOWN_SECONDS);
  env.scheduler.advance(4000);
  assert.equal(env.machine.context.countdown, 1);
  env.scheduler.advance(1000);
  assert.equal(env.machine.state, AppState.QUESTION);
  assert.equal(env.scheduler.pending, 0, 'le minuteur du compte à rebours est arrêté');
});

test('« Pas maintenant » annule le compte à rebours, qui ne revient pas', () => {
  const env = setup();
  playGame(env);
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.PROGRESS });
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.HOME });
  assert.equal(env.machine.state, AppState.COUNTDOWN, 'détour par Progrès : toujours un retour de partie');
  env.machine.send(AppEvent.CANCEL);
  assert.equal(env.machine.state, AppState.HOME);
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.ACHIEVEMENTS });
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.HOME });
  assert.equal(env.machine.state, AppState.HOME);
});

test('quitter une partie ne laisse aucune trace', () => {
  const env = setup();
  env.machine.send(AppEvent.START);
  answerWord(env, true);
  env.machine.send(AppEvent.QUIT);
  assert.equal(env.machine.state, AppState.HOME);
  assert.equal(env.machine.context.session, null);
  assert.equal(env.profiles.load().gameCount, 0);
  assert.equal(env.profiles.load().difficulty.value, 0);
});

test('la difficulté acquise est conservée pour la partie suivante', () => {
  const env = setup();
  playGame(env);
  env.machine.send(AppEvent.START);
  assert.equal(env.machine.context.session.difficulty.value, 40);
});

test('la progression se déverrouille à la 3ᵉ partie', () => {
  const env = setup();
  playGame(env);
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.PROGRESS });
  assert.equal(env.machine.context.progress.isUnlocked, false);
  env.machine.send(AppEvent.START);
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < 10; i++) { answerWord(env, i % 2 === 0); env.machine.send(AppEvent.CONTINUE); }
    if (g === 0) env.machine.send(AppEvent.START);
  }
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.PROGRESS });
  assert.equal(env.machine.context.progress.isUnlocked, true);
  assert.equal(env.machine.context.progress.gameCount, 3);
});

test('les succès reflètent la partie qui vient de se terminer', () => {
  const env = setup();
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.ACHIEVEMENTS });
  assert.equal(env.machine.context.achievements.earned, 0);
  playGame(env);
  assert.ok(env.machine.context.summary.unlocked.some(p => p.id === 'flawless'));
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.ACHIEVEMENTS });
  assert.ok(env.machine.context.achievements.earned > 0);
});

test('succès : sélection et fermeture d’un badge, index hors limites refusé', () => {
  const env = setup();
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.ACHIEVEMENTS });
  assert.equal(env.machine.context.achievements.total, 50);
  env.machine.send(AppEvent.SELECT_BADGE, { index: 1 });
  assert.equal(env.machine.context.selectedBadge, 1);
  env.machine.send(AppEvent.SELECT_BADGE, { index: 99 });
  assert.equal(env.machine.context.selectedBadge, 1);
  env.machine.send(AppEvent.CLOSE_BADGE);
  assert.equal(env.machine.context.selectedBadge, null);
});

test('le réglage du son est global et persistant', () => {
  const storage = memoryStorage();
  const env = setup({ storage });
  assert.equal(env.machine.context.soundEnabled, true);
  env.machine.send(AppEvent.TOGGLE_SOUND);
  assert.equal(env.machine.context.soundEnabled, false);
  assert.equal(setup({ storage }).machine.context.soundEnabled, false);
});
