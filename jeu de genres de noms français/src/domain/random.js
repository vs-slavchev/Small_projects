(function (LeOuLa) {
'use strict';

/**
 * Tire un élément d'une liste au hasard, ou null si elle est vide.
 * @template T @param {readonly T[]} list @param {() => number} random dans [0, 1)
 * @returns {T | null}
 */
function pickRandom(list, random) {
  if (!list.length) return null;
  // Le min protège d'un random() qui renverrait 1.
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

Object.assign(LeOuLa, { pickRandom });
})(globalThis.LeOuLa ??= {});
