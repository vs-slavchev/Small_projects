// Jours fériés français et journées mondiales, pour les succès cachés.
// Les fêtes mobiles (Pâques, Ascension, Pentecôte) se calculent à partir de Pâques, année par année.

(function (Conjugo) {
'use strict';

const { dayKey, addDays } = Conjugo;

/** Dimanche de Pâques (calendrier grégorien, algorithme de Meeus). */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Date fixe : `month` de 1 à 12. */
const fixed = (month, day) => year => new Date(year, month - 1, day);
/** Date mobile : `offset` jours après le dimanche de Pâques. */
const afterEaster = offset => year => addDays(easterSunday(year), offset);

/**
 * Jours de fête. `dateIn(year)` donne la date de la fête cette année-là ;
 * `label` complète « Jouer une partie… » et « Partie jouée… » ;
 * `emoji` et `badge` habillent le succès caché correspondant.
 */
const HOLIDAYS = Object.freeze([
  { id: 'newYear', emoji: '🎉', badge: 'Bonne année', label: 'le jour de l’An (1ᵉʳ janvier)', dateIn: fixed(1, 1) },
  { id: 'valentine', emoji: '💌', badge: 'Mots doux', label: 'le jour de la Saint-Valentin (14 février)', dateIn: fixed(2, 14) },
  { id: 'womensDay', emoji: '💜', badge: 'Féminin pluriel', label: 'la Journée internationale des droits des femmes (8 mars)', dateIn: fixed(3, 8) },
  { id: 'francophonie', emoji: '🌍', badge: 'Francophone', label: 'la Journée internationale de la Francophonie (20 mars)', dateIn: fixed(3, 20) },
  { id: 'aprilFool', emoji: '🐟', badge: 'Poisson d’avril', label: 'le 1ᵉʳ avril', dateIn: fixed(4, 1) },
  { id: 'easterMonday', emoji: '🐣', badge: 'Chasse aux œufs', label: 'le lundi de Pâques', dateIn: afterEaster(1) },
  { id: 'labourDay', emoji: '🌼', badge: 'Brin de muguet', label: 'le jour de la fête du Travail (1ᵉʳ mai)', dateIn: fixed(5, 1) },
  { id: 'victoryDay', emoji: '🕊️', badge: 'Devoir de mémoire', label: 'le 8 mai, jour de la Victoire de 1945', dateIn: fixed(5, 8) },
  { id: 'ascension', emoji: '☁️', badge: 'Septième ciel', label: 'le jeudi de l’Ascension', dateIn: afterEaster(39) },
  { id: 'pentecost', emoji: '🌬️', badge: 'Second souffle', label: 'le lundi de Pentecôte', dateIn: afterEaster(50) },
  { id: 'musicDay', emoji: '🎸', badge: 'En musique', label: 'le jour de la fête de la Musique (21 juin)', dateIn: fixed(6, 21) },
  { id: 'bastilleDay', emoji: '🎇', badge: 'Feu d’artifice', label: 'le 14 Juillet, jour de la fête nationale', dateIn: fixed(7, 14) },
  { id: 'assumption', emoji: '🌻', badge: 'Plein été', label: 'le 15 août, jour de l’Assomption', dateIn: fixed(8, 15) },
  { id: 'halloween', emoji: '🎃', badge: 'Citrouille', label: 'le soir d’Halloween (31 octobre)', dateIn: fixed(10, 31) },
  { id: 'allSaints', emoji: '🕯️', badge: 'Toussaint', label: 'le jour de la Toussaint (1ᵉʳ novembre)', dateIn: fixed(11, 1) },
  { id: 'armistice', emoji: '🎖️', badge: 'Bleuet', label: 'le 11 novembre, jour de l’Armistice', dateIn: fixed(11, 11) },
  { id: 'christmas', emoji: '🎄', badge: 'Petit papa Noël', label: 'le jour de Noël (25 décembre)', dateIn: fixed(12, 25) },
  { id: 'newYearsEve', emoji: '🥂', badge: 'Réveillon', label: 'le soir du réveillon de la Saint-Sylvestre (31 décembre)', dateIn: fixed(12, 31) },
].map(Object.freeze));

/** Par année : clé de jour → identifiants des fêtes de ce jour. Les dates ne changent jamais. */
const calendarByYear = new Map();

function calendarOf(year) {
  if (!calendarByYear.has(year)) {
    const days = new Map();
    for (const h of HOLIDAYS) {
      const key = dayKey(h.dateIn(year));
      days.set(key, [...(days.get(key) ?? []), h.id]);
    }
    calendarByYear.set(year, days);
  }
  return calendarByYear.get(year);
}

/** Identifiants des fêtes qui tombent le jour local de `date`. */
function holidaysOn(date) {
  const d = new Date(date);
  return calendarOf(d.getFullYear()).get(dayKey(d)) ?? [];
}

Object.assign(Conjugo, { HOLIDAYS, easterSunday, holidaysOn });
})(globalThis.Conjugo ??= {});
