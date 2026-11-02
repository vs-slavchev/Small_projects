(function (Conjugo) {
'use strict';

const { createMachine } = Conjugo;

const AppState = Object.freeze({
  ONBOARDING: 'onboarding',
  PLACEMENT: 'placement',
  PLACEMENT_RESULT: 'placementResult',
  HOME: 'home',
  QUESTION: 'question',
  REVEALING: 'revealing',
  FEEDBACK: 'feedback',
  RESULTS: 'results',
  LEVEL_UP: 'levelUp',
  JOURNEY: 'journey',
  ACHIEVEMENTS: 'achievements',
});

const AppEvent = Object.freeze({
  START: 'START',
  NAVIGATE: 'NAVIGATE',
  CHOOSE_BEGINNER: 'CHOOSE_BEGINNER',
  START_PLACEMENT: 'START_PLACEMENT',
  PLACEMENT_ANSWER: 'PLACEMENT_ANSWER',
  PLACEMENT_SKIP: 'PLACEMENT_SKIP',
  ANSWER: 'ANSWER',
  REVEALED: 'REVEALED',
  CONTINUE: 'CONTINUE',
  FEEDBACK_READY: 'FEEDBACK_READY',
  RETYPE: 'RETYPE',
  QUIT: 'QUIT',
  SELECT_BADGE: 'SELECT_BADGE',
  PREVIEW_BADGE: 'PREVIEW_BADGE',
  CLOSE_BADGE: 'CLOSE_BADGE',
  TOGGLE_SOUND: 'TOGGLE_SOUND',
});

const Destination = Object.freeze({ HOME: 'home', JOURNEY: 'journey', ACHIEVEMENTS: 'achievements' });

const REVEAL_DELAY_MS = Object.freeze({ correct: 420, wrong: 520 });
/** L'explication ne peut pas être quittée avant ce délai : la touche Entrée qui a validé la réponse ne doit pas la sauter. */
const FEEDBACK_MIN_MS = 600;

function createAppMachine(useCases, options = {}) {
  const { ONBOARDING, PLACEMENT, PLACEMENT_RESULT, HOME, QUESTION, REVEALING, FEEDBACK, RESULTS, LEVEL_UP, JOURNEY, ACHIEVEMENTS } = AppState;

  const context = {
    session: null,
    summary: null,
    placement: null,
    startLevel: null,
    home: null,
    achievements: null,
    selectedBadge: null,
    feedbackReady: false,
    retyped: true,
    retypeTried: false,
    gameLength: useCases.gameLength,
    soundEnabled: useCases.isSoundEnabled(),
  };

  const loadHome = ctx => { ctx.home = useCases.getHomeOverview(); };
  const beginGame = ctx => {
    ctx.session = useCases.startGame();
    ctx.summary = null;
  };
  const leaveGame = ctx => { ctx.session = null; };
  const finishGame = ctx => {
    ctx.summary = useCases.finishGame(ctx.session);
    ctx.session = null;
  };
  const validText = (_, e) => typeof e.text === 'string' && e.text.trim() !== '';
  const canLeave = ctx => ctx.feedbackReady && ctx.retyped;
  const endPlacement = ctx => {
    ctx.startLevel = useCases.finishPlacement(ctx.placement);
    ctx.placement = null;
  };

  const start = { target: QUESTION, actions: [beginGame] };
  const quit = { target: HOME, actions: [leaveGame] };
  const selectBadge = {
    guard: (ctx, e) => Number.isInteger(e.index) && e.index >= 0 && e.index < ctx.achievements.list.length && e.index !== ctx.selectedBadge,
    actions: [(ctx, e) => { ctx.selectedBadge = e.index; }],
  };
  const navigate = [
    { target: HOME, guard: (_, e) => e.to === Destination.HOME },
    { target: JOURNEY, guard: (_, e) => e.to === Destination.JOURNEY },
    { target: ACHIEVEMENTS, guard: (_, e) => e.to === Destination.ACHIEVEMENTS },
  ];

  return createMachine({
    initial: useCases.needsOnboarding() ? ONBOARDING : HOME,
    context,
    on: {
      [AppEvent.TOGGLE_SOUND]: { actions: [ctx => { ctx.soundEnabled = useCases.toggleSound(); }] },
    },
    states: {
      [ONBOARDING]: {
        on: {
          [AppEvent.CHOOSE_BEGINNER]: { target: HOME, actions: [() => { useCases.chooseBeginner(); }] },
          [AppEvent.START_PLACEMENT]: { target: PLACEMENT, actions: [ctx => { ctx.placement = useCases.startPlacement(); }] },
        },
      },
      // Chaque réponse redessine la question suivante (transition externe vers le même état),
      // ou mène au résultat quand le test est terminé.
      [PLACEMENT]: {
        always: { target: PLACEMENT_RESULT, guard: ctx => ctx.placement.isComplete, actions: [endPlacement] },
        on: {
          [AppEvent.PLACEMENT_ANSWER]: { target: PLACEMENT, guard: validText, actions: [(ctx, e) => { useCases.answerPlacement(ctx.placement, e.text); }] },
          [AppEvent.PLACEMENT_SKIP]: { target: PLACEMENT, actions: [ctx => { useCases.skipPlacement(ctx.placement); }] },
          [AppEvent.QUIT]: { target: ONBOARDING, actions: [ctx => { ctx.placement = null; }] },
        },
      },
      [PLACEMENT_RESULT]: {
        on: { [AppEvent.START]: start },
      },
      [HOME]: {
        entry: [loadHome],
        on: { [AppEvent.START]: start, [AppEvent.NAVIGATE]: navigate },
      },
      [QUESTION]: {
        on: {
          [AppEvent.ANSWER]: {
            target: REVEALING,
            guard: validText,
            actions: [(ctx, e) => { useCases.submitAnswer(ctx.session, e.text); }],
          },
          [AppEvent.QUIT]: quit,
        },
      },
      [REVEALING]: {
        after: { delay: ctx => (ctx.session.lastAnswer.correct ? REVEAL_DELAY_MS.correct : REVEAL_DELAY_MS.wrong), event: AppEvent.REVEALED },
        on: { [AppEvent.REVEALED]: FEEDBACK, [AppEvent.QUIT]: quit },
      },
      [FEEDBACK]: {
        entry: [ctx => {
          ctx.feedbackReady = false;
          ctx.retyped = ctx.session.lastAnswer.correct;
          ctx.retypeTried = false;
        }],
        after: { delay: FEEDBACK_MIN_MS, event: AppEvent.FEEDBACK_READY },
        on: {
          [AppEvent.FEEDBACK_READY]: { actions: [ctx => { ctx.feedbackReady = true; }] },
          [AppEvent.RETYPE]: {
            guard: (ctx, e) => !ctx.retyped && validText(ctx, e),
            actions: [(ctx, e) => {
              ctx.retypeTried = true;
              // Sans touches d'accent à l'écran, un clavier sans accents ne doit pas bloquer la suite.
              const { correct, accentsOnly } = ctx.session.lastAnswer.question.expected.check(e.text);
              ctx.retyped = correct || accentsOnly;
            }],
          },
          [AppEvent.CONTINUE]: [
            { target: RESULTS, guard: ctx => canLeave(ctx) && ctx.session.isComplete, actions: [finishGame] },
            { target: QUESTION, guard: canLeave, actions: [ctx => { useCases.nextQuestion(ctx.session); }] },
          ],
          [AppEvent.QUIT]: quit,
        },
      },
      [RESULTS]: {
        always: { target: LEVEL_UP, guard: ctx => ctx.summary.levelCompleted },
        on: { [AppEvent.START]: start, [AppEvent.NAVIGATE]: navigate },
      },
      [LEVEL_UP]: {
        on: { [AppEvent.START]: start, [AppEvent.NAVIGATE]: navigate },
      },
      [JOURNEY]: {
        entry: [loadHome],
        on: { [AppEvent.START]: start, [AppEvent.NAVIGATE]: navigate },
      },
      [ACHIEVEMENTS]: {
        entry: [ctx => { ctx.achievements = useCases.getAchievements(); ctx.selectedBadge = null; }],
        on: {
          [AppEvent.SELECT_BADGE]: selectBadge,
          [AppEvent.PREVIEW_BADGE]: selectBadge,
          [AppEvent.CLOSE_BADGE]: { guard: ctx => ctx.selectedBadge !== null, actions: [ctx => { ctx.selectedBadge = null; }] },
          [AppEvent.START]: start,
          [AppEvent.NAVIGATE]: navigate,
        },
      },
    },
  }, options);
}

Object.assign(Conjugo, { AppState, AppEvent, Destination, REVEAL_DELAY_MS, FEEDBACK_MIN_MS, createAppMachine });
})(globalThis.Conjugo ??= {});
