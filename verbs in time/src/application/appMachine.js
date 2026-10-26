(function (Conjugo) {
'use strict';

const { createMachine } = Conjugo;

/** États de l'application. */
const AppState = Object.freeze({
  HOME: 'home',                 // accueil, en attente
  COUNTDOWN: 'countdown',       // accueil après une partie : la suivante démarre dans 5 s
  QUESTION: 'question',         // une question attend la réponse du joueur
  REVEALING: 'revealing',       // réponse donnée, retour visuel bref avant l'explication
  FEEDBACK: 'feedback',         // forme attendue, règle du temps et particularité du verbe
  RESULTS: 'results',           // bilan de fin de partie
  PROGRESS: 'progress',         // chronologie et grille de maîtrise
  ACHIEVEMENTS: 'achievements', // badges
  SETTINGS: 'settings',         // temps et types de verbes à travailler
});

const AppEvent = Object.freeze({
  START: 'START',
  NAVIGATE: 'NAVIGATE',         // { to: Destination }
  TICK: 'TICK',
  CANCEL: 'CANCEL',
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
  TOGGLE_TENSE: 'TOGGLE_TENSE', // { id: string }
  TOGGLE_TYPE: 'TOGGLE_TYPE',   // { id: string }
});

/** Destinations de la barre d'onglets, et des réglages (depuis l'accueil). */
const Destination = Object.freeze({ HOME: 'home', PROGRESS: 'progress', ACHIEVEMENTS: 'achievements', SETTINGS: 'settings' });

const COUNTDOWN_SECONDS = 5;
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
  const { HOME, COUNTDOWN, QUESTION, REVEALING, FEEDBACK, RESULTS, PROGRESS, ACHIEVEMENTS, SETTINGS } = AppState;

  const context = {
    /** @type {import('../domain/gameSession.js').GameSession | null} */
    session: null,
    /** @type {import('../domain/gameSummary.js').GameSummary | null} */
    summary: null,
    home: null,
    progress: null,
    /** Grille de maîtrise, chargée avec la chronologie. */
    mastery: null,
    achievements: null,
    settings: null,
    selectedBadge: null,
    countdown: 0,
    /** Faux pendant les premiers instants de l'explication (FEEDBACK_MIN_MS). */
    feedbackReady: false,
    /** Après une erreur, faux tant que la bonne forme n'a pas été recopiée ; `retypeTried` : une copie a été proposée. */
    retyped: true,
    retypeTried: false,
    /** Vrai entre la fin d'une partie et le retour à l'accueil : déclenche le compte à rebours. */
    returningFromGame: false,
    soundEnabled: useCases.isSoundEnabled(),
  };

  // --- Actions ---
  const loadHome = ctx => { ctx.home = useCases.getHomeOverview(); ctx.settings = useCases.getSettings(); };
  const beginGame = ctx => {
    ctx.session = useCases.startGame();
    ctx.summary = null;
    ctx.returningFromGame = false;
  };
  // Abandon : la partie est simplement oubliée. Rien n'est enregistré.
  const leaveGame = ctx => { ctx.session = null; };
  const finishGame = ctx => {
    ctx.summary = useCases.finishGame(ctx.session);
    ctx.session = null;
    ctx.returningFromGame = true;
  };

  // --- Transitions partagées ---
  const start = { target: QUESTION, actions: [ctx => beginGame(ctx)] };
  const refreshSettings = ctx => { ctx.settings = useCases.getSettings(); };
  const quit = { target: HOME, actions: [leaveGame] };
  const selectBadge = {
    guard: (ctx, e) => Number.isInteger(e.index) && e.index >= 0 && e.index < ctx.achievements.list.length && e.index !== ctx.selectedBadge,
    actions: [(ctx, e) => { ctx.selectedBadge = e.index; }],
  };
  const navigate = [
    { target: COUNTDOWN, guard: (ctx, e) => e.to === Destination.HOME && ctx.returningFromGame },
    { target: HOME, guard: (_, e) => e.to === Destination.HOME },
    { target: PROGRESS, guard: (_, e) => e.to === Destination.PROGRESS },
    { target: ACHIEVEMENTS, guard: (_, e) => e.to === Destination.ACHIEVEMENTS },
    { target: SETTINGS, guard: (_, e) => e.to === Destination.SETTINGS },
  ];

  return createMachine({
    initial: HOME,
    context,
    on: {
      [AppEvent.TOGGLE_SOUND]: { actions: [ctx => { ctx.soundEnabled = useCases.toggleSound(); }] },
    },
    states: {
      [HOME]: {
        entry: [loadHome],
        on: { [AppEvent.START]: start, [AppEvent.NAVIGATE]: navigate },
      },
      [COUNTDOWN]: {
        entry: [loadHome, ctx => { ctx.returningFromGame = false; ctx.countdown = COUNTDOWN_SECONDS; }],
        every: { interval: 1000, event: AppEvent.TICK },
        on: {
          [AppEvent.TICK]: [
            { guard: ctx => ctx.countdown > 1, actions: [ctx => { ctx.countdown--; }] },
            start,
          ],
          [AppEvent.CANCEL]: HOME,
          [AppEvent.START]: start,
          [AppEvent.NAVIGATE]: navigate,
        },
      },
      [QUESTION]: {
        on: {
          [AppEvent.ANSWER]: {
            target: REVEALING,
            guard: (_, e) => typeof e.text === 'string' && e.text.trim() !== '',
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
            { target: RESULTS, guard: ctx => ctx.feedbackReady && ctx.retyped && ctx.session.isComplete, actions: [finishGame] },
            { target: QUESTION, guard: ctx => ctx.feedbackReady && ctx.retyped, actions: [ctx => { useCases.nextQuestion(ctx.session); }] },
          ],
          [AppEvent.QUIT]: quit,
        },
      },
      [RESULTS]: {
        on: { [AppEvent.START]: start, [AppEvent.NAVIGATE]: navigate },
      },
      [PROGRESS]: {
        entry: [ctx => { ctx.progress = useCases.getProgress(); ctx.mastery = useCases.getMastery(); }],
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
      [SETTINGS]: {
        entry: [refreshSettings],
        on: {
          [AppEvent.TOGGLE_TENSE]: { guard: (_, e) => typeof e.id === 'string', actions: [(ctx, e) => { useCases.toggleTense(e.id); }, refreshSettings] },
          [AppEvent.TOGGLE_TYPE]: { guard: (_, e) => typeof e.id === 'string', actions: [(ctx, e) => { useCases.toggleType(e.id); }, refreshSettings] },
          [AppEvent.START]: start,
          [AppEvent.NAVIGATE]: navigate,
        },
      },
    },
  }, options);
}

Object.assign(Conjugo, { AppState, AppEvent, Destination, COUNTDOWN_SECONDS, REVEAL_DELAY_MS, FEEDBACK_MIN_MS, createAppMachine });
})(globalThis.Conjugo ??= {});
