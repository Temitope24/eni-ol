/*
  Shared request-action sheets — batch B24, extracted for B25/B26 reuse.
  Source: PRO R03 (Accepter sheet, read in full). Proposer/Refuser/Devis
  have no dedicated artboard — minimal real sheets in the same language.
  Both pro/demandes.html (the request cards) and pro/agenda.html (R12's
  desktop "À valider" side panel) trigger the same Accepter/Proposer/
  Refuser flow, so this lives in one place rather than being duplicated.
*/
window.ENIOL_REQUEST_ACTIONS = (function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var A = window.ENIOL_AVAILABILITY;

  var overlay = null;

  function addressLine(b) {
    var addr = S.address(b.adresseId);
    return addr ? addr.zone : "";
  }
  function serviceDateLine(b, isProjet) {
    if (isProjet) return "souhaité pour le " + D.formatDateShort(D.parseLocal(b.projet.pourLe)).replace(/^\S+\s/, "");
    return D.formatDateShort(D.parseLocal(b.debut)) + " · " + D.formatTime(D.parseLocal(b.debut)) + "–" + D.formatTime(D.parseLocal(b.fin));
  }
  // R03's "Quand" row format — "sam. 19 sept. 13:00 → 15:30", no middle dot
  // and an arrow, distinct from the request-card's own "sam. 19 sept. ·
  // 16:00–18:00" (R02) — same underlying data, two different literal
  // formats depending which artboard draws it.
  function sheetWhenLine(b) {
    return D.formatDateShort(D.parseLocal(b.debut)) + " " + D.formatTime(D.parseLocal(b.debut)) + " → " + D.formatTime(D.parseLocal(b.fin));
  }
  // R03's "Où" row — a short headline on its own line, a smaller muted
  // line underneath. R03's own example has a real street address for that
  // second line ("Montreuil (93)" / "12 rue de Belfort · Bât. B"); when a
  // client has no street on file (e.g. Grâce, sans_deplacement-adjacent
  // "au_choix" bookings with only a zone), the zone itself carries a
  // neighbourhood qualifier after "·" ("Paris 10ᵉ · Gare de l’Est") — that
  // same split still reads as headline + detail, so it's used as the
  // fallback rather than collapsing to one dense line.
  function sheetWhereHtml(b) {
    if (b.lieu === "sans_deplacement") return "Sans déplacement";
    var addr = S.address(b.adresseId);
    if (!addr) return "";
    var street = [addr.ligne1, addr.complement].filter(Boolean).join(" · ");
    if (street) return addr.zone + '<br><span style="font-size:13px; color:var(--ink-2);">' + street + '</span>';
    var parts = addr.zone.split(" · ");
    if (parts.length > 1) return parts[0] + '<br><span style="font-size:13px; color:var(--ink-2);">' + parts.slice(1).join(" · ") + '</span>';
    return addr.zone;
  }

  // R03's green banner — built from evaluateBooking's raw fields rather
  // than availability.js's canned signal.label, which (correctly, for its
  // other callers) omits the "(zone)" parenthetical and the trailing
  // margin sentence this specific sheet spells out in full.
  function travelBannerHtml(state, now, id) {
    var ev = A.evaluateBooking(state, id, now);
    if (ev.type !== "trajet") return "";
    var tone = ev.signal.tone;
    var bg = tone === "danger" ? "var(--state-danger-bg)" : tone === "warn" ? "var(--state-warn-bg)" : "var(--state-ok-bg)";
    var ink = tone === "danger" ? "var(--state-danger-ink)" : tone === "warn" ? "var(--state-warn-ink)" : "var(--state-ok-ink)";
    var icon = tone === "danger" ? "✕" : tone === "warn" ? "◔" : "✓";
    var label = ev.arrivee.fit.level === "ne_tient_pas" ? "Ne tient pas" : (ev.loin ? "Loin" : (ev.arrivee.fit.level === "serre" ? "Trajet serré" : "Trajet OK"));

    var sentence;
    if (ev.arrivee.depuis === "rdv") {
      var prevB = S.booking(ev.arrivee.rdvId), prevAddr = prevB ? S.address(prevB.adresseId) : null;
      sentence = "≈ " + ev.arrivee.trajetMin + " min depuis ton RDV de " + ev.arrivee.rdvDebut + (prevAddr ? " (" + prevAddr.zone.split(" · ")[0] + ")" : "") + ", départ " + ev.partirA + ".";
      if (ev.arrivee.fit.level === "ok" && ev.arrivee.fit.spareMin != null) sentence += " Il te reste " + ev.arrivee.fit.spareMin + " min de marge.";
    } else {
      sentence = "≈ " + ev.arrivee.trajetMin + " min depuis " + ev.arrivee.baseLabel + ", départ " + ev.partirA + ".";
    }

    var conflictLine = "";
    if (ev.suivant && ev.suivant.fit.level === "ne_tient_pas") {
      var suivB = S.booking(ev.suivant.rdvId), suivCl = S.client(suivB.clienteId), suivAddr = S.address(suivB.adresseId);
      conflictLine = '<p style="margin:6px 0 0; font-size:13px; color:' + ink + ';">↓ RDV suivant : ' + suivCl.prenom + " " + suivCl.nom + " à " + ev.suivant.debut + (suivAddr ? " (" + suivAddr.zone.split(" · ")[0] + ")" : "") + ' — <strong>ne tient pas</strong> si tu acceptes les deux.</p>';
    }

    return '<div style="background:' + bg + '; border-radius:12px; padding:12px; margin-bottom:16px;">' +
      '<p style="margin:0; font-size:13.5px; color:' + ink + ';">' + icon + ' <strong>' + label + '</strong> — ' + sentence + '</p>' +
      conflictLine +
    '</div>';
  }

  // The page behind a sheet must not scroll while it's open — the sheet
  // itself is position:fixed and dims the whole viewport, but the body
  // underneath was still free to scroll (and visibly "moved" if you
  // dragged it), which the design's own dimmed-backdrop treatment doesn't
  // do. document.body.style.overflow is enough to freeze it in place.
  function lockBody() { document.body.style.overflow = "hidden"; }
  function unlockBody() { document.body.style.overflow = ""; }

  function openSheet(html) {
    closeSheet();
    overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    overlay.innerHTML = '<button type="button" class="sheet-overlay__backdrop" aria-label="Fermer"></button>' + html;
    document.body.appendChild(overlay);
    lockBody();
    overlay.querySelector(".sheet-overlay__backdrop").addEventListener("click", closeSheet);
    return overlay;
  }
  function closeSheet() { if (overlay) { overlay.remove(); overlay = null; unlockBody(); } }

  function showToast(text) {
    var t = document.createElement("div");
    t.className = "toast";
    t.style.cssText = "position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:95;";
    t.textContent = text;
    document.body.appendChild(t);
    window.setTimeout(function () { t.remove(); }, 2600);
  }

  function openAccepter(id) {
    var state = S.get(), now = S.now();
    var b = S.booking(id), svc = S.service(b.serviceId), cl = S.client(b.clienteId);
    var defaultArrhes = svc.arrhes && svc.arrhes.type === "montant" ? svc.arrhes.valeur : 0;
    var travelBanner = travelBannerHtml(state, now, id);

    var el = openSheet(
      '<form class="sheet" id="accepter-form">' +
        '<div class="sheet__handle"></div>' +
        '<p class="sheet__title">Accepter cette demande ?</p>' +
        '<p class="sheet__subtitle">' + cl.prenom + " " + cl.nom + " · " + svc.nom + '</p>' +
        '<div style="background:var(--ground); border-radius:12px; padding:14px; margin-bottom:14px; font-size:14.5px;">' +
          '<div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span style="color:var(--ink-2);">Quand</span><span class="field--mono">' + sheetWhenLine(b) + '</span></div>' +
          '<div style="display:flex; justify-content:space-between; gap:12px;"><span style="color:var(--ink-2);">Où</span><span style="text-align:right;">' + sheetWhereHtml(b) + '</span></div>' +
        '</div>' +
        travelBanner +
        '<label class="field-label">Frais de déplacement <span style="color:var(--ink-2); font-weight:400;">(facultatif)</span></label>' +
        '<div style="display:flex; gap:8px; margin-bottom:14px;" id="acc-frais">' +
          [0, 5, 10].map(function (v) {
            return '<button type="button" class="field field--mono" data-frais="' + v + '" style="width:auto; padding:13px 16px; font-size:15px; cursor:pointer;' + (v === 0 ? "border:2px solid var(--action);" : "") + '">' + v + ' €</button>';
          }).join("") +
          '<button type="button" class="field" id="acc-frais-autre" style="width:auto; padding:13px 16px; font-size:14px; color:var(--ink-2); cursor:pointer;">Autre</button>' +
        '</div>' +
        '<input class="field field--mono" id="acc-frais-custom" style="max-width:110px; margin-bottom:14px;" placeholder="0 €" hidden>' +
        '<label class="field-label" for="acc-arrhes">Arrhes à demander</label>' +
        '<div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">' +
          '<input class="field field--mono" id="acc-arrhes" style="max-width:110px; background:var(--ground);" value="' + defaultArrhes + ' €">' +
          '<span style="font-size:13px; color:var(--ink-2);">valeur par défaut pour cette prestation</span>' +
        '</div>' +
        '<p id="acc-arrhes-note" style="margin:0 0 14px; font-size:13px; color:var(--ink-2);"></p>' +
        '<label class="field-label" for="acc-message">Message à la cliente <span style="color:var(--ink-2); font-weight:400;">(facultatif)</span></label>' +
        '<textarea class="field" id="acc-message" style="min-height:70px; margin-bottom:18px; background:var(--ground);" placeholder="Ex. : À samedi ' + cl.prenom + ' ! Pensez à démêler vos cheveux la veille ♡"></textarea>' +
        '<button type="submit" class="btn btn--primary" style="width:100%; margin-bottom:8px;">Confirmer l’acceptation</button>' +
        '<button type="button" class="btn btn--text-plain" style="width:100%; text-align:center;" data-close="1">Annuler</button>' +
      '</form>'
    );
    var frais = 0;
    function updateArrhesNote() {
      var arrhes = parseInt(el.querySelector("#acc-arrhes").value, 10) || 0;
      var reste = (b.prixEuros || 0) + frais - arrhes;
      var limite = b.debut ? D.addHours(b.debut, -state.settings.annulation.gratuiteJusquaHeures) : null;
      el.querySelector("#acc-arrhes-note").textContent = limite
        ? "À recevoir avant le " + D.formatDateShort(D.parseLocal(limite)).replace(/^\S+\s/, "") + " " + D.formatTime(D.parseLocal(limite)) + " · reste " + reste + " € sur place."
        : "";
    }
    updateArrhesNote();
    el.querySelector("#acc-arrhes").addEventListener("input", updateArrhesNote);
    function clearFraisSelection() {
      el.querySelectorAll("#acc-frais [data-frais]").forEach(function (o) { o.style.border = "1px solid var(--rule)"; });
      el.querySelector("#acc-frais-autre").style.border = "1px solid var(--rule)";
    }
    el.querySelectorAll("#acc-frais [data-frais]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        frais = +btn.dataset.frais;
        clearFraisSelection();
        btn.style.border = "2px solid var(--action)";
        el.querySelector("#acc-frais-custom").hidden = true;
        updateArrhesNote();
      });
    });
    el.querySelector("#acc-frais-autre").addEventListener("click", function () {
      clearFraisSelection();
      this.style.border = "2px solid var(--action)";
      var custom = el.querySelector("#acc-frais-custom");
      custom.hidden = false;
      custom.focus();
    });
    el.querySelector("#acc-frais-custom").addEventListener("input", function () {
      frais = +this.value || 0;
      updateArrhesNote();
    });
    el.querySelector('[data-close]').addEventListener("click", closeSheet);
    el.querySelector("#accepter-form").addEventListener("submit", function (e) {
      e.preventDefault();
      S.act(id, "accepter", {
        fraisDeplacementEuros: frais,
        arrhesEuros: parseInt(el.querySelector("#acc-arrhes").value, 10) || 0,
        message: el.querySelector("#acc-message").value || null
      });
      closeSheet();
      showToast("RDV accepté ✓");
    });
  }

  function openProposer(id) {
    var state = S.get(), now = S.now();
    var b = S.booking(id), cl = S.client(b.clienteId);
    var alt = A.proposeAlternative(state, id, now);
    var el = openSheet(
      '<form class="sheet" id="proposer-form">' +
        '<div class="sheet__handle"></div>' +
        '<p class="sheet__title">Proposer un autre créneau</p>' +
        '<p class="sheet__subtitle">' + cl.prenom + " " + cl.nom + ' · demande actuelle : ' + serviceDateLine(b, false) + '</p>' +
        '<div style="display:flex; gap:10px; margin-bottom:14px;">' +
          '<div style="flex:1;"><label class="field-label" for="prop-date">Date</label><input class="field field--mono" type="date" id="prop-date" style="background:var(--ground);" value="' + b.debut.slice(0, 10) + '"></div>' +
          '<div style="width:120px;"><label class="field-label" for="prop-heure">Heure</label><input class="field field--mono" type="time" id="prop-heure" style="background:var(--ground);" value="' + (alt ? alt.time : b.debut.slice(11, 16)) + '"></div>' +
        '</div>' +
        (alt ? '<p style="margin:0 0 14px; font-size:13px; color:var(--ink-2);">Suggestion : ' + alt.time + ', le premier horaire qui s’enchaîne sans conflit ce jour-là.</p>' : "") +
        '<label class="field-label" for="prop-message">Message à la cliente <span style="color:var(--ink-2); font-weight:400;">(facultatif)</span></label>' +
        '<textarea class="field" id="prop-message" style="min-height:70px; margin-bottom:18px; background:var(--ground);"></textarea>' +
        '<button type="submit" class="btn btn--primary" style="width:100%; margin-bottom:8px;">Envoyer la proposition</button>' +
        '<button type="button" class="btn btn--text-plain" style="width:100%; text-align:center;" data-close="1">Annuler</button>' +
      '</form>'
    );
    el.querySelector('[data-close]').addEventListener("click", closeSheet);
    el.querySelector("#proposer-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var svc = S.service(b.serviceId);
      var debut = el.querySelector("#prop-date").value + "T" + el.querySelector("#prop-heure").value;
      var fin = D.toLocalIso(new Date(D.parseLocal(debut).getTime() + (svc.dureeMin || 0) * 60000));
      S.act(id, "proposer", { debut: debut, fin: fin, message: el.querySelector("#prop-message").value || null });
      closeSheet();
      showToast("Proposition envoyée ✓");
    });
  }

  function openRefuser(id) {
    var b = S.booking(id), cl = S.client(b.clienteId);
    var el = openSheet(
      '<form class="sheet" id="refuser-form">' +
        '<div class="sheet__handle"></div>' +
        '<p class="sheet__title">Refuser cette demande ?</p>' +
        '<p class="sheet__subtitle">' + cl.prenom + " " + cl.nom + " · " + S.service(b.serviceId).nom + '</p>' +
        '<label class="field-label" for="ref-message">Message à la cliente <span style="color:var(--ink-2); font-weight:400;">(facultatif)</span></label>' +
        '<textarea class="field" id="ref-message" style="min-height:70px; margin-bottom:18px; background:var(--ground);" placeholder="Ex. : Je ne peux pas ce jour-là, désolée."></textarea>' +
        '<button type="submit" class="btn btn--destructive" style="width:100%; margin-bottom:8px;">Refuser la demande</button>' +
        '<button type="button" class="btn btn--text-plain" style="width:100%; text-align:center;" data-close="1">Annuler</button>' +
      '</form>'
    );
    el.querySelector('[data-close]').addEventListener("click", closeSheet);
    el.querySelector("#refuser-form").addEventListener("submit", function (e) {
      e.preventDefault();
      S.act(id, "refuser", { message: el.querySelector("#ref-message").value || null });
      closeSheet();
      showToast("Demande refusée");
    });
  }

  function openDevis(id) {
    var b = S.booking(id), cl = S.client(b.clienteId), svc = S.service(b.serviceId);
    var el = openSheet(
      '<form class="sheet" id="devis-form">' +
        '<div class="sheet__handle"></div>' +
        '<p class="sheet__title">Préparer le devis</p>' +
        '<p class="sheet__subtitle">' + cl.prenom + " " + cl.nom + " · " + svc.nom + '</p>' +
        '<label class="field-label" for="devis-prix">Montant du devis</label>' +
        '<input class="field field--mono" id="devis-prix" style="max-width:140px; margin-bottom:6px; background:var(--ground);" value="' + (svc.prixEuros ? svc.prixEuros + " €" : "") + '">' +
        '<p style="margin:0 0 14px; font-size:13px; color:var(--ink-2);">Arrhes : 30 % non remboursables une fois les matières commandées.</p>' +
        '<label class="field-label" for="devis-message">Message à la cliente <span style="color:var(--ink-2); font-weight:400;">(facultatif)</span></label>' +
        '<textarea class="field" id="devis-message" style="min-height:70px; margin-bottom:18px; background:var(--ground);"></textarea>' +
        '<button type="submit" class="btn btn--primary" style="width:100%; margin-bottom:8px;">Envoyer le devis</button>' +
        '<button type="button" class="btn btn--text-plain" style="width:100%; text-align:center;" data-close="1">Annuler</button>' +
      '</form>'
    );
    el.querySelector('[data-close]').addEventListener("click", closeSheet);
    el.querySelector("#devis-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var prix = parseInt(el.querySelector("#devis-prix").value, 10) || 0;
      S.act(id, "accepter", { prixEuros: prix, arrhesEuros: Math.round(prix * 0.3), message: el.querySelector("#devis-message").value || null });
      closeSheet();
      showToast("Devis envoyé ✓");
    });
  }

  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay) closeSheet(); });

  return {
    addressLine: addressLine,
    serviceDateLine: serviceDateLine,
    openAccepter: openAccepter,
    openProposer: openProposer,
    openRefuser: openRefuser,
    openDevis: openDevis,
    showToast: showToast
  };
})();
