// Mise en forme des données du domaine en texte français pour l'interface.

(function (LeOuLa) {
'use strict';

const { TrendWindow, InsightKind, Verdict, dayKey, addDays } = LeOuLa;

const MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const SECONDS_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Échappe du texte brut. Les règles et anecdotes de la banque contiennent du HTML voulu et ne passent pas par ici. */
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

/** Taille de police pour qu'un mot tienne sur une ligne de l'écran. */
const fitFontSize = (text, max, budget) => Math.min(max, Math.floor(budget / text.length));

const VERDICT_TEXT = Object.freeze({
  [Verdict.PERFECT]: 'Sans faute. Impeccable.',
  [Verdict.WEEK_BEST]: 'Ton meilleur score de la semaine.',
  [Verdict.STRONG]: 'Très solide. Les règles sont là.',
  [Verdict.FAIR]: "Bonne base. Les règles s'installent.",
  [Verdict.KEEP_GOING]: 'Chaque erreur, c’est une règle de plus en mémoire.',
});

function trendText({ delta, window }) {
  const span = window === TrendWindow.TWO_WEEKS ? 'en 2 semaines' : 'depuis tes débuts';
  if (delta > 0) return `+${delta} pts ${span}`;
  if (delta < 0) return `−${-delta} pts ${span}`;
  return `Stable ${span}`;
}

function insightText(insight) {
  switch (insight.kind) {
    case InsightKind.STEADY:
      return insight.all
        ? `Toutes tes parties sont à ${insight.threshold} % ou plus. Belle régularité.`
        : `Tes ${insight.count} dernières parties sont toutes à ${insight.threshold} % ou plus.`;
    case InsightKind.ABOVE_AVERAGE:
      return `Ta dernière partie (${insight.accuracy} %) dépasse ta moyenne. Continue comme ça.`;
    default:
      return 'Les mots ratés reviennent plus souvent : chaque partie t’aide à les fixer.';
  }
}

/** @param {import('../domain/achievements.js').AchievementProgress} p */
function achievementStatus(p) {
  const tierLabel = p.isSingleStep
    ? (p.reached ? 'Obtenu' : 'Pas encore obtenu')
    : (p.reached ? `Niveau ${p.tierName}${p.isComplete ? '' : ` · ${p.reached}/${p.thresholds.length}`}` : 'Pas encore obtenu');
  const percent = Math.round(p.ratio * 100);
  if (p.isComplete) return { tierLabel, nextLabel: 'Niveau maximal atteint', progressLabel: '✓', percent };
  if (p.isBelowGoal) {
    return {
      tierLabel, percent,
      nextLabel: `Prochain palier : ${p.nextTierName} (${p.nextThreshold} ${p.unit})`,
      progressLabel: p.value === null ? 'aucune partie' : `record ${formatSeconds(p.value * 1000)}`,
    };
  }
  return {
    tierLabel, percent,
    nextLabel: p.isSingleStep ? "Pour l'obtenir" : `Prochain palier : ${p.nextTierName} (${p.nextThreshold})`,
    progressLabel: `${p.value} / ${p.nextThreshold}`,
  };
}

/** Libellé d'un palier franchi, pour le bilan de fin de partie. */
const unlockedLabel = p => (p.isSingleStep ? p.name : `${p.name} · ${p.tierName}`);

Object.assign(LeOuLa, { escapeHtml, plural, formatClock, formatSeconds, shortDate, relativeDay, fitFontSize, VERDICT_TEXT, trendText, insightText, achievementStatus, unlockedLabel });
})(globalThis.LeOuLa ??= {});
