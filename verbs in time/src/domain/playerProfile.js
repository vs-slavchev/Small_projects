(function (Conjugo) {
'use strict';

const { DomainError, GameRecord, AnswerStat, AnswerStatsBook, ActivityCalendar } = Conjugo;

/** Version des clés de statistiques : 1 = verbe + temps, 2 = verbe + temps + case de personne. */
const PRACTICE_VERSION = 2;
const LevelVia = Object.freeze({ TEST: 'test', PLAY: 'play' });

/**
 * Tout ce que le jeu sait du joueur (agrégat) : parties terminées, statistiques par forme
 * (verbe, temps, case de personne), niveau en cours, niveaux terminés et compteurs utilisés par les succès.
 * Une partie abandonnée ne laisse aucune trace : seul `recordGame` modifie les statistiques.
 * `level` est null tant que le joueur n'a pas choisi son point de départ.
 */
class PlayerProfile {
  #games;
  /** Vue figée de #games, reconstruite seulement quand une partie est ajoutée. */
  #gamesView;
  #calendar;
  #practice;
  #recoveries;
  #level;
  #levelHistory;

  /**
   * @param {{ games?: GameRecord[], practice?: AnswerStatsBook, recoveries?: number, level?: number | null,
   *           levelHistory?: { level: number, completedAt: Date, via: string }[] }} props
   */
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

  /** Parties terminées, de la plus ancienne à la plus récente. */
  get games() { return this.#gamesView; }
  get gameCount() { return this.#games.length; }
  get practice() { return this.#practice; }
  /** Verbes réussis à un temps alors qu'ils avaient été ratés à ce temps la fois précédente. */
  get recoveries() { return this.#recoveries; }

  get calendar() { return this.#calendar; }
  /** Niveau en cours (à partir de 1), ou null avant le premier choix du joueur. */
  get level() { return this.#level; }
  /** Niveaux terminés, du premier au dernier : { level, completedAt, via: 'test' | 'play' }. */
  get levelHistory() { return Object.freeze([...this.#levelHistory]); }

  /**
   * Point de départ : les niveaux précédents sont validés (par le test de placement), sans statistiques.
   * @param {number} level @param {Date} now
   */
  startAt(level, now) {
    if (!Number.isInteger(level) || level < 1) throw new DomainError(`Niveau de départ invalide : ${level}.`);
    const done = new Set(this.#levelHistory.map(h => h.level));
    for (let n = 1; n < level; n++) {
      if (!done.has(n)) this.#levelHistory.push(Object.freeze({ level: n, completedAt: new Date(now), via: LevelVia.TEST }));
    }
    this.#level = level;
  }

  /**
   * Le niveau en cours est terminé : il rejoint l'historique et le suivant commence,
   * sauf après le dernier, où le joueur reste pour réviser.
   * @param {Date} now @param {number} lastLevel
   */
  completeLevel(now, lastLevel) {
    if (this.#level === null) throw new DomainError('Aucun niveau en cours.');
    this.#levelHistory.push(Object.freeze({ level: this.#level, completedAt: new Date(now), via: LevelVia.PLAY }));
    this.#level = Math.min(this.#level + 1, lastLevel);
  }

  /** Archive une partie terminée et met à jour les statistiques qui en découlent. @param {GameRecord} record */
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
      practiceVersion: PRACTICE_VERSION,
      level: this.#level,
      levelHistory: this.#levelHistory.map(h => ({ ...h, completedAt: h.completedAt.toISOString() })),
    };
  }

  /**
   * Reconstruit un profil. Un enregistrement invalide (partie, statistique, niveau terminé)
   * est ignoré et signalé à `onInvalid` : il ne fait pas perdre le reste de l'historique.
   * Les statistiques d'un ancien profil (par verbe et par temps) sont recalculées à partir des parties archivées.
   */
  static fromSnapshot(snapshot, { onInvalid = () => {} } = {}) {
    const valid = (items, build) => items.flatMap(item => {
      try {
        return [build(item)];
      } catch (error) {
        onInvalid(error);
        return [];
      }
    });
    const count = value => (Number.isInteger(value) && value >= 0 ? value : 0);
    const games = valid(Array.isArray(snapshot.games) ? snapshot.games : [], GameRecord.fromSnapshot);
    const practice = snapshot.practiceVersion === PRACTICE_VERSION
      ? new AnswerStatsBook(valid(Object.entries(snapshot.practice ?? {}),
        ([key, s]) => [key, new AnswerStat(s.seen, s.correct, s.lastCorrect ?? null)]))
      : PlayerProfile.#practiceFrom(games);
    const levelHistory = valid(Array.isArray(snapshot.levelHistory) ? snapshot.levelHistory : [], h => {
      const completedAt = new Date(h?.completedAt);
      if (!Number.isInteger(h?.level) || h.level < 1 || Number.isNaN(completedAt.getTime())) throw new DomainError('Niveau terminé invalide.');
      return Object.freeze({ level: h.level, completedAt, via: h.via === LevelVia.TEST ? LevelVia.TEST : LevelVia.PLAY });
    });
    return new PlayerProfile({
      games,
      practice,
      recoveries: count(snapshot.recoveries),
      level: Number.isInteger(snapshot.level) && snapshot.level >= 1 ? snapshot.level : null,
      levelHistory,
    });
  }

  /** Statistiques recalculées en rejouant les réponses archivées, dans l'ordre. @param {GameRecord[]} games */
  static #practiceFrom(games) {
    const practice = new AnswerStatsBook();
    for (const g of [...games].sort((a, b) => a.endedAt - b.endedAt)) {
      for (const a of g.answers) practice.record(GameRecord.practiceKeyOf(a), a.correct);
    }
    return practice;
  }
}

Object.assign(Conjugo, { PRACTICE_VERSION, LevelVia, PlayerProfile });
})(globalThis.Conjugo ??= {});
