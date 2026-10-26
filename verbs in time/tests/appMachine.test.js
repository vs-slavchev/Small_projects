import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, seededRandom, fakeClock, fakeScheduler, memoryStorage } from './helpers.js';
import { Conjugo } from './game.js';

const {
  createAppMachine, AppState, AppEvent, Destination, COUNTDOWN_SECONDS, REVEAL_DELAY_MS, FEEDBACK_MIN_MS, createUseCases,
  LocalStorageProfileRepository, LocalStoragePreferences, DEFAULT_GAME_LENGTH, ACHIEVEMENTS, stripAccents,
} = Conjugo;

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

/**
 * Répond à une question (juste ou faux), laisse passer le retour visuel et attend l'explication ;
 * après une erreur, recopie la bonne forme pour pouvoir continuer.
 */
function answerQuestion({ machine, clock, scheduler }, correct) {
  const question = machine.context.session.currentQuestion;
  clock.advance(2000);
  machine.send(AppEvent.ANSWER, { text: correct ? question.expected.forms[0] : 'xyz' });
  assert.equal(machine.state, AppState.REVEALING);
  scheduler.advance(correct ? REVEAL_DELAY_MS.correct : REVEAL_DELAY_MS.wrong);
  assert.equal(machine.state, AppState.FEEDBACK);
  scheduler.advance(FEEDBACK_MIN_MS);
  if (!correct) machine.send(AppEvent.RETYPE, { text: question.expected.forms[0] });
}

function playGame(env, pattern = Array(DEFAULT_GAME_LENGTH).fill(true)) {
  env.machine.send(AppEvent.START);
  pattern.forEach((correct, i) => {
    answerQuestion(env, correct);
    env.machine.send(AppEvent.CONTINUE);
    assert.equal(env.machine.state, i === pattern.length - 1 ? AppState.RESULTS : AppState.QUESTION);
  });
}

test('déroulé complet d’une partie jusqu’au bilan', () => {
  const env = setup();
  assert.equal(env.machine.state, AppState.HOME);
  playGame(env, [true, true, false, true, false]);
  const { summary } = env.machine.context;
  assert.equal(summary.record.accuracy, 60);
  assert.equal(summary.record.durationMs, 10_000, '5 × 2 s de réflexion');
  assert.equal(summary.missed.length, 2);
  assert.equal(summary.missed[0].given, 'xyz');
  assert.equal(summary.streak, 1);
  assert.equal(env.profiles.load().gameCount, 1, 'partie archivée');
});

test('un double appui sur une réponse est ignoré', () => {
  const env = setup();
  env.machine.send(AppEvent.START);
  const question = env.machine.context.session.currentQuestion;
  env.machine.send(AppEvent.ANSWER, { text: question.expected.forms[0] });
  env.machine.send(AppEvent.ANSWER, { text: 'xyz' });
  assert.equal(env.machine.context.session.answers.length, 1);
  assert.ok(env.machine.context.session.lastAnswer.correct);
});

test('l’explication ne se quitte pas dans la foulée de la réponse', () => {
  const env = setup();
  env.machine.send(AppEvent.START);
  env.machine.send(AppEvent.ANSWER, { text: env.machine.context.session.currentQuestion.expected.forms[0] });
  env.scheduler.advance(REVEAL_DELAY_MS.correct);
  env.machine.send(AppEvent.CONTINUE);
  assert.equal(env.machine.state, AppState.FEEDBACK, 'second appui sur Entrée ignoré');
  env.scheduler.advance(FEEDBACK_MIN_MS);
  env.machine.send(AppEvent.CONTINUE);
  assert.equal(env.machine.state, AppState.QUESTION);
});

test('la recopie accepte la forme juste sans ses accents', () => {
  const env = setup();
  env.machine.send(AppEvent.START);
  const { expected } = env.machine.context.session.currentQuestion;
  env.machine.send(AppEvent.ANSWER, { text: 'xyz' });
  env.scheduler.advance(REVEAL_DELAY_MS.wrong + FEEDBACK_MIN_MS);
  env.machine.send(AppEvent.RETYPE, { text: stripAccents(expected.forms[0]) });
  assert.equal(env.machine.context.retyped, true);
});

test('après une erreur, il faut recopier la bonne forme pour continuer', () => {
  const env = setup();
  env.machine.send(AppEvent.START);
  const { expected } = env.machine.context.session.currentQuestion;
  env.machine.send(AppEvent.ANSWER, { text: 'xyz' });
  env.scheduler.advance(REVEAL_DELAY_MS.wrong + FEEDBACK_MIN_MS);
  env.machine.send(AppEvent.CONTINUE);
  assert.equal(env.machine.state, AppState.FEEDBACK, 'pas encore recopiée');
  env.machine.send(AppEvent.RETYPE, { text: 'abc' });
  assert.deepEqual([env.machine.context.retyped, env.machine.context.retypeTried], [false, true]);
  env.machine.send(AppEvent.RETYPE, { text: expected.forms[0] });
  assert.equal(env.machine.context.retyped, true);
  env.machine.send(AppEvent.CONTINUE);
  assert.equal(env.machine.state, AppState.QUESTION);
});

test('« Rejouer mes erreurs » repose d’abord les questions ratées', () => {
  const env = setup();
  playGame(env, [false, true, false, true, true]);
  const missed = env.machine.context.summary.missed.map(m => m.question);
  env.machine.send(AppEvent.START_REVIEW);
  assert.equal(env.machine.state, AppState.QUESTION);
  assert.equal(env.machine.context.session.currentQuestion, missed[0]);
  answerQuestion(env, true);
  env.machine.send(AppEvent.CONTINUE);
  assert.equal(env.machine.context.session.currentQuestion, missed[1]);
});

test('« Rejouer mes erreurs » n’est pas proposé après un sans-faute', () => {
  const env = setup();
  playGame(env);
  env.machine.send(AppEvent.START_REVIEW);
  assert.equal(env.machine.state, AppState.RESULTS);
});

test('réglages : les temps choisis sont les seuls demandés, et il en reste toujours un', () => {
  const env = setup();
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.SETTINGS });
  assert.equal(env.machine.state, AppState.SETTINGS);
  for (const { tense } of env.machine.context.settings.tenses) {
    if (tense.id !== 'passeCompose') env.machine.send(AppEvent.TOGGLE_TENSE, { id: tense.id });
  }
  env.machine.send(AppEvent.TOGGLE_TENSE, { id: 'passeCompose' });
  assert.deepEqual(env.machine.context.settings.tenses.filter(t => t.on).map(t => t.tense.id), ['passeCompose'], 'le dernier temps reste coché');
  env.machine.send(AppEvent.TOGGLE_TYPE, { id: 'pronominal' });
  assert.equal(env.machine.context.settings.types.find(t => t.type.id === 'pronominal').on, false);
  env.machine.send(AppEvent.START);
  const asked = [];
  for (let i = 0; i < DEFAULT_GAME_LENGTH; i++) {
    asked.push(env.machine.context.session.currentQuestion);
    answerQuestion(env, true);
    env.machine.send(AppEvent.CONTINUE);
  }
  assert.ok(asked.every(q => q.tense.id === 'passeCompose' && !q.verb.pronominal));
  assert.deepEqual(env.storage.getItem('conjugo.preferences.v1') && JSON.parse(env.storage.getItem('conjugo.preferences.v1')).tenses, ['passeCompose'], 'réglage enregistré');
});

test('la progression montre la grille de maîtrise', () => {
  const env = setup();
  playGame(env, [true, false, true, true, true]);
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.PROGRESS });
  const cells = env.machine.context.mastery.flatMap(g => g.verbs.flatMap(v => v.levels));
  assert.equal(cells.length, 20 * 5);
  assert.equal(cells.filter(l => l !== 'unseen').length, 5);
  assert.equal(cells.filter(l => l === 'weak').length, 1);
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
  answerQuestion(env, true);
  env.machine.send(AppEvent.QUIT);
  assert.equal(env.machine.state, AppState.HOME);
  assert.equal(env.machine.context.session, null);
  assert.equal(env.profiles.load().gameCount, 0);
});

test('une réponse vide est ignorée', () => {
  const env = setup();
  env.machine.send(AppEvent.START);
  env.machine.send(AppEvent.ANSWER, { text: '  ' });
  assert.equal(env.machine.state, AppState.QUESTION);
});

test('la progression se déverrouille à la 3ᵉ partie', () => {
  const env = setup();
  playGame(env);
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.PROGRESS });
  assert.equal(env.machine.context.progress.isUnlocked, false);
  env.machine.send(AppEvent.START);
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < DEFAULT_GAME_LENGTH; i++) { answerQuestion(env, i % 2 === 0); env.machine.send(AppEvent.CONTINUE); }
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
  const visibleSteps = ACHIEVEMENTS.filter(a => !a.hidden).length;
  assert.ok(env.machine.context.achievements.total >= visibleSteps, 'les succès cachés non obtenus ne sont pas listés');
  assert.equal(env.machine.context.achievements.list.length, visibleSteps);
  env.machine.send(AppEvent.SELECT_BADGE, { index: 1 });
  assert.equal(env.machine.context.selectedBadge, 1);
  env.machine.send(AppEvent.SELECT_BADGE, { index: 99 });
  assert.equal(env.machine.context.selectedBadge, 1);
  env.machine.send(AppEvent.CLOSE_BADGE);
  assert.equal(env.machine.context.selectedBadge, null);
});

test('une partie plus longue que le nombre de questions garanties est refusée dès le départ', () => {
  const storage = memoryStorage();
  const bank = realBank();
  assert.throws(() => createUseCases({
    bank, profiles: new LocalStorageProfileRepository({ storage }), preferences: new LocalStoragePreferences({ storage }),
    clock: fakeClock(), gameLength: 9,
  }), /impossible/);
});

test('le réglage du son est global et persistant', () => {
  const storage = memoryStorage();
  const env = setup({ storage });
  assert.equal(env.machine.context.soundEnabled, true);
  env.machine.send(AppEvent.TOGGLE_SOUND);
  assert.equal(env.machine.context.soundEnabled, false);
  assert.equal(setup({ storage }).machine.context.soundEnabled, false);
});
