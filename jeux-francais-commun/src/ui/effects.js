(function (JeuxFr) {
'use strict';

const { AppState, AppEvent } = JeuxFr;

const BADGE_SOUND_DELAY_S = 0.9;
const TAP_EVENTS = new Set([
  AppEvent.START, AppEvent.NAVIGATE, AppEvent.CANCEL, AppEvent.CONTINUE,
  AppEvent.SELECT_BADGE, AppEvent.CLOSE_BADGE, AppEvent.TOGGLE_SOUND,
]);

/**
 * Abonné de l'automate qui joue les sons et vibrations correspondant aux transitions.
 * Le survol d'un badge (PREVIEW_BADGE) reste silencieux : il n'est pas dans TAP_EVENTS.
 * @param {{ sound: import('../infrastructure/webAudioSound.js').WebAudioSound, vibrate?: (ms: number) => void }} deps
 */
function createEffects({ sound, vibrate = () => {} }) {
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
    } else if (TAP_EVENTS.has(event.type)) {
      sound.tap();
    }
  };
}

Object.assign(JeuxFr, { createEffects });
})(globalThis.JeuxFr ??= {});
