/*
  pro/demandes.html — batch B24. Source: PRO R02 (request-card, all 4
  variants), read in full. Accept/Propose/Refuse/Devis sheets live in
  request-actions.js (shared with pro/agenda.html's R12 requests panel).
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var A = window.ENIOL_AVAILABILITY;
  var RA = window.ENIOL_REQUEST_ACTIONS;

  var activeTab = "valider";

  // ---------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------
  function placeUnderline() {
    var active = document.querySelector(".req-tabs button.is-active");
    var underline = document.getElementById("req-tabs-underline");
    if (!active || !underline) return;
    underline.style.width = active.offsetWidth + "px";
    underline.style.transform = "translateX(" + active.offsetLeft + "px)";
  }
  function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".req-tabs button").forEach(function (b) { b.classList.toggle("is-active", b.dataset.tab === tab); });
    placeUnderline();
    render();
  }
  document.querySelectorAll(".req-tabs button").forEach(function (b) {
    b.addEventListener("click", function () { setTab(b.dataset.tab); });
  });
  placeUnderline();
  if (window.ResizeObserver) new ResizeObserver(placeUnderline).observe(document.getElementById("req-tabs"));

  // ---------------------------------------------------------------------
  // À valider — request cards
  // ---------------------------------------------------------------------
  function tagHtml(cl, isProjet) {
    if (isProjet) return '<span class="chip chip--projet">✦ Projet · devis à envoyer</span>';
    if (!cl) return "";
    if (cl.tags && cl.tags.indexOf("nouvelle") >= 0) return '<span class="request-card__tag">Nouvelle cliente</span>';
    var n = (cl.stats ? cl.stats.rdv : 0) + 1;
    return '<span class="request-card__tag" style="background:var(--sand); color:var(--ink);">' + n + 'ᵉ RDV</span>';
  }
  function formatTypeLace(s) { return (s || "").replace(/_/g, " ").replace(/(\d)x(\d)/, "$1×$2"); }

  function requestCard(state, now, b) {
    var svc = S.service(b.serviceId), cl = S.client(b.clienteId);
    var isProjet = svc.modeReservation === "projet";
    var urgent = b.repondreAvant && (D.parseLocal(b.repondreAvant) - now) < 6 * 3600000;
    var expiryHtml = isProjet
      ? '<p class="request-card__expiry">Devis sous ' + (svc.devisSousHeures || 48) + ' h</p>'
      : (b.repondreAvant ? '<p class="request-card__expiry' + (urgent ? " request-card__expiry--urgent" : "") + '">Expire dans ' + D.formatExpiry(D.parseLocal(b.repondreAvant), now) + '</p>' : "");

    var cardClass = "request-card";
    var travelBox = "", actions = "";

    if (isProjet) {
      cardClass += " request-card--project";
      var p = b.projet || {};
      travelBox =
        '<div class="request-card__travel-box">' +
          '<p class="muted">🏠 Sans déplacement · pas de trajet</p>' +
          '<p>' + [p.envies && p.envies.longueurPouces ? p.envies.longueurPouces + '"' : null, p.envies && p.envies.densitePct ? p.envies.densitePct + " %" : null, p.envies && p.envies.texture, p.envies && p.envies.couleur, p.envies && p.envies.typeLace ? formatTypeLace(p.envies.typeLace) : null].filter(Boolean).join(" · ") + '</p>' +
          (p.mesuresConnues === false ? '<p class="muted">Mesures : « je préfère qu’Eni’ol les prenne » → visite à prévoir</p>' : "") +
        '</div>';
      actions =
        '<button type="button" class="btn btn--primary" data-action="devis" data-id="' + b.id + '">Préparer le devis</button>' +
        '<button type="button" class="btn btn--secondary" data-action="questions" data-id="' + b.id + '">Poser des questions</button>';
    } else {
      var ev = A.evaluateBooking(state, b.id, now);
      var level = ev.type === "trajet" ? ev.signal.level : "ok";
      var tone = ev.type === "trajet" ? ev.signal.tone : "ok";
      if (level === "ne_tient_pas") cardClass += " request-card--attention";

      var lines = [];
      if (ev.type === "sans_deplacement") lines.push('<p class="muted">🏠 Sans déplacement</p>');
      else if (ev.type === "trajet") {
        lines.push("<p>📍 " + RA.addressLine(b) + "</p>");
        if (ev.arrivee.depuis === "rdv") {
          var prevB = S.booking(ev.arrivee.rdvId), prevCl = S.client(prevB.clienteId), prevAddr = S.address(prevB.adresseId);
          lines.push('<p class="muted">↑ depuis ' + prevCl.prenom + " " + prevCl.nom + " (" + (prevAddr ? prevAddr.zone + ", " : "") + "fin " + ev.arrivee.rdvFin + ") · <strong>≈ " + ev.arrivee.trajetMin + " min</strong></p>");
        } else {
          lines.push('<p class="muted">↑ premier RDV du jour, depuis ' + ev.arrivee.baseLabel + '</p>');
        }
        lines.push('<p class="muted">↓ ' + (ev.suivant ? "RDV suivant à " + ev.suivant.debut : "aucun RDV après") + '</p>');
        lines.push('<span class="chip chip--' + tone + '">' + ev.signal.label + '</span>');
        if (ev.loin && ev.allerRetourMin) lines.push('<p class="muted">Aller-retour ≈ ' + D.formatDuration(ev.allerRetourMin * 60000) + ' pour ' + D.formatDuration((svc.dureeMin || 0) * 60000) + ' de pose.</p>');
      }
      travelBox = '<div class="request-card__travel-box">' + lines.join("") + '</div>';

      if (level === "ne_tient_pas") {
        actions =
          '<button type="button" class="btn btn--sand" data-action="accepter" data-id="' + b.id + '">Accepter quand même</button>' +
          '<button type="button" class="btn btn--primary" data-action="proposer" data-id="' + b.id + '">Proposer ' + (proposedTime(state, now, b) || "un autre créneau") + '</button>' +
          '<button type="button" class="btn btn--destructive" data-action="refuser" data-id="' + b.id + '">Refuser</button>';
      } else if (level === "loin") {
        actions =
          '<button type="button" class="btn btn--primary" data-action="accepter" data-id="' + b.id + '">Accepter + frais</button>' +
          '<button type="button" class="btn btn--secondary" data-action="proposer" data-id="' + b.id + '">Autre créneau</button>' +
          '<button type="button" class="btn btn--destructive" data-action="refuser" data-id="' + b.id + '">Refuser</button>';
      } else {
        actions =
          '<button type="button" class="btn btn--primary" data-action="accepter" data-id="' + b.id + '">Accepter</button>' +
          '<button type="button" class="btn btn--secondary" data-action="proposer" data-id="' + b.id + '">Autre créneau</button>' +
          '<button type="button" class="btn btn--destructive" data-action="refuser" data-id="' + b.id + '">Refuser</button>';
      }
    }

    var thumbs = (b.photos && b.photos.length)
      ? '<div class="request-card__thumbs">' + b.photos.slice(0, 2).map(function () { return '<div class="request-card__thumb placeholder-swatch"></div>'; }).join("") +
        (b.photos.length > 2 ? '<div class="request-card__thumb request-card__thumb--more">+' + (b.photos.length - 2) + '</div>' : "") + '</div>'
      : "";
    var quote = b.notesCliente ? '<p class="request-card__quote">« ' + b.notesCliente + ' »</p>' : "";

    return '<div class="' + cardClass + '">' +
      '<div class="request-card__header"><div><p class="request-card__name">' + (cl.prenom + " " + cl.nom) + '</p>' + tagHtml(cl, isProjet) + '</div>' + expiryHtml + '</div>' +
      '<div class="request-card__service">' +
        '<div><p class="request-card__service-name">' + svc.nom + '</p><p class="request-card__service-date">' + RA.serviceDateLine(b, isProjet) + '</p></div>' +
        '<p class="request-card__price">' + (isProjet ? "à chiffrer" : D.formatPrice(b.prixEuros)) + '</p>' +
      '</div>' +
      travelBox + thumbs + quote +
      '<div class="request-card__actions">' + actions + '</div>' +
    '</div>';
  }

  function proposedTime(state, now, b) {
    var alt = A.proposeAlternative(state, b.id, now);
    return alt ? alt.time : null;
  }

  // ---------------------------------------------------------------------
  // Other tabs — compact rows (no artboard; extrapolated from R13's table row)
  // ---------------------------------------------------------------------
  var STATUT_CHIP = {
    confirmee: ["chip--ok", "✓ Confirmée"], acceptee_arrhes_attendues: ["chip--warn", "◔ Arrhes en attente"],
    nouveau_creneau_propose: ["chip--warn", "◔ Proposition envoyée"], terminee: ["chip--outline", "Terminée"],
    refusee: ["chip--danger", "Refusée"], expiree: ["chip--outline", "Expirée"],
    annulee_cliente: ["chip--danger", "Annulée par la cliente"], annulee_pro: ["chip--danger", "Annulée par moi"],
    absente: ["chip--danger", "Absente"]
  };
  function compactRow(b) {
    var svc = S.service(b.serviceId), cl = S.client(b.clienteId);
    var m = STATUT_CHIP[b.statut] || ["chip--outline", b.statut];
    return '<a class="req-row" href="rdv.html?id=' + b.id + '">' +
      '<span><p class="req-row__name">' + cl.prenom + " " + cl.nom + '</p><p class="req-row__sub">' + svc.nom + (b.debut ? " · " + D.formatDateShort(D.parseLocal(b.debut)) : "") + '</p></span>' +
      '<span class="chip ' + m[0] + '">' + m[1] + '</span></a>';
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  function render() {
    var state = S.get(), now = S.now();
    var list = document.getElementById("req-list");

    if (activeTab === "valider") {
      var reqs = S.requestsToValidate();
      list.innerHTML = reqs.length
        ? reqs.map(function (b) { return requestCard(state, now, b); }).join("")
        : '<div class="empty-state"><p class="empty-state__heart">♡</p><p class="empty-state__title">Aucune demande à valider</p><p class="empty-state__desc">Tout est à jour. Profite de ta journée ♡</p></div>';
      return;
    }

    var rows;
    if (activeTab === "venir") {
      rows = state.bookings.filter(function (b) { return ["confirmee", "acceptee_arrhes_attendues", "nouveau_creneau_propose"].indexOf(b.statut) >= 0 && (!b.debut || D.parseLocal(b.debut) >= now); });
    } else if (activeTab === "passes") {
      rows = state.bookings.filter(function (b) { return b.statut === "terminee" || b.statut === "absente"; });
    } else {
      rows = state.bookings.filter(function (b) { return ["refusee", "expiree", "annulee_cliente", "annulee_pro"].indexOf(b.statut) >= 0; });
    }
    rows.sort(function (a, c) { return (c.debut || c.creeLe) < (a.debut || a.creeLe) ? -1 : 1; });
    list.innerHTML = rows.length ? rows.map(compactRow).join("") : '<div class="empty-state"><p class="empty-state__title">Rien ici pour l’instant</p></div>';
  }

  document.getElementById("req-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var id = btn.dataset.id, action = btn.dataset.action;
    if (action === "accepter") RA.openAccepter(id);
    else if (action === "proposer") RA.openProposer(id);
    else if (action === "refuser") RA.openRefuser(id);
    else if (action === "devis") RA.openDevis(id);
    else if (action === "questions") window.alert("Provisoire — à venir.");
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
  S.subscribe(render);
})();
