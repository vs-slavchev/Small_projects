import { JeuxFr } from './game.js';

export { seededRandom, sequence, fakeClock, fakeScheduler, memoryStorage } from '../../jeux-francais-commun/tests/testKit.js';

const { WORD_DATA, WordBank } = JeuxFr;

export const realBank = () => WordBank.fromData(WORD_DATA);

