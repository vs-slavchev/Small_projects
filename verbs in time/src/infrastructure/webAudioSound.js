// Sons synthétisés avec Web Audio : timbre doux de xylophone, aucun fichier à charger.

(function (Conjugo) {
'use strict';

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];

class WebAudioSound {
  #context = null;
  enabled;

  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
  }

  tap() { this.#tone(784, 0, 0.12, 0.05); }

  /** La note monte avec le combo. */
  correct(combo) {
    const i = Math.min(Math.max(combo - 1, 0), PENTATONIC.length - 3);
    this.#tone(PENTATONIC[i], 0, 0.5, 0.15);
    this.#tone(PENTATONIC[i + 2], 0.09, 0.7, 0.14);
  }

  wrong() {
    this.#tone(311.13, 0, 0.45, 0.12);
    this.#tone(233.08, 0.13, 0.7, 0.12);
  }

  /** Arpège d'autant plus long que la partie est réussie. */
  gameOver(accuracy) {
    const notes = accuracy >= 80 ? [0, 2, 4, 5, 7] : accuracy >= 50 ? [0, 2, 4] : [0, 2];
    notes.forEach((n, k) => this.#tone(PENTATONIC[n], k * 0.11, 0.8, 0.13));
  }

  badge(delay = 0) {
    [7, 8, 9, 10].forEach((n, k) => this.#tone(PENTATONIC[n], delay + k * 0.07, 0.9, 0.08));
  }

  #audio() {
    if (!this.enabled) return null;
    if (!this.#context) {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return null;
      this.#context = new AudioContext();
    }
    if (this.#context.state === 'suspended') this.#context.resume();
    return this.#context;
  }

  #tone(frequency, when, duration, volume) {
    const ctx = this.#audio();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    this.#partial(ctx, frequency, t, duration, volume);
    this.#partial(ctx, frequency * 3.93, t, duration * 0.22, volume * 0.3); // harmonique « bois » d'une lame
  }

  #partial(ctx, frequency, t, duration, volume) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }
}

Object.assign(Conjugo, { WebAudioSound });
})(globalThis.Conjugo ??= {});
