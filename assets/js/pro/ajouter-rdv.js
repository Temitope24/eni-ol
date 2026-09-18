/*
  "Ajouter un RDV" sheet — batch B33. Source: PRO R11, read in full (marked
  "S" — simplified/no full pixel spec, so the address sub-form below is a
  minimal-but-real set of fields rather than a literal transcription of a
  drawn form; R11 itself only ever shows an already-saved address row).

  A JS-driven sheet component per CODE-BATCHES.md's B33 note ("not a
  separate ajouter-rdv.html — a sheet opened by the FAB from pro/index.html
  and pro/agenda.html"). Self-contained like demo-bar.js: any page includes
  this script and adds a [data-open="ajouter-rdv"] trigger, and the sheet
  builds/attaches itself lazily on first open.
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var A = window.ENIOL_AVAILABILITY;
  var T = window.ENIOL_TRAVEL;
  var M = window.ENIOL_MOTION;

  var overlay = null;

  function dayBase(state, date) {
    var o = state.settings.departsDuJour && state.settings.departsDuJour[date];
    return o || state.settings.pointDeDepart;
  }

  function clientLabel(cl) { return (cl.prenom + " " + cl.nom).trim(); }

  function build() {
    var st = S.get();
    var services = st.services.filter(function (s) { return s.modeReservation !== "projet"; });

    var el = document.createElement("div");
    el.className = "sheet-overlay";
    el.id = "ajouter-rdv-overlay";
    el.innerHTML =
      '<button type="button" class="sheet-overlay__backdrop" aria-label="Fermer"></button>' +
      '<form class="sheet" id="ajouter-rdv-form" novalidate>' +
        '<div class="sheet__handle"></div>' +
        '<p class="sheet__title">Ajouter un RDV</p>' +
        '<div class="prep-card" style="margin-bottom:16px;"><p style="margin:0; font-size:13.5px; color:var(--ink-body);">Pour une réservation prise en DM ou par téléphone. La cliente reçoit un e-mail de confirmation automatique si tu mets son adresse.</p></div>' +

        '<label class="field-label" for="ar-client">Cliente</label>' +
        '<select class="field" id="ar-client" style="margin-bottom:6px;"><option value="">— Choisir —</option>' +
          st.clients.map(function (c) { return '<option value="' + c.id + '">' + clientLabel(c) + '</option>'; }).join("") +
          '<option value="__new__">＋ Nouvelle cliente</option>' +
        '</select>' +
        '<div id="ar-new-client" hidden style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">' +
          '<input class="field" id="ar-new-prenom" placeholder="Prénom">' +
          '<input class="field" id="ar-new-nom" placeholder="Nom">' +
          '<input class="field field--mono" id="ar-new-tel" placeholder="Téléphone">' +
        '</div>' +

        '<label class="field-label" for="ar-service">Prestation</label>' +
        '<select class="field" id="ar-service" style="margin-bottom:14px;"><option value="">— Choisir —</option>' +
          services.map(function (s) { return '<option value="' + s.id + '">' + s.nom + ' — ' + D.formatServicePrice(s) + '</option>'; }).join("") +
        '</select>' +

        '<label class="field-label">Où ?</label>' +
        '<div class="segmented segmented--thumb" id="ar-lieu" style="margin-bottom:10px; width:100%; display:flex;">' +
          '<div class="segmented__thumb"></div>' +
          '<label class="segmented__item" style="flex:1; text-align:center;"><input type="radio" name="ar-lieu-r" value="domicile_cliente" class="sr-only" checked>À domicile</label>' +
          '<label class="segmented__item" style="flex:1; text-align:center;"><input type="radio" name="ar-lieu-r" value="sans_deplacement" class="sr-only">Sans déplacement</label>' +
        '</div>' +
        '<div id="ar-adresse-wrap" style="margin-bottom:14px;">' +
          '<select class="field" id="ar-adresse-existante" style="margin-bottom:8px;" hidden></select>' +
          '<div id="ar-adresse-fields" style="display:flex; flex-direction:column; gap:8px;">' +
            '<input class="field" id="ar-ad-ligne1" placeholder="Adresse">' +
            '<input class="field" id="ar-ad-cp" placeholder="Code postal" style="width:120px;">' +
            '<input class="field" id="ar-ad-ville" placeholder="Ville">' +
          '</div>' +
        '</div>' +

        '<div style="display:flex; gap:10px; margin-bottom:6px;">' +
          '<div style="flex:1;"><label class="field-label" for="ar-date">Date</label><input class="field field--mono" type="date" id="ar-date"></div>' +
          '<div style="width:130px;"><label class="field-label" for="ar-heure">Heure</label><input class="field field--mono" type="time" id="ar-heure"></div>' +
        '</div>' +
        '<div id="ar-trajet" style="margin:10px 0 14px;"></div>' +

        '<label class="field-label" for="ar-arrhes">Arrhes</label>' +
        '<div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">' +
          '<input class="field field--mono" id="ar-arrhes" style="max-width:110px; background:var(--ground);" inputmode="numeric">' +
          '<label style="display:flex; gap:8px; align-items:center; font-size:14px;"><input type="checkbox" id="ar-arrhes-recues" style="width:20px; height:20px; accent-color:var(--action);">Déjà reçues</label>' +
        '</div>' +
        '<select class="field" id="ar-moyen" style="margin-bottom:14px;" hidden>' +
          st.settings.moyensEncaissement.map(function (m) { return '<option>' + m + '</option>'; }).join("") +
        '</select>' +

        '<label class="field-label" for="ar-note">Note interne</label>' +
        '<textarea class="field" id="ar-note" style="min-height:66px; margin-bottom:18px; background:var(--ground);" placeholder="Ex. : pris en DM le 11/09, elle apporte sa perruque"></textarea>' +

        '<button type="submit" class="btn btn--primary" style="width:100%;">Créer le rendez-vous</button>' +
      '</form>';
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";
    return el;
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.style.overflow = "";
  }

  function renderTrajet() {
    var wrap = overlay.querySelector("#ar-trajet");
    var lieu = overlay.querySelector('input[name="ar-lieu-r"]:checked').value;
    var date = overlay.querySelector("#ar-date").value;
    var heure = overlay.querySelector("#ar-heure").value;
    if (lieu !== "domicile_cliente") { wrap.innerHTML = ""; return; }
    if (!date || !heure) { wrap.innerHTML = ""; return; }

    var st = S.get();
    var serviceId = overlay.querySelector("#ar-service").value;
    var svc = serviceId ? S.service(serviceId) : null;
    if (!svc) { wrap.innerHTML = ""; return; }

    var existingSel = overlay.querySelector("#ar-adresse-existante");
    var loc = null;
    if (!existingSel.hidden && existingSel.value) {
      var addr = S.address(existingSel.value);
      if (addr && addr.lat != null) loc = addr;
    }
    if (!loc) {
      wrap.innerHTML = '<p style="margin:0; font-size:13px; color:var(--ink-2);">Le trajet se calcule une fois une adresse enregistrée sélectionnée.</p>';
      return;
    }

    var start = A.toMin(heure);
    var end = start + (svc.dureeMin || 0);
    var busy = A.busyOn(st, date, S.now());
    var prev = null, next = null;
    busy.forEach(function (b) {
      if (b.end <= start && (!prev || b.end > prev.end)) prev = b;
      if (b.start >= end && (!next || b.start < next.start)) next = b;
    });
    var base = dayBase(st, date);
    var from = prev ? (prev.location || base) : base;
    var min = T.estimateMinutes(from, loc);
    var ok = true, msg;
    if (prev) {
      var arrive = prev.end + prev.bufferAfter + min;
      ok = arrive + (svc.tamponAvantMin || 0) <= start;
      msg = ok
        ? "✓ Trajet OK — ≈ " + min + " min depuis ton RDV de " + A.fromMin(prev.start) + "."
        : "✕ Ne tient pas — ≈ " + min + " min nécessaires depuis ton RDV de " + A.fromMin(prev.start) + ".";
    } else {
      msg = "✓ Trajet OK — ≈ " + min + " min depuis " + (base.libelle || "chez moi") + ", départ " + A.fromMin(start - min) + ". " + (next ? "" : "Aucun autre RDV ce jour-là.");
    }
    wrap.innerHTML = '<div class="' + (ok ? "" : "field-error-banner") + '" style="' + (ok ? "background:var(--state-ok-bg); border-radius:12px; padding:12px;" : "") + '">' +
      '<p style="margin:0; font-size:13.5px; ' + (ok ? "color:var(--state-ok-ink);" : "") + '">' + msg + '</p></div>';
  }

  function updateAdresseVisibility() {
    var lieu = overlay.querySelector('input[name="ar-lieu-r"]:checked').value;
    overlay.querySelector("#ar-adresse-wrap").hidden = lieu !== "domicile_cliente";
    renderTrajet();
  }

  function updateClientAddresses() {
    var clientSel = overlay.querySelector("#ar-client");
    var newWrap = overlay.querySelector("#ar-new-client");
    newWrap.hidden = clientSel.value !== "__new__";

    var existingSel = overlay.querySelector("#ar-adresse-existante");
    var fields = overlay.querySelector("#ar-adresse-fields");
    var cl = clientSel.value && clientSel.value !== "__new__" ? S.client(clientSel.value) : null;
    if (cl && cl.adresses && cl.adresses.length) {
      existingSel.innerHTML = cl.adresses.map(function (a) {
        return '<option value="' + a.id + '">' + (a.libelle || "Chez elle") + (a.zone ? " · " + a.zone : "") + '</option>';
      }).join("") + '<option value="">＋ Nouvelle adresse</option>';
      existingSel.hidden = false;
      fields.hidden = !!existingSel.value;
    } else {
      existingSel.hidden = true;
      existingSel.innerHTML = "";
      fields.hidden = false;
    }
    renderTrajet();
  }

  function svcArrhesDefault(svc) {
    return svc && svc.arrhes && svc.arrhes.type === "montant" ? svc.arrhes.valeur : 0;
  }

  function onServiceChange() {
    var svc = S.service(overlay.querySelector("#ar-service").value);
    if (svc) overlay.querySelector("#ar-arrhes").value = svcArrhesDefault(svc) + " €";
    renderTrajet();
  }

  function wire() {
    overlay.querySelector(".sheet-overlay__backdrop").addEventListener("click", close);
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape" && overlay) { close(); document.removeEventListener("keydown", esc); }
    });

    overlay.querySelector("#ar-client").addEventListener("change", updateClientAddresses);
    overlay.querySelector("#ar-adresse-existante").addEventListener("change", function () {
      overlay.querySelector("#ar-adresse-fields").hidden = !!this.value;
      renderTrajet();
    });
    overlay.querySelectorAll('input[name="ar-lieu-r"]').forEach(function (r) { r.addEventListener("change", updateAdresseVisibility); });
    overlay.querySelector("#ar-service").addEventListener("change", onServiceChange);
    overlay.querySelector("#ar-date").addEventListener("change", renderTrajet);
    overlay.querySelector("#ar-heure").addEventListener("change", renderTrajet);
    overlay.querySelector("#ar-arrhes-recues").addEventListener("change", function () {
      overlay.querySelector("#ar-moyen").hidden = !this.checked;
    });
    M.segmented(overlay.querySelector("#ar-lieu"));

    overlay.querySelector("#ar-client").dispatchEvent(new Event("change"));

    overlay.querySelector("#ajouter-rdv-form").addEventListener("submit", onSubmit);
  }

  function onSubmit(e) {
    e.preventDefault();
    var clientSel = overlay.querySelector("#ar-client");
    var serviceId = overlay.querySelector("#ar-service").value;
    var date = overlay.querySelector("#ar-date").value;
    var heure = overlay.querySelector("#ar-heure").value;
    if (!clientSel.value || !serviceId || !date || !heure) {
      window.alert("Merci de renseigner la cliente, la prestation, la date et l’heure.");
      return;
    }
    var svc = S.service(serviceId);
    var lieu = overlay.querySelector('input[name="ar-lieu-r"]:checked').value;
    var debut = date + "T" + heure;
    var fin = D.toLocalIso(new Date(D.parseLocal(debut).getTime() + (svc.dureeMin || 0) * 60000));

    var payload = {
      serviceId: serviceId, lieu: lieu, debut: debut, fin: fin,
      arrhesEuros: overlay.querySelector("#ar-arrhes").value ? parseInt(overlay.querySelector("#ar-arrhes").value, 10) : null,
      arrhesDejaRecues: overlay.querySelector("#ar-arrhes-recues").checked,
      moyenArrhes: overlay.querySelector("#ar-moyen").value,
      noteInterne: overlay.querySelector("#ar-note").value || null
    };

    if (clientSel.value === "__new__") {
      payload.contact = {
        prenom: overlay.querySelector("#ar-new-prenom").value,
        nom: overlay.querySelector("#ar-new-nom").value,
        telephone: overlay.querySelector("#ar-new-tel").value
      };
    } else {
      payload.clientId = clientSel.value;
    }

    if (lieu === "domicile_cliente") {
      var existingSel = overlay.querySelector("#ar-adresse-existante");
      if (!existingSel.hidden && existingSel.value) {
        payload.adresseId = existingSel.value;
      } else {
        payload.adresse = {
          ligne1: overlay.querySelector("#ar-ad-ligne1").value,
          codePostal: overlay.querySelector("#ar-ad-cp").value,
          ville: overlay.querySelector("#ar-ad-ville").value
        };
      }
    }

    var b = S.createManualBooking(payload);
    close();
    showToast("RDV créé ✓ · " + b.ref);
  }

  function showToast(text) {
    var t = document.createElement("div");
    t.className = "toast";
    t.style.position = "fixed";
    t.style.left = "50%";
    t.style.bottom = "24px";
    t.style.transform = "translateX(-50%)";
    t.style.zIndex = "95";
    t.textContent = text;
    document.body.appendChild(t);
    window.setTimeout(function () { t.remove(); }, 2600);
  }

  function open() {
    if (overlay) return;
    overlay = build();
    wire();
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest('[data-open="ajouter-rdv"]') : null;
    if (trigger) { e.preventDefault(); open(); }
  });
})();
