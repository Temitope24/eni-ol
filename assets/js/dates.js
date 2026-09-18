/*
  French date/time/price formatting — batch B6.
  Source: "Plan de conception.dc.html" §6's own conventions line — "Format
  d’heure unique : 14:30. Dates longues « samedi 19 septembre », courtes
  « sam. 19 sept. ». Prix « 60 € » avec espace insécable. Espace insécable
  avant : ; ! ?" — plus DATA-MODEL.md §7 for the travel-estimate rounding
  used by formatExpiry's sibling in travel.js (B7).

  Pure formatting only: every function takes explicit Date/number
  arguments, nothing here reads a "current time" — the demo's pinned clock
  lives in store.js (B9), not here.
*/

window.ENIOL_DATES = (function () {

  var NBSP_NARROW = " "; // narrow no-break space, for "60 €"
  var NBSP = " ";        // regular no-break space, for : ; ! ?

  var DAYS_LONG = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var DAYS_SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  var MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /** "14:30" — the one time format used everywhere, 24h, zero-padded. */
  function formatTime(date) {
    return pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  }

  /** "samedi 19 septembre" (or with a year: "samedi 19 septembre 2026"). */
  function formatDateLong(date, opts) {
    opts = opts || {};
    var s = DAYS_LONG[date.getDay()] + " " + date.getDate() + " " + MONTHS_LONG[date.getMonth()];
    if (opts.withYear) s += " " + date.getFullYear();
    return s;
  }

  /** "sam. 19 sept." (or with a year: "sam. 19 sept. 2026"). */
  function formatDateShort(date, opts) {
    opts = opts || {};
    var s = DAYS_SHORT[date.getDay()] + " " + date.getDate() + " " + MONTHS_SHORT[date.getMonth()];
    if (opts.withYear) s += " " + date.getFullYear();
    return s;
  }

  /** "60 €" — amount + narrow no-break space + euro sign. */
  function formatPrice(amountEuros) {
    return amountEuros + NBSP_NARROW + "€";
  }

  /**
   * A service's displayed price, honoring typePrix:
   *   "fixe"        -> "60 €"
   *   "a_partir_de" -> "dès 90 €"
   *   "devis"       -> "dès 150 €" when a starting price exists — every
   *                    artboard (P01, P02, P03, P13) shows fabrication that
   *                    way — else "Sur devis"
   */
  function formatServicePrice(service) {
    if (service.typePrix === "devis") return service.prixEuros != null ? "dès " + formatPrice(service.prixEuros) : "Sur devis";
    if (service.typePrix === "a_partir_de") return "dès " + formatPrice(service.prixEuros);
    return formatPrice(service.prixEuros);
  }

  /** "+33753711138" -> "07 53 71 11 38" (CLIENT-BRIEF.md's documented display format). */
  function formatPhoneFr(e164) {
    var digits = e164.replace(/\D/g, "").replace(/^33/, "0");
    return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }

  /** 19 -> "19ᵉ" (the ordinal used for every Paris arrondissement mention). */
  function formatArrondissement(n) {
    return n + "ᵉ";
  }

  /**
   * A duration in ms -> "5 h" or, when there's a remainder, "21 h 40".
   * Matches the exact display convention seen throughout the pro dashboard
   * (R02/R04/R09/R12): hours always shown, minutes only when non-zero, no
   * leading zero on the minutes, no "min" suffix when paired with "h".
   */
  function formatDuration(ms) {
    var totalMin = Math.max(0, Math.round(ms / 60000));
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    return m === 0 ? (h + " h") : (h + " h " + m);
  }

  /**
   * The duration string to interpolate into strings.js's "Expire dans
   * {duree}" / "il reste {duree}" templates — same underlying formatting
   * as formatDuration, named separately because it's the one call sites
   * reach for when a request/countdown is involved.
   */
  function formatExpiry(targetDate, now) {
    return formatDuration(targetDate.getTime() - now.getTime());
  }

  /**
   * Inserts the correct spacing before ; : ! ? per §6's rule ("espace
   * insécable avant : ; ! ?"). Only useful for strings assembled at
   * runtime (e.g. from a template); strings already hard-coded in HTML
   * should just contain the no-break space directly.
   */
  function frenchPunctuationSpacing(str) {
    return str.replace(/ ?([;:!?])/g, NBSP + "$1");
  }

  /**
   * "2026-09-19T13:00" or "2026-09-19" -> a local Date. All seed/demo times
   * are wall-clock Paris times with no offset; building the Date from its
   * parts avoids any engine-specific ISO parsing quirks.
   */
  function parseLocal(iso) {
    var d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    if (iso.length > 10) d.setHours(+iso.slice(11, 13), +iso.slice(14, 16), 0, 0);
    return d;
  }

  /** Local Date -> "2026-09-19T13:00" (the format stored in data.js). */
  function toLocalIso(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()) +
      "T" + pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  }

  function addHours(iso, hours) {
    return toLocalIso(new Date(parseLocal(iso).getTime() + hours * 3600000));
  }

  return {
    MONTHS_LONG: MONTHS_LONG,
    MONTHS_SHORT: MONTHS_SHORT,
    DAYS_LONG: DAYS_LONG,
    DAYS_SHORT: DAYS_SHORT,
    parseLocal: parseLocal,
    toLocalIso: toLocalIso,
    addHours: addHours,
    formatTime: formatTime,
    formatDateLong: formatDateLong,
    formatDateShort: formatDateShort,
    formatPrice: formatPrice,
    formatServicePrice: formatServicePrice,
    formatPhoneFr: formatPhoneFr,
    formatArrondissement: formatArrondissement,
    formatDuration: formatDuration,
    formatExpiry: formatExpiry,
    frenchPunctuationSpacing: frenchPunctuationSpacing,
    NBSP: NBSP,
    NBSP_NARROW: NBSP_NARROW
  };
})();
