import { Conjugo } from './game.js';

export { seededRandom, sequence, fakeClock, fakeScheduler } from '../../jeux-francais-commun/tests/testKit.js';

const { VerbBank, MemoryStorage } = Conjugo;

export const realBank = () => VerbBank.fromData();

export const memoryStorage = () => new MemoryStorage();
