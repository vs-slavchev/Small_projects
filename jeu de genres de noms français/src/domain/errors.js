/** Violation d'une règle du domaine (invariant cassé, opération interdite dans l'état courant). */
export class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}
