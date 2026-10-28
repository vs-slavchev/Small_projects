(function (LeOuLa) {
'use strict';

const { AppState, AppEvent } = LeOuLa;

const BADGE_SOUND_DELAY_S = 0.9;
/** Le carillon sans faute suit l'arpège de fin ; le son de badge attend alors qu'il se termine. */
const FLAWLESS_SOUND_DELAY_S = 0.65;
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
      const { record, unlocked } = context.summary;
      sound.gameOver(record.accuracy);
      const chimeEnd = record.isPerfect ? sound.flawless(FLAWLESS_SOUND_DELAY_S) : 0;
      if (unlocked.length) sound.badge(Math.max(BADGE_SOUND_DELAY_S, chimeEnd));
    } else if (!changed && state === AppState.COUNTDOWN && event.type === AppEvent.TICK) {
      sound.tick();
    } else if (TAP_EVENTS.has(event.type)) {
      sound.tap();
    }
  };
}

Object.assign(LeOuLa, { createEffects });
})(globalThis.LeOuLa ??= {});
