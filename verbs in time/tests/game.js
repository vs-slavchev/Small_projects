import { loadGame } from '../../jeux-francais-commun/tests/testKit.js';

export const JeuxFr = await loadGame(new URL('../index.html', import.meta.url));
