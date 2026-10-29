(function (Conjugo) {
'use strict';

const {
  GameSession, DEFAULT_GAME_LENGTH, QuestionPicker, PlacementTest, LevelLadder, AnswerStatsBook, GameRecord,
  AchievementFacts, evaluateAchievements, newlyUnlocked, earnedSteps, totalSteps, GameSummary, rateGame, homeOverview, DomainError,
} = Conjugo;

const keyOf = q => GameRecord.comboKey(q.verb.infinitive, q.tense.id, q.person.index);

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
  // Un profil enregistré au-delà du dernier niveau (parcours raccourci) reprend au dernier.
  if (profile.level !== null && profile.level > ladder.count) profile.startAt(ladder.count, new Date(clock.now()));
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
  /** Statistiques telles qu'elles seraient après la partie, sans toucher au profil. */
  const statsAfter = session => {
    const stats = new AnswerStatsBook(profile.practice.entries());
    for (const a of session.answers) stats.record(keyOf(a.question), a.correct);
    return stats;
  };

  return Object.freeze({
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
      placement.answer('');
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

    /** La partie terminée ferait-elle passer le niveau en cours au complet ? @param {GameSession} session */
    completesLevel(session) {
      const level = currentLevel();
      return !level.isComplete(profile.practice) && level.isComplete(statsAfter(session));
    },

    /**
     * Archive la partie, met à jour le profil et retourne le bilan
     * (verdict, succès débloqués, progression dans le niveau, niveau terminé ou non).
     * @param {GameSession} session @returns {GameSummary}
     */
    finishGame(session) {
      const now = today();
      const level = currentLevel();
      const before = level.progress(profile.practice);
      const after = level.progress(statsAfter(session));
      const wasMastered = new Set(level.combos.filter(c => profile.practice.get(c.key).isMastered).map(c => c.key));
      const record = session.finish(clock.now(), { level: level.number, masteredBefore: before.mastered, masteredAfter: after.mastered });
      const missed = session.answers.filter(a => !a.correct).map(({ question, given }) => ({ question, given }));
      const earlierGames = profile.games;
      const achievementsBefore = achievements();
      profile.recordGame(record);
      const seen = new Set();
      const newlyMastered = session.answers.map(a => a.question).filter(q => {
        const key = keyOf(q);
        if (seen.has(key) || wasMastered.has(key) || !profile.practice.get(key).isMastered) return false;
        seen.add(key);
        return true;
      });
      const levelCompleted = before.mastered < before.total && after.mastered === after.total;
      if (levelCompleted) profile.completeLevel(now, ladder.count);
      achievementsCache = null;
      profiles.save(profile);
      const overview = homeOverview(profile, ladder, now);
      return new GameSummary({
        record,
        verdict: rateGame(record, earlierGames),
        unlocked: newlyUnlocked(achievementsBefore, achievements()),
        missed,
        streak: profile.calendar.currentStreak(now),
        level,
        before,
        after,
        newlyMastered: newlyMastered.filter(q => level.combos.some(c => c.key === keyOf(q))),
        levelCompleted,
        nextLevel: profile.level,
        gamesLeft: levelCompleted ? 0 : overview.gamesLeft,
        nextGamePercent: overview.nextGamePercent,
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
