// Succès : chaque succès mesure un fait de l'historique du joueur et le compare
// à un ou trois paliers (Bronze, Argent, Or). Un succès à palier unique est simplement obtenu ou non.

(function (LeOuLa) {
'use strict';

const { Gender, GameRecord, WordStatsBook, dayKey } = LeOuLa;

const TIER_NAMES = Object.freeze(['Bronze', 'Argent', 'Or']);
const MAX_TIER = TIER_NAMES.length;

const NIGHT_END_HOUR = 5;
const MORNING_END_HOUR = 8;
/** Équilibriste : réussite à atteindre sur chaque genre, cumulée sur cette taille de série de parties consécutives. */
const BALANCE_ACCURACY = 90;
const BALANCE_WINDOW_GAMES = 10;
/** Précision : une partie compte si sa réussite atteint ce pourcentage. */
const PRECISE_ACCURACY = 90;
/** Sans hâte : une partie compte si chaque anecdote reste au moins ce temps à l'écran. */
const READ_MIN_MS = 5000;
/** Intouchable : difficulté de départ à dépasser. Sans erreur, elle ne fait que monter pendant la partie. */
const EXTREME_DIFFICULTY = 80;
const EXTREME_PERFECT_GAMES = 7;

/** Faits mesurables tirés du profil, calculés une fois pour tous les succès. */
class AchievementFacts {
  /**
   * @param {import('./playerProfile.js').PlayerProfile} profile
   * @param {import('./wordBank.js').WordBank} bank
   */
  static collect(profile, bank) {
    const correctByGroup = new Map();
    const exceptionsByGroup = new Map();
    const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
    let totalCorrect = 0;
    let bestDurationMs = null;
    let perfectGames = 0;
    let extremePerfectGames = 0;
    let maxCombo = 0;
    let playedAtNight = false;
    let playedEarly = false;
    let unhurriedGames = 0;
    const hWordsFound = new Set();
    const gamesByDay = new Map();
    // Équilibriste : bilan { juste, total } par genre de chacune des dernières parties.
    const genders = [Gender.MASCULINE.code, Gender.FEMININE.code];
    const recentTallies = [];
    let balance = 0;
    // Maître du groupe : l'historique est rejoué dans un carnet de statistiques neuf ;
    // un groupe est maîtrisé dès que la dernière réponse à chacun de ses mots est juste.
    const replay = new WordStatsBook();
    const wordsByGroup = new Map();
    for (const w of bank.words) wordsByGroup.set(w.group.id, [...(wordsByGroup.get(w.group.id) ?? []), w]);
    const masteredGroups = new Set();

    for (const game of profile.games) {
      const hour = game.endedAt.getHours();
      if (hour < NIGHT_END_HOUR) playedAtNight = true;
      else if (hour < MORNING_END_HOUR) playedEarly = true;
      bump(gamesByDay, dayKey(game.endedAt));
      if (game.isPerfect) perfectGames++;
      if (game.isPerfect && game.difficultyStart > EXTREME_DIFFICULTY) extremePerfectGames++;
      maxCombo = Math.max(maxCombo, game.maxCombo);
      if (bestDurationMs === null || game.durationMs < bestDurationMs) bestDurationMs = game.durationMs;

      const tally = Object.fromEntries(genders.map(g => [g, { correct: 0, total: 0 }]));
      const touchedGroups = new Set();
      let anecdotes = 0;
      let allAnecdotesRead = true;
      for (const a of game.answers) {
        const word = bank.word(a.word);
        if (!word) continue;
        const t = tally[word.gender.code];
        t.total++;
        if (a.correct) t.correct++;
        if (word.anecdote) {
          anecdotes++;
          if (a.readMs === null || a.readMs < READ_MIN_MS) allAnecdotesRead = false;
        }
        replay.record(word.text, a.correct);
        touchedGroups.add(word.group.id);
        if (!a.correct) continue;
        totalCorrect++;
        bump(correctByGroup, word.group.id);
        if (word.startsWithH) hWordsFound.add(word.text);
        if (word.isException) bump(exceptionsByGroup, word.group.id);
      }
      if (anecdotes && allAnecdotesRead) unhurriedGames++;
      for (const id of touchedGroups) {
        if (wordsByGroup.get(id).every(w => replay.get(w.text).lastCorrect === true)) masteredGroups.add(id);
      }

      recentTallies.push(tally);
      if (recentTallies.length > BALANCE_WINDOW_GAMES) recentTallies.shift();
      if (recentTallies.length === BALANCE_WINDOW_GAMES) {
        const ratios = genders.map(g => {
          const correct = recentTallies.reduce((sum, t) => sum + t[g].correct, 0);
          const total = recentTallies.reduce((sum, t) => sum + t[g].total, 0);
          return total ? Math.floor((correct * 100) / total) : 0;
        });
        balance = Math.max(balance, Math.min(...ratios));
      }
    }

    return Object.freeze({
      correctByGroup, exceptionsByGroup, totalCorrect, perfectGames, maxCombo, playedAtNight,
      bestDurationSeconds: bestDurationMs === null ? null : bestDurationMs / 1000,
      groupsFound: correctByGroup.size,
      groupCount: bank.groups.length,
      longestStreak: profile.calendar.longestStreak(),
      anecdotesRead: profile.anecdotesRead,
      recoveries: profile.recoveries,
      playedEarly, unhurriedGames, extremePerfectGames,
      mostGamesInADay: Math.max(0, ...gamesByDay.values()),
      longestPreciseRun: Math.max(0, ...GameRecord.accuracyRuns(profile.games, PRECISE_ACCURACY)),
      gameCount: profile.gameCount,
      balance,
      groupsMastered: masteredGroups.size,
      hWordsFound: hWordsFound.size,
      hWordCount: bank.words.filter(w => w.startsWithH).length,
    });
  }
}

/**
 * Catalogue des succès.
 * `measure` lit la valeur dans les faits ; `thresholds` liste les paliers (ou les calcule) ;
 * `comparison: 'below'` signifie qu'il faut passer sous le palier (temps) ;
 * `goal` décrit un palier atteint, en une ligne.
 */
const ACHIEVEMENTS = Object.freeze([
  { id: 'builder', emoji: '🧱', name: 'Bâtisseur', description: 'Bonnes réponses dans le groupe -age.',
    measure: f => f.correctByGroup.get('age') ?? 0, thresholds: [10, 30, 100], goal: n => `${n} bonnes réponses en -age` },
  { id: 'baker', emoji: '🥖', name: 'Boulanger', description: 'Bonnes réponses dans le groupe -ette.',
    measure: f => f.correctByGroup.get('ette') ?? 0, thresholds: [10, 30, 100], goal: n => `${n} bonnes réponses en -ette` },
  { id: 'trapper', emoji: '🦴', name: 'Chasseur de pièges', description: 'Exceptions trouvées dans un même groupe.',
    measure: f => Math.max(0, ...f.exceptionsByGroup.values()), thresholds: [3, 10, 25], goal: n => `${n} exceptions trouvées dans un même groupe` },
  { id: 'lightning', emoji: '⚡', name: 'Éclair', description: 'Terminer une partie en moins de 25 s, puis 15 s, puis 8 s.',
    measure: f => f.bestDurationSeconds, thresholds: [25, 15, 8], comparison: 'below', unit: 's', goal: n => `Partie terminée en moins de ${n} s` },
  { id: 'explorer', emoji: '🗺️', name: 'Explorateur', description: 'Deviner au moins un mot de chaque groupe.',
    measure: f => f.groupsFound, thresholds: f => [f.groupCount], goal: () => 'Un mot deviné dans chaque groupe' },
  { id: 'faithful', emoji: '🔥', name: 'Fidèle', description: 'Jouer plusieurs jours d’affilée.',
    measure: f => f.longestStreak, thresholds: [3, 7, 30], goal: n => `${n} jours d'affilée` },
  { id: 'flawless', emoji: '🎯', name: 'Sans faute', description: 'Parties à 100 %.',
    measure: f => f.perfectGames, thresholds: [1, 5, 20], goal: n => (n === 1 ? 'Une partie à 100 %' : `${n} parties à 100 %`) },
  // Une partie compte 10 mots : un combo ne peut pas dépasser 10.
  { id: 'combo', emoji: '🌋', name: 'Combo', description: 'Bonnes réponses d’affilée dans une partie.',
    measure: f => f.maxCombo, thresholds: [3, 6, 10], goal: n => `${n} bonnes réponses d'affilée` },
  { id: 'centurion', emoji: '🏔️', name: 'Centurion', description: 'Bonnes réponses au total.',
    measure: f => f.totalCorrect, thresholds: [100, 500, 2000], goal: n => `${n} bonnes réponses au total` },
  { id: 'nightOwl', emoji: '🌙', name: 'Noctambule', description: 'Finir une partie après minuit (avant 5 h du matin).',
    measure: f => (f.playedAtNight ? 1 : 0), thresholds: [1], goal: () => 'Une partie finie après minuit' },
  { id: 'scholar', emoji: '📚', name: 'Érudit', description: 'Lire des anecdotes.',
    measure: f => f.anecdotesRead, thresholds: [25, 75, 200], goal: n => `${n} anecdotes lues` },
  { id: 'comeback', emoji: '🧭', name: 'Retour', description: 'Réussir un mot raté auparavant.',
    measure: f => f.recoveries, thresholds: [5, 20, 50], goal: n => `${n} mots ratés puis réussis` },
  { id: 'balanced', emoji: '⚖️', name: 'Équilibriste', description: `Atteindre ${BALANCE_ACCURACY} % de réussite à la fois sur les féminins et sur les masculins, sur ${BALANCE_WINDOW_GAMES} parties d’affilée.`,
    measure: f => f.balance, thresholds: [BALANCE_ACCURACY], unit: '%', goal: () => `${BALANCE_ACCURACY} % sur les deux genres` },
  { id: 'unhurried', emoji: '🐢', name: 'Sans hâte', description: 'Prendre le temps de lire chaque anecdote d’une partie (au moins 5 s par explication).',
    measure: f => f.unhurriedGames, thresholds: [1, 10, 30], goal: n => (n === 1 ? 'Une partie sans hâte' : `${n} parties sans hâte`) },
  { id: 'earlyBird', emoji: '🌅', name: 'Lève-tôt', description: 'Finir une partie entre 5 h et 8 h du matin.',
    measure: f => (f.playedEarly ? 1 : 0), thresholds: [1], goal: () => 'Une partie finie avant 8 h' },
  { id: 'regular', emoji: '📅', name: 'Habitué', description: 'Parties jouées au total.',
    measure: f => f.gameCount, thresholds: [10, 50, 200], goal: n => `${n} parties jouées` },
  { id: 'persistent', emoji: '🔁', name: 'Persévérant', description: 'Jouer de nombreuses parties le même jour.',
    measure: f => f.mostGamesInADay, thresholds: [20, 50, 100], goal: n => `${n} parties en une journée` },
  { id: 'groupMaster', emoji: '🎓', name: 'Maître du groupe', description: 'Maîtriser un groupe : la dernière réponse à chacun de ses mots est juste.',
    measure: f => f.groupsMastered, thresholds: f => [1, 5, f.groupCount], goal: n => (n === 1 ? 'Un groupe maîtrisé' : `${n} groupes maîtrisés`) },
  { id: 'silentH', emoji: '🪶', name: 'Le h muet', description: 'Réussir chaque mot en h, qu’il soit muet ou aspiré.',
    measure: f => f.hWordsFound, thresholds: f => [f.hWordCount], goal: () => 'Tous les mots en h réussis' },
  { id: 'precision', emoji: '🏹', name: 'Précision', description: `Enchaîner des parties à ${PRECISE_ACCURACY} % ou plus.`,
    measure: f => f.longestPreciseRun, thresholds: [3, 7, 15], goal: n => `${n} parties d’affilée à ${PRECISE_ACCURACY} % ou plus` },
  { id: 'untouchable', emoji: '💎', name: 'Intouchable', description: `Terminer ${EXTREME_PERFECT_GAMES} parties extrêmement difficiles (difficulté au-dessus de ${EXTREME_DIFFICULTY}) sans une seule erreur.`,
    measure: f => f.extremePerfectGames, thresholds: [EXTREME_PERFECT_GAMES], goal: n => `${n} parties sans faute au-dessus de ${EXTREME_DIFFICULTY}` },
].map(Object.freeze));

/** Avancement du joueur sur un succès. */
class AchievementProgress {
  /** @param {typeof ACHIEVEMENTS[number]} definition @param {number|null} value @param {number[]} thresholds */
  constructor(definition, value, thresholds) {
    this.definition = definition;
    this.value = value;
    this.thresholds = Object.freeze([...thresholds]);
    Object.freeze(this);
  }

  get id() { return this.definition.id; }
  get emoji() { return this.definition.emoji; }
  get name() { return this.definition.name; }
  get description() { return this.definition.description; }
  get isBelowGoal() { return this.definition.comparison === 'below'; }
  get unit() { return this.definition.unit ?? ''; }
  get isSingleStep() { return this.thresholds.length === 1; }

  #meets(threshold) {
    if (this.value === null || this.value === undefined) return false;
    return this.isBelowGoal ? this.value < threshold : this.value >= threshold;
  }

  /** Nombre de paliers atteints. */
  get reached() { return this.thresholds.filter(t => this.#meets(t)).length; }
  /** Palier affiché, de 0 à 3. Un succès à palier unique obtenu s'affiche directement en Or. */
  get tier() { return this.isSingleStep ? (this.reached ? MAX_TIER : 0) : this.reached; }
  get isComplete() { return this.reached === this.thresholds.length; }
  get nextThreshold() { return this.thresholds[this.reached] ?? null; }
  get nextTierName() { return this.isSingleStep || this.isComplete ? null : TIER_NAMES[this.reached]; }
  get tierName() { return this.reached && !this.isSingleStep ? TIER_NAMES[this.reached - 1] : null; }

  /** Avancement vers le prochain palier, entre 0 et 1. */
  get ratio() {
    if (this.isComplete) return 1;
    if (this.value === null || this.value === undefined) return 0;
    const goal = this.nextThreshold;
    return this.isBelowGoal ? Math.min(0.99, goal / this.value) : Math.min(1, this.value / goal);
  }

  /** Description du dernier palier atteint. */
  get reachedGoal() {
    return this.reached ? this.definition.goal(this.thresholds[this.reached - 1]) : null;
  }
}

/** @param {ReturnType<typeof AchievementFacts.collect>} facts */
function evaluateAchievements(facts, definitions = ACHIEVEMENTS) {
  return definitions.map(def => {
    const thresholds = typeof def.thresholds === 'function' ? def.thresholds(facts) : def.thresholds;
    return new AchievementProgress(def, def.measure(facts), thresholds);
  });
}

/** Paliers franchis entre deux évaluations. */
function newlyUnlocked(before, after) {
  const previous = new Map(before.map(p => [p.id, p.reached]));
  return after.filter(p => p.reached > (previous.get(p.id) ?? 0));
}

const earnedSteps = list => list.reduce((sum, p) => sum + p.reached, 0);
const totalSteps = list => list.reduce((sum, p) => sum + p.thresholds.length, 0);

Object.assign(LeOuLa, { TIER_NAMES, MAX_TIER, AchievementFacts, ACHIEVEMENTS, AchievementProgress, evaluateAchievements, newlyUnlocked, earnedSteps, totalSteps });
})(globalThis.LeOuLa ??= {});
