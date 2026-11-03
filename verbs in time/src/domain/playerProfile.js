(function (Conjugo) {
'use strict';

const { DomainError, GameRecord, AnswerStat, AnswerStatsBook, ActivityCalendar, nonNegativeInt } = Conjugo;

const LevelVia = Object.freeze({ TEST: 'test', PLAY: 'play' });

class PlayerProfile {
  #games;
  #gamesView;
  #calendar;
  #practice;
  #recoveries;
  #level;
  #levelHistory;

  constructor({ games = [], practice = new AnswerStatsBook(), recoveries = 0, level = null, levelHistory = [] } = {}) {
    this.#games = [...games].sort((a, b) => a.endedAt - b.endedAt);
    this.#gamesView = Object.freeze([...this.#games]);
    this.#calendar = new ActivityCalendar(this.#games.map(g => g.endedAt));
    this.#practice = practice;
    this.#recoveries = recoveries;
    this.#level = level;
    this.#levelHistory = [...levelHistory];
  }

  static empty() {
    return new PlayerProfile();
  }

  get games() { return this.#gamesView; }
  get gameCount() { return this.#games.length; }
  get practice() { return this.#practice; }
  get recoveries() { return this.#recoveries; }

  get calendar() { return this.#calendar; }
  get level() { return this.#level; }
  get levelHistory() { return Object.freeze([...this.#levelHistory]); }

  startAt(level, now) {
    if (!Number.isInteger(level) || level < 1) throw new DomainError(`Niveau de départ invalide : ${level}.`);
    const done = new Set(this.#levelHistory.map(h => h.level));
    for (let n = 1; n < level; n++) {
      if (!done.has(n)) this.#levelHistory.push(Object.freeze({ level: n, completedAt: new Date(now), via: LevelVia.TEST }));
    }
    this.#level = level;
  }

  hasCompleted(level) {
    return this.#levelHistory.some(h => h.level === level);
  }

  fitTo(lastLevel) {
    this.#levelHistory = this.#levelHistory.filter(h => h.level <= lastLevel);
    if (this.#level === null) return;
    this.#level = Math.min(this.#level, lastLevel);
    // Un parcours qui s'allonge peut laisser le niveau en cours déjà terminé : on passe au suivant à faire.
    while (this.#level < lastLevel && this.hasCompleted(this.#level)) this.#level++;
  }

  completeLevel(now, lastLevel) {
    if (this.#level === null) throw new DomainError('Aucun niveau en cours.');
    if (this.hasCompleted(this.#level)) return;
    this.#levelHistory.push(Object.freeze({ level: this.#level, completedAt: new Date(now), via: LevelVia.PLAY }));
    this.#level = Math.min(this.#level + 1, lastLevel);
  }

  recordGame(record) {
    for (const a of record.answers) {
      const key = GameRecord.practiceKeyOf(a);
      if (a.correct && this.#practice.get(key).lastCorrect === false) this.#recoveries++;
      this.#practice.record(key, a.correct);
    }
    this.#games.push(record);
    this.#gamesView = Object.freeze([...this.#games]);
    this.#calendar.record(record.endedAt);
  }

  toSnapshot() {
    return {
      games: this.#games.map(g => g.toSnapshot()),
      practice: Object.fromEntries([...this.#practice.entries()].map(([key, s]) => [key, { seen: s.seen, correct: s.correct, lastCorrect: s.lastCorrect }])),
      recoveries: this.#recoveries,
      level: this.#level,
      levelHistory: this.#levelHistory.map(h => ({ ...h, completedAt: h.completedAt.toISOString() })),
    };
  }

  static fromSnapshot(snapshot, { onInvalid = () => {} } = {}) {
    const valid = (items, build) => items.flatMap(item => {
      try {
        return [build(item)];
      } catch (error) {
        onInvalid(error);
        return [];
      }
    });
    const games = valid(Array.isArray(snapshot.games) ? snapshot.games : [], GameRecord.fromSnapshot);
    const practice = new AnswerStatsBook(valid(Object.entries(snapshot.practice ?? {}),
      ([key, s]) => [key, new AnswerStat(s.seen, s.correct, s.lastCorrect ?? null)]));
    const levelHistory = valid(Array.isArray(snapshot.levelHistory) ? snapshot.levelHistory : [], h => {
      const completedAt = new Date(h?.completedAt);
      if (!Number.isInteger(h?.level) || h.level < 1 || Number.isNaN(completedAt.getTime())) throw new DomainError('Niveau terminé invalide.');
      return Object.freeze({ level: h.level, completedAt, via: h.via === LevelVia.TEST ? LevelVia.TEST : LevelVia.PLAY });
    });
    return new PlayerProfile({
      games,
      practice,
      recoveries: nonNegativeInt(snapshot.recoveries, 0),
      level: Number.isInteger(snapshot.level) && snapshot.level >= 1 ? snapshot.level : null,
      levelHistory,
    });
  }
}

Object.assign(Conjugo, { LevelVia, PlayerProfile });
})(globalThis.Conjugo ??= {});
