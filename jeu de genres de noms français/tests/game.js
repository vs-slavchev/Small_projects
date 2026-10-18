// Charge les scripts du jeu dans l'ordre d'index.html (sauf main.js, qui démarre l'interface)
// et expose l'espace de noms LeOuLa qu'ils remplissent.

import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const [, src] of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (src !== 'src/main.js') await import(new URL(`../${src}`, import.meta.url));
}

export const { LeOuLa } = globalThis;
