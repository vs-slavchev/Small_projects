(function (JeuxFr) {
'use strict';

const { GameRecord, AnswerStat, AnswerStatsBook, ActivityCalendar } = JeuxFr;

/**
 * Tout ce que le jeu sait du joueur (agrégat) : parties terminées, statistiques par verbe et par temps,
 * et compteurs utilisés par les succès.
 * Une partie abandonnée ne laisse aucune trace : seul `recordGame` modifie le profil.
 */
class PlayerProfile {
  #games;
  /** Vue figée de #games, reconstruite seulement quand une partie est ajoutée. */
  #gamesView;
  #calendar;
  #practice;
  #recoveries;

  /** @param {{ games?: GameRecord[], practice?: AnswerStatsBook, recoveries?: number }} props */
  constructor({ games = [], practice = new AnswerStatsBook(), recoveries = 0 } = {}) {
    this.#games = [...games].sort((a, b) => a.endedAt - b.endedAt);
    this.#gamesView = Object.freeze([...this.#games]);
    this.#calendar = new ActivityCalendar(this.#games.map(g => g.endedAt));
    this.#practice = practice;
    this.#recoveries = recoveries;
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
    };
  }

  /**
   * Reconstruit un profil. Un enregistrement invalide (partie, statistique)
   * est ignoré et signalé à `onInvalid` : il ne fait pas perdre le reste de l'historique.
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
    return new PlayerProfile({
      games: valid(Array.isArray(snapshot.games) ? snapshot.games : [], GameRecord.fromSnapshot),
      practice: new AnswerStatsBook(valid(Object.entries(snapshot.practice ?? {}),
        ([key, s]) => [key, new AnswerStat(s.seen, s.correct, s.lastCorrect ?? null)])),
      recoveries: count(snapshot.recoveries),
    });
  }
}

Object.assign(JeuxFr, { PlayerProfile });
})(globalThis.JeuxFr ??= {});
