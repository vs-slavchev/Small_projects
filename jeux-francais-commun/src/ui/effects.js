(function (JeuxFr) {
'use strict';

const BADGE_SOUND_DELAY_S = 0.9;

/**
 * Abonné de l'automate qui joue les sons et vibrations correspondant aux transitions.
 * Le survol d'un badge (PREVIEW_BADGE) reste silencieux : il ne fait pas partie des appuis.
 * @param {{ sound: import('../infrastructure/webAudioSound.js').WebAudioSound, vibrate?: (ms: number) => void,
 *           AppState: Record<string, string>, AppEvent: Record<string, string>, extraTapEvents?: string[] }} deps
 *   AppState et AppEvent : états et événements de l'automate du jeu ; extraTapEvents : autres appuis propres au jeu
 */
function createEffects({ sound, vibrate = () => {}, AppState, AppEvent, extraTapEvents = [] }) {
  const tapEvents = new Set([
    AppEvent.START, AppEvent.NAVIGATE, AppEvent.CANCEL, AppEvent.CONTINUE,
    AppEvent.SELECT_BADGE, AppEvent.CLOSE_BADGE, AppEvent.TOGGLE_SOUND, ...extraTapEvents,
  ]);
  return ({ state, event, context, changed }) => {
    sound.enabled = context.soundEnabled;

    if (changed && state === AppState.REVEALING) {
      const { session } = context;
      if (session.lastAnswer.correct) sound.correct(session.combo);
      else { sound.wrong(); vibrate(60); }
    } else if (changed && state === AppState.RESULTS) {
      sound.gameOver(context.summary.record.accuracy);
      if (context.summary.unlocked.length) sound.badge(BADGE_SOUND_DELAY_S);
    } else if (!changed && state === AppState.COUNTDOWN && event.type === AppEvent.TICK) {
      sound.tick();
    } else if (tapEvents.has(event.type)) {
      sound.tap();
    }
  };
}

Object.assign(JeuxFr, { createEffects });
})(globalThis.JeuxFr ??= {});
