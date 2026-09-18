/*
  Availability / slot engine — batch B8.
  Sources, read fresh for this batch: research/01 §3–§5 (the §4.3 slot
  pseudocode, §4.4 curation, §5 signals), DATA-MODEL.md §3/§5, PUB P05
  (A + B) and P14, PRO R02/R03/R04/R05/R12.

  Pure functions over a state object (the seed shape from data.js, or the
  live demo state from store.js) plus an explicit `now` — nothing here reads
  a clock or localStorage, so _tests.html can run it against a clean seed.

  --- Two models, on purpose ---
  1. What a client can SELECT (slotsForDay) follows §4.3: prev appointment
     end + its cleanup buffer + travel + this service's prep buffer must fit
     before the start, and the same going out to the next one. One addition:
     §4.3 only applies the prep buffer (tamponAvantMin) in its no-travel
     branch — it's applied on arrival in the travel branch too, since R08
     gives lace-frontale a 15 min "battement avant (préparation)".
  2. The dashboard SIGNAL on an existing booking (evaluateBooking) compares
     travel to the raw gap between the two appointments, exactly as R04
     phrases it: "≈ 55 min nécessaires · écart de 30 min".
  Because buffers are ≥ 0, anything model 1 lets a client pick can never
  show "Ne tient pas" in model 2 — _tests.html checks that invariant.

  --- Design numbers this reproduces (all asserted in _tests.html) ---
  Maëlys "Ne tient pas : il manque ≈ 25 min", "écart de 30 min", "≈ 55 min"
  (R02/R03/R04/R05/R12) · "Proposer 17:00" (R02/R04/R12) · Inès "≈ 35 min ·
  partir à 12:25" (R03/R04) · Fatou "Loin : ≈ 1 h 15", "aller-retour ≈ 2 h
  30" (R02) · Grâce "≈ 20 min depuis le lycée" (R02) · Aïcha "≈ 20 min
  depuis chez moi" (R05/R06) · October closed, lead times, max 3 RDV/day.

  --- Design numbers it deliberately does NOT reproduce ---
  - R03/R04 "Temps libre · 45 min (11:30 → 12:25)": the range beside the
    label is itself 55 min. Engine says 55.
  - R04 "partir à 09:35" for Aïcha: R01/R05/R06 all give ≈ 20 min travel,
    so the engine says 09:40.
  - P05/P14's literal slot times: 08:30 on a Saturday (R09 opens at 09:00),
    18:30 for a 2 h 30 lace frontale and 17:00 on Wed 23 (both end after
    19:00 — contradicts the confirmed "jamais le soir à partir de 19h"),
    and P05 B marks Friday 18 available (R09 has Fridays closed). The engine
    reproduces the STATES those screens show — pris, conseillé, trop tôt,
    mois fermé, rien de libre — not those specific times.

  --- Implementation choices (not specified anywhere) ---
  - Half-days: matin < 12:00 ≤ après-midi < 18:00 ≤ soir (matches where P05
    puts 16:00 and 18:30).
  - "♡ Conseillé": per half-day, the slot that chains most tightly onto an
    existing appointment (least idle time), only if that idle time is ≤ 60
    min — PDC §4: "le créneau qui s'enchaîne le mieux avec ses autres RDV".
    No existing appointment that half-day -> no conseillé.
  - Curation (§4.4, max 3 per half-day): the conseillé slot first, then
    evenly spread picks from the rest, so a free afternoon doesn't show
    three back-to-back starts.
*/

window.ENIOL_AVAILABILITY = (function () {
  var T = window.ENIOL_TRAVEL;
  var D = window.ENIOL_DATES;

  var HOLDING = { confirmee: true, acceptee_arrhes_attendues: true, nouveau_creneau_propose: true, en_attente: true };
  var EXPIRES = { en_attente: true, nouveau_creneau_propose: true };
  var CONSEILLE_MAX_IDLE_MIN = 60;
  var TONES = { ok: "ok", serre: "warn", loin: "warn", ne_tient_pas: "danger" };
  var DEMI_JOURNEES = [
    { id: "matin", label: "MATIN" },
    { id: "apresMidi", label: "APRÈS-MIDI" },
    { id: "soir", label: "SOIR" }
  ];

  // ---- small helpers ----
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function toMin(hhmm) { var p = hhmm.split(":"); return (+p[0]) * 60 + (+p[1]); }
  function fromMin(m) { return pad2(Math.floor(m / 60)) + ":" + pad2(m % 60); }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function addDays(date, n) { var d = D.parseLocal(date); d.setDate(d.getDate() + n); return isoDate(d); }
  function at(date, min) { var d = D.parseLocal(date); d.setHours(0, min, 0, 0); return d; }
  function halfDay(min) { return min < 720 ? "matin" : (min < 1080 ? "apresMidi" : "soir"); }
  function extend(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  function service(state, id) { return findById(state.services, id); }
  function address(state, id) {
    for (var i = 0; i < state.clients.length; i++) {
      var a = findById(state.clients[i].adresses || [], id);
      if (a) return a;
    }
    return null;
  }
  function bookingLocation(state, b) {
    if (!b.adresseId || b.lieu === "sans_deplacement") return null;
    var a = address(state, b.adresseId);
    return a && a.lat != null ? a : null;
  }
  function dayBase(state, date) {
    var o = state.settings.departsDuJour && state.settings.departsDuJour[date];
    return o || state.settings.pointDeDepart;
  }
  function baseLabel(base) {
    var l = base.libelle || "";
    return /^chez /i.test(l) ? l.toLowerCase() : "le " + l.toLowerCase();
  }
  function travel(state, from, to) {
    if (!from || !to || from.lat == null || to.lat == null) return state.settings.tamponTrajetParDefautMin;
    return T.estimateMinutes(from, to);
  }

  // ---- which bookings occupy the calendar ----
  function holds(b, now) {
    if (!HOLDING[b.statut] || !b.debut) return false;
    if (EXPIRES[b.statut] && b.repondreAvant && D.parseLocal(b.repondreAvant) <= now) return false;
    return true;
  }

  function busyOn(state, date, now, excludeId) {
    var out = [];
    state.bookings.forEach(function (b) {
      if (b.id === excludeId || !b.debut || b.debut.slice(0, 10) !== date || !holds(b, now)) return;
      var s = service(state, b.serviceId) || {};
      var start = toMin(b.debut.slice(11, 16));
      var end = b.fin ? toMin(b.fin.slice(11, 16)) : start + (s.dureeMin || 0);
      out.push({
        booking: b, start: start, end: end,
        bufferBefore: s.tamponAvantMin || 0, bufferAfter: s.tamponApresMin || 0,
        location: bookingLocation(state, b)
      });
    });
    return out.sort(function (a, b) { return a.start - b.start; });
  }

  // ---- opening hours: weekly rules + exceptions ----
  function mergeIntervals(list) {
    var out = [];
    list.slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (iv) {
      var last = out[out.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else out.push([iv[0], iv[1]]);
    });
    return out;
  }
  function subtractInterval(list, cut) {
    var out = [];
    list.forEach(function (iv) {
      if (cut[1] <= iv[0] || cut[0] >= iv[1]) { out.push(iv); return; }
      if (cut[0] > iv[0]) out.push([iv[0], cut[0]]);
      if (cut[1] < iv[1]) out.push([cut[1], iv[1]]);
    });
    return out;
  }

  /** Opening windows for a date, in minutes: weekly rules ∪ "ouverture" exceptions, minus "blocage" ones. */
  function windowsFor(state, date) {
    var dow = D.parseLocal(date).getDay();
    var list = [];
    state.weeklyRules.forEach(function (r) {
      if (r.jours.indexOf(dow) < 0) return;
      r.plages.forEach(function (p) { list.push([toMin(p[0]), toMin(p[1])]); });
    });
    var active = state.exceptions.filter(function (e) { return date >= e.du && date <= e.au; });
    active.forEach(function (e) {
      if (e.type === "ouverture" && e.plages) e.plages.forEach(function (p) { list.push([toMin(p[0]), toMin(p[1])]); });
    });
    list = mergeIntervals(list);
    for (var i = 0; i < active.length; i++) {
      var e = active[i];
      if (e.type !== "blocage") continue;
      if (!e.plages) return []; // whole-day block, e.g. "Bac de français — révisions"
      e.plages.forEach(function (p) { list = subtractInterval(list, [toMin(p[0]), toMin(p[1])]); });
    }
    return list;
  }

  function monthIsOpen(state, date) { return state.settings.moisOuverts.indexOf(date.slice(0, 7)) >= 0; }

  function windowFor(windows, start, end) {
    for (var i = 0; i < windows.length; i++) if (windows[i][0] <= start && end <= windows[i][1]) return windows[i];
    return null;
  }

  // ---- feasibility of one start time (research/01 §4.3) ----
  function makeCtx(state, svc, date, now, loc, excludeId, dur) {
    return {
      state: state, svc: svc, dur: dur || svc.dureeMin, loc: loc,
      needsTravel: !!loc && (svc.lieu === "domicile_cliente" || svc.lieu === "au_choix"),
      busy: busyOn(state, date, now, excludeId),
      base: dayBase(state, date),
      windows: windowsFor(state, date),
      countFirst: state.settings.compterTrajetPremierRdv !== false
    };
  }

  function checkStart(ctx, start) {
    var svc = ctx.svc, end = start + ctx.dur;
    var win = windowFor(ctx.windows, start, end);
    if (!win) return null;
    var prev = null, next = null, i, b;
    for (i = 0; i < ctx.busy.length; i++) {
      b = ctx.busy[i];
      if (b.start < end && b.end > start) return null;
      if (b.end <= start) prev = b;
      else if (!next && b.start >= end) next = b;
    }
    var before = svc.tamponAvantMin || 0, after = svc.tamponApresMin || 0;
    var info = { start: start, end: end, tIn: null, idleBefore: null, idleAfter: null };
    if (ctx.needsTravel) {
      if (prev) {
        info.tIn = travel(ctx.state, prev.location || ctx.base, ctx.loc);
        var arrive = prev.end + prev.bufferAfter + info.tIn;
        if (arrive + before > start) return null;
        info.idleBefore = start - before - arrive;
      } else if (ctx.countFirst) {
        info.tIn = travel(ctx.state, ctx.base, ctx.loc);
        if (start - before - info.tIn < win[0]) return null; // can't leave before she's available
      }
      if (next) {
        var tOut = travel(ctx.state, ctx.loc, next.location || ctx.base);
        var leave = end + after + tOut;
        if (leave + next.bufferBefore > next.start) return null;
        info.idleAfter = next.start - next.bufferBefore - leave;
      }
    } else {
      var a0 = start - before, a1 = end + after;
      for (i = 0; i < ctx.busy.length; i++) {
        b = ctx.busy[i];
        if (b.start - b.bufferBefore < a1 && b.end + b.bufferAfter > a0) return null;
      }
      if (prev) info.idleBefore = a0 - (prev.end + prev.bufferAfter);
      if (next) info.idleAfter = (next.start - next.bufferBefore) - a1;
    }
    var idles = [info.idleBefore, info.idleAfter].filter(function (x) { return x != null; });
    info.idle = idles.length ? Math.min.apply(null, idles) : Infinity;
    return info;
  }

  // ---- curation (research/01 §4.4) ----
  function spread(list, k) {
    if (k <= 0) return [];
    if (list.length <= k) return list.slice();
    if (k === 1) return [list[0]];
    var out = [];
    for (var i = 0; i < k; i++) out.push(list[Math.round(i * (list.length - 1) / (k - 1))]);
    return out;
  }

  function thin(state, feasible) {
    var max = state.settings.maxCreneauxAffichesParDemiJournee || 3;
    var buckets = {};
    feasible.forEach(function (f) { var k = halfDay(f.start); (buckets[k] = buckets[k] || []).push(f); });
    var out = [];
    DEMI_JOURNEES.forEach(function (hd) {
      var list = buckets[hd.id];
      if (!list) return;
      var best = null;
      list.forEach(function (f) { if (isFinite(f.idle) && (!best || f.idle < best.idle)) best = f; });
      var conseille = best && best.idle <= CONSEILLE_MAX_IDLE_MIN ? best : null;
      var chosen = conseille ? [conseille] : [];
      spread(list.filter(function (f) { return f !== conseille; }), max - chosen.length)
        .forEach(function (f) { chosen.push(f); });
      chosen.sort(function (a, b) { return a.start - b.start; });
      chosen.forEach(function (f) {
        out.push({ time: fromMin(f.start), fin: fromMin(f.end), halfDay: hd.id, conseille: f === conseille, trajetMin: f.tIn });
      });
    });
    return out;
  }

  // ---- public: slots for one day ----
  /**
   * opts: { date "YYYY-MM-DD", serviceId, now (Date), clientLocation {lat,lon}|null,
   *         dureeMin (variant override), excludeBookingId }
   * status: ok | passe | mois_ferme | ferme | trop_tot | complet | projet | inconnu
   *   ok       — slots[] has at least one start
   *   ferme    — no opening hours that day (weekly rule or a "blocage")
   *   trop_tot — every possible start is inside the service's minimum notice
   *   complet  — max RDV/day reached, or nothing fits around existing bookings
   *   projet   — fabrication: no slot list, the flow asks "Pour quand ?"
   * taken[] lists existing bookings' starts, for the "10:00 · pris" chips (P05/P14).
   */
  function slotsForDay(state, opts) {
    var date = opts.date, now = opts.now, svc = service(state, opts.serviceId);
    var res = { date: date, status: null, slots: [], taken: [] };
    if (!svc) { res.status = "inconnu"; return res; }
    if (svc.modeReservation === "projet" || !svc.dureeMin) { res.status = "projet"; return res; }
    if (date < isoDate(now)) { res.status = "passe"; return res; }
    if (!monthIsOpen(state, date)) { res.status = "mois_ferme"; return res; }

    var ctx = makeCtx(state, svc, date, now, opts.clientLocation || null, opts.excludeBookingId, opts.dureeMin);
    if (!ctx.windows.length) { res.status = "ferme"; return res; }
    res.taken = ctx.busy
      .filter(function (b) { return windowFor(ctx.windows, b.start, b.start); })
      .map(function (b) { return { time: fromMin(b.start), halfDay: halfDay(b.start) }; });

    var earliest = new Date(now.getTime() + svc.delaiMinimumHeures * 3600000);
    var latestStart = null;
    ctx.windows.forEach(function (w) {
      if (w[1] - w[0] >= ctx.dur) latestStart = Math.max(latestStart == null ? -1 : latestStart, w[1] - ctx.dur);
    });
    if (latestStart == null) { res.status = "complet"; return res; }
    if (at(date, latestStart) < earliest) { res.status = "trop_tot"; return res; }
    if (ctx.busy.length >= state.settings.maxRdvParJour) { res.status = "complet"; return res; }

    var step = state.settings.pasCreneauxMin, feasible = [];
    ctx.windows.forEach(function (w) {
      for (var s = w[0]; s + ctx.dur <= w[1]; s += step) {
        if (at(date, s) < earliest) continue;
        var info = checkStart(ctx, s);
        if (info) feasible.push(info);
      }
    });
    if (!feasible.length) { res.status = "complet"; return res; }
    res.slots = thin(state, feasible);
    res.status = "ok";
    return res;
  }

  /** "Prochaines disponibilités" (P05 A): the next `limit` days that have slots. */
  function nextAvailability(state, opts) {
    var out = [], from = opts.fromDate || isoDate(opts.now);
    var horizon = opts.days || 60, limit = opts.limit || 3;
    for (var i = 0; i < horizon && out.length < limit; i++) {
      var r = slotsForDay(state, extend(opts, { date: addDays(from, i) }));
      if (r.status === "ok") out.push(r);
    }
    return out;
  }

  /** Calendar grid (P05 B): one status per day of the month. month is 1–12. */
  function monthCalendar(state, opts) {
    var first = opts.year + "-" + pad2(opts.month) + "-01";
    var today = isoDate(opts.now), days = [], d = first;
    while (d.slice(0, 7) === first.slice(0, 7)) {
      var r = slotsForDay(state, extend(opts, { date: d }));
      days.push({ date: d, jour: +d.slice(8), jourSemaine: D.parseLocal(d).getDay(), status: r.status, aujourdhui: d === today });
      d = addDays(d, 1);
    }
    return { mois: first.slice(0, 7), ouvert: monthIsOpen(state, first), jours: days };
  }

  // ---- public: dashboard signal for an existing booking (research/01 §5) ----
  function signalLabel(level, res, hasPrev) {
    var a = res.arrivee;
    if (level === "ne_tient_pas") return T.labelNeTientPas(a.fit.manqueMin);
    if (level === "serre") return T.labelServe(a.fit.spareMin);
    if (level === "loin") return T.labelLoin(a.trajetMin);
    return T.labelOk(a.trajetMin, hasPrev ? "ton RDV de " + a.rdvDebut : a.baseLabel);
  }

  /**
   * Travel context for one booking, as shown on request cards (R02), the
   * accept sheet (R03), and the day timeline (R04/R05).
   * type: trajet | sans_deplacement | projet
   */
  function evaluateBooking(state, bookingId, now) {
    var b = findById(state.bookings, bookingId);
    if (!b) return null;
    var svc = service(state, b.serviceId) || {};
    if (svc.modeReservation === "projet" || !b.debut) return { type: "projet" };
    var loc = bookingLocation(state, b);
    if (!loc) return { type: "sans_deplacement" };

    var date = b.debut.slice(0, 10);
    var start = toMin(b.debut.slice(11, 16));
    var end = b.fin ? toMin(b.fin.slice(11, 16)) : start + svc.dureeMin;
    var prev = null, next = null;
    busyOn(state, date, now, b.id).forEach(function (o) {
      if (o.start < start) prev = o;
      else if (!next) next = o;
    });

    var base = dayBase(state, date), marge = state.settings.margeTrajetMin;
    var res = { type: "trajet", date: date, debut: fromMin(start), fin: fromMin(end) };
    var t;
    if (prev) {
      t = travel(state, prev.location || base, loc);
      var ecart = start - prev.end;
      res.arrivee = {
        depuis: "rdv", rdvId: prev.booking.id, rdvDebut: fromMin(prev.start), rdvFin: fromMin(prev.end),
        trajetMin: t, ecartMin: ecart, fit: T.classifyFit(t, ecart, marge)
      };
      res.tempsLibreMin = Math.max(0, ecart - t);
    } else {
      t = travel(state, base, loc);
      res.arrivee = { depuis: "base", base: base.libelle, baseLabel: baseLabel(base), trajetMin: t, fit: { level: "ok", spareMin: null } };
      res.tempsLibreMin = null;
    }
    res.partirA = fromMin(start - t);
    res.loin = T.isLoin(t);

    if (next) {
      var t2 = travel(state, loc, next.location || base), ecart2 = next.start - end;
      res.suivant = { rdvId: next.booking.id, debut: fromMin(next.start), trajetMin: t2, ecartMin: ecart2, fit: T.classifyFit(t2, ecart2, marge) };
    } else {
      res.suivant = null;
      if (!prev) res.allerRetourMin = t + travel(state, loc, base);
    }

    var level = res.arrivee.fit.level;
    if (level === "ok" && res.loin) level = "loin";
    res.signal = { level: level, tone: TONES[level], label: signalLabel(level, res, !!prev) };
    return res;
  }

  /**
   * The nearest feasible start on the same day for a booking that doesn't
   * fit ("Proposer 17:00", R02/R04/R12). Uses the client-slot model (with
   * buffers), ignores minimum notice (she's the one proposing).
   */
  function proposeAlternative(state, bookingId, now) {
    var b = findById(state.bookings, bookingId);
    if (!b || !b.debut) return null;
    var svc = service(state, b.serviceId);
    var date = b.debut.slice(0, 10);
    var orig = toMin(b.debut.slice(11, 16));
    var dur = b.fin ? toMin(b.fin.slice(11, 16)) - orig : svc.dureeMin;
    var ctx = makeCtx(state, svc, date, now, bookingLocation(state, b), b.id, dur);
    var best = null;
    ctx.windows.forEach(function (w) {
      for (var s = w[0]; s + dur <= w[1]; s += state.settings.pasCreneauxMin) {
        if (s === orig) continue;
        var info = checkStart(ctx, s);
        if (!info) continue;
        var dist = Math.abs(s - orig), bestDist = best ? Math.abs(best.start - orig) : Infinity;
        if (dist < bestDist || (dist === bestDist && s > orig)) best = info;
      }
    });
    return best ? { time: fromMin(best.start), debut: date + "T" + fromMin(best.start), fin: date + "T" + fromMin(best.end) } : null;
  }

  return {
    DEMI_JOURNEES: DEMI_JOURNEES,
    slotsForDay: slotsForDay,
    nextAvailability: nextAvailability,
    monthCalendar: monthCalendar,
    evaluateBooking: evaluateBooking,
    proposeAlternative: proposeAlternative,
    windowsFor: windowsFor,
    busyOn: busyOn,
    holds: holds,
    monthIsOpen: monthIsOpen,
    toMin: toMin,
    fromMin: fromMin,
    halfDay: halfDay
  };
})();
