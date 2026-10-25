import { LeOuLa } from './game.js';

export { seededRandom, sequence, fakeClock, fakeScheduler } from '../../jeux-francais-commun/tests/testKit.js';

const { WORD_DATA, WordBank, MemoryStorage } = LeOuLa;

export const realBank = () => WordBank.fromData(WORD_DATA);

export const memoryStorage = () => new MemoryStorage();
