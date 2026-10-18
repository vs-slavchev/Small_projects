import { AppState, AppEvent } from '../application/appMachine.js';

const BADGE_SOUND_DELAY_S = 0.9;
const TAP_EVENTS = new Set([
  AppEvent.START, AppEvent.NAVIGATE, AppEvent.CANCEL, AppEvent.SELECT_BADGE,
  AppEvent.CLOSE_BADGE, AppEvent.TOGGLE_SOUND,
]);

/**
 * Abonné de l'automate qui joue les sons et vibrations correspondant aux transitions.
 * @param {{ sound: import('../infrastructure/webAudioSound.js').WebAudioSound, vibrate?: (ms: number) => void }} deps
 */
export function createEffects({ sound, vibrate = () => {} }) {
  return ({ state, event, context, changed }) => {
    sound.enabled = context.soundEnabled;

    if (event.type === AppEvent.ANSWER && state === AppState.REVEALING) {
      const { answer, combo } = context.outcome;
      if (answer.correct) sound.correct(combo);
      else { sound.wrong(); vibrate(60); }
    } else if (event.type === AppEvent.TICK && state === AppState.COUNTDOWN && !changed) {
      sound.tick();
    } else if (event.type === AppEvent.CONTINUE) {
      if (state === AppState.RESULTS) {
        sound.gameOver(context.summary.record.accuracy);
        if (context.summary.unlocked.length) sound.badge(BADGE_SOUND_DELAY_S);
      } else {
        sound.tap();
      }
    } else if (TAP_EVENTS.has(event.type) && !event.viaHover) {
      sound.tap();
    }
  };
}
