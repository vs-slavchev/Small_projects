// Sons synthétisés avec Web Audio : timbre doux de xylophone, aucun fichier à charger.

(function (Conjugo) {
'use strict';

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];

/** Fin de chaque note : fondu linéaire jusqu'au vrai zéro, puis arrêt de l'oscillateur un peu plus tard. */
const RELEASE_S = 0.04;
const STOP_PADDING_S = 0.1;

/** En dessous de ce niveau, la sortie est identique à l'entrée. */
const SOFT_CLIP_KNEE = 0.7;

/** Courbe d'écrêtage : identité jusqu'au genou, puis approche douce de ±1. */
function softClipCurve(size = 1025) {
  const curve = new Float32Array(size);
  const room = 1 - SOFT_CLIP_KNEE;
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= SOFT_CLIP_KNEE ? a : SOFT_CLIP_KNEE + room * Math.tanh((a - SOFT_CLIP_KNEE) / room);
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

class WebAudioSound {
  #context = null;
  #output = null;
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
      // Toutes les notes passent par un écrêteur doux : linéaire (volume inchangé) jusqu'à SOFT_CLIP_KNEE,
      // il arrondit seulement les rares pics de notes qui se chevauchent au lieu de les laisser saturer.
      const clipper = this.#context.createWaveShaper();
      clipper.curve = softClipCurve();
      clipper.oversample = '2x';
      clipper.connect(this.#context.destination);
      this.#output = clipper;
    }
    if (this.#context.state === 'suspended') this.#context.resume();
    return this.#context;
  }

  #tone(frequency, when, duration, volume) {
    const ctx = this.#audio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01 + when; // petite avance : jamais une enveloppe commencée dans le passé
    this.#partial(ctx, frequency, t, duration, volume);
    this.#partial(ctx, frequency * 3.93, t, duration * 0.22, volume * 0.3); // harmonique « bois » d'une lame
  }

  #partial(ctx, frequency, t, duration, volume) {
    // Décroissance exponentielle, puis court fondu linéaire jusqu'à 0 : une rampe exponentielle
    // ne peut pas atteindre 0, et couper un son résiduel s'entend comme un petit craquement.
    const gain = ctx.createGain();
    const g = gain.gain;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(volume, t + 0.006);
    g.exponentialRampToValueAtTime(0.001, t + duration);
    g.linearRampToValueAtTime(0, t + duration + RELEASE_S);
    gain.connect(this.#output);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(t);
    osc.stop(t + duration + RELEASE_S + STOP_PADDING_S);
  }
}

Object.assign(Conjugo, { WebAudioSound });
})(globalThis.Conjugo ??= {});
