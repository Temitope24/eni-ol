/*
  Travel estimate — batch B7.
  Source: research/01-TRAVEL-AND-AVAILABILITY.md §5 (soft signals + exact
  label wording) and §8 (the mockup formula), re-read in full for this
  batch since it had never been read this session before.

  Formula (§8, verbatim): "Estimate = straight-line distance × a Paris
  transit factor. minutes ≈ 10 + km × 4 (≈10 min access/waiting plus ≈15
  km/h effective transit speed), rounded to 5 min, labelled « ≈ »."

  --- Coordinate back-solving (per this batch's own instructions) ---
  CODE-BATCHES.md's B7 row explicitly says to back-solve placeholder
  lat/lon so this formula reproduces the design's stated numbers. Verified
  against every checkable travel figure in R01/R02/R03/R04/R05:

    home → Aïcha (R01/R05 "≈ 20 min depuis chez moi")        -> 20 min ✓
    Aïcha → Inès (R03/R04 "≈ 35 min · partir à 12:25")        -> 35 min ✓
    Inès → Maëlys (R02/R04 "≈ 55 min ... manque ≈ 25 min")    -> 55 min ✓ (matched the original data.js coordinates, no edit needed)
    lycée → Grâce (R02 "≈ 20 min depuis le lycée")             -> 20 min ✓ (also unedited)
    home → Fatou/Cergy (R02 "Loin : ≈ 1 h 15")                 -> 75 min ✓ (required moving "Cergy" ~9 km closer than its real position — flagged in data.js, since the flat formula turns Cergy's true ~25 km into ~1 h 50, not 1 h 15)

  All five now match exactly; two required editing data.js's placeholder
  coordinates (Aïcha's address, Fatou's), documented there.
*/

window.ENIOL_TRAVEL = (function () {

  var EARTH_RADIUS_KM = 6371;

  function toRad(deg) { return (deg * Math.PI) / 180; }

  /** Great-circle distance between {lat,lon} points a and b, in km. */
  function haversineKm(a, b) {
    var dLat = toRad(b.lat - a.lat);
    var dLon = toRad(b.lon - a.lon);
    var lat1 = toRad(a.lat);
    var lat2 = toRad(b.lat);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return EARTH_RADIUS_KM * c;
  }

  function roundTo5(n) { return Math.round(n / 5) * 5; }

  /** The mockup formula (§8): 10 min access/waiting + ~15 km/h transit, rounded to 5 min. */
  function estimateMinutes(a, b) {
    var km = haversineKm(a, b);
    return roundTo5(10 + km * 4);
  }

  /**
   * How a required travel time compares to the time actually available
   * before/after a neighboring appointment. Thresholds from §5, with the
   * margin taken from settings.margeTrajetMin (R09, default 15):
   *   ok      — ≥ margin spare
   *   serre   — fits, but < margin spare
   *   ne_tient_pas — doesn't fit at all
   */
  function classifyFit(requiredMin, availableMin, margeMin) {
    var marge = margeMin == null ? 15 : margeMin;
    var spare = availableMin - requiredMin;
    if (spare < 0) return { level: "ne_tient_pas", spareMin: spare, manqueMin: -spare };
    if (spare < marge) return { level: "serre", spareMin: spare };
    return { level: "ok", spareMin: spare };
  }

  /** §5: "Loin" is a one-way estimate over 60 min — independent of whether it fits a gap. */
  function isLoin(oneWayMin) { return oneWayMin > 60; }

  // ---- Label helpers — exact phrasing from §5's table ----

  function labelOk(min, origineLabel) {
    return "≈ " + min + " min" + (origineLabel ? " depuis " + origineLabel : "");
  }
  function labelServe(margeMin) {
    return "Trajet serré : " + margeMin + " min de marge";
  }
  function labelNeTientPas(manqueMin) {
    return "Ne tient pas : il manque ≈ " + manqueMin + " min";
  }
  function labelLoin(oneWayMin) {
    var duree = window.ENIOL_DATES ? window.ENIOL_DATES.formatDuration(oneWayMin * 60000) : (oneWayMin + " min");
    return "Loin : ≈ " + duree + " en transports";
  }

  return {
    haversineKm: haversineKm,
    estimateMinutes: estimateMinutes,
    classifyFit: classifyFit,
    isLoin: isLoin,
    labelOk: labelOk,
    labelServe: labelServe,
    labelNeTientPas: labelNeTientPas,
    labelLoin: labelLoin
  };
})();
