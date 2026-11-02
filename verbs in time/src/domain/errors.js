(function (Conjugo) {
'use strict';

class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

Object.assign(Conjugo, { DomainError });
})(globalThis.Conjugo ??= {});
