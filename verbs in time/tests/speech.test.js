import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conjugo } from './game.js';
import { fakeScheduler } from './helpers.js';

const { createSpeaker, START_TIMEOUT_MS, SPEECH_TIMEOUT_MS } = Conjugo;

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
  const scheduler = fakeScheduler();
  const speaker = createSpeaker({ synth, Utterance, ...scheduler });
  const done = speaker.speak('je parle');
  const [u] = synth.spoken;
  assert.equal(u.text, 'je parle');
  assert.equal(u.lang, 'fr-FR');
  assert.equal(u.voice.name, 'Amélie');
  assert.equal(synth.cancelled, 0, 'rien à interrompre : pas de cancel() qui avalerait l’énoncé');
  u.onend();
  await done;
  assert.equal(scheduler.pending, 0, 'le filet de sécurité est annulé à la fin');
});

test('lecture : une nouvelle lecture interrompt la précédente puis démarre', async () => {
  const { synth, Utterance } = fakeSynth();
  const scheduler = fakeScheduler();
  const speaker = createSpeaker({ synth, Utterance, ...scheduler });
  speaker.speak('je parle');
  const second = speaker.speak('tu parles');
  assert.equal(synth.cancelled, 1);
  assert.equal(synth.spoken.length, 1, 'la seconde lecture attend un instant après cancel()');
  scheduler.advance(100);
  assert.equal(synth.spoken.at(-1).text, 'tu parles');
  synth.spoken.at(-1).onerror();
  await second;
});

test('lecture : deux appuis rapprochés après une interruption attendent tous deux avant de parler', async () => {
  const { synth, Utterance } = fakeSynth();
  const scheduler = fakeScheduler();
  const speaker = createSpeaker({ synth, Utterance, ...scheduler });
  const first = speaker.speak('je parle');
  const second = speaker.speak('tu parles');
  scheduler.advance(10);
  // `speaking` est déjà faux après cancel() : la troisième lecture doit quand même attendre.
  const third = speaker.speak('il parle');
  assert.equal(synth.spoken.length, 1, 'aucun speak() juste après cancel()');
  scheduler.advance(100);
  assert.deepEqual(synth.spoken.map(u => u.text), ['je parle', 'il parle']);
  await Promise.all([first, second]);
  synth.spoken.at(-1).onend();
  await third;
  assert.equal(scheduler.pending, 0);
});

test('lecture : un énoncé qui ne démarre jamais est abandonné vite', async () => {
  const { synth, Utterance } = fakeSynth();
  const scheduler = fakeScheduler();
  const speaker = createSpeaker({ synth, Utterance, ...scheduler });
  let settled = false;
  const done = speaker.speak('il parle').then(() => { settled = true; });
  scheduler.advance(START_TIMEOUT_MS);
  await done;
  assert.ok(settled);
});

test('lecture : une fois la voix partie, le filet de sécurité est plus long', async () => {
  const { synth, Utterance } = fakeSynth();
  const scheduler = fakeScheduler();
  const speaker = createSpeaker({ synth, Utterance, ...scheduler });
  let settled = false;
  const done = speaker.speak('il parle').then(() => { settled = true; });
  synth.spoken[0].onstart();
  scheduler.advance(START_TIMEOUT_MS);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false, 'la lecture continue au-delà du délai de démarrage');
  scheduler.advance(SPEECH_TIMEOUT_MS);
  await done;
});

test('lecture : sans synthèse vocale, rien ne se passe', async () => {
  const speaker = createSpeaker({ synth: null, Utterance: null });
  assert.equal(speaker.available, false);
  await speaker.speak('je parle');
});
