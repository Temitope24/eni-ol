/*
  pro/agenda.html — batches B25 (Jour/Liste/Carte) + B26 (Semaine + panel).
  Source: PRO R04, R05, R12, all read in full (see the HTML file's own
  header comment for what's drawn vs. extrapolated).
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var A = window.ENIOL_AVAILABILITY;
  var T = window.ENIOL_TRAVEL;
  var RA = window.ENIOL_REQUEST_ACTIONS;
  var M = window.ENIOL_MOTION;

  var view = "jour";
  var selectedDate = null;

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function addDaysIso(dateIso, n) { var d = D.parseLocal(dateIso); d.setDate(d.getDate() + n); return isoDate(d); }
  function mondayOf(dateIso) { var d = D.parseLocal(dateIso); var dow = d.getDay(); d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow)); return isoDate(d); }
  function dayBase(state, date) { return (state.settings.departsDuJour && state.settings.departsDuJour[date]) || state.settings.pointDeDepart; }

  var STATUT_CHIP = {
    confirmee: ["chip--ok", "✓ Confirmée"], acceptee_arrhes_attendues: ["chip--warn", "◔ Arrhes en attente"],
    nouveau_creneau_propose: ["chip--warn", "◔ Proposition envoyée"], en_attente: ["chip--warn", "◌ Demande en attente"]
  };

  // ---------------------------------------------------------------------
  // Init / view switching
  // ---------------------------------------------------------------------
  function todayIso() { return isoDate(S.now()); }

  function pickDefaultDate(state, now) {
    var out = null;
    state.bookings.forEach(function (b) {
      if (!b.debut || !A.holds(b, now)) return;
      if (D.parseLocal(b.debut) < now) return;
      if (!out || b.debut < out) out = b.debut;
    });
    return out ? out.slice(0, 10) : todayIso();
  }

  var segmentedPlace = M.segmented(document.getElementById("agenda-tabs"));

  function setView(v) {
    view = v;
    document.body.classList.toggle("view-semaine", v === "semaine");
    ["jour", "semaine", "liste", "carte"].forEach(function (k) {
      document.getElementById("view-" + k).hidden = k !== v;
    });
    render();
  }
  document.querySelectorAll('#agenda-tabs input[name="agenda-view-r"]').forEach(function (r) {
    r.addEventListener("change", function () { setView(this.value); });
  });
  document.getElementById("agenda-today").addEventListener("click", function (e) {
    e.preventDefault();
    selectedDate = todayIso();
    render();
  });

  // ---------------------------------------------------------------------
  // Date strip — dates with activity in the next 45 days (skip empty days,
  // same "jump to the next day that has something" pattern already used
  // in reserver.html's own availability list).
  // ---------------------------------------------------------------------
  function renderDateStrip(state, now) {
    var strip = document.getElementById("date-strip");
    var d = todayIso(), out = [];
    for (var i = 0; i < 45 && out.length < 8; i++) {
      if (A.busyOn(state, d, now).length || d === selectedDate) out.push(d);
      d = addDaysIso(d, 1);
    }
    if (out.indexOf(selectedDate) < 0) out.push(selectedDate);
    out.sort();
    strip.innerHTML = out.map(function (date) {
      var dd = D.parseLocal(date);
      return '<button type="button" data-date="' + date + '" class="' + (date === selectedDate ? "is-active" : "") + '">' +
        D.DAYS_LONG[dd.getDay()].slice(0, 3) + '.<br>' + dd.getDate() + '</button>';
    }).join("");
    strip.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () { selectedDate = b.dataset.date; render(); });
    });
  }

  // ---------------------------------------------------------------------
  // Jour — full day timeline (R04)
  // ---------------------------------------------------------------------
  function statutChip(statut) {
    var m = STATUT_CHIP[statut] || ["chip--outline", statut];
    return '<span class="chip ' + m[0] + '">' + m[1] + '</span>';
  }

  function renderJour(state, now, date) {
    var wrap = document.getElementById("view-jour");
    var busy = A.busyOn(state, date, now);
    var dd = D.parseLocal(date);
    var head = '<div class="jour-title"><h2>' + D.formatDateLong(dd) + '</h2><span>' + busy.length + ' RDV' +
      (busy.length ? " · " + D.formatDuration(busy.reduce(function (s, o) { return s + (o.end - o.start); }, 0) * 60000) : "") + '</span></div>';

    if (!busy.length) {
      wrap.innerHTML = head + '<div class="empty-state"><p class="empty-state__heart">♡</p><p class="empty-state__title">Rien de prévu ce jour-là</p></div>';
      return;
    }

    var rows = "";
    var base = dayBase(state, date);
    var firstEv = A.evaluateBooking(state, busy[0].booking.id, now);
    if (firstEv.type === "trajet" && firstEv.arrivee.depuis === "base") {
      rows += '<div class="day-timeline__row"><span class="day-timeline__time">' + firstEv.partirA + '</span><div class="day-timeline__rail"><p class="day-timeline__note" style="color:var(--ink-body);">🏠 Départ de ' + base.libelle + ' — ' + base.arrondissement + ' · <strong>partir à ' + firstEv.partirA + '</strong></p></div></div>';
    }

    busy.forEach(function (o, i) {
      var b = o.booking, svc = S.service(b.serviceId), cl = S.client(b.clienteId);
      var danger = b.statut === "en_attente";
      var addr = b.adresseId ? S.address(b.adresseId) : null;
      var railClass = danger ? "day-timeline__rail--pending" : "day-timeline__rail--event";
      var locSuffix = danger ? " · demande à valider" : (b.statut === "confirmee" ? " · arrhes reçues" : (b.statut === "acceptee_arrhes_attendues" ? " · arrhes en attente" : ""));
      var evSelf = A.evaluateBooking(state, b.id, now);
      var manqueLine = evSelf.type === "trajet" && evSelf.arrivee.fit.level === "ne_tient_pas"
        ? '<p class="day-timeline__card-loc" style="color:var(--state-danger-ink);">✕ Ne tient pas : il manque ≈ ' + evSelf.arrivee.fit.manqueMin + ' min</p>' : "";
      rows += '<div class="day-timeline__row"><span class="day-timeline__time">' + A.fromMin(o.start) + '</span>' +
        '<div class="day-timeline__rail ' + railClass + '"><div class="day-timeline__card' + (danger ? " day-timeline__card--danger" : "") + '" data-rdv-id="' + b.id + '" style="cursor:pointer;">' +
          '<div class="day-timeline__card-head"><p>' + A.fromMin(o.start) + '–' + A.fromMin(o.end) + '</p>' + statutChip(b.statut) + '</div>' +
          '<p class="day-timeline__card-name">' + cl.prenom + " " + cl.nom + (cl.tags && cl.tags.indexOf("nouvelle") >= 0 ? ' <span style="font-weight:400; font-size:13px; color:var(--ink-2);">· nouvelle</span>' : '') + '</p>' +
          '<p class="day-timeline__card-sub">' + svc.nom + (b.prixEuros != null ? " · " + D.formatPrice(b.prixEuros) : "") + '</p>' +
          (addr ? '<p class="day-timeline__card-loc">📍 ' + addr.zone + locSuffix + '</p>' : (b.lieu === "sans_deplacement" ? '<p class="day-timeline__card-loc">🏠 Sans déplacement</p>' : "")) +
          manqueLine +
          (danger ? '<div class="day-timeline__card-actions"><button type="button" class="btn btn--primary" data-action="proposer" data-id="' + b.id + '" style="padding:12px 14px; min-height:0;">Proposer un créneau</button><a class="btn btn--secondary" href="demandes.html" style="padding:12px 14px; min-height:0;">Voir la demande</a></div>' : "") +
        '</div></div></div>';

      var next = busy[i + 1];
      if (next) {
        var ev = A.evaluateBooking(state, b.id, now);
        var s = ev.suivant;
        if (s) {
          var gapDanger = s.fit.level === "ne_tient_pas";
          var partirA = A.fromMin(A.toMin(s.debut) - s.trajetMin);
          // Temps libre is the idle time BEFORE the next booking, i.e. that
          // booking's own tempsLibreMin (computed against ITS prev, which is
          // this one) — not this booking's own (which reflects the gap
          // before IT, unrelated to the gap that follows it).
          var nextEv = A.evaluateBooking(state, next.booking.id, now);
          rows += '<div class="day-timeline__row"><span class="day-timeline__time"></span><div class="day-timeline__gap-inner">' +
            '<div class="day-timeline__gap-rail-col' + (gapDanger ? " day-timeline__gap-rail-col--danger" : "") + '"><span></span></div>' +
            '<div class="day-timeline__gap-content">' +
              '<p class="day-timeline__note" style="' + (gapDanger ? "color:var(--state-danger-ink);" : "") + '">🚇 ≈ ' + s.trajetMin + ' min' + (gapDanger ? ' nécessaires · écart de ' + s.ecartMin + ' min' : ' · <strong>partir à ' + partirA + '</strong>') + ' <span class="chip ' + (gapDanger ? "chip--danger" : "chip--ok") + '" style="margin-left:4px;">' + (gapDanger ? "✕ Ne tient pas" : "✓ OK") + '</span></p>' +
              (!gapDanger ? '<p class="day-timeline__note" style="color:var(--ink-2); margin-top:4px;">Temps libre · ' + nextEv.tempsLibreMin + ' min</p>' : "") +
            '</div>' +
          '</div></div>';
        }
      } else {
        var lastEv = A.evaluateBooking(state, b.id, now);
        if (lastEv.type === "trajet") {
          var loc = addr;
          var retourMin = loc ? T.estimateMinutes(loc, base) : null;
          rows += '<div class="day-timeline__row"><span class="day-timeline__time">' + A.fromMin(o.end) + '</span><div class="day-timeline__rail"><p class="day-timeline__note" style="color:var(--ink-2);">Fin de journée' + (retourMin ? " · retour ≈ " + retourMin + " min" : "") + '</p></div></div>';
        }
      }
    });

    wrap.innerHTML = head + rows;
    wrap.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function (e) { e.stopPropagation(); RA.openProposer(btn.dataset.id); });
    });
    wrap.querySelectorAll("[data-rdv-id]").forEach(function (card) {
      card.addEventListener("click", function () { window.location.href = "rdv.html?id=" + card.dataset.rdvId; });
    });
  }

  // ---------------------------------------------------------------------
  // Liste — grouped upcoming bookings (no artboard; extrapolated)
  // ---------------------------------------------------------------------
  function renderListe(state, now) {
    var wrap = document.getElementById("view-liste");
    var byDate = {};
    state.bookings.forEach(function (b) {
      if (!b.debut || !A.holds(b, now) || D.parseLocal(b.debut) < now) return;
      var d = b.debut.slice(0, 10);
      (byDate[d] = byDate[d] || []).push(b);
    });
    var dates = Object.keys(byDate).sort();
    if (!dates.length) { wrap.innerHTML = '<div class="empty-state"><p class="empty-state__title">Rien à venir</p></div>'; return; }
    wrap.innerHTML = dates.map(function (d) {
      var items = byDate[d].sort(function (a, c) { return a.debut < c.debut ? -1 : 1; });
      return '<div class="liste-group"><p class="liste-group__date">' + D.formatDateLong(D.parseLocal(d)) + '</p>' +
        items.map(function (b) {
          var svc = S.service(b.serviceId), cl = S.client(b.clienteId);
          return '<a class="req-row" href="rdv.html?id=' + b.id + '" style="margin-bottom:8px;">' +
            '<span><p class="req-row__name">' + D.formatTime(D.parseLocal(b.debut)) + ' · ' + cl.prenom + " " + cl.nom + '</p><p class="req-row__sub">' + svc.nom + '</p></span>' +
            statutChip(b.statut) + '</a>';
        }).join("") +
      '</div>';
    }).join("");
  }

  // ---------------------------------------------------------------------
  // Carte — stylized SVG + ordered list (R05)
  // ---------------------------------------------------------------------
  function renderCarte(state, now, date) {
    var wrap = document.getElementById("view-carte");
    var busy = A.busyOn(state, date, now);
    var base = dayBase(state, date);
    var head = '<p style="margin:0 0 12px; font-size:13.5px; color:var(--ink-2);">' + D.formatDateLong(D.parseLocal(date)) + ' · ' + busy.length + ' RDV</p>';
    if (!busy.length) { wrap.innerHTML = head + '<div class="empty-state"><p class="empty-state__title">Rien à placer sur la carte</p></div>'; return; }

    // R05 is an explicitly stylised map ("SVG stylisé, aucune tuile"), so its
    // pins sit in the artboard's own three slots rather than at real
    // coordinates. settings.maxRdvParJour is 3, so those cover every demo
    // day; a 4th+ stop falls back to an arc.
    var SLOTS = [{ x: 196, y: 88 }, { x: 248, y: 132 }, { x: 86, y: 160 }];
    var DX = 126, DY = 72; // "départ", where R05 places it
    function shortZone(z) {
      if (!z) return "";
      return z.split(" · ")[0].replace(/^Paris\s+/, "").replace(/\s*\(\d+\)$/, "");
    }
    var pins = busy.map(function (o, i) {
      var slot = SLOTS[i];
      if (!slot) {
        var angle = -Math.PI / 2 + (i + 1) * (Math.PI * 1.3 / (busy.length + 1));
        slot = { x: 150 + 90 * Math.cos(angle), y: 118 + 90 * Math.sin(angle) };
      }
      return { x: slot.x, y: slot.y, o: o, i: i + 1 };
    });

    var svg = '<svg viewBox="0 0 300 240" style="width:100%; height:auto; display:block;">' +
      '<rect x="0" y="0" width="300" height="240" fill="var(--sand)"></rect>' +
      '<circle cx="150" cy="118" r="88" fill="#DFD1BE" stroke="#C9B8A3" stroke-width="1"></circle>' +
      '<circle cx="150" cy="118" r="58" fill="#D6C6B0" stroke="#C9B8A3" stroke-width="1"></circle>' +
      // the Seine, and the petite-couronne ring around the city
      '<path d="M40 130 q60 -26 120 -6 t100 -4" stroke="#A8BAC4" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.7"></path>' +
      '<circle cx="150" cy="118" r="120" fill="none" stroke="#C9B8A3" stroke-width="1" stroke-dasharray="4 5"></circle>' +
      '<text x="150" y="20" text-anchor="middle" font-family="DM Mono, monospace" font-size="9" fill="var(--ink-3)">PARIS + PETITE COURONNE</text>' +
      '<circle cx="' + DX + '" cy="' + DY + '" r="9" fill="var(--deep)"></circle>' +
      '<text x="' + DX + '" y="' + (DY + 4) + '" text-anchor="middle" font-family="DM Mono, monospace" font-size="9" fill="var(--ground)">D</text>' +
      '<text x="' + DX + '" y="' + (DY - 14) + '" text-anchor="middle" font-family="DM Mono, monospace" font-size="8" fill="var(--ink-body)">départ · ' + shortZone(base.arrondissement) + '</text>';

    pins.forEach(function (p) {
      var b = p.o.booking, pending = b.statut === "en_attente";
      var addr = b.adresseId ? S.address(b.adresseId) : null;
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="11" ' + (pending ? 'fill="none" stroke="var(--state-warn-ink)" stroke-width="2" stroke-dasharray="3 3"' : 'fill="var(--action)"') + '></circle>' +
        '<text x="' + p.x + '" y="' + (p.y + 4) + '" text-anchor="middle" font-family="DM Mono, monospace" font-size="10" fill="' + (pending ? "var(--state-warn-ink)" : "var(--surface)") + '">' + p.i + '</text>' +
        '<text x="' + p.x + '" y="' + (p.i === 1 ? p.y - 16 : p.y + 24) + '" text-anchor="middle" font-family="DM Mono, monospace" font-size="8" fill="' + (pending ? "var(--state-warn-ink)" : "var(--ink-body)") + '">' +
          A.fromMin(p.o.start) + ' · ' + shortZone(addr ? addr.zone : "") + (pending ? " (attente)" : "") + '</text>';
    });

    // R05 chains the route départ → 1 → 2 → 3 (not a star out of D), and
    // draws the hop into a stop whose travel doesn't fit in red.
    pins.forEach(function (p, i) {
      var from = i === 0 ? { x: DX, y: DY } : pins[i - 1];
      var ev = A.evaluateBooking(state, p.o.booking.id, now);
      var bad = ev && ev.type === "trajet" && ev.arrivee.fit.level === "ne_tient_pas";
      svg += '<path d="M' + from.x + ' ' + from.y + ' L' + p.x + ' ' + p.y + '" stroke="' + (bad ? "var(--state-danger-ink)" : "var(--ink)") + '" stroke-width="1.5" stroke-dasharray="3 3"></path>';
    });
    svg += '</svg>';

    var legend = '<div class="carte-legend">' +
      '<span><span class="carte-dot" style="background:var(--action);"></span>RDV accepté</span>' +
      '<span><span class="carte-dot" style="border:2px dashed var(--state-warn-ink);"></span>Demande en attente</span>' +
      '<span><span class="carte-dot" style="background:var(--deep);"></span>Point de départ</span>' +
    '</div>';

    var list = '<div class="carte-list">' + pins.map(function (p) {
      var b = p.o.booking, cl = S.client(b.clienteId), addr = S.address(b.adresseId);
      var pending = b.statut === "en_attente";
      return '<div class="carte-row' + (pending ? " carte-row--pending" : "") + '"><span class="carte-row__num">' + p.i + '</span>' +
        '<div><p style="margin:0; font-weight:600; font-size:15px;">' + A.fromMin(p.o.start) + ' · ' + cl.prenom + " " + cl.nom + (pending ? ' <span style="font-weight:400; color:var(--ink-2); font-size:13px;">· en attente</span>' : '') + '</p>' +
        '<p style="margin:2px 0 0; font-size:13px; color:' + (pending ? "var(--state-danger-ink)" : "var(--ink-2)") + ';">' + (addr ? addr.zone : "") + '</p></div></div>';
    }).join("") + '</div>';

    wrap.innerHTML = head + '<div class="carte-box">' + svg + legend + '</div>' + list;
  }

  // ---------------------------------------------------------------------
  // Semaine — week grid + requests panel (R12, desktop)
  // ---------------------------------------------------------------------
  var AXIS_START = 8 * 60, AXIS_END = 20 * 60; // 08:00–20:00

  function renderSemaine(state, now, weekStart) {
    var grid = document.getElementById("week-grid");
    var hours = [];
    for (var h = AXIS_START / 60; h <= AXIS_END / 60; h++) hours.push(h);
    var axisH = AXIS_END - AXIS_START;
    var pxPerMin = 1;

    var html = '<div class="week-grid__gutter-head"></div>';
    var days = [];
    for (var i = 0; i < 7; i++) days.push(addDaysIso(weekStart, i));
    days.forEach(function (d) {
      var dd = D.parseLocal(d);
      html += '<div class="week-grid__daycol-head"><p class="dow">' + D.DAYS_LONG[dd.getDay()].slice(0, 3).toUpperCase() + '</p><p class="dom">' + dd.getDate() + '</p></div>';
    });

    html += '<div class="week-grid__gutter" style="grid-column:1; display:flex; flex-direction:column;">' +
      hours.map(function (h) { return '<div class="week-grid__hour-label" style="height:' + (60 * pxPerMin) + 'px;">' + pad2(h) + ':00</div>'; }).join("") + '</div>';

    days.forEach(function (d) {
      var busy = A.busyOn(state, d, now);
      var inner = "";
      busy.forEach(function (o) {
        var top = Math.max(0, (o.start - AXIS_START) * pxPerMin);
        var height = Math.max(20, (o.end - o.start) * pxPerMin);
        var cl = S.client(o.booking.clienteId);
        var pending = o.booking.statut === "en_attente";
        var danger = false;
        var ev = A.evaluateBooking(state, o.booking.id, now);
        if (ev.type === "trajet" && ev.arrivee.fit.level === "ne_tient_pas") danger = true;
        var cls = danger ? "week-event--danger" : (pending ? "week-event--pending" : "");
        inner += '<a class="week-event ' + cls + '" href="rdv.html?id=' + o.booking.id + '" style="top:' + top + 'px; height:' + height + 'px;">' +
          '<p class="week-event__time">' + A.fromMin(o.start) + '–' + A.fromMin(o.end) + '</p><p class="week-event__name">' + cl.prenom + " " + cl.nom.slice(0, 1) + '.</p></a>';
      });
      html += '<div class="week-grid__daycol" style="height:' + (axisH * pxPerMin) + 'px;">' + inner + '</div>';
    });

    grid.innerHTML = html;
    renderSide(state, now);
  }

  function sideRequestCard(state, now, b) {
    var svc = S.service(b.serviceId), cl = S.client(b.clienteId);
    var isProjet = svc.modeReservation === "projet";
    var attention = false, signal = "";
    if (!isProjet) {
      var ev = A.evaluateBooking(state, b.id, now);
      if (ev.type === "trajet") {
        attention = ev.signal.level === "ne_tient_pas";
        signal = '<p class="side-request__signal" style="color:var(--state-' + (ev.signal.tone === "ok" ? "ok" : (ev.signal.tone === "danger" ? "danger" : "warn")) + '-ink);">' + ev.signal.label + '</p>';
      }
    }
    var expiry = b.repondreAvant ? D.formatExpiry(D.parseLocal(b.repondreAvant), now) : "";
    var actions = isProjet
      ? '<a class="btn btn--secondary" href="demandes.html" style="flex:1; padding:11px 8px; min-height:0;">Ouvrir</a>'
      : (attention
        ? '<button type="button" class="btn btn--primary" data-action="proposer" data-id="' + b.id + '" style="flex:1; padding:11px 8px; min-height:0;">Proposer</button><a class="btn btn--secondary" href="demandes.html" style="flex:1; padding:11px 8px; min-height:0;">Ouvrir</a>'
        : '<button type="button" class="btn btn--primary" data-action="accepter" data-id="' + b.id + '" style="flex:1; padding:11px 8px; min-height:0;">Accepter</button><a class="btn btn--secondary" href="demandes.html" style="flex:1; padding:11px 8px; min-height:0;">Ouvrir</a>');

    return '<div class="side-request' + (attention ? " side-request--attention" : "") + '">' +
      '<div class="side-request__head"><p>' + cl.prenom + " " + cl.nom + '</p><span style="font-family:var(--font-mono); font-size:11.5px; color:' + (attention ? "var(--state-danger-ink)" : "var(--ink-2)") + ';">' + expiry + '</span></div>' +
      '<p class="side-request__meta">' + svc.nom + (b.debut ? " · " + D.formatDateShort(D.parseLocal(b.debut)) + " · " + D.formatTime(D.parseLocal(b.debut)) : "") + (b.prixEuros != null ? " · " + D.formatPrice(b.prixEuros) : "") + '</p>' +
      signal +
      '<div class="side-request__actions">' + actions + '</div>' +
    '</div>';
  }

  function renderSide(state, now) {
    var side = document.getElementById("agenda-side");
    var reqs = S.requestsToValidate();
    var monthOpen = state.settings.moisOuverts.slice().sort();
    var lastOpen = monthOpen[monthOpen.length - 1] || todayIso().slice(0, 7);
    var nextMonth = addDaysIso(lastOpen + "-01", 32).slice(0, 7);
    var nextClosed = monthOpen.indexOf(nextMonth) < 0;

    side.innerHTML =
      '<div style="display:flex; align-items:baseline; gap:8px;"><p style="margin:0; font-family:var(--font-display); font-size:22px;">À valider</p>' +
      (reqs.length ? '<span style="background:var(--state-danger-ink); color:var(--surface); border-radius:999px; font-family:var(--font-mono); font-size:11px; padding:2px 7px;">' + reqs.length + '</span>' : '') + '</div>' +
      '<p style="margin:0; font-size:13px; color:var(--ink-2);">Ouvre une demande pour l’accepter ou lui proposer un autre créneau.</p>' +
      (reqs.length ? reqs.map(function (b) { return sideRequestCard(state, now, b); }).join("") : '<div class="empty-state"><p class="empty-state__heart">♡</p><p class="empty-state__title">Aucune demande à valider</p></div>') +
      (nextClosed ? '<div style="margin-top:auto; background:var(--sand); border-radius:12px; padding:12px;"><p style="margin:0; font-size:13px;">' + monthLabel(nextMonth) + ' est fermé aux réservations. <a href="disponibilites.html">Ouvrir</a></p></div>' : "");

    side.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.dataset.action === "accepter") RA.openAccepter(btn.dataset.id);
        else RA.openProposer(btn.dataset.id);
      });
    });
  }

  function monthLabel(yyyyMm) {
    var d = D.parseLocal(yyyyMm + "-01");
    return D.MONTHS_LONG[d.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + " " + d.getFullYear();
  }

  // ---------------------------------------------------------------------
  // Render dispatch
  // ---------------------------------------------------------------------
  function render() {
    var state = S.get(), now = S.now();
    if (!selectedDate) selectedDate = pickDefaultDate(state, now);

    var base = dayBase(state, selectedDate);
    document.getElementById("agenda-depart").innerHTML = "Je pars de : <strong>" + base.libelle + " — " + base.arrondissement + "</strong> ▾";

    renderDateStrip(state, now);

    if (view === "jour") renderJour(state, now, selectedDate);
    else if (view === "liste") renderListe(state, now);
    else if (view === "carte") renderCarte(state, now, selectedDate);
    else if (view === "semaine") renderSemaine(state, now, mondayOf(selectedDate));
  }

  setView("jour");
  S.subscribe(render);
})();
