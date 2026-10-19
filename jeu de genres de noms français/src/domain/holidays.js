// Jours fériés français et journées mondiales, pour les succès cachés.
// Les fêtes mobiles (Pâques, Ascension, Pentecôte) se calculent à partir de Pâques, année par année.

(function (LeOuLa) {
'use strict';

const { dayKey, addDays } = LeOuLa;

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
 * `label` complète « Jouer une partie… » et « Partie jouée… ».
 */
const HOLIDAYS = Object.freeze([
  { id: 'newYear', label: 'le jour de l’An (1ᵉʳ janvier)', dateIn: fixed(1, 1) },
  { id: 'valentine', label: 'le jour de la Saint-Valentin (14 février)', dateIn: fixed(2, 14) },
  { id: 'womensDay', label: 'la Journée internationale des droits des femmes (8 mars)', dateIn: fixed(3, 8) },
  { id: 'francophonie', label: 'la Journée internationale de la Francophonie (20 mars)', dateIn: fixed(3, 20) },
  { id: 'aprilFool', label: 'le 1ᵉʳ avril', dateIn: fixed(4, 1) },
  { id: 'easterMonday', label: 'le lundi de Pâques', dateIn: afterEaster(1) },
  { id: 'labourDay', label: 'le jour de la fête du Travail (1ᵉʳ mai)', dateIn: fixed(5, 1) },
  { id: 'victoryDay', label: 'le 8 mai, jour de la Victoire de 1945', dateIn: fixed(5, 8) },
  { id: 'ascension', label: 'le jeudi de l’Ascension', dateIn: afterEaster(39) },
  { id: 'pentecost', label: 'le lundi de Pentecôte', dateIn: afterEaster(50) },
  { id: 'musicDay', label: 'le jour de la fête de la Musique (21 juin)', dateIn: fixed(6, 21) },
  { id: 'bastilleDay', label: 'le 14 Juillet, jour de la fête nationale', dateIn: fixed(7, 14) },
  { id: 'assumption', label: 'le 15 août, jour de l’Assomption', dateIn: fixed(8, 15) },
  { id: 'halloween', label: 'le soir d’Halloween (31 octobre)', dateIn: fixed(10, 31) },
  { id: 'allSaints', label: 'le jour de la Toussaint (1ᵉʳ novembre)', dateIn: fixed(11, 1) },
  { id: 'armistice', label: 'le 11 novembre, jour de l’Armistice', dateIn: fixed(11, 11) },
  { id: 'christmas', label: 'le jour de Noël (25 décembre)', dateIn: fixed(12, 25) },
  { id: 'newYearsEve', label: 'le soir du réveillon de la Saint-Sylvestre (31 décembre)', dateIn: fixed(12, 31) },
].map(Object.freeze));

/** Identifiants des fêtes qui tombent le jour local de `date`. */
function holidaysOn(date) {
  const key = dayKey(date);
  const year = new Date(date).getFullYear();
  return HOLIDAYS.filter(h => dayKey(h.dateIn(year)) === key).map(h => h.id);
}

Object.assign(LeOuLa, { HOLIDAYS, easterSunday, holidaysOn });
})(globalThis.LeOuLa ??= {});
