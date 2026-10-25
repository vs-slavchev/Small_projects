(function (JeuxFr) {
'use strict';

/** Violation d'une règle du domaine (invariant cassé, opération interdite dans l'état courant). */
class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

Object.assign(JeuxFr, { DomainError });
})(globalThis.JeuxFr ??= {});
