import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LeOuLa } from './game.js';

const { createSpeaker, createEffects, bindController, AppState, AppEvent } = LeOuLa;

/* ---------- Synthèse vocale ---------- */

function fakeSynth(voices = []) {
  const listeners = [];
  return {
    voices, spoken: [], cancelled: 0, speaking: false, pending: false,
    getVoices() { return this.voices; },
    speak(u) { this.spoken.push(u); },
    cancel() { this.cancelled++; },
    addEventListener(type, fn) { if (type === 'voiceschanged') listeners.push(fn); },
    loadVoices(voices) { this.voices = voices; listeners.forEach(fn => fn()); },
  };
}
function Utterance(text) { this.text = text; }
const FRENCH = { lang: 'fr-FR', name: 'Amélie' };

test('sans voix française, le lecteur est indisponible et ne lit rien', () => {
  const synth = fakeSynth([{ lang: 'en-US' }]);
  const speaker = createSpeaker({ synth, Utterance });
  assert.equal(speaker.available, false);
  speaker.speak('la baguette');
  assert.deepEqual(synth.spoken, []);
  assert.equal(createSpeaker({ synth: undefined, Utterance }).available, false);
});

test('les voix chargées plus tard rendent le lecteur disponible', () => {
  const synth = fakeSynth();
  const speaker = createSpeaker({ synth, Utterance });
  let changes = 0;
  speaker.onAvailabilityChange(() => changes++);
  synth.loadVoices([{ lang: 'en-GB' }, FRENCH]);
  assert.equal(changes, 1);
  assert.equal(speaker.available, true);
});

test('lecture en français, avec la voix française', () => {
  const synth = fakeSynth([FRENCH]);
  createSpeaker({ synth, Utterance }).speak('l’école');
  const [u] = synth.spoken;
  assert.equal(u.text, 'l’école');
  assert.equal(u.lang, 'fr-FR');
  assert.equal(u.voice, FRENCH);
  assert.equal(u.rate, 0.9);
  assert.equal(synth.cancelled, 0, 'rien à couper quand rien ne parle');
});

test('une lecture en cours est coupée, la nouvelle part au tour suivant', () => {
  const synth = fakeSynth([FRENCH]);
  const deferred = [];
  const speaker = createSpeaker({ synth, Utterance, defer: fn => deferred.push(fn) });
  synth.speaking = true;
  speaker.speak('le portail');
  assert.equal(synth.cancelled, 1);
  assert.deepEqual(synth.spoken, []);
  deferred.forEach(fn => fn());
  assert.equal(synth.spoken[0].text, 'le portail');
});

/* ---------- Sons de fin de partie ---------- */

function resultsSounds({ isPerfect, unlocked }) {
  const calls = [];
  const sound = {
    enabled: true,
    gameOver: a => calls.push(['gameOver', a]),
    flawless: d => { calls.push(['flawless', d]); return d + 1.22; },
    badge: d => calls.push(['badge', d]),
  };
  const record = { accuracy: isPerfect ? 100 : 90, isPerfect };
  createEffects({ sound })({
    state: AppState.RESULTS, changed: true, event: { type: AppEvent.CONTINUE },
    context: { soundEnabled: true, summary: { record, unlocked } },
  });
  return calls;
}

test('partie sans faute : carillon après l’arpège, puis le badge une fois le carillon fini', () => {
  const calls = resultsSounds({ isPerfect: true, unlocked: [{}] });
  assert.deepEqual(calls.map(c => c[0]), ['gameOver', 'flawless', 'badge']);
  const [, [, chimeAt], [, badgeAt]] = calls;
  assert.ok(badgeAt >= chimeAt + 1.22);
});

test('partie avec erreur : pas de carillon, badge à son délai habituel', () => {
  assert.deepEqual(resultsSounds({ isPerfect: false, unlocked: [{}] }), [['gameOver', 90], ['badge', 0.9]]);
  assert.deepEqual(resultsSounds({ isPerfect: true, unlocked: [] }).map(c => c[0]), ['gameOver', 'flawless']);
});

/* ---------- Contrôleur : bouton « écouter » ---------- */

function controllerHarness() {
  const listeners = {};
  const docListeners = {};
  const sent = [];
  const spoken = [];
  const root = {
    ownerDocument: { addEventListener: (type, fn) => { docListeners[type] = fn; } },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    contains: () => true,
  };
  const machine = { context: {}, send: (type, payload) => sent.push(type), can: type => type === AppEvent.CONTINUE };
  bindController(root, machine, { speak: text => spoken.push(text) });
  const target = attrs => ({ dataset: attrs, closest: sel => (sel === '[data-speak]' && attrs.speak ? target(attrs) : sel === '[data-event]' && attrs.event ? target(attrs) : null) });
  return { listeners, docListeners, sent, spoken, target };
}

test('un clic sur « écouter » lit le mot sans envoyer d’événement', () => {
  const h = controllerHarness();
  h.listeners.click({ target: h.target({ speak: 'la tour' }) });
  assert.deepEqual(h.spoken, ['la tour']);
  assert.deepEqual(h.sent, []);
});

test('Entrée sur « écouter » ne passe pas au mot suivant ; ailleurs, elle continue', () => {
  const h = controllerHarness();
  const key = (key, target) => h.docListeners.keydown({ key, target, preventDefault() {} });
  key('Enter', h.target({ speak: 'la tour' }));
  key(' ', h.target({ speak: 'la tour' }));
  assert.deepEqual(h.sent, []);
  key('Enter', h.target({}));
  assert.deepEqual(h.sent, [AppEvent.CONTINUE]);
});
