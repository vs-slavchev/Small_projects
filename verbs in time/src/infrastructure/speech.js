(function (Conjugo) {
'use strict';

/** Filet de sécurité : certains navigateurs n'émettent jamais `end` (ou `error`) pour un énoncé. */
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
  // Référence gardée : sans elle, Chrome peut ramasser l'énoncé en cours et ne jamais signaler sa fin.
  let current = null;

  return Object.freeze({
    available,
    /** @param {string} text @returns {Promise<void>} */
    speak(text) {
      if (!available) return Promise.resolve();
      return new Promise(resolve => {
        const utterance = new Utterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        const voice = frenchVoice();
        if (voice) utterance.voice = voice;

        let timer = null;
        const done = () => {
          clearTimeout(timer);
          if (current === utterance) current = null;
          resolve();
        };
        utterance.onend = done;
        utterance.onerror = done;
        timer = setTimeout(done, SPEECH_TIMEOUT_MS);
        current = utterance;

        const start = () => {
          if (current !== utterance) return done(); // remplacé entre-temps par une autre lecture
          synth.resume?.(); // Chrome reste parfois bloqué en pause après une longue inactivité
          synth.speak(utterance);
        };
        if (synth.speaking || synth.pending) {
          synth.cancel();
          setTimeout(start, AFTER_CANCEL_MS);
        } else {
          start();
        }
      });
    },
  });
}

Object.assign(Conjugo, { createSpeaker, SPEECH_TIMEOUT_MS });
})(globalThis.Conjugo ??= {});
