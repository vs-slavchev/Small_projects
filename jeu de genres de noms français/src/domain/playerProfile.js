import { Difficulty } from './difficulty.js';
import { GameRecord } from './gameRecord.js';
import { WordStat, WordStatsBook } from './wordStats.js';
import { ActivityCalendar } from './calendar.js';

/**
 * Tout ce que le jeu sait du joueur (agrégat) : parties terminées, statistiques par mot,
 * difficulté courante et compteurs utilisés par les succès.
 * Une partie abandonnée ne laisse aucune trace : seul `recordGame` modifie le profil.
 */
export class PlayerProfile {
  #games;
  /** Vue figée de #games, reconstruite seulement quand une partie est ajoutée. */
  #gamesView;
  #calendar;
  #wordStats;
  #difficulty;
  #anecdotesRead;
  #recoveries;

  /**
   * @param {{ games?: GameRecord[], wordStats?: WordStatsBook, difficulty?: Difficulty,
   *           anecdotesRead?: number, recoveries?: number }} props
   */
  constructor({ games = [], wordStats = new WordStatsBook(), difficulty = Difficulty.initial(), anecdotesRead = 0, recoveries = 0 } = {}) {
    this.#games = [...games].sort((a, b) => a.endedAt - b.endedAt);
    this.#gamesView = Object.freeze([...this.#games]);
    this.#calendar = new ActivityCalendar(this.#games.map(g => g.endedAt));
    this.#wordStats = wordStats;
    this.#difficulty = difficulty;
    this.#anecdotesRead = anecdotesRead;
    this.#recoveries = recoveries;
  }

  static empty() {
    return new PlayerProfile();
  }

  /** Parties terminées, de la plus ancienne à la plus récente. */
  get games() { return this.#gamesView; }
  get gameCount() { return this.#games.length; }
  get wordStats() { return this.#wordStats; }
  get difficulty() { return this.#difficulty; }
  /** Anecdotes affichées après une réponse. */
  get anecdotesRead() { return this.#anecdotesRead; }
  /** Mots réussis alors qu'ils avaient été ratés la fois précédente. */
  get recoveries() { return this.#recoveries; }

  get calendar() { return this.#calendar; }

  /**
   * Archive une partie terminée et met à jour les statistiques qui en découlent.
   * @param {GameRecord} record @param {import('./wordBank.js').WordBank} bank
   */
  recordGame(record, bank) {
    for (const a of record.answers) {
      if (a.correct && this.#wordStats.get(a.word).lastCorrect === false) this.#recoveries++;
      if (bank.word(a.word)?.anecdote) this.#anecdotesRead++;
      this.#wordStats.record(a.word, a.correct);
    }
    this.#games.push(record);
    this.#gamesView = Object.freeze([...this.#games]);
    this.#calendar.record(record.endedAt);
    this.#difficulty = Difficulty.of(record.difficultyEnd);
  }

  toSnapshot() {
    return {
      games: this.#games.map(g => g.toSnapshot()),
      wordStats: Object.fromEntries([...this.#wordStats.entries()].map(([text, s]) => [text, { seen: s.seen, correct: s.correct, lastCorrect: s.lastCorrect }])),
      difficulty: this.#difficulty.value,
      anecdotesRead: this.#anecdotesRead,
      recoveries: this.#recoveries,
    };
  }

  static fromSnapshot(snapshot) {
    return new PlayerProfile({
      games: (snapshot.games ?? []).map(GameRecord.fromSnapshot),
      wordStats: new WordStatsBook(Object.entries(snapshot.wordStats ?? {})
        .map(([text, s]) => [text, new WordStat(s.seen, s.correct, s.lastCorrect ?? null)])),
      difficulty: Difficulty.of(snapshot.difficulty ?? Difficulty.MIN),
      anecdotesRead: snapshot.anecdotesRead ?? 0,
      recoveries: snapshot.recoveries ?? 0,
    });
  }
}
