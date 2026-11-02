(function (Conjugo) {
'use strict';

const {
  GameSession, DEFAULT_GAME_LENGTH, QuestionPicker, PlacementTest, binarySearchPlacement, LevelLadder,
  AchievementFacts, evaluateAchievements, newlyUnlocked, earnedSteps, totalSteps, GameSummary, rateGame, homeOverview, LevelVia, DomainError,
} = Conjugo;

function createUseCases({
  bank, profiles, preferences, clock, random = Math.random, gameLength = DEFAULT_GAME_LENGTH,
  ladder = LevelLadder.fromData(bank), placementStrategy = binarySearchPlacement(),
}) {
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
    gameLength,

    needsOnboarding() {
      return profile.level === null;
    },

    chooseBeginner() {
      profile.startAt(1, today());
      profiles.save(profile);
    },

    startPlacement() {
      return new PlacementTest({ ladder, strategy: placementStrategy, random });
    },

    answerPlacement(placement, text) {
      placement.answer(text);
    },

    skipPlacement(placement) {
      placement.skip();
    },

    finishPlacement(placement) {
      profile.startAt(placement.result, today());
      profiles.save(profile);
      return currentLevel();
    },

    getHomeOverview() {
      return homeOverview(profile, ladder, today());
    },

    startGame() {
      const picker = new QuestionPicker({ ladder, level: profile.level, random, stats: profile.practice });
      return GameSession.start({
        length: gameLength,
        drawQuestion: request => picker.pick(request),
        now: clock.now(),
      });
    },

    submitAnswer(session, text) {
      session.answer(text, clock.now());
    },

    nextQuestion(session) {
      session.next(clock.now());
    },

    finishGame(session) {
      const now = today();
      const level = currentLevel();
      const projected = profile.practice.with(session.answers.map(a => [a.question.key, a.correct]));
      const inLevel = new Set(level.combos.map(c => c.key));
      const newlyMastered = session.answers.map(a => a.question)
        .filter(q => inLevel.has(q.key) && !profile.practice.get(q.key).isMastered && projected.get(q.key).isMastered);
      const newlyLost = session.answers.map(a => a.question)
        .filter(q => inLevel.has(q.key) && profile.practice.get(q.key).isMastered && !projected.get(q.key).isMastered);
      const inProgress = level.combos.filter(c => { const s = projected.get(c.key); return s.seen > 0 && !s.isMastered; }).length;
      const before = level.progress(profile.practice);
      const after = level.progress(projected);
      const record = session.finish(clock.now(), {
        level: level.number, masteredBefore: before.mastered, masteredAfter: after.mastered, masteredKeys: newlyMastered.map(q => q.key),
      });
      const missed = session.answers.filter(a => !a.correct).map(({ question, given }) => ({ question, given }));
      const earlierGames = profile.games;
      const achievementsBefore = achievements();
      profile.recordGame(record);
      const levelCompleted = after.mastered === after.total && !profile.hasCompleted(level.number);
      if (levelCompleted) profile.completeLevel(now, ladder.count);
      achievementsCache = null;
      profiles.save(profile);
      return new GameSummary({
        record,
        verdict: rateGame(record, earlierGames),
        unlocked: newlyUnlocked(achievementsBefore, achievements()),
        missed,
        streak: profile.calendar.currentStreak(now),
        level,
        newlyMastered,
        newlyLost,
        inProgress,
        levelCompleted,
        levelsPlayed: profile.levelHistory.filter(h => h.via === LevelVia.PLAY).length,
        nextLevel: profile.level,
      });
    },

    getAchievements() {
      const list = achievements().filter(p => p.isVisible);
      return Object.freeze({ list, earned: earnedSteps(list), total: totalSteps(list) });
    },

    isSoundEnabled() {
      return prefs.soundEnabled;
    },

    toggleSound() {
      savePrefs({ soundEnabled: !prefs.soundEnabled });
      return prefs.soundEnabled;
    },
  });
}

Object.assign(Conjugo, { createUseCases });
})(globalThis.Conjugo ??= {});
