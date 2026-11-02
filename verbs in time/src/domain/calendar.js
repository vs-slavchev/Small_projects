(function (Conjugo) {
'use strict';

const pad = n => String(n).padStart(2, '0');

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const daysBetween = (from, to) => Math.round((fromKey(dayKey(to)) - fromKey(dayKey(from))) / 86_400_000);

class ActivityCalendar {
  #days;

  constructor(dates = []) {
    this.#days = new Set([...dates].map(dayKey));
  }

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
}

Object.assign(Conjugo, { dayKey, addDays, daysBetween, ActivityCalendar });
})(globalThis.Conjugo ??= {});
