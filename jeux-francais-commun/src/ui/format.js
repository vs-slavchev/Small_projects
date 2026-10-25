// Mise en forme commune aux jeux : textes français (dates, durées, pluriels, succès) pour l'interface.

(function (JeuxFr) {
'use strict';

const { TrendWindow, dayKey, addDays } = JeuxFr;

const MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const SECONDS_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Échappe du texte brut. Les textes des banques de données contiennent du HTML voulu et ne passent pas par ici. */
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

const plural = (n, singular, pluralForm = `${singular}s`) => (Math.abs(n) > 1 ? pluralForm : singular);

/** 41 000 ms → « 0:41 » */
function formatClock(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 9 000 ms → « 9 s », 12 340 ms → « 12,3 s » */
const formatSeconds = ms => `${SECONDS_FORMAT.format(ms / 1000)} s`;

const shortDate = date => `${date.getDate()} ${MONTHS[date.getMonth()]}`;

function relativeDay(date, today) {
  const key = dayKey(date);
  if (key === dayKey(today)) return "Aujourd'hui";
  if (key === dayKey(addDays(today, -1))) return 'Hier';
  return shortDate(date);
}

/**
 * Écart lettre à lettre entre deux textes (plus longue sous-suite commune).
 * @returns {{ type: 'same' | 'extra' | 'missing', text: string }[]} `extra` : en trop dans `given`, `missing` : absent de `given`
 */
function diffChars(given, expected) {
  const a = [...given];
  const b = [...expected];
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const parts = [];
  const push = (type, ch) => (parts.at(-1)?.type === type ? (parts.at(-1).text += ch) : parts.push({ type, text: ch }));
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { push('same', a[i]); i++; j++; }
    else if (j < b.length && (i === a.length || lcs[i][j + 1] >= lcs[i + 1][j])) { push('missing', b[j]); j++; }
    else { push('extra', a[i]); i++; }
  }
  return parts;
}

/** Nombre de lettres communes, dans l'ordre : sert à choisir la forme attendue la plus proche d'une réponse. */
const similarity = (given, expected) => diffChars(given, expected).filter(p => p.type === 'same').reduce((n, p) => n + p.text.length, 0);

/** Taille de police pour qu'un texte tienne sur une ligne de l'écran. */
const fitFontSize = (text, max, budget) => Math.min(max, Math.floor(budget / text.length));

function trendText({ delta, window }) {
  const span = window === TrendWindow.TWO_WEEKS ? 'en 2 semaines' : 'depuis tes débuts';
  if (delta > 0) return `+${delta} pts ${span}`;
  if (delta < 0) return `−${-delta} pts ${span}`;
  return `Stable ${span}`;
}

/** @param {import('../domain/achievements.js').AchievementProgress} p */
function achievementStatus(p) {
  const withUnit = n => (p.unit ? `${n} ${p.unit}` : `${n}`);
  const tierLabel = p.isSingleStep
    ? (p.reached ? 'Obtenu' : 'Pas encore obtenu')
    : (p.reached ? `Niveau ${p.tierName}${p.isComplete ? '' : ` · ${p.reached}/${p.thresholds.length}`}` : 'Pas encore obtenu');
  const percent = Math.round(p.ratio * 100);
  if (p.isComplete) return { tierLabel, nextLabel: 'Niveau maximal atteint', progressLabel: '✓', percent };
  if (p.isBelowGoal) {
    return {
      tierLabel, percent,
      nextLabel: `Prochain palier : ${p.nextTierName} (${withUnit(p.nextThreshold)})`,
      progressLabel: p.value === null ? 'aucune partie' : `record ${formatSeconds(p.value * 1000)}`,
    };
  }
  return {
    tierLabel, percent,
    nextLabel: p.isSingleStep ? "Pour l'obtenir" : `Prochain palier : ${p.nextTierName} (${withUnit(p.nextThreshold)})`,
    progressLabel: `${p.value} / ${withUnit(p.nextThreshold)}`,
  };
}

/** Libellé d'un palier franchi, pour le bilan de fin de partie. */
const unlockedLabel = p => (p.isSingleStep ? p.name : `${p.name} · ${p.tierName}`);

Object.assign(JeuxFr, { escapeHtml, plural, formatClock, formatSeconds, shortDate, relativeDay, diffChars, similarity, fitFontSize, trendText, achievementStatus, unlockedLabel });
})(globalThis.JeuxFr ??= {});
