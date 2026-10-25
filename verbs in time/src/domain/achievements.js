// Succès : chaque succès mesure un fait de l'historique du joueur et le compare
// à un ou trois paliers (Bronze, Argent, Or). Un succès à palier unique est simplement obtenu ou non.
// Un succès caché n'apparaît qu'une fois obtenu.

(function (Conjugo) {
'use strict';

const { Tense, GameRecord, dayKey, HOLIDAYS, holidaysOn } = Conjugo;

const TIER_NAMES = Object.freeze(['Bronze', 'Argent', 'Or']);
const MAX_TIER = TIER_NAMES.length;

const NIGHT_END_HOUR = 5;
const MORNING_END_HOUR = 8;
/** Polyvalent : réussite à atteindre sur chaque temps, cumulée sur cette taille de série de parties consécutives. */
const BALANCE_ACCURACY = 80;
const BALANCE_WINDOW_GAMES = 10;
/** Précision : une partie compte si sa réussite atteint ce pourcentage (4 sur 5). */
const PRECISE_ACCURACY = 80;
/** Types de verbes comptés par « Dompteur » : les verbes à apprendre un par un. */
const IRREGULAR_TYPES = new Set(['third', 'auxiliary']);

/** Faits mesurables tirés du profil, calculés une fois pour tous les succès. */
class AchievementFacts {
  /**
   * @param {import('./playerProfile.js').PlayerProfile} profile
   * @param {import('./conjugation.js').VerbBank} bank
   */
  static collect(profile, bank) {
    const correctByTense = new Map();
    const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
    let totalCorrect = 0;
    let bestDurationMs = null;
    let perfectGames = 0;
    const holidaysPlayed = new Set();
    let maxCombo = 0;
    let playedAtNight = false;
    let playedEarly = false;
    let irregularCorrect = 0;
    let pronominalCorrect = 0;
    let beingVerbsCorrect = 0;
    const typesFound = new Set();
    const verbsFound = new Set();
    const gamesByDay = new Map();
    // Polyvalent : bilan { juste, total } par temps de chacune des dernières parties.
    const recentTallies = [];
    let balance = 0;

    for (const game of profile.games) {
      const hour = game.endedAt.getHours();
      if (hour < NIGHT_END_HOUR) playedAtNight = true;
      else if (hour < MORNING_END_HOUR) playedEarly = true;
      bump(gamesByDay, dayKey(game.endedAt));
      if (game.isPerfect) perfectGames++;
      for (const id of holidaysOn(game.endedAt)) holidaysPlayed.add(id);
      maxCombo = Math.max(maxCombo, game.maxCombo);
      // Éclair : seule une partie réussie compte, sinon taper n'importe quoi suffirait.
      if (game.accuracy >= PRECISE_ACCURACY && (bestDurationMs === null || game.durationMs < bestDurationMs)) bestDurationMs = game.durationMs;

      const tally = Object.fromEntries(Tense.ALL.map(t => [t.id, { correct: 0, total: 0 }]));
      for (const a of game.answers) {
        const verb = bank.verb(a.verb);
        if (tally[a.tense]) {
          tally[a.tense].total++;
          if (a.correct) tally[a.tense].correct++;
        }
        if (!a.correct) continue;
        totalCorrect++;
        bump(correctByTense, a.tense);
        if (!verb) continue;
        verbsFound.add(verb.infinitive);
        typesFound.add(verb.type.id);
        if (IRREGULAR_TYPES.has(verb.type.id)) irregularCorrect++;
        if (verb.pronominal) pronominalCorrect++;
        if (a.tense === Tense.PASSE_COMPOSE.id && verb.auxiliary === 'être') beingVerbsCorrect++;
      }

      recentTallies.push(tally);
      if (recentTallies.length > BALANCE_WINDOW_GAMES) recentTallies.shift();
      if (recentTallies.length === BALANCE_WINDOW_GAMES) {
        const ratios = Tense.ALL.map(t => {
          const correct = recentTallies.reduce((sum, r) => sum + r[t.id].correct, 0);
          const total = recentTallies.reduce((sum, r) => sum + r[t.id].total, 0);
          return total ? Math.floor((correct * 100) / total) : 0;
        });
        balance = Math.max(balance, Math.min(...ratios));
      }
    }

    return Object.freeze({
      totalCorrect, perfectGames, maxCombo, playedAtNight, playedEarly, holidaysPlayed,
      bestDurationSeconds: bestDurationMs === null ? null : bestDurationMs / 1000,
      longestStreak: profile.calendar.longestStreak(),
      recoveries: profile.recoveries,
      mostGamesInADay: Math.max(0, ...gamesByDay.values()),
      longestPreciseRun: Math.max(0, ...GameRecord.accuracyRuns(profile.games, PRECISE_ACCURACY)),
      gameCount: profile.gameCount,
      balance,
      typesFound: typesFound.size,
      typeCount: bank.types.length,
      verbsFound: verbsFound.size,
      verbCount: bank.verbs.length,
      weakestTenseCorrect: Math.min(...Tense.ALL.map(t => correctByTense.get(t.id) ?? 0)),
      irregularCorrect, pronominalCorrect, beingVerbsCorrect,
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
  { id: 'faithful', emoji: '🔥', name: 'Fidèle', description: 'Jouer plusieurs jours d’affilée.',
    measure: f => f.longestStreak, thresholds: [3, 7, 30], goal: n => `${n} jours d'affilée` },
  { id: 'flawless', emoji: '🎯', name: 'Sans faute', description: 'Parties à 100 %.',
    measure: f => f.perfectGames, thresholds: [1, 5, 20], goal: n => (n === 1 ? 'Une partie à 100 %' : `${n} parties à 100 %`) },
  // Une partie compte 5 questions : un combo ne peut pas dépasser 5.
  { id: 'combo', emoji: '🌋', name: 'Combo', description: 'Bonnes réponses d’affilée dans une partie.',
    measure: f => f.maxCombo, thresholds: [3, 4, 5], goal: n => `${n} bonnes réponses d'affilée` },
  { id: 'lightning', emoji: '⚡', name: 'Éclair', description: `Terminer rapidement une partie à ${PRECISE_ACCURACY} % ou plus.`,
    measure: f => f.bestDurationSeconds, thresholds: [90, 60, 35], comparison: 'below', unit: 's', goal: n => `Partie terminée en moins de ${n} s` },
  { id: 'centurion', emoji: '🏔️', name: 'Centurion', description: 'Bonnes réponses au total.',
    measure: f => f.totalCorrect, thresholds: [50, 250, 1000], goal: n => `${n} bonnes réponses au total` },
  { id: 'explorer', emoji: '🗺️', name: 'Explorateur', description: 'Réussir au moins un verbe de chaque groupe.',
    measure: f => f.typesFound, thresholds: f => [f.typeCount], goal: () => 'Un verbe réussi dans chaque groupe' },
  { id: 'collector', emoji: '📚', name: 'Collectionneur', description: 'Réussir des verbes différents.',
    measure: f => f.verbsFound, thresholds: f => [5, 12, f.verbCount], goal: n => `${n} verbes différents réussis` },
  { id: 'timeTraveler', emoji: '⏳', name: 'Voyageur du temps', description: 'Bonnes réponses à chacun des cinq temps.',
    measure: f => f.weakestTenseCorrect, thresholds: [3, 15, 50], goal: n => `${n} bonnes réponses à chaque temps` },
  { id: 'tamer', emoji: '🦁', name: 'Dompteur', description: 'Bonnes réponses sur les verbes irréguliers (3e groupe, être, avoir).',
    measure: f => f.irregularCorrect, thresholds: [10, 40, 150], goal: n => `${n} verbes irréguliers réussis` },
  { id: 'mirror', emoji: '🪞', name: 'Miroir', description: 'Bonnes réponses sur un verbe pronominal.',
    measure: f => f.pronominalCorrect, thresholds: [3, 10, 30], goal: n => `${n} verbes pronominaux réussis` },
  { id: 'agreement', emoji: '🤝', name: 'Accord parfait', description: 'Passés composés réussis avec l’auxiliaire être.',
    measure: f => f.beingVerbsCorrect, thresholds: [3, 10, 30], goal: n => `${n} passés composés avec être réussis` },
  { id: 'comeback', emoji: '🧭', name: 'Retour', description: 'Réussir un verbe à un temps où il avait été raté.',
    measure: f => f.recoveries, thresholds: [5, 20, 50], goal: n => `${n} conjugaisons ratées puis réussies` },
  { id: 'balanced', emoji: '⚖️', name: 'Polyvalent', description: `Atteindre ${BALANCE_ACCURACY} % de réussite à chacun des cinq temps, sur ${BALANCE_WINDOW_GAMES} parties d’affilée.`,
    measure: f => f.balance, thresholds: [BALANCE_ACCURACY], unit: '%', goal: () => `${BALANCE_ACCURACY} % à chaque temps` },
  { id: 'precision', emoji: '🏹', name: 'Précision', description: `Enchaîner des parties à ${PRECISE_ACCURACY} % ou plus.`,
    measure: f => f.longestPreciseRun, thresholds: [3, 7, 15], goal: n => `${n} parties d’affilée à ${PRECISE_ACCURACY} % ou plus` },
  { id: 'regular', emoji: '📅', name: 'Habitué', description: 'Parties jouées au total.',
    measure: f => f.gameCount, thresholds: [10, 50, 200], goal: n => `${n} parties jouées` },
  { id: 'persistent', emoji: '🔁', name: 'Persévérant', description: 'Jouer de nombreuses parties le même jour.',
    measure: f => f.mostGamesInADay, thresholds: [5, 15, 40], goal: n => `${n} parties en une journée` },
  { id: 'nightOwl', emoji: '🌙', name: 'Noctambule', description: 'Finir une partie après minuit.',
    measure: f => (f.playedAtNight ? 1 : 0), thresholds: [1], goal: () => 'Une partie finie après minuit' },
  { id: 'earlyBird', emoji: '🌅', name: 'Lève-tôt', description: 'Finir une partie avant 8 h du matin.',
    measure: f => (f.playedEarly ? 1 : 0), thresholds: [1], goal: () => 'Une partie finie avant 8 h' },
  ...holidayAchievements(),
].map(Object.freeze));

/** Succès cachés : un par jour de fête, obtenu en y jouant une partie. */
function holidayAchievements() {
  return HOLIDAYS.map(h => ({
    id: `holiday-${h.id}`, emoji: h.emoji, name: h.badge, hidden: true, description: `Jouer une partie ${h.label}.`,
    measure: f => (f.holidaysPlayed.has(h.id) ? 1 : 0), thresholds: [1], goal: () => `Partie jouée ${h.label}`,
  }));
}

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
  /** Un succès caché ne se montre qu'une fois obtenu. */
  get isVisible() { return !this.definition.hidden || this.reached > 0; }

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

Object.assign(Conjugo, { TIER_NAMES, MAX_TIER, AchievementFacts, ACHIEVEMENTS, AchievementProgress, evaluateAchievements, newlyUnlocked, earnedSteps, totalSteps });
})(globalThis.JeuxFr ??= {});
