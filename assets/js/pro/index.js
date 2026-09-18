/*
  pro/index.html — batch B23. Source: PRO R01, read in full. Every number
  here is derived live from data.js/store.js through the shared engine
  modules (availability.js/status.js/travel.js), not hardcoded from the
  maquette's own literal figures — same principle B25's own note states
  ("derive the timeline from the engine rather than hardcoding").
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var A = window.ENIOL_AVAILABILITY;

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function mondayOf(dateIso) {
    var d = D.parseLocal(dateIso);
    var dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    return isoDate(d);
  }
  function addDaysIso(dateIso, n) { var d = D.parseLocal(dateIso); d.setDate(d.getDate() + n); return isoDate(d); }

  // "Prochain RDV" (R01) is an appointment she's actually committed to —
  // a still-pending request (en_attente) holds its slot per availability.js
  // but isn't a real RDV yet, so it's excluded here even though A.holds()
  // itself counts it (that broader definition is right for the calendar's
  // own busy/free math, just not for this "what's coming up" card).
  var COMMITTED = { confirmee: true, acceptee_arrhes_attendues: true, nouveau_creneau_propose: true };
  function nextHeldBooking(state, now) {
    var out = null;
    state.bookings.forEach(function (b) {
      if (!b.debut || !COMMITTED[b.statut] || !A.holds(b, now)) return;
      if (D.parseLocal(b.debut) < now) return;
      if (!out || b.debut < out.debut) out = b;
    });
    return out;
  }

  // Real dropdown (per client feedback) — offers "Chez moi" plus any
  // day-override points from settings.departsDuJour. Picking one is
  // demo-only (departsDuJour stays date-keyed, not a live "current" flag)
  // but the control genuinely opens/closes and updates the pill's label.
  var departOverride = null;
  function renderDepart(state, todayIso) {
    var base = departOverride || (state.settings.departsDuJour && state.settings.departsDuJour[todayIso]) || state.settings.pointDeDepart;
    document.getElementById("depart-toggle").innerHTML = "Je pars de : <strong>" + base.libelle + " — " + base.arrondissement + "</strong> ▾";

    var options = [state.settings.pointDeDepart];
    Object.keys(state.settings.departsDuJour || {}).forEach(function (d) { options.push(state.settings.departsDuJour[d]); });
    document.getElementById("depart-menu").innerHTML = options.map(function (o) {
      return '<button type="button" class="depart-menu-item" data-libelle="' + o.libelle + '" data-arr="' + o.arrondissement + '">' + o.libelle + " — " + o.arrondissement + '</button>';
    }).join("");
  }

  function render() {
    var state = S.get(), now = S.now(), todayIso = isoDate(now);

    // ---- topbar ----
    document.getElementById("pro-date").textContent = D.formatDateLong(now) + " · " + D.formatTime(now);
    renderDepart(state, todayIso);

    // ---- requests banner ----
    var reqs = S.requestsToValidate();
    var banner = document.getElementById("requests-banner");
    banner.hidden = reqs.length === 0;
    if (reqs.length) {
      document.getElementById("requests-count").textContent = reqs.length;
      document.getElementById("requests-title").textContent = reqs.length + " demande" + (reqs.length > 1 ? "s" : "") + " à valider";
      var mostUrgent = reqs[0];
      document.getElementById("requests-sub").textContent = mostUrgent.repondreAvant
        ? "La plus urgente expire dans " + D.formatExpiry(D.parseLocal(mostUrgent.repondreAvant), now)
        : "";
    }

    // ---- prochain RDV ----
    var next = nextHeldBooking(state, now);
    var nextWrap = document.getElementById("next-rdv-wrap");
    var dayWrap = document.getElementById("day-timeline-wrap");
    if (!next) {
      nextWrap.innerHTML = '<div class="empty-state" style="margin-bottom:18px;"><p class="empty-state__heart">♡</p><p class="empty-state__title">Aucun rendez-vous à venir</p><p class="empty-state__desc">Profite de ta journée ♡</p></div>';
      dayWrap.innerHTML = "";
    } else {
      var svc = S.service(next.serviceId), cl = S.client(next.clienteId);
      var addr = next.adresseId ? S.address(next.adresseId) : null;
      var ev = A.evaluateBooking(state, next.id, now);
      var dateBadge = D.formatDateShort(D.parseLocal(next.debut));
      var travelLine = "";
      if (ev && ev.type === "trajet") travelLine = "🚇 " + ev.signal.label + (ev.partirA ? " · partir à " + ev.partirA : "");
      var addrLine = addr ? "📍 " + (addr.ligne1 ? addr.ligne1 + " · " + addr.zone.split(" · ")[0] : addr.zone) : (next.lieu === "sans_deplacement" ? "🏠 Sans déplacement" : "");
      var telHref = cl && cl.telephone ? "tel:" + cl.telephone : null;
      var mapsHref = addr && addr.ligne1 ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr.ligne1 + " " + addr.ville) : null;

      nextWrap.innerHTML =
        '<p class="next-rdv-eyebrow">PROCHAIN RDV</p>' +
        '<div class="next-rdv">' +
          '<div class="next-rdv__time"><strong>' + D.formatTime(D.parseLocal(next.debut)) + '</strong>' +
            (next.fin ? '<span class="end">→ ' + D.formatTime(D.parseLocal(next.fin)) + '</span>' : '') +
            '<span class="next-rdv__date">' + dateBadge + '</span></div>' +
          '<p class="next-rdv__name">' + (cl ? cl.prenom + " " + cl.nom : "") + '</p>' +
          '<p class="next-rdv__service">' + (svc ? svc.nom : "") + (next.prixEuros != null ? " · " + D.formatPrice(next.prixEuros) : "") + '</p>' +
          (addrLine ? '<p class="next-rdv__addr">' + addrLine + '</p>' : '') +
          (travelLine ? '<p class="next-rdv__travel">' + travelLine + '</p>' : '') +
          '<div class="next-rdv__actions">' +
            (mapsHref ? '<a class="btn btn--on-deep" href="' + mapsHref + '" target="_blank" rel="noopener">Itinéraire</a>' : '<span class="btn btn--on-deep" aria-disabled="true" style="opacity:.5;">Itinéraire</span>') +
            (telHref ? '<a class="btn btn--on-deep-secondary" href="' + telHref + '">Appeler</a>' : '<span class="btn btn--on-deep-secondary" aria-disabled="true" style="opacity:.5;">Appeler</span>') +
          '</div>' +
        '</div>';

      renderDayTimeline(state, now, next.debut.slice(0, 10), dayWrap);
    }

    // ---- stats ----
    var weekStart = mondayOf(next ? next.debut.slice(0, 10) : todayIso);
    var weekEnd = addDaysIso(weekStart, 7);
    var weekBookings = state.bookings.filter(function (b) {
      return b.debut && A.holds(b, now) && b.debut.slice(0, 10) >= weekStart && b.debut.slice(0, 10) < weekEnd;
    });
    var weekMs = weekBookings.reduce(function (sum, b) {
      var s = S.service(b.serviceId);
      var mins = b.fin ? (D.parseLocal(b.fin) - D.parseLocal(b.debut)) / 60000 : (s ? s.dureeMin : 0);
      return sum + mins;
    }, 0);
    document.getElementById("stat-week-count").textContent = weekBookings.length;
    document.getElementById("stat-week-sub").textContent = "RDV" + (weekMs ? " · " + D.formatDuration(weekMs * 60000) : "");

    var resteTotal = 0, arrhesTotal = 0;
    state.bookings.forEach(function (b) {
      if (["acceptee_arrhes_attendues", "confirmee"].indexOf(b.statut) < 0) return;
      resteTotal += Math.max(0, S.resteAEncaisser(b));
      if (b.statut === "acceptee_arrhes_attendues" && b.arrhesAttenduesEuros > 0) arrhesTotal += b.arrhesAttenduesEuros;
    });
    document.getElementById("stat-reste").textContent = D.formatPrice(resteTotal);
    document.getElementById("stat-reste-sub").textContent = arrhesTotal ? "dont " + D.formatPrice(arrhesTotal) + " d’arrhes" : "";

    // ---- month banner ----
    var open = state.settings.moisOuverts.slice().sort();
    var lastOpen = open[open.length - 1] || todayIso.slice(0, 7);
    var nextMonth = addDaysIso(lastOpen + "-01", 32).slice(0, 7);
    document.getElementById("month-banner").innerHTML =
      '<p style="flex:1;"><span class="month-banner__title">' + monthNameOnly(lastOpen).replace(/^./, function (c) { return c.toUpperCase(); }) + ' est ouvert</span>' +
      '<span class="month-banner__sub" style="display:block;">' + monthNameOnly(nextMonth).replace(/^./, function (c) { return c.toUpperCase(); }) + ' est encore fermé aux réservations.</span></p>' +
      '<a class="btn btn--secondary" href="disponibilites.html">Ouvrir ' + monthNameOnly(nextMonth) + '</a>';
  }

  function monthNameOnly(yyyyMm) {
    var d = D.parseLocal(yyyyMm + "-01");
    return D.MONTHS_LONG[d.getMonth()];
  }

  // R01's mini timeline: day title is "SAMEDI 19 · MA JOURNÉE" (day name +
  // day number only, no month) — distinct from agenda.html's own day title
  // ("samedi 19 septembre"), which spells the month out in full.
  function renderDayTimeline(state, now, date, wrap) {
    var busy = A.busyOn(state, date, now);
    if (!busy.length) { wrap.innerHTML = ""; return; }
    var dd = D.parseLocal(date);
    var dayLabel = D.DAYS_LONG[dd.getDay()].toUpperCase() + " " + dd.getDate();

    var dots = "", cards = "";
    busy.forEach(function (o, i) {
      var svc = S.service(o.booking.serviceId), cl = S.client(o.booking.clienteId);
      var danger = o.booking.statut === "en_attente";
      dots += '<span class="day-timeline__dot' + (danger ? "--pending" : "") + '"></span>';
      if (i < busy.length - 1) dots += '<span class="day-timeline__line"></span>';

      var locSuffix = danger ? " · demande à valider" : (o.booking.statut === "confirmee" ? " · arrhes reçues" : (o.booking.statut === "acceptee_arrhes_attendues" ? " · arrhes en attente" : ""));
      var addr = o.booking.adresseId ? S.address(o.booking.adresseId) : null;
      cards += '<div class="day-timeline__card' + (danger ? " day-timeline__card--danger" : "") + '" data-rdv-id="' + o.booking.id + '">' +
        '<div class="day-timeline__card-head"><p>' + A.fromMin(o.start) + '–' + A.fromMin(o.end) + '</p>' + statutChip(o.booking.statut) + '</div>' +
        '<p class="day-timeline__card-name">' + (cl ? cl.prenom + " " + cl.nom : "") + " · " + (svc ? svc.nom : "") + '</p>' +
        '<p class="day-timeline__card-sub">' + (addr ? addr.zone : (o.booking.lieu === "sans_deplacement" ? "Sans déplacement" : "")) + locSuffix + '</p>' +
      '</div>';

      var next = busy[i + 1];
      if (next) {
        var ev = A.evaluateBooking(state, o.booking.id, now);
        var s = ev && ev.suivant;
        var gapDanger = s && s.fit.level === "ne_tient_pas";
        var nextEv = A.evaluateBooking(state, next.booking.id, now);
        cards += '<p class="day-timeline__gap' + (gapDanger ? " day-timeline__gap--danger" : "") + '">' +
          (s ? T_label(s) + (gapDanger ? "" : " · Temps libre · " + nextEv.tempsLibreMin + " min") : "") + '</p>';
      }
    });

    wrap.innerHTML = '<div class="day-timeline">' +
      '<div class="day-timeline__eyebrow-row"><p class="section-eyebrow">' + dayLabel + ' · MA JOURNÉE</p><a href="agenda.html">Agenda</a></div>' +
      '<div class="day-timeline__body"><div class="day-timeline__rail">' + dots + '</div><div class="day-timeline__cards">' + cards + '</div></div>' +
    '</div>';
    wrap.querySelectorAll("[data-rdv-id]").forEach(function (card) {
      card.addEventListener("click", function () { window.location.href = "rdv.html?id=" + card.dataset.rdvId; });
    });
  }

  function T_label(suivant) {
    if (suivant.fit.level === "ne_tient_pas") return "🚇 ≈ " + suivant.trajetMin + " min · il manque ≈ " + (suivant.trajetMin - suivant.ecartMin) + " min";
    var partirA = A.fromMin(A.toMin(suivant.debut) - suivant.trajetMin);
    return "🚇 ≈ " + suivant.trajetMin + " min · partir à " + partirA;
  }

  function statutChip(statut) {
    var map = {
      confirmee: ["chip--ok", "✓ Confirmée"],
      acceptee_arrhes_attendues: ["chip--warn", "◔ Arrhes en attente"],
      en_attente: ["chip--warn", "◌ Demande en attente"]
    };
    var m = map[statut] || ["chip--outline", statut];
    return '<span class="chip ' + m[0] + '">' + m[1] + '</span>';
  }

  document.getElementById("depart-toggle").addEventListener("click", function (e) {
    e.stopPropagation();
    var menu = document.getElementById("depart-menu");
    var open = menu.hidden;
    menu.hidden = !open;
    this.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.getElementById("depart-menu").addEventListener("click", function (e) {
    var btn = e.target.closest(".depart-menu-item");
    if (!btn) return;
    departOverride = { libelle: btn.dataset.libelle, arrondissement: btn.dataset.arr };
    document.getElementById("depart-menu").hidden = true;
    document.getElementById("depart-toggle").setAttribute("aria-expanded", "false");
    render();
  });
  document.addEventListener("click", function () { document.getElementById("depart-menu").hidden = true; });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
  S.subscribe(render);
})();
