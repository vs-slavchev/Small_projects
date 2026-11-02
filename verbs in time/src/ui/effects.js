(function (Conjugo) {
'use strict';

const BADGE_SOUND_DELAY_S = 0.9;

function createEffects({ sound, vibrate = () => {}, AppState, AppEvent, extraTapEvents = [] }) {
  const tapEvents = new Set([
    AppEvent.START, AppEvent.NAVIGATE, AppEvent.CONTINUE,
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
    } else if (changed && state === AppState.LEVEL_UP) {
      sound.gameOver(100);
      if (context.summary.unlocked.length) sound.badge(BADGE_SOUND_DELAY_S);
    } else if (tapEvents.has(event.type)) {
      sound.tap();
    }
  };
}

Object.assign(Conjugo, { createEffects });
})(globalThis.Conjugo ??= {});
