(function (JeuxFr) {
'use strict';

const {
  GameSession, DEFAULT_GAME_LENGTH, QuestionPicker, AchievementFacts, evaluateAchievements, newlyUnlocked,
  earnedSteps, totalSteps, ProgressReport, GameSummary, rateGame, DomainError, Tense, masteryGrid,
} = JeuxFr;

/**
 * Cas d'utilisation du jeu. Ils orchestrent les objets du domaine et les ports
 * (stockage, horloge, hasard) sans rien savoir de l'interface.
 *
 * Ports attendus :
 * - profiles    : { load(): PlayerProfile, save(profile): void }
 * - preferences : { load(): { soundEnabled: boolean, tenses: string[] | null, types: string[] | null }, save(prefs): void }
 * - clock       : { now(): number }   // millisecondes
 * - random      : () => number        // [0, 1)
 *
 * @param {{ bank: import('../domain/conjugation.js').VerbBank, profiles: object, preferences: object,
 *           clock: { now(): number }, random?: () => number, gameLength?: number }} deps
 */
function createUseCases({ bank, profiles, preferences, clock, random = Math.random, gameLength = DEFAULT_GAME_LENGTH }) {
  if (gameLength > QuestionPicker.MIN_CAPACITY) {
    throw new DomainError(`Partie de ${gameLength} tours impossible : ${QuestionPicker.MIN_CAPACITY} questions différentes sont garanties au plus.`);
  }
  const profile = profiles.load();
  let prefs = preferences.load();
  const savePrefs = changes => {
    prefs = { ...prefs, ...changes };
    preferences.save(prefs);
  };
  /** Identifiants retenus dans un réglage (null : tous), avec `id` ajouté ou retiré ; null si plus rien ne resterait. */
  const toggled = (chosen, all, id) => {
    const current = chosen?.filter(c => all.includes(c)) ?? all;
    const next = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
    if (!next.length || !all.includes(id)) return undefined;
    return next.length === all.length ? null : next;
  };
  const tenseIds = Tense.ALL.map(t => t.id);
  const typeIds = bank.types.map(t => t.id);
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

    /**
     * Démarre une partie : chaque tour tire un verbe, un temps et une personne parmi les réglages du joueur.
     * @param {import('../domain/conjugation.js').Question[]} [review] questions à reposer d'abord (« Rejouer mes erreurs »)
     */
    startGame(review = []) {
      const picker = new QuestionPicker({ bank, random, stats: profile.practice, tenses: prefs.tenses, types: prefs.types });
      const queue = review.slice(0, gameLength);
      return GameSession.start({
        length: gameLength,
        drawQuestion: request => queue.shift() ?? picker.pick(request),
        now: clock.now(),
      });
    },

    /** @param {GameSession} session @param {string} text forme saisie */
    submitAnswer(session, text) {
      session.answer(text, clock.now());
    },

    /** @param {GameSession} session */
    nextQuestion(session) {
      session.next(clock.now());
    },

    /**
     * Archive la partie, met à jour le profil et retourne le bilan
     * (verdict, succès débloqués, conjugaisons à revoir).
     * @param {GameSession} session @returns {GameSummary}
     */
    finishGame(session) {
      const record = session.finish(clock.now());
      const missed = session.answers.filter(a => !a.correct).map(({ question, given }) => ({ question, given }));
      const earlierGames = profile.games;
      const before = achievements();
      profile.recordGame(record);
      achievementsCache = null;
      profiles.save(profile);
      return new GameSummary({
        record,
        verdict: rateGame(record, earlierGames),
        unlocked: newlyUnlocked(before, achievements()),
        missed,
        streak: profile.calendar.currentStreak(today()),
      });
    },

    getProgress() {
      return new ProgressReport(profile.games, today(), bank);
    },

    /** Grille de maîtrise : niveau de chaque verbe à chaque temps. */
    getMastery() {
      return masteryGrid(bank, profile.practice, Tense.ALL);
    },

    /** Temps et types de verbes à travailler, cochés ou non. */
    getSettings() {
      const on = (chosen, id) => !chosen?.length || chosen.includes(id);
      return Object.freeze({
        tenses: Tense.ALL.map(tense => ({ tense, on: on(prefs.tenses, tense.id) })),
        types: bank.types.map(type => ({ type, on: on(prefs.types, type.id) })),
      });
    },

    /** Coche ou décoche un temps ; il en reste toujours au moins un. @returns {boolean} vrai si le réglage a changé */
    toggleTense(id) {
      const tenses = toggled(prefs.tenses, tenseIds, id);
      if (tenses === undefined) return false;
      savePrefs({ tenses });
      return true;
    },

    /** Coche ou décoche un type de verbe ; il en reste toujours au moins un. @returns {boolean} vrai si le réglage a changé */
    toggleType(id) {
      const types = toggled(prefs.types, typeIds, id);
      if (types === undefined) return false;
      savePrefs({ types });
      return true;
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
      savePrefs({ soundEnabled: !prefs.soundEnabled });
      return prefs.soundEnabled;
    },
  });
}

Object.assign(JeuxFr, { createUseCases });
})(globalThis.JeuxFr ??= {});
