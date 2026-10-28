// Sons synthétisés avec Web Audio : timbre doux de xylophone, aucun fichier à charger.

(function (LeOuLa) {
'use strict';

// Gamme pentatonique de do à partir du do5 : la n-ième note, sans limite vers l'aigu.
const PENTATONIC_STEPS = [0, 2, 4, 7, 9];
const note = n => 523.25 * 2 ** ((PENTATONIC_STEPS[n % 5] + 12 * Math.floor(n / 5)) / 12);

class WebAudioSound {
  #context = null;
  enabled;

  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
  }

  tap() { this.#tone(784, 0, 0.12, 0.05); }
  tick() { this.#tone(1046.5, 0, 0.12, 0.06); }

  /** La note monte avec le combo. */
  correct(combo) {
    const i = Math.max(combo - 1, 0);
    this.#tone(note(i), 0, 0.5, 0.15);
    this.#tone(note(i + 2), 0.09, 0.7, 0.14);
  }

  wrong() {
    this.#tone(311.13, 0, 0.45, 0.12);
    this.#tone(233.08, 0.13, 0.7, 0.12);
  }

  /** Arpège d'autant plus long que la partie est réussie. */
  gameOver(accuracy) {
    const notes = accuracy >= 80 ? [0, 2, 4, 5, 7] : accuracy >= 50 ? [0, 2, 4] : [0, 2];
    notes.forEach((n, k) => this.#tone(note(n), k * 0.11, 0.8, 0.13));
  }

  /** Carillon de fête après une partie sans faute. Retourne l'instant (en s) où il se termine. */
  flawless(delay = 0) {
    [10, 12, 14].forEach((n, k) => this.#tone(note(n), delay + k * 0.12, 0.9, 0.11));
    this.#tone(note(15), delay + 0.42, 0.8, 0.12);
    return delay + 0.42 + 0.8;
  }

  badge(delay = 0) {
    [7, 8, 9, 10].forEach((n, k) => this.#tone(note(n), delay + k * 0.07, 0.9, 0.08));
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

Object.assign(LeOuLa, { WebAudioSound });
})(globalThis.LeOuLa ??= {});
