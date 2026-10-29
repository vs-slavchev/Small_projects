import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realBank, seededRandom, fakeClock, fakeScheduler, memoryStorage } from './helpers.js';
import { Conjugo } from './game.js';

const {
  createAppMachine, AppState, AppEvent, Destination, REVEAL_DELAY_MS, FEEDBACK_MIN_MS, createUseCases,
  LocalStorageProfileRepository, LocalStoragePreferences, DEFAULT_GAME_LENGTH, ACHIEVEMENTS, stripAccents, LevelLadder, HomeState,
} = Conjugo;

/**
 * Jeu prêt à jouer. Par défaut, le joueur a choisi « Je débute » (niveau 1) ;
 * `onboard: false` le laisse sur l'écran de premier lancement.
 */
function setup({ storage = memoryStorage(), seed = 3, onboard = true, ladder } = {}) {
  const clock = fakeClock();
  const scheduler = fakeScheduler();
  const profiles = new LocalStorageProfileRepository({ storage });
  const bank = realBank();
  const useCases = createUseCases({
    bank, profiles, preferences: new LocalStoragePreferences({ storage }), clock, random: seededRandom(seed),
    ...(ladder ? { ladder: LevelLadder.fromData(bank, ladder) } : {}),
  });
  const machine = createAppMachine(useCases, { scheduler });
  machine.start();
  if (onboard && machine.state === AppState.ONBOARDING) machine.send(AppEvent.CHOOSE_BEGINNER);
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
    if (i < pattern.length - 1) assert.equal(env.machine.state, AppState.QUESTION);
  });
  assert.ok([AppState.RESULTS, AppState.LEVEL_UP].includes(env.machine.state));
}

/** Deux petits niveaux d'un seul verbe : six formes chacun. */
const TINY_LADDER = [
  { tense: 'present', verbs: ['finir'], label: 'Verbes en -ir' },
  { tense: 'present', verbs: ['venir'], label: 'Venir' },
];

test('premier lancement : « Je débute » place au niveau 1, une seule fois', () => {
  const storage = memoryStorage();
  const env = setup({ storage, onboard: false });
  assert.equal(env.machine.state, AppState.ONBOARDING);
  env.machine.send(AppEvent.START);
  assert.equal(env.machine.state, AppState.ONBOARDING, 'pas de partie avant le choix du point de départ');
  env.machine.send(AppEvent.CHOOSE_BEGINNER);
  assert.equal(env.machine.state, AppState.HOME);
  assert.equal(env.machine.context.home.level.number, 1);
  assert.equal(env.machine.context.home.state, HomeState.NOT_YET_TODAY);
  assert.equal(setup({ storage, onboard: false }).machine.state, AppState.HOME, 'le choix est enregistré');
});

test('test de placement : chaque réponse passe à la question suivante, puis le niveau de départ s’affiche', () => {
  const env = setup({ onboard: false });
  env.machine.send(AppEvent.START_PLACEMENT);
  assert.equal(env.machine.state, AppState.PLACEMENT);
  const { placement } = env.machine.context;
  env.machine.send(AppEvent.PLACEMENT_ANSWER, { text: '  ' });
  assert.equal(placement.position, 1, 'réponse vide ignorée');
  let guard = 0;
  while (env.machine.state === AppState.PLACEMENT && guard++ < 20) {
    env.machine.send(AppEvent.PLACEMENT_ANSWER, { text: env.machine.context.placement.currentQuestion.expected.forms[0] });
  }
  assert.equal(env.machine.state, AppState.PLACEMENT_RESULT);
  assert.equal(env.machine.context.startLevel.number, 22, 'tout juste : dernier niveau');
  assert.equal(env.profiles.load().level, 22);
  assert.equal(env.profiles.load().levelHistory.length, 21);
  assert.equal(env.profiles.load().practice.get('parler|present|0').seen, 0, 'le test ne compte pas dans les statistiques');
  env.machine.send(AppEvent.START);
  assert.equal(env.machine.state, AppState.QUESTION);
});

test('test de placement : « Je ne sais pas » partout mène au niveau 1 ; quitter n’enregistre rien', () => {
  const env = setup({ onboard: false });
  env.machine.send(AppEvent.START_PLACEMENT);
  env.machine.send(AppEvent.QUIT);
  assert.equal(env.machine.state, AppState.ONBOARDING);
  assert.equal(env.profiles.load().level, null);
  env.machine.send(AppEvent.START_PLACEMENT);
  let guard = 0;
  while (env.machine.state === AppState.PLACEMENT && guard++ < 20) env.machine.send(AppEvent.PLACEMENT_SKIP);
  assert.equal(env.machine.state, AppState.PLACEMENT_RESULT);
  assert.equal(env.machine.context.startLevel.number, 1);
});

test('déroulé complet d’une partie jusqu’au bilan', () => {
  const env = setup();
  assert.equal(env.machine.state, AppState.HOME);
  playGame(env, [true, true, false, true, false]);
  const { summary } = env.machine.context;
  assert.equal(env.machine.state, AppState.RESULTS);
  assert.equal(summary.record.accuracy, 60);
  assert.equal(summary.record.durationMs, 10_000, '5 × 2 s de réflexion');
  assert.equal(summary.missed.length, 2);
  assert.equal(summary.missed[0].given, 'xyz');
  assert.equal(summary.streak, 1);
  assert.equal(summary.level.number, 1);
  assert.equal(summary.newlyMastered.length, 3, 'chaque forme juste du niveau est acquise');
  assert.equal(summary.percentAfter, 25, '3 formes sur 12');
  assert.equal(summary.gainPercent, 25);
  const saved = env.profiles.load();
  assert.equal(saved.gameCount, 1, 'partie archivée');
  assert.deepEqual([saved.games[0].level, saved.games[0].masteredBefore, saved.games[0].masteredAfter], [1, 0, 3]);
});

test('niveau terminé : écran de fête, puis le niveau suivant', () => {
  const env = setup({ ladder: TINY_LADDER });
  let games = 0;
  do { playGame(env); games++; } while (env.machine.state === AppState.RESULTS && games < 10);
  assert.equal(env.machine.state, AppState.LEVEL_UP);
  const { summary } = env.machine.context;
  assert.ok(summary.levelCompleted);
  assert.equal(summary.percentAfter, 100);
  assert.equal(summary.nextLevel, 2);
  assert.equal(env.profiles.load().level, 2);
  env.machine.send(AppEvent.START);
  assert.equal(env.machine.state, AppState.QUESTION);
  assert.equal(env.machine.context.session.currentQuestion.verb.infinitive, 'venir', 'la partie suivante est dans le nouveau niveau');
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

test('après le bilan : « Encore une » relance une partie, « Accueil » montre le gain du jour', () => {
  const env = setup();
  playGame(env);
  env.machine.send(AppEvent.START);
  assert.equal(env.machine.state, AppState.QUESTION, 'pas de compte à rebours');
  env.machine.send(AppEvent.QUIT);
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.HOME });
  const { home } = env.machine.context;
  assert.equal(home.state, HomeState.PLAYED_TODAY);
  assert.equal(home.todayPercent, home.percent);
  assert.ok(home.todayPercent > 0);
});

test('un niveau déjà entièrement acquis se termine à la partie suivante', () => {
  const storage = memoryStorage();
  const profiles = new LocalStorageProfileRepository({ storage });
  const profile = profiles.load();
  profile.startAt(1, new Date(2026, 9, 1));
  for (const slot of [0, 1, 2, 3, 4, 5]) profile.practice.record(`finir|present|${slot}`, true);
  profiles.save(profile);
  const env = setup({ storage, ladder: TINY_LADDER });
  playGame(env);
  assert.equal(env.machine.state, AppState.LEVEL_UP);
  assert.equal(env.profiles.load().level, 2);
});

test('le dernier niveau ne se termine qu’une fois ; ensuite, on révise', () => {
  const env = setup({ ladder: TINY_LADDER });
  let games = 0;
  while (env.profiles.load().levelHistory.length < 2 && games++ < 30) playGame(env);
  assert.deepEqual(env.profiles.load().levelHistory.map(h => h.level), [1, 2]);
  for (let i = 0; i < 3; i++) {
    playGame(env);
    assert.equal(env.machine.state, AppState.RESULTS, 'pas de seconde fête');
  }
  assert.equal(env.profiles.load().levelHistory.length, 2);
  assert.equal(env.machine.context.summary.nextGamePercent, 0, 'rien à gagner : pas de « +1 % »');
});

test('Progrès : le parcours montre le niveau en cours et les niveaux terminés', () => {
  const env = setup({ ladder: TINY_LADDER });
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.JOURNEY });
  assert.equal(env.machine.state, AppState.JOURNEY);
  assert.equal(env.machine.context.home.journey.length, 0);
  do { playGame(env); } while (env.machine.state === AppState.RESULTS);
  env.machine.send(AppEvent.NAVIGATE, { to: Destination.JOURNEY });
  assert.deepEqual(env.machine.context.home.journey.map(h => h.level.number), [1]);
  assert.equal(env.machine.context.home.level.number, 2);
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

test('la longueur de partie configurée arrive jusqu’aux libellés', () => {
  const storage = memoryStorage();
  const bank = realBank();
  const useCases = createUseCases({
    bank, profiles: new LocalStorageProfileRepository({ storage }), preferences: new LocalStoragePreferences({ storage }),
    clock: fakeClock(), gameLength: 4,
  });
  assert.equal(createAppMachine(useCases, { scheduler: fakeScheduler() }).context.gameLength, 4);
});

test('une partie plus longue que le nombre de questions garanties est refusée dès le départ', () => {
  const storage = memoryStorage();
  const bank = realBank();
  assert.throws(() => createUseCases({
    bank, profiles: new LocalStorageProfileRepository({ storage }), preferences: new LocalStoragePreferences({ storage }),
    clock: fakeClock(), gameLength: 7,
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
