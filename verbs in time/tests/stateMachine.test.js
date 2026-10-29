import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeScheduler } from './helpers.js';
import { Conjugo } from './game.js';

const { createMachine } = Conjugo;

function traffic(log = [], scheduler = fakeScheduler()) {
  const machine = createMachine({
    initial: 'red',
    context: { count: 0 },
    on: { RESET: 'red' },
    states: {
      red: { entry: [() => log.push('enter red')], exit: [() => log.push('exit red')], on: { GO: 'green' } },
      green: {
        entry: [() => log.push('enter green')],
        after: { delay: 1000, event: 'TIMEOUT' },
        on: {
          TIMEOUT: 'red',
          BUMP: [
            { guard: ctx => ctx.count >= 2, target: 'red' },
            { actions: [ctx => { ctx.count++; }] },
          ],
        },
      },
    },
  }, { scheduler });
  return { machine, log, scheduler };
}

test('entrée, sortie et transitions dans l’ordre', () => {
  const { machine, log } = traffic();
  machine.start();
  machine.send('GO');
  assert.equal(machine.state, 'green');
  assert.deepEqual(log, ['enter red', 'exit red', 'enter green']);
});

test('un événement sans transition est ignoré', () => {
  const { machine } = traffic();
  machine.start();
  const seen = [];
  machine.subscribe(s => seen.push(s.state));
  machine.send('TIMEOUT');
  assert.equal(machine.state, 'red');
  assert.deepEqual(seen, []);
  assert.equal(machine.can('TIMEOUT'), false);
  assert.equal(machine.can('GO'), true);
});

test('gardes : la première transition dont la garde passe l’emporte ; sans cible, transition interne', () => {
  const { machine, log } = traffic();
  machine.start();
  machine.send('GO');
  log.length = 0;
  const changes = [];
  machine.subscribe(s => changes.push(s.changed));
  machine.send('BUMP');
  machine.send('BUMP');
  assert.equal(machine.context.count, 2);
  assert.deepEqual(log, [], 'pas de sortie ni d’entrée sur une transition interne');
  machine.send('BUMP');
  assert.equal(machine.state, 'red');
  assert.deepEqual(changes, [false, false, true]);
});

test('`after` émet son événement après le délai et s’annule en quittant l’état', () => {
  const { machine, scheduler } = traffic();
  machine.start();
  machine.send('GO');
  scheduler.advance(999);
  assert.equal(machine.state, 'green');
  scheduler.advance(1);
  assert.equal(machine.state, 'red');

  machine.send('GO');
  machine.send('RESET'); // transition globale
  assert.equal(scheduler.pending, 0, 'minuterie annulée à la sortie');
});

test('`every` répète son événement tant qu’on reste dans l’état', () => {
  const scheduler = fakeScheduler();
  const machine = createMachine({
    initial: 'running',
    context: { ticks: 0 },
    states: {
      running: { every: { interval: 100, event: 'TICK' }, on: { TICK: [{ guard: c => c.ticks < 2, actions: [c => { c.ticks++; }] }, 'done'] } },
      done: {},
    },
  }, { scheduler });
  machine.start();
  scheduler.advance(250);
  assert.equal(machine.context.ticks, 2);
  scheduler.advance(100);
  assert.equal(machine.state, 'done');
  assert.equal(scheduler.pending, 0);
});

test('un événement envoyé pendant une transition est traité après elle (run-to-completion)', () => {
  const order = [];
  let machine;
  machine = createMachine({
    initial: 'a',
    context: {},
    states: {
      a: { on: { NEXT: { target: 'b', actions: [() => { machine.send('NEXT'); order.push('action a→b'); }] } } },
      b: { entry: [() => order.push('enter b')], on: { NEXT: 'c' } },
      c: { entry: [() => order.push('enter c')] },
    },
  });
  machine.start();
  machine.send('NEXT');
  assert.deepEqual(order, ['action a→b', 'enter b', 'enter c']);
});

test('la définition est validée dès la création', () => {
  assert.throws(() => createMachine({ initial: 'x', context: {}, states: {} }), /initial inconnu/);
  assert.throws(() => createMachine({ initial: 'a', context: {}, states: { a: { on: { GO: 'nowhere' } } } }), /état inconnu/);
});

test('envoyer avant le démarrage est une erreur', () => {
  const { machine } = traffic();
  assert.throws(() => machine.send('GO'), /démarre/);
});

test('always : la destination se choisit après les actions, et seul l’état final est signalé', () => {
  const seen = [];
  const machine = createMachine({
    initial: 'idle',
    context: { score: 0 },
    states: {
      idle: { on: { PLAY: { target: 'check', actions: [(ctx, e) => { ctx.score = e.score; }] } } },
      check: { always: [{ target: 'win', guard: ctx => ctx.score > 5 }, { target: 'retry' }] },
      win: { always: { target: 'party', guard: ctx => ctx.score > 9 } },
      party: {},
      retry: { on: { PLAY: 'idle' } },
    },
  });
  machine.subscribe(s => seen.push(s.state));
  machine.start();
  assert.equal(machine.send('PLAY', { score: 7 }), 'win');
  assert.deepEqual(seen, ['idle', 'win']);
  const other = createMachine({ initial: 'a', context: {}, states: { a: { always: 'b' }, b: {} } });
  assert.equal(other.start(), 'b', 'aussi au démarrage');
  assert.throws(() => createMachine({ initial: 'a', context: {}, states: { a: { always: 'z' } } }), /inconnu/);
});
