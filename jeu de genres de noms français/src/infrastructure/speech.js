(function (LeOuLa) {
'use strict';

/**
 * Lecture à voix haute par la synthèse vocale du navigateur, en français.
 * Sans synthèse vocale ou sans voix française, `available` est faux et `speak` ne fait rien.
 * Les voix se chargent de façon asynchrone : `onAvailabilityChange` prévient quand la liste change.
 * @param {{ synth?: SpeechSynthesis, Utterance?: typeof SpeechSynthesisUtterance, defer?: (fn: () => void) => void }} [deps]
 */
function createSpeaker({
  synth = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  defer = fn => globalThis.setTimeout(fn, 0),
} = {}) {
  const supported = Boolean(synth && Utterance);
  const frenchVoice = () => (supported && synth.getVoices().find(v => v.lang?.toLowerCase().startsWith('fr'))) || null;
  return Object.freeze({
    get available() { return Boolean(frenchVoice()); },
    /** @param {() => void} callback */
    onAvailabilityChange(callback) {
      synth?.addEventListener?.('voiceschanged', callback);
    },
    /** @param {string} text */
    speak(text) {
      const voice = frenchVoice();
      if (!voice) return;
      const utterance = new Utterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.voice = voice;
      // Chrome perd parfois un `speak` lancé juste après `cancel` : on ne coupe que si nécessaire, puis on attend un tour.
      if (synth.speaking || synth.pending) {
        synth.cancel();
        defer(() => synth.speak(utterance));
      } else {
        synth.speak(utterance);
      }
    },
  });
}

Object.assign(LeOuLa, { createSpeaker });
})(globalThis.LeOuLa ??= {});
