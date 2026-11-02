import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conjugo } from './game.js';

const { createSpeaker } = Conjugo;

function fakeSynth() {
  const synth = {
    spoken: [], cancelled: 0, speaking: false, pending: false,
    getVoices: () => [{ lang: 'fr-FR', name: 'Amélie' }],
    resume() {},
    cancel() { this.cancelled++; this.speaking = false; },
    speak(u) { this.spoken.push(u); this.speaking = true; },
  };
  function Utterance(text) { this.text = text; }
  return { synth, Utterance };
}

test('lecture : voix française, promesse tenue à la fin de l’énoncé', async () => {
  const { synth, Utterance } = fakeSynth();
  const speaker = createSpeaker({ synth, Utterance });
  const done = speaker.speak('je parle');
  const [u] = synth.spoken;
  assert.equal(u.text, 'je parle');
  assert.equal(u.lang, 'fr-FR');
  assert.equal(u.voice.name, 'Amélie');
  assert.equal(synth.cancelled, 0, 'rien à interrompre : pas de cancel() qui avalerait l’énoncé');
  u.onend();
  await done;
});

test('lecture : une nouvelle lecture interrompt la précédente puis démarre', async () => {
  const { synth, Utterance } = fakeSynth();
  const timers = [];
  const speaker = createSpeaker({ synth, Utterance, setTimeout: (fn, ms) => timers.push({ fn, ms }), clearTimeout: () => {} });
  speaker.speak('je parle');
  const second = speaker.speak('tu parles');
  assert.equal(synth.cancelled, 1);
  assert.equal(synth.spoken.length, 1, 'la seconde lecture attend un instant après cancel()');
  timers.filter(t => t.ms < 1000).forEach(t => t.fn());
  assert.equal(synth.spoken.at(-1).text, 'tu parles');
  synth.spoken.at(-1).onerror();
  await second;
});

test('lecture : sans fin signalée, la promesse est tenue par le filet de sécurité', async () => {
  const { synth, Utterance } = fakeSynth();
  let timeout;
  const speaker = createSpeaker({ synth, Utterance, setTimeout: fn => { timeout = fn; }, clearTimeout: () => {} });
  const done = speaker.speak('il parle');
  timeout();
  await done;
});

test('lecture : sans synthèse vocale, rien ne se passe', async () => {
  const speaker = createSpeaker({ synth: null, Utterance: null });
  assert.equal(speaker.available, false);
  await speaker.speak('je parle');
});
