(function (LeOuLa) {
'use strict';

/**
 * Lecture à voix haute par la synthèse vocale du navigateur, en français.
 * Sans synthèse vocale (ou sans voix française), `available` est faux et `speak` ne fait rien.
 * @param {{ synth?: SpeechSynthesis, Utterance?: typeof SpeechSynthesisUtterance }} [deps]
 */
function createSpeaker({ synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance } = {}) {
  const available = Boolean(synth && Utterance);
  const frenchVoice = () => synth.getVoices().find(v => v.lang?.toLowerCase().startsWith('fr')) ?? null;
  return Object.freeze({
    available,
    /** @param {string} text */
    speak(text) {
      if (!available) return;
      const utterance = new Utterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      const voice = frenchVoice();
      if (voice) utterance.voice = voice;
      synth.cancel();
      synth.speak(utterance);
    },
  });
}

Object.assign(LeOuLa, { createSpeaker });
})(globalThis.LeOuLa ??= {});
