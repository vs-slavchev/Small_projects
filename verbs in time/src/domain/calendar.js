// Calcul de la série quotidienne. Tout est exprimé en jours du calendrier local.

(function (Conjugo) {
'use strict';

const pad = n => String(n).padStart(2, '0');

/** Clé de jour local « AAAA-MM-JJ ». */
function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Lundi de la semaine de `date`, à minuit. */
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return addDays(d, -((d.getDay() + 6) % 7));
}

function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Jours où le joueur a terminé au moins une partie. */
class ActivityCalendar {
  #days;

  /** @param {Iterable<Date>} dates */
  constructor(dates = []) {
    this.#days = new Set([...dates].map(dayKey));
  }

  /** Ajoute un jour d'activité. */
  record(date) {
    this.#days.add(dayKey(date));
  }

  playedOn(date) {
    return this.#days.has(dayKey(date));
  }

  /**
   * Jours consécutifs joués jusqu'à aujourd'hui. Une série reste en cours
   * tant que le joueur a joué hier : il a jusqu'à ce soir pour la prolonger.
   */
  currentStreak(today) {
    let day = new Date(today);
    if (!this.playedOn(day)) day = addDays(day, -1);
    let streak = 0;
    while (this.playedOn(day)) {
      streak++;
      day = addDays(day, -1);
    }
    return streak;
  }

  longestStreak() {
    let best = 0;
    let run = 0;
    let previous = null;
    for (const key of [...this.#days].sort()) {
      run = previous && dayKey(addDays(previous, 1)) === key ? run + 1 : 1;
      best = Math.max(best, run);
      previous = fromKey(key);
    }
    return best;
  }

  /** Les 7 jours de la semaine en cours, du lundi au dimanche. */
  week(today) {
    const todayKey = dayKey(today);
    const monday = startOfWeek(today);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const key = dayKey(date);
      return Object.freeze({ date, played: this.#days.has(key), isToday: key === todayKey, isFuture: key > todayKey });
    });
  }
}

Object.assign(Conjugo, { dayKey, addDays, startOfWeek, ActivityCalendar });
})(globalThis.Conjugo ??= {});
