import { JeuxFr } from './game.js';

export { seededRandom, sequence, fakeClock, fakeScheduler, memoryStorage } from '../../jeux-francais-commun/tests/testKit.js';

const { VerbBank } = JeuxFr;

export const realBank = () => VerbBank.fromData();

