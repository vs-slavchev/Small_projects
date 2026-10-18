import { createMachine } from './stateMachine.js';
import { Gender } from '../domain/gender.js';

/** États de l'application. */
export const AppState = Object.freeze({
  HOME: 'home',                 // accueil, en attente
  COUNTDOWN: 'countdown',       // accueil après une partie : la suivante démarre dans 5 s
  QUESTION: 'question',         // un mot attend la réponse du joueur
  REVEALING: 'revealing',       // réponse donnée, retour visuel bref avant l'explication
  FEEDBACK: 'feedback',         // règle, exception et anecdote
  RESULTS: 'results',           // bilan de fin de partie
  PROGRESS: 'progress',         // chronologie
  ACHIEVEMENTS: 'achievements', // badges
});

export const AppEvent = Object.freeze({
  START: 'START',
  NAVIGATE: 'NAVIGATE',         // { to: Destination }
  TICK: 'TICK',
  CANCEL: 'CANCEL',
  ANSWER: 'ANSWER',             // { gender: Gender }
  REVEALED: 'REVEALED',
  CONTINUE: 'CONTINUE',
  QUIT: 'QUIT',
  SELECT_BADGE: 'SELECT_BADGE', // { index: number }
  PREVIEW_BADGE: 'PREVIEW_BADGE', // { index: number } — survol à la souris, même effet que SELECT_BADGE
  CLOSE_BADGE: 'CLOSE_BADGE',
  TOGGLE_SOUND: 'TOGGLE_SOUND',
});

/** Destinations de la barre d'onglets. */
export const Destination = Object.freeze({ HOME: 'home', PROGRESS: 'progress', ACHIEVEMENTS: 'achievements' });

export const COUNTDOWN_SECONDS = 5;
export const REVEAL_DELAY_MS = Object.freeze({ correct: 420, wrong: 520 });

/**
 * Automate de l'application : il décide de l'enchaînement des écrans et délègue
 * chaque opération métier à un cas d'utilisation.
 *
 * @param {ReturnType<typeof import('./useCases.js').createUseCases>} useCases
 * @param {{ scheduler?: object }} [options]
 */
export function createAppMachine(useCases, options = {}) {
  const { HOME, COUNTDOWN, QUESTION, REVEALING, FEEDBACK, RESULTS, PROGRESS, ACHIEVEMENTS } = AppState;

  const context = {
    /** @type {import('../domain/gameSession.js').GameSession | null} */
    session: null,
    /** @type {import('../domain/gameSummary.js').GameSummary | null} */
    summary: null,
    home: null,
    progress: null,
    achievements: null,
    selectedBadge: null,
    countdown: 0,
    /** Vrai entre la fin d'une partie et le retour à l'accueil : déclenche le compte à rebours. */
    returningFromGame: false,
    soundEnabled: useCases.isSoundEnabled(),
  };

  // --- Actions ---
  const loadHome = ctx => { ctx.home = useCases.getHomeOverview(); };
  const beginGame = ctx => {
    ctx.session = useCases.startGame();
    ctx.summary = null;
    ctx.returningFromGame = false;
  };
  // Abandon : la partie est simplement oubliée. Rien n'est enregistré, ni statistiques ni difficulté.
  const leaveGame = ctx => { ctx.session = null; };
  const finishGame = ctx => {
    ctx.summary = useCases.finishGame(ctx.session);
    ctx.session = null;
    ctx.returningFromGame = true;
  };

  // --- Transitions partagées ---
  const start = { target: QUESTION, actions: [beginGame] };
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
            guard: (_, e) => e.gender instanceof Gender,
            actions: [(ctx, e) => { useCases.submitAnswer(ctx.session, e.gender); }],
          },
          [AppEvent.QUIT]: quit,
        },
      },
      [REVEALING]: {
        after: { delay: ctx => (ctx.session.lastAnswer.correct ? REVEAL_DELAY_MS.correct : REVEAL_DELAY_MS.wrong), event: AppEvent.REVEALED },
        on: { [AppEvent.REVEALED]: FEEDBACK, [AppEvent.QUIT]: quit },
      },
      [FEEDBACK]: {
        on: {
          [AppEvent.CONTINUE]: [
            { target: RESULTS, guard: ctx => ctx.session.isComplete, actions: [finishGame] },
            { target: QUESTION, actions: [ctx => { useCases.nextWord(ctx.session); }] },
          ],
          [AppEvent.QUIT]: quit,
        },
      },
      [RESULTS]: {
        on: { [AppEvent.START]: start, [AppEvent.NAVIGATE]: navigate },
      },
      [PROGRESS]: {
        entry: [ctx => { ctx.progress = useCases.getProgress(); }],
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
