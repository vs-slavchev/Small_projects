// Succès : chaque succès mesure un fait de l'historique du joueur et le compare
// à un ou trois paliers (Bronze, Argent, Or). Un succès à palier unique est simplement obtenu ou non.

export const TIER_NAMES = Object.freeze(['Bronze', 'Argent', 'Or']);
export const MAX_TIER = TIER_NAMES.length;

const NIGHT_END_HOUR = 5;

/** Faits mesurables tirés du profil, calculés une fois pour tous les succès. */
export class AchievementFacts {
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
    let maxCombo = 0;
    let playedAtNight = false;

    for (const game of profile.games) {
      if (game.isPerfect) perfectGames++;
      maxCombo = Math.max(maxCombo, game.maxCombo);
      if (bestDurationMs === null || game.durationMs < bestDurationMs) bestDurationMs = game.durationMs;
      if (game.endedAt.getHours() < NIGHT_END_HOUR) playedAtNight = true;
      for (const a of game.answers) {
        const word = bank.word(a.word);
        if (!word || !a.correct) continue;
        totalCorrect++;
        bump(correctByGroup, word.group.id);
        if (word.isException) bump(exceptionsByGroup, word.group.id);
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
    });
  }
}

/**
 * Catalogue des succès.
 * `measure` lit la valeur dans les faits ; `thresholds` liste les paliers (ou les calcule) ;
 * `comparison: 'below'` signifie qu'il faut passer sous le palier (temps) ;
 * `goal` décrit un palier atteint, en une ligne.
 */
export const ACHIEVEMENTS = Object.freeze([
  { id: 'builder', emoji: '🧱', name: 'Bâtisseur', description: 'Bonnes réponses dans le groupe -age.',
    measure: f => f.correctByGroup.get('age') ?? 0, thresholds: [10, 30, 100], goal: n => `${n} bonnes réponses en -age` },
  { id: 'baker', emoji: '🥖', name: 'Boulanger', description: 'Bonnes réponses dans le groupe -ette.',
    measure: f => f.correctByGroup.get('ette') ?? 0, thresholds: [10, 30, 100], goal: n => `${n} bonnes réponses en -ette` },
  { id: 'trapper', emoji: '🦴', name: 'Chasseur de pièges', description: 'Exceptions trouvées dans un même groupe.',
    measure: f => Math.max(0, ...f.exceptionsByGroup.values()), thresholds: [3, 10, 25], goal: n => `${n} exceptions trouvées dans un même groupe` },
  { id: 'lightning', emoji: '⚡', name: 'Éclair', description: 'Terminer une partie en moins de 30 s, puis 15 s, puis 8 s.',
    measure: f => f.bestDurationSeconds, thresholds: [30, 15, 8], comparison: 'below', unit: 's', goal: n => `Partie terminée en moins de ${n} s` },
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
].map(Object.freeze));

/** Avancement du joueur sur un succès. */
export class AchievementProgress {
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
export function evaluateAchievements(facts, definitions = ACHIEVEMENTS) {
  return definitions.map(def => {
    const thresholds = typeof def.thresholds === 'function' ? def.thresholds(facts) : def.thresholds;
    return new AchievementProgress(def, def.measure(facts), thresholds);
  });
}

/** Paliers franchis entre deux évaluations. */
export function newlyUnlocked(before, after) {
  const previous = new Map(before.map(p => [p.id, p.reached]));
  return after.filter(p => p.reached > (previous.get(p.id) ?? 0));
}

export const earnedSteps = list => list.reduce((sum, p) => sum + p.reached, 0);
export const totalSteps = list => list.reduce((sum, p) => sum + p.thresholds.length, 0);
