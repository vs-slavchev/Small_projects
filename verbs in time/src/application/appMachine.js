(function (Conjugo) {
'use strict';

const { createMachine } = Conjugo;

/** États de l'application. */
const AppState = Object.freeze({
  ONBOARDING: 'onboarding',     // premier lancement : je débute, ou test de placement
  PLACEMENT: 'placement',       // une question du test de placement attend sa réponse
  PLACEMENT_RESULT: 'placementResult', // niveau de départ trouvé
  HOME: 'home',                 // accueil, en attente
  QUESTION: 'question',         // une question attend la réponse du joueur
  REVEALING: 'revealing',       // réponse donnée, retour visuel bref avant l'explication
  FEEDBACK: 'feedback',         // forme attendue, règle du temps et particularité du verbe
  RESULTS: 'results',           // bilan de fin de partie
  LEVEL_UP: 'levelUp',          // la partie a terminé le niveau
  JOURNEY: 'journey',           // niveau en cours et niveaux terminés
  ACHIEVEMENTS: 'achievements', // badges
});

const AppEvent = Object.freeze({
  START: 'START',
  NAVIGATE: 'NAVIGATE',         // { to: Destination }
  CHOOSE_BEGINNER: 'CHOOSE_BEGINNER',
  START_PLACEMENT: 'START_PLACEMENT',
  PLACEMENT_ANSWER: 'PLACEMENT_ANSWER', // { text: string }
  PLACEMENT_SKIP: 'PLACEMENT_SKIP',     // « Je ne sais pas »
  ANSWER: 'ANSWER',             // { text: string }
  REVEALED: 'REVEALED',
  CONTINUE: 'CONTINUE',
  FEEDBACK_READY: 'FEEDBACK_READY', // l'explication est restée assez longtemps à l'écran pour être quittée
  RETYPE: 'RETYPE',             // { text: string } — après une erreur, la bonne forme recopiée
  QUIT: 'QUIT',
  SELECT_BADGE: 'SELECT_BADGE', // { index: number }
  PREVIEW_BADGE: 'PREVIEW_BADGE', // { index: number } — survol à la souris, même effet que SELECT_BADGE
  CLOSE_BADGE: 'CLOSE_BADGE',
  TOGGLE_SOUND: 'TOGGLE_SOUND',
});

/** Destinations de la barre d'onglets. */
const Destination = Object.freeze({ HOME: 'home', JOURNEY: 'journey', ACHIEVEMENTS: 'achievements' });

const REVEAL_DELAY_MS = Object.freeze({ correct: 420, wrong: 520 });
/** L'explication ne peut pas être quittée avant ce délai : la touche Entrée qui a validé la réponse ne doit pas la sauter. */
const FEEDBACK_MIN_MS = 600;

/**
 * Automate de l'application : il décide de l'enchaînement des écrans et délègue
 * chaque opération métier à un cas d'utilisation.
 *
 * @param {ReturnType<typeof import('./useCases.js').createUseCases>} useCases
 * @param {{ scheduler?: object }} [options]
 */
function createAppMachine(useCases, options = {}) {
  const { ONBOARDING, PLACEMENT, PLACEMENT_RESULT, HOME, QUESTION, REVEALING, FEEDBACK, RESULTS, LEVEL_UP, JOURNEY, ACHIEVEMENTS } = AppState;

  const context = {
    /** @type {import('../domain/gameSession.js').GameSession | null} */
    session: null,
    /** @type {import('../domain/gameSummary.js').GameSummary | null} */
    summary: null,
    /** @type {import('../domain/placementTest.js').PlacementTest | null} */
    placement: null,
    /** Niveau de départ trouvé par le test. */
    startLevel: null,
    /** Accueil et écran Progrès (voir `homeOverview`). */
    home: null,
    achievements: null,
    selectedBadge: null,
    /** Faux pendant les premiers instants de l'explication (FEEDBACK_MIN_MS). */
    feedbackReady: false,
    /** Après une erreur, faux tant que la bonne forme n'a pas été recopiée ; `retypeTried` : une copie a été proposée. */
    retyped: true,
    retypeTried: false,
    soundEnabled: useCases.isSoundEnabled(),
  };

  // --- Actions ---
  const loadHome = ctx => { ctx.home = useCases.getHomeOverview(); };
  const beginGame = ctx => {
    ctx.session = useCases.startGame();
    ctx.summary = null;
  };
  // Abandon : la partie est simplement oubliée. Rien n'est enregistré.
  const leaveGame = ctx => { ctx.session = null; };
  const finishGame = ctx => {
    ctx.summary = useCases.finishGame(ctx.session);
    ctx.session = null;
  };
  const validText = (_, e) => typeof e.text === 'string' && e.text.trim() !== '';
  /** La réponse (ou « Je ne sais pas ») clôt-elle le test ? */
  const endsPlacement = (ctx, text) => ctx.placement.endsAfter(text !== null && ctx.placement.isCorrect(text));
  const endPlacement = ctx => {
    ctx.startLevel = useCases.finishPlacement(ctx.placement);
    ctx.placement = null;
  };

  // --- Transitions partagées ---
  const start = { target: QUESTION, actions: [ctx => beginGame(ctx)] };
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
      // Chaque réponse redessine la question suivante (transition externe vers le même état).
      [PLACEMENT]: {
        on: {
          [AppEvent.PLACEMENT_ANSWER]: [
            { target: PLACEMENT_RESULT, guard: (ctx, e) => validText(ctx, e) && endsPlacement(ctx, e.text),
              actions: [(ctx, e) => { useCases.answerPlacement(ctx.placement, e.text); }, endPlacement] },
            { target: PLACEMENT, guard: validText, actions: [(ctx, e) => { useCases.answerPlacement(ctx.placement, e.text); }] },
          ],
          [AppEvent.PLACEMENT_SKIP]: [
            { target: PLACEMENT_RESULT, guard: ctx => endsPlacement(ctx, null),
              actions: [ctx => { useCases.skipPlacement(ctx.placement); }, endPlacement] },
            { target: PLACEMENT, actions: [ctx => { useCases.skipPlacement(ctx.placement); }] },
          ],
          // Abandon du test : rien n'est enregistré, le joueur revient au choix de départ.
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
            guard: (ctx, e) => !ctx.retyped && typeof e.text === 'string' && e.text.trim() !== '',
            actions: [(ctx, e) => {
              ctx.retypeTried = true;
              // Sans touches d'accent à l'écran, un clavier sans accents ne doit pas bloquer la suite.
              const { correct, accentsOnly } = ctx.session.lastAnswer.question.expected.check(e.text);
              ctx.retyped = correct || accentsOnly;
            }],
          },
          [AppEvent.CONTINUE]: [
            { target: LEVEL_UP, guard: ctx => ctx.feedbackReady && ctx.retyped && ctx.session.isComplete && useCases.completesLevel(ctx.session), actions: [finishGame] },
            { target: RESULTS, guard: ctx => ctx.feedbackReady && ctx.retyped && ctx.session.isComplete, actions: [finishGame] },
            { target: QUESTION, guard: ctx => ctx.feedbackReady && ctx.retyped, actions: [ctx => { useCases.nextQuestion(ctx.session); }] },
          ],
          [AppEvent.QUIT]: quit,
        },
      },
      [RESULTS]: {
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
