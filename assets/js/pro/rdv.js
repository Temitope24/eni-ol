/*
  pro/rdv.html — batch B27. Source: PRO R06 (RDV detail + Encaisser sheet),
  read in full.
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var A = window.ENIOL_AVAILABILITY;
  var M = window.ENIOL_MOTION;

  // The href is just a no-JS fallback — a real back tap should return to
  // wherever the user actually came from (demandes.html, agenda.html,
  // clientes.html…), not always the same hardcoded page.
  document.getElementById("rdv-back").addEventListener("click", function (e) {
    e.preventDefault();
    M.back("agenda.html");
  });

  var overlay = null;
  function openSheet(html) {
    closeSheet();
    overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    overlay.innerHTML = '<button type="button" class="sheet-overlay__backdrop" aria-label="Fermer"></button>' + html;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    overlay.querySelector(".sheet-overlay__backdrop").addEventListener("click", closeSheet);
    return overlay;
  }
  function closeSheet() { if (overlay) { overlay.remove(); overlay = null; document.body.style.overflow = ""; } }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay) closeSheet(); });

  function showToast(text) {
    var t = document.createElement("div");
    t.className = "toast";
    t.style.cssText = "position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:95;";
    t.textContent = text;
    document.body.appendChild(t);
    window.setTimeout(function () { t.remove(); }, 2600);
  }

  var STATUT_CHIP = {
    confirmee: ["chip--ok", "✓ Confirmée"], acceptee_arrhes_attendues: ["chip--warn", "◔ Arrhes en attente"],
    nouveau_creneau_propose: ["chip--warn", "◔ Proposition envoyée"], en_attente: ["chip--warn", "◌ Demande en attente"],
    terminee: ["chip--outline", "Terminée"], refusee: ["chip--danger", "Refusée"], expiree: ["chip--outline", "Expirée"],
    annulee_cliente: ["chip--danger", "Annulée par la cliente"], annulee_pro: ["chip--danger", "Annulée par moi"],
    absente: ["chip--danger", "Absente"]
  };
  var HIST_LABEL = {
    en_attente: "Demande reçue", acceptee_arrhes_attendues: "Acceptée · arrhes demandées",
    nouveau_creneau_propose: "Nouveau créneau proposé", confirmee: "Arrhes reçues · confirmée",
    terminee: "Terminée", refusee: "Refusée", expiree: "Expirée",
    annulee_cliente: "Annulée par la cliente", annulee_pro: "Annulée par moi", absente: "Absente (non-présentée)"
  };

  function getId() { return new URLSearchParams(window.location.search).get("id"); }

  function render() {
    var id = getId();
    var b = id && S.booking(id);
    var main = document.getElementById("rdv-main");
    if (!b) { main.innerHTML = '<div class="empty-state"><p class="empty-state__title">Rendez-vous introuvable</p></div>'; return; }

    var state = S.get(), now = S.now();
    var svc = S.service(b.serviceId), cl = S.client(b.clienteId);
    var addr = b.adresseId ? S.address(b.adresseId) : null;
    var m = STATUT_CHIP[b.statut] || ["chip--outline", b.statut];
    var telHref = cl.telephone ? "tel:" + cl.telephone : null;
    var smsHref = cl.telephone ? "sms:" + cl.telephone : null;
    var mapsHref = addr && addr.ligne1 ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr.ligne1 + " " + addr.ville) : null;

    var html = '<span class="chip ' + m[0] + '">' + m[1] + '</span>' +
      '<p class="rdv-name">' + cl.prenom + " " + cl.nom + '</p>' +
      '<p class="rdv-service">' + svc.nom + (b.prixEuros != null ? " · " + D.formatPrice(b.prixEuros) : "") + '</p>' +
      '<p class="rdv-when">' + (b.debut ? D.formatDateShort(D.parseLocal(b.debut)) + " · " + D.formatTime(D.parseLocal(b.debut)) + (b.fin ? " → " + D.formatTime(D.parseLocal(b.fin)) : "") : "date à définir") + '</p>' +
      '<div class="rdv-actions">' +
        (mapsHref ? '<a class="btn btn--primary" href="' + mapsHref + '" target="_blank" rel="noopener">Itinéraire</a>' : '<span class="btn btn--primary" aria-disabled="true" style="opacity:.5;">Itinéraire</span>') +
        (telHref ? '<a class="btn btn--secondary" href="' + telHref + '">Appeler</a>' : '<span class="btn btn--secondary" aria-disabled="true" style="opacity:.5;">Appeler</span>') +
        (smsHref ? '<a class="btn btn--secondary" href="' + smsHref + '">SMS</a>' : '<span class="btn btn--secondary" aria-disabled="true" style="opacity:.5;">SMS</span>') +
      '</div>';

    // ---- OÙ ----
    if (b.lieu !== "sans_deplacement" && addr) {
      var ev = A.evaluateBooking(state, id, now);
      html += '<p class="rdv-eyebrow">OÙ</p><div class="rdv-card">' +
        '<p style="font-weight:600;">' + (addr.ligne1 ? addr.ligne1 + " · " + addr.zone.split(" · ")[0] : addr.zone) + '</p>' +
        (addr.complement ? '<p style="color:var(--ink-body);">' + addr.complement + '</p>' : "") +
        (addr.codeAcces ? '<p style="color:var(--ink-body);">Code : <span class="field--mono">' + addr.codeAcces + '</span></p>' : "") +
        (addr.indications ? '<p class="rdv-quote">« ' + addr.indications + ' »</p>' : "") +
        (ev.type === "trajet" ? '<p style="color:var(--ink-2); margin-top:10px; padding-top:10px; border-top:1px solid var(--sand);">🚇 ' + ev.signal.label + (ev.partirA ? ' · <strong>partir à ' + ev.partirA + '</strong>' : '') + '</p>' : "") +
      '</div>';
    } else if (b.lieu === "sans_deplacement") {
      html += '<p class="rdv-eyebrow">OÙ</p><div class="rdv-card"><p>🏠 Sans déplacement</p></div>';
    }

    // ---- Ce qu'elle m'a envoyé ----
    if ((b.photos && b.photos.length) || b.notesCliente) {
      html += '<p class="rdv-eyebrow">CE QU’ELLE M’A ENVOYÉ</p>';
      if (b.photos && b.photos.length) html += '<div class="rdv-photos">' + b.photos.map(function () { return '<div class="rdv-photo placeholder-swatch"></div>'; }).join("") + '</div>';
      if (b.notesCliente) html += '<p class="rdv-quote" style="margin:0 0 18px; border-left:2px solid var(--rule); padding-left:10px;">« ' + b.notesCliente + ' »</p>';
    }

    // ---- Paiement ----
    var paid = S.paymentsOf(id);
    var reste = S.resteAEncaisser(b);
    html += '<p class="rdv-eyebrow">PAIEMENT</p><div class="rdv-card">' +
      '<div class="rdv-payment-row"><span>Prestation</span><span class="field--mono">' + (b.prixEuros != null ? D.formatPrice(b.prixEuros) : "à chiffrer") + '</span></div>' +
      (b.fraisDeplacementEuros ? '<div class="rdv-payment-row"><span class="muted">Frais de déplacement</span><span class="field--mono">' + D.formatPrice(b.fraisDeplacementEuros) + '</span></div>' : "") +
      paid.map(function (p) { return '<div class="rdv-payment-row"><span>' + p.type.charAt(0).toUpperCase() + p.type.slice(1) + ' reçues <span class="muted" style="font-size:12.5px;">(' + p.moyen + ', ' + D.formatDateShort(D.parseLocal(p.encaisseLe)) + ')</span></span><span class="field--mono" style="color:var(--state-ok-ink);">− ' + D.formatPrice(p.montantEuros) + '</span></div>'; }).join("") +
      '<div class="rdv-payment-row total"><span>Reste à encaisser</span><span class="field--mono">' + D.formatPrice(Math.max(0, reste)) + '</span></div>' +
    '</div>';
    if (reste > 0 && ["confirmee", "acceptee_arrhes_attendues", "terminee"].indexOf(b.statut) >= 0) {
      html += '<button type="button" class="btn btn--primary" id="btn-encaisser" style="width:100%; margin-bottom:18px;">Encaisser ' + D.formatPrice(reste) + '</button>';
    }

    // ---- Historique ----
    html += '<p class="rdv-eyebrow">HISTORIQUE</p><div class="timeline" style="margin-bottom:18px;">' +
      (b.historique || []).map(function (h, i, arr) {
        var last = i === arr.length - 1;
        return '<div class="timeline__row"><div class="timeline__rail"><span class="timeline__dot' + (last ? " timeline__dot--done" : "") + '"></span>' + (last ? "" : '<span class="timeline__line"></span>') + '</div>' +
          '<div class="timeline__content"><p class="timeline__title">' + (HIST_LABEL[h.statut] || h.statut) + '</p><p class="timeline__desc">' + D.formatDateShort(D.parseLocal(h.le)) + " " + D.formatTime(D.parseLocal(h.le)) + '</p></div></div>';
      }).join("") +
    '</div>';

    // ---- Final actions ----
    var actions = "";
    if (b.statut === "confirmee") {
      actions += '<button type="button" class="btn" style="background:var(--deep); color:var(--ink-on-deep);" data-action="terminer">Terminé</button>';
      actions += '<button type="button" class="btn btn--secondary" data-action="absente">Absente</button>';
    }
    if (["confirmee", "acceptee_arrhes_attendues"].indexOf(b.statut) >= 0) {
      actions += '<button type="button" class="btn btn--secondary" data-action="modifier">Modifier</button>';
      actions += '<button type="button" class="btn btn--destructive" data-action="annuler">Annuler</button>';
    }
    if (actions) html += '<div class="rdv-final-actions">' + actions + '</div>';
    if (["confirmee", "acceptee_arrhes_attendues"].indexOf(b.statut) >= 0 && S.paymentsOf(id).some(function (p) { return p.type === "arrhes"; })) {
      var lastArrhes = S.paymentsOf(id).filter(function (p) { return p.type === "arrhes"; }).pop();
      html += '<p class="rdv-warning">⚠ Si tu annules, tu dois rembourser le double des arrhes (' + D.formatPrice(lastArrhes.montantEuros * 2) + ').</p>';
    }

    main.innerHTML = html;
    wire(b);
  }

  function wire(b) {
    var enc = document.getElementById("btn-encaisser");
    if (enc) enc.addEventListener("click", function () { openEncaisser(b); });
    document.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.dataset.action;
        if (action === "terminer") { S.act(b.id, "terminer"); showToast("RDV marqué terminé"); }
        else if (action === "absente") { S.act(b.id, "marquerAbsente"); showToast("Cliente marquée absente"); }
        else if (action === "modifier") openModifier(b);
        else if (action === "annuler") openAnnuler(b);
      });
    });
  }

  function openModifier(b) {
    var el = openSheet(
      '<form class="sheet" id="mod-form">' +
        '<div class="sheet__handle"></div><p class="sheet__title">Modifier le rendez-vous</p>' +
        '<div style="display:flex; gap:10px; margin-bottom:18px;">' +
          '<div style="flex:1;"><label class="field-label" for="mod-date">Date</label><input class="field field--mono" type="date" id="mod-date" style="background:var(--ground);" value="' + (b.debut ? b.debut.slice(0, 10) : "") + '"></div>' +
          '<div style="width:120px;"><label class="field-label" for="mod-heure">Heure</label><input class="field field--mono" type="time" id="mod-heure" style="background:var(--ground);" value="' + (b.debut ? b.debut.slice(11, 16) : "") + '"></div>' +
        '</div>' +
        '<button type="submit" class="btn btn--primary" style="width:100%; margin-bottom:8px;">Enregistrer</button>' +
        '<button type="button" class="btn btn--text-plain" style="width:100%; text-align:center;" data-close="1">Annuler</button>' +
      '</form>'
    );
    el.querySelector('[data-close]').addEventListener("click", closeSheet);
    el.querySelector("#mod-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var svc = S.service(b.serviceId);
      var debut = el.querySelector("#mod-date").value + "T" + el.querySelector("#mod-heure").value;
      var fin = D.toLocalIso(new Date(D.parseLocal(debut).getTime() + (svc.dureeMin || 0) * 60000));
      S.update(function (s) { var bb = s.bookings.find(function (x) { return x.id === b.id; }); bb.debut = debut; bb.fin = fin; });
      closeSheet();
      showToast("Rendez-vous modifié ✓");
    });
  }

  function openAnnuler(b) {
    var el = openSheet(
      '<form class="sheet" id="ann-form">' +
        '<div class="sheet__handle"></div><p class="sheet__title">Annuler ce rendez-vous ?</p>' +
        '<p class="sheet__subtitle">Cette action ne peut pas être annulée.</p>' +
        '<button type="submit" class="btn btn--destructive" style="width:100%; margin-bottom:8px;">Annuler le rendez-vous</button>' +
        '<button type="button" class="btn btn--text-plain" style="width:100%; text-align:center;" data-close="1">Retour</button>' +
      '</form>'
    );
    el.querySelector('[data-close]').addEventListener("click", closeSheet);
    el.querySelector("#ann-form").addEventListener("submit", function (e) {
      e.preventDefault();
      S.act(b.id, "annulerPro", {});
      closeSheet();
      showToast("Rendez-vous annulé");
    });
  }

  function openEncaisser(b) {
    var svc = S.service(b.serviceId), cl = S.client(b.clienteId);
    var reste = S.resteAEncaisser(b);
    var today = S.now();
    var todayStr = ("0" + today.getDate()).slice(-2) + "/" + ("0" + (today.getMonth() + 1)).slice(-2) + "/" + today.getFullYear();
    var moyens = S.get().settings.moyensEncaissement;
    var el = openSheet(
      '<form class="sheet" id="enc-form">' +
        '<div class="sheet__handle"></div>' +
        '<p class="sheet__title">Encaisser</p>' +
        '<p class="sheet__subtitle">' + cl.prenom + " " + cl.nom + " · " + svc.nom + (b.debut ? " · " + D.formatDateShort(D.parseLocal(b.debut)) : "") + '</p>' +
        '<label class="field-label" for="enc-montant">Montant reçu</label>' +
        '<input class="amount-display" id="enc-montant" inputmode="decimal" value="' + reste + '" style="width:100%; border:2px solid var(--action); box-sizing:border-box;">' +
        '<p style="margin:0 0 16px; font-size:13px; color:var(--ink-2);">Reste à encaisser : ' + D.formatPrice(reste) + '</p>' +
        '<fieldset style="border:0; margin:0 0 16px; padding:0;"><legend class="field-label">Moyen de paiement</legend>' +
          '<ul class="payment-method-list">' + moyens.map(function (m, i) {
            return '<li><label><input type="radio" name="enc-moyen" value="' + m + '"' + (i === 0 ? " checked" : "") + '>' + m + '</label></li>';
          }).join("") + '</ul>' +
        '</fieldset>' +
        '<label class="field-label" for="enc-date">Date d’encaissement</label>' +
        '<div class="field field--mono" style="margin-bottom:18px;">' + todayStr + '</div>' +
        '<button type="submit" class="btn btn--primary" style="width:100%; margin-bottom:8px;">Enregistrer l’encaissement</button>' +
        '<p style="margin:0; font-size:12.5px; color:var(--ink-3); text-align:center;">Aucun paiement n’est traité ici : c’est ton livre des recettes.</p>' +
      '</form>'
    );
    el.querySelector("#enc-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var montant = parseFloat(el.querySelector("#enc-montant").value) || reste;
      var moyen = el.querySelector('input[name="enc-moyen"]:checked').value;
      S.addPayment({ rdvId: b.id, clienteId: b.clienteId, type: "solde", montantEuros: montant, moyen: moyen });
      closeSheet();
      showToast("Encaissement enregistré ✓");
    });
  }

  render();
  S.subscribe(render);
})();
