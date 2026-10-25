(function (LeOuLa) {
'use strict';

const {
  GameSession, DEFAULT_GAME_LENGTH, WordSelectionPolicy, AchievementFacts, evaluateAchievements, newlyUnlocked,
  earnedSteps, totalSteps, ProgressReport, GameSummary, rateGame,
} = LeOuLa;

/**
 * Cas d'utilisation du jeu. Ils orchestrent les objets du domaine et les ports
 * (stockage, horloge, hasard) sans rien savoir de l'interface.
 *
 * Ports attendus :
 * - profiles    : { load(): PlayerProfile, save(profile): void }
 * - preferences : { load(): { soundEnabled: boolean }, save(prefs): void }
 * - clock       : { now(): number }   // millisecondes
 * - random      : () => number        // [0, 1)
 *
 * @param {{ bank: import('../domain/wordBank.js').WordBank, profiles: object, preferences: object,
 *           clock: { now(): number }, random?: () => number, gameLength?: number }} deps
 */
function createUseCases({ bank, profiles, preferences, clock, random = Math.random, gameLength = DEFAULT_GAME_LENGTH }) {
  const profile = profiles.load();
  let prefs = preferences.load();
  const today = () => new Date(clock.now());
  // Évaluation des succès mise en cache : le profil ne change qu'à la fin d'une partie,
  // où le cache est invalidé. L'état « avant » d'une partie est donc déjà calculé.
  let achievementsCache = null;
  const achievements = () => (achievementsCache ??= evaluateAchievements(AchievementFacts.collect(profile, bank)));

  return Object.freeze({
    /** Série quotidienne et activité de la semaine, pour l'accueil. */
    getHomeOverview() {
      const calendar = profile.calendar;
      const now = today();
      return Object.freeze({
        streak: calendar.currentStreak(now),
        playedToday: calendar.playedOn(now),
        week: calendar.week(now),
      });
    },

    /** Démarre une partie à la difficulté courante du joueur. */
    startGame() {
      const policy = new WordSelectionPolicy({ bank, stats: profile.wordStats, random });
      return GameSession.start({
        length: gameLength,
        difficulty: profile.difficulty,
        drawWord: request => policy.pick(request).word,
        now: clock.now(),
      });
    },

    /** @param {GameSession} session @param {import('../domain/gender.js').Gender} gender */
    submitAnswer(session, gender) {
      session.answer(gender, clock.now());
    },

    /** @param {GameSession} session */
    nextWord(session) {
      session.next(clock.now());
    },

    /**
     * Archive la partie, met à jour le profil et retourne le bilan
     * (verdict, succès débloqués, mots à revoir).
     * @param {GameSession} session @returns {GameSummary}
     */
    finishGame(session) {
      const record = session.finish(clock.now());
      const earlierGames = profile.games;
      const before = achievements();
      profile.recordGame(record, bank);
      achievementsCache = null;
      profiles.save(profile);
      return new GameSummary({
        record,
        verdict: rateGame(record, earlierGames),
        unlocked: newlyUnlocked(before, achievements()),
        missedWords: record.missedWords.map(text => bank.word(text)).filter(Boolean),
        streak: profile.calendar.currentStreak(today()),
      });
    },

    getProgress() {
      return new ProgressReport(profile.games, today());
    },

    getAchievements() {
      const list = achievements().filter(p => p.isVisible);
      return Object.freeze({ list, earned: earnedSteps(list), total: totalSteps(list) });
    },

    isSoundEnabled() {
      return prefs.soundEnabled;
    },

    /** @returns {boolean} nouvel état du son */
    toggleSound() {
      prefs = { ...prefs, soundEnabled: !prefs.soundEnabled };
      preferences.save(prefs);
      return prefs.soundEnabled;
    },
  });
}

Object.assign(LeOuLa, { createUseCases });
})(globalThis.JeuxFr ??= {});
