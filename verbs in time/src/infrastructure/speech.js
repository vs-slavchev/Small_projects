(function (Conjugo) {
'use strict';

/** Sans `start` dans ce délai, la lecture est tenue pour perdue (Chrome avale parfois un énoncé sans rien signaler). */
const START_TIMEOUT_MS = 2000;
/** Filet de sécurité une fois la voix partie : certains navigateurs n'émettent jamais `end` (ou `error`). */
const SPEECH_TIMEOUT_MS = 6000;
/** Chrome avale parfois un énoncé lancé dans la foulée d'un `cancel()` : on lui laisse un instant. */
const AFTER_CANCEL_MS = 60;

/**
 * Lecture à voix haute par la synthèse vocale du navigateur, en français.
 * Sans synthèse vocale, `available` est faux et `speak` ne fait rien.
 * `speak` renvoie une promesse tenue quand la lecture est finie (ou abandonnée).
 * @param {{ synth?: SpeechSynthesis, Utterance?: typeof SpeechSynthesisUtterance,
 *           setTimeout?: typeof globalThis.setTimeout, clearTimeout?: typeof globalThis.clearTimeout }} [deps]
 */
function createSpeaker({
  synth = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  setTimeout = globalThis.setTimeout,
  clearTimeout = globalThis.clearTimeout,
} = {}) {
  const available = Boolean(synth && Utterance);
  const frenchVoice = () => synth.getVoices().find(v => v.lang?.toLowerCase().startsWith('fr')) ?? null;
  // Les voix arrivent souvent après le chargement : les demander tôt évite une première lecture sans voix française.
  if (available) synth.getVoices();
  // Lecture en cours ou sur le point de démarrer. La référence à l'énoncé compte aussi :
  // sans elle, Chrome peut le ramasser en cours de route et ne jamais signaler sa fin.
  let current = null;

  return Object.freeze({
    available,
    /** @param {string} text @returns {Promise<void>} */
    speak(text) {
      if (!available) return Promise.resolve();
      // Notre propre suivi plutôt que `speaking`/`pending` seuls : ceux-ci sont déjà faux juste après un
      // `cancel()`, alors que Chrome n'accepte pas encore de nouvel énoncé.
      const interrupting = current !== null || synth.speaking || synth.pending;
      current?.finish();
      if (interrupting) synth.cancel();

      return new Promise(resolve => {
        const utterance = new Utterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        const voice = frenchVoice();
        if (voice) utterance.voice = voice;

        let timer = null;
        const lecture = {
          utterance, // jamais lu : garde l'énoncé vivant tant que `current` le référence (voir plus haut)
          finish() {
            clearTimeout(timer);
            if (current === lecture) current = null;
            resolve();
          },
        };
        const watch = ms => { clearTimeout(timer); timer = setTimeout(lecture.finish, ms); };
        utterance.onstart = () => watch(SPEECH_TIMEOUT_MS);
        utterance.onend = lecture.finish;
        utterance.onerror = lecture.finish;
        current = lecture;

        const start = () => {
          synth.resume?.(); // Chrome reste parfois bloqué en pause après une longue inactivité
          synth.speak(utterance);
          watch(START_TIMEOUT_MS);
        };
        if (interrupting) timer = setTimeout(start, AFTER_CANCEL_MS);
        else start();
      });
    },
  });
}

Object.assign(Conjugo, { createSpeaker, START_TIMEOUT_MS, SPEECH_TIMEOUT_MS });
})(globalThis.Conjugo ??= {});
