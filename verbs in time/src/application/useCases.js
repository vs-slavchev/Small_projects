(function (Conjugo) {
'use strict';

const {
  GameSession, DEFAULT_GAME_LENGTH, QuestionPicker, PlacementTest, LevelLadder,
  AchievementFacts, evaluateAchievements, newlyUnlocked, earnedSteps, totalSteps, GameSummary, rateGame, homeOverview, levelPace, DomainError,
} = Conjugo;

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
 * @param {{ bank: import('../domain/conjugation.js').VerbBank, profiles: object, preferences: object,
 *           clock: { now(): number }, random?: () => number, gameLength?: number,
 *           ladder?: import('../domain/levels.js').LevelLadder }} deps
 */
function createUseCases({ bank, profiles, preferences, clock, random = Math.random, gameLength = DEFAULT_GAME_LENGTH, ladder = LevelLadder.fromData(bank) }) {
  if (gameLength > QuestionPicker.MIN_CAPACITY) {
    throw new DomainError(`Partie de ${gameLength} tours impossible : ${QuestionPicker.MIN_CAPACITY} questions différentes sont garanties au plus.`);
  }
  const profile = profiles.load();
  profile.fitTo(ladder.count);
  let prefs = preferences.load();
  const savePrefs = changes => {
    prefs = { ...prefs, ...changes };
    preferences.save(prefs);
  };
  const today = () => new Date(clock.now());
  // Évaluation des succès mise en cache : le profil ne change qu'à la fin d'une partie,
  // où le cache est invalidé. L'état « avant » d'une partie est donc déjà calculé.
  let achievementsCache = null;
  const achievements = () => (achievementsCache ??= evaluateAchievements(AchievementFacts.collect(profile, bank)));
  const currentLevel = () => ladder.level(profile.level);

  return Object.freeze({
    /** Nombre de questions d'une partie. */
    gameLength,

    /** Vrai tant que le joueur n'a pas choisi son point de départ (premier lancement, ou ancien profil). */
    needsOnboarding() {
      return profile.level === null;
    },

    /** « Je débute » : premier niveau, sans test. */
    chooseBeginner() {
      profile.startAt(1, today());
      profiles.save(profile);
    },

    /** « Je connais déjà un peu » : un test de placement commence. Rien n'est enregistré avant la fin. */
    startPlacement() {
      return new PlacementTest({ ladder, random });
    },

    /** @param {PlacementTest} placement @param {string} text forme saisie */
    answerPlacement(placement, text) {
      placement.answer(text);
    },

    /** « Je ne sais pas » : compte comme une réponse fausse. @param {PlacementTest} placement */
    skipPlacement(placement) {
      placement.skip();
    },

    /** Le joueur commence au niveau trouvé ; les précédents sont validés. @returns {import('../domain/levels.js').Level} */
    finishPlacement(placement) {
      profile.startAt(placement.result, today());
      profiles.save(profile);
      return currentLevel();
    },

    /** Niveau en cours, gain du jour, rythme, semaine et parcours : pour l'accueil et l'écran Progrès. */
    getHomeOverview() {
      return homeOverview(profile, ladder, today());
    },

    /**
     * Démarre une partie dans le niveau du joueur (voir `QuestionPicker` pour la répartition des questions).
     */
    startGame() {
      const picker = new QuestionPicker({ ladder, level: profile.level, random, stats: profile.practice });
      return GameSession.start({
        length: gameLength,
        drawQuestion: request => picker.pick(request),
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
     * (verdict, succès débloqués, progression dans le niveau, niveau terminé ou non).
     * @param {GameSession} session @returns {GameSummary}
     */
    finishGame(session) {
      const now = today();
      const level = currentLevel();
      // Formes du niveau après la partie : leur statistique, enrichie des réponses de la partie
      // (une forme n'est posée qu'une fois par partie).
      const projected = new Map(level.combos.map(c => [c.key, profile.practice.get(c.key)]));
      const newlyMastered = [];
      for (const { question, correct } of session.answers) {
        const stat = projected.get(question.key);
        if (!stat) continue;
        const next = stat.record(correct);
        projected.set(question.key, next);
        if (!stat.isMastered && next.isMastered) newlyMastered.push(question);
      }
      const before = level.progress(profile.practice);
      const after = { mastered: [...projected.values()].filter(st => st.isMastered).length, total: before.total };
      const record = session.finish(clock.now(), { level: level.number, masteredBefore: before.mastered, masteredAfter: after.mastered });
      const missed = session.answers.filter(a => !a.correct).map(({ question, given }) => ({ question, given }));
      const earlierGames = profile.games;
      const achievementsBefore = achievements();
      profile.recordGame(record);
      const levelCompleted = before.mastered < before.total && after.mastered === after.total;
      if (levelCompleted) profile.completeLevel(now, ladder.count);
      achievementsCache = null;
      profiles.save(profile);
      const pace = levelPace(profile.games, level, after.mastered);
      return new GameSummary({
        record,
        verdict: rateGame(record, earlierGames),
        unlocked: newlyUnlocked(achievementsBefore, achievements()),
        missed,
        streak: profile.calendar.currentStreak(now),
        level,
        before,
        after,
        newlyMastered,
        levelCompleted,
        nextLevel: profile.level,
        gamesLeft: pace.gamesLeft,
        nextGamePercent: pace.nextGamePercent,
      });
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

Object.assign(Conjugo, { createUseCases });
})(globalThis.Conjugo ??= {});
