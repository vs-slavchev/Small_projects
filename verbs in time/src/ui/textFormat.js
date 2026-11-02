(function (Conjugo) {
'use strict';

const SECONDS_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Échappe du texte brut. Les textes des banques de données contiennent du HTML voulu et ne passent pas par ici. */
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

const plural = (n, singular, pluralForm = `${singular}s`) => (Math.abs(n) > 1 ? pluralForm : singular);

const percentOf = (part, total) => Math.round((part / total) * 100);

const formatSeconds = ms => `${SECONDS_FORMAT.format(ms / 1000)} s`;

function durationText(ms) {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s} ${plural(s, 'seconde')}`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m} min ${s % 60} s` : `${m} ${plural(m, 'minute')}`;
}

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

const similarity = (given, expected) => diffChars(given, expected).filter(p => p.type === 'same').reduce((n, p) => n + p.text.length, 0);

const minutesText = ms => `${Math.max(1, Math.round(ms / 60_000))} min`;

function accentMarks(given, target) {
  const fold = text => text.toLowerCase().replace(/[’']/g, "'");
  const bare = text => fold(text).normalize('NFD').replace(/\p{M}/gu, '');
  // Espaces en trop ignorés, comme le fait la vérification de la réponse.
  const givenText = given.trim().replace(/\s+/g, ' ');
  const g = [...givenText];
  const t = [...target];
  const offset = t.length - g.length;
  const none = { target: [], given: [], givenText };
  if (offset < 0 || bare(t.slice(offset).join('')) !== bare(g.join(''))) return none;
  const marks = { target: [], given: [], givenText };
  g.forEach((ch, i) => {
    if (fold(ch) !== fold(t[offset + i])) { marks.given.push(i); marks.target.push(offset + i); }
  });
  return marks;
}

const fitFontSize = (text, max, budget) => Math.min(max, Math.floor(budget / text.length));

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

const unlockedLabel = p => (p.isSingleStep ? p.name : `${p.name} · ${p.tierName}`);

Object.assign(Conjugo, { escapeHtml, plural, percentOf, formatSeconds, durationText, minutesText, diffChars, similarity, accentMarks, fitFontSize, achievementStatus, unlockedLabel });
})(globalThis.Conjugo ??= {});
