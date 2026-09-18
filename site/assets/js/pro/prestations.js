/*
  pro/prestations.html — batch B30. Source: PRO R08, read in full. Only
  the "Où ?" tab below is a literal transcription — Infos/Prix & durée/
  Réservation reuse COMP's field patterns, flagged in the HTML file's own
  header comment.
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;

  var draft = null, tab = "infos";

  // Same formula as booking-flow.js/prestations.html/index.html's own
  // preavisLabel (each already has a local copy — matching that precedent
  // rather than introducing a new shared module for one more call site).
  function delaiLabel(hours) {
    if (hours % 24 !== 0 || hours <= 72) return hours + " h";
    var d = hours / 24;
    return (d > 7 && d % 7 === 0) ? (d / 7) + " semaines" : d + " jours";
  }

  function getId() { return new URLSearchParams(window.location.search).get("id"); }

  function renderList() {
    var state = S.get();
    var services = state.services.slice().sort(function (a, b) { return a.ordre - b.ordre; });
    document.getElementById("pr-list").innerHTML = services.map(function (s) {
      var lieuLabel = s.lieu === "domicile_cliente" ? "🚶‍♀️ Je me déplace" : s.lieu === "sans_deplacement" ? "🏠 Sans déplacement" : "↔ Au choix";
      return '<a class="pr-list-row" href="prestations.html?id=' + s.id + '" style="text-decoration:none; color:inherit;">' +
        '<span class="data-table__avatar" style="border-radius:10px;">✂</span>' +
        '<span class="pr-list-row__meta"><p class="pr-list-row__name">' + s.nom + (s.visible ? "" : ' <span style="font-weight:400; color:var(--ink-3); font-size:12.5px;">· masquée</span>') + '</p>' +
        '<p class="pr-list-row__sub">' + D.formatServicePrice(s) + (s.dureeMin ? " · " + D.formatDuration(s.dureeMin * 60000) : "") + " · " + lieuLabel + '</p></span>' +
        '<span style="font-size:16px; color:var(--ink-2);">›</span>' +
      '</a>';
    }).join("");
  }

  function fieldRow(label, inner) { return '<div class="pr-field-row"><span class="label">' + label + '</span>' + inner + '</div>'; }

  function renderInfos() {
    return '<label class="field-label" for="ed-nom">Nom</label><input class="field" id="ed-nom" style="margin-bottom:14px;" value="' + draft.nom + '">' +
      '<label class="field-label" for="ed-accroche">Accroche</label><input class="field" id="ed-accroche" style="margin-bottom:14px;" value="' + (draft.accroche || "") + '">' +
      '<label class="field-label" for="ed-description">Description</label><textarea class="field" id="ed-description" style="min-height:90px; margin-bottom:14px;">' + (draft.description || "") + '</textarea>' +
      fieldRow("Visible sur le site", '<button type="button" class="switch" id="ed-visible" role="switch" aria-checked="' + draft.visible + '"><span class="switch__thumb"></span></button>');
  }

  function renderPrix() {
    return '<label class="field-label" for="ed-typeprix">Type de prix</label>' +
      '<select class="field" id="ed-typeprix" style="margin-bottom:14px;">' +
        ["fixe", "a_partir_de", "devis"].map(function (t) { return '<option value="' + t + '"' + (draft.typePrix === t ? " selected" : "") + '>' + (t === "fixe" ? "Prix fixe" : t === "a_partir_de" ? "À partir de" : "Sur devis") + '</option>'; }).join("") +
      '</select>' +
      fieldRow("Prix (€)", '<input class="field field--mono" id="ed-prix" value="' + (draft.prixEuros != null ? draft.prixEuros : "") + '">') +
      (draft.dureeMin != null ? fieldRow("Durée (min)", '<input class="field field--mono" id="ed-duree" value="' + draft.dureeMin + '">') : "") +
      '<label class="field-label" style="margin-top:8px;">Arrhes</label>' +
      fieldRow("Type", '<select class="field" id="ed-arrhes-type" style="max-width:140px;"><option value="" ' + (!draft.arrhes ? "selected" : "") + '>Aucune</option><option value="montant"' + (draft.arrhes && draft.arrhes.type === "montant" ? " selected" : "") + '>Montant (€)</option><option value="pourcentage"' + (draft.arrhes && draft.arrhes.type === "pourcentage" ? " selected" : "") + '>Pourcentage (%)</option></select>') +
      (draft.arrhes ? fieldRow("Valeur", '<input class="field field--mono" id="ed-arrhes-valeur" value="' + draft.arrhes.valeur + '">') : "");
  }

  function renderOu() {
    var lieu = draft.lieu;
    return '<p style="margin:0 0 6px; font-family:var(--font-display); font-size:22px;">Où se passe la prestation ?</p>' +
      '<p style="margin:0 0 14px; font-size:14px; color:var(--ink-body);">C’est ce réglage qui décide si la cliente doit donner son adresse.</p>' +
      '<fieldset style="border:0; margin:0 0 18px; padding:0; display:flex; flex-direction:column; gap:10px;" id="ed-lieu">' +
        [
          ["domicile_cliente", "Je me déplace chez la cliente", "L’étape « Adresse » apparaît avant les horaires, et je vois le trajet sur chaque demande."],
          ["sans_deplacement", "Sans déplacement", "Le travail se fait sur la perruque. Pas d’adresse, pas de trajet."],
          ["au_choix", "Au choix de la cliente", "Elle choisit « À domicile » ou « Sans déplacement » au début de sa demande."]
        ].map(function (o) {
          var checked = lieu === o[0];
          return '<label style="border:' + (checked ? "2px solid var(--action)" : "1px solid var(--rule)") + '; background:var(--surface); border-radius:12px; padding:14px; display:flex; gap:12px; align-items:flex-start; cursor:pointer;">' +
            '<input type="radio" name="ed-lieu-r" value="' + o[0] + '" class="sr-only"' + (checked ? " checked" : "") + '>' +
            '<span style="width:20px; height:20px; border-radius:50%; border:' + (checked ? "6px solid var(--action)" : "1px solid var(--ink-3)") + '; background:var(--surface); flex:none; margin-top:2px;"></span>' +
            '<span><p style="margin:0; font-weight:600; font-size:15.5px;">' + o[1] + '</p><p style="margin:3px 0 0; font-size:13.5px; color:var(--ink-2);">' + o[2] + '</p></span></label>';
        }).join("") +
      '</fieldset>' +
      (lieu === "sans_deplacement" ? '<div style="background:var(--sand); border-radius:12px; padding:14px; margin-bottom:18px;">' +
        '<p style="margin:0 0 10px; font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.08em; color:var(--action);">SI SANS DÉPLACEMENT · REMISE DE LA PERRUQUE</p>' +
        ["a_definir", "main_propre", "envoi", "lors_d_un_rdv"].map(function (r) {
          var checked = draft.remise === r;
          var label = { a_definir: "À définir ensemble par message", main_propre: "Je passe la chercher (trajet compté)", envoi: "Envoi postal", lors_d_un_rdv: "Lors d’un autre RDV" }[r];
          return '<label style="display:flex; gap:10px; align-items:center; min-height:44px; font-size:14.5px; cursor:pointer;"><input type="radio" name="ed-remise-r" value="' + r + '" class="sr-only"' + (checked ? " checked" : "") + '><span style="width:18px; height:18px; border-radius:50%; border:' + (checked ? "5px solid var(--action)" : "1px solid var(--ink-3)") + '; background:var(--surface);"></span>' + label + '</label>';
        }).join("") +
      '</div>' : "") +
      '<div style="display:flex; flex-direction:column; gap:12px; margin-bottom:18px;">' +
        fieldRow("Battement avant (préparation)", '<input class="field field--mono" id="ed-tampon-avant" value="' + draft.tamponAvantMin + ' min">') +
        fieldRow("Battement après (rangement)", '<input class="field field--mono" id="ed-tampon-apres" value="' + draft.tamponApresMin + ' min">') +
      '</div>' +
      '<p class="cl-eyebrow" style="margin-bottom:8px;">APERÇU CÔTÉ CLIENTE</p>' +
      '<div class="pr-preview-box"><div id="ed-preview"></div><p style="margin:10px 0 0; font-size:12.5px; color:var(--ink-2); text-align:center;">Mis à jour en direct pendant que tu modifies.</p></div>';
  }

  function renderReservation() {
    return fieldRow("Mode de réservation", '<select class="field" id="ed-mode" style="max-width:160px;">' +
        ["demande", "instantane", "projet"].map(function (m) { return '<option value="' + m + '"' + (draft.modeReservation === m ? " selected" : "") + '>' + (m === "demande" ? "Sur demande" : m === "instantane" ? "Instantané" : "Projet") + '</option>'; }).join("") +
      '</select>') +
      fieldRow("Délai minimum (heures)", '<input class="field field--mono" id="ed-delai" value="' + draft.delaiMinimumHeures + '">') +
      '<label class="field-label" style="margin-top:8px;">Photos</label>' +
      '<select class="field" id="ed-photos" style="margin-bottom:14px;">' +
        ["masquees", "optionnelles", "obligatoires"].map(function (p) { return '<option value="' + p + '"' + (draft.photos === p ? " selected" : "") + '>' + (p === "masquees" ? "Masquées" : p === "optionnelles" ? "Optionnelles" : "Obligatoires") + '</option>'; }).join("") +
      '</select>';
  }

  function renderPreview() {
    var el = document.getElementById("ed-preview");
    if (!el) return;
    var lieuLabel = draft.lieu === "domicile_cliente" ? "🚶‍♀️ Je me déplace" : draft.lieu === "sans_deplacement" ? "🏠 Sans déplacement" : "↔ Au choix";
    el.innerHTML = '<div style="background:var(--surface); border:1px solid var(--rule); border-radius:12px; padding:14px;">' +
      '<div style="display:flex; justify-content:space-between; gap:10px; align-items:baseline;"><p style="margin:0; font-family:var(--font-display); font-size:19px;">' + draft.nom + '</p><span class="field--mono" style="white-space:nowrap;">' + D.formatServicePrice(draft) + '</span></div>' +
      (draft.accroche ? '<p style="margin:6px 0 0; font-size:13.5px; color:var(--ink-body);">' + draft.accroche + '</p>' : "") +
      '<p style="margin:8px 0 0; font-size:12.5px; color:var(--ink-2);"><span class="chip chip--travel">' + lieuLabel + '</span>' + (draft.dureeMin ? " · " + D.formatDuration(draft.dureeMin * 60000) : "") + (draft.delaiMinimumHeures ? " · préavis " + delaiLabel(draft.delaiMinimumHeures) : "") + '</p>' +
    '</div>';
  }

  function renderEditorBody() {
    var body = document.getElementById("pr-editor-body");
    body.innerHTML = tab === "infos" ? renderInfos() : tab === "prix" ? renderPrix() : tab === "ou" ? renderOu() : renderReservation();
    wireEditor();
    if (tab === "ou") renderPreview();
  }

  function wireEditor() {
    var $ = function (id) { return document.getElementById(id); };
    if ($("ed-nom")) $("ed-nom").addEventListener("input", function () { draft.nom = this.value; });
    if ($("ed-accroche")) $("ed-accroche").addEventListener("input", function () { draft.accroche = this.value; });
    if ($("ed-description")) $("ed-description").addEventListener("input", function () { draft.description = this.value; });
    if ($("ed-visible")) $("ed-visible").addEventListener("click", function () {
      draft.visible = !draft.visible;
      this.setAttribute("aria-checked", draft.visible);
    });
    if ($("ed-typeprix")) $("ed-typeprix").addEventListener("change", function () { draft.typePrix = this.value; });
    if ($("ed-prix")) $("ed-prix").addEventListener("input", function () { draft.prixEuros = +this.value || null; });
    if ($("ed-duree")) $("ed-duree").addEventListener("input", function () { draft.dureeMin = +this.value || null; });
    if ($("ed-arrhes-type")) $("ed-arrhes-type").addEventListener("change", function () {
      draft.arrhes = this.value ? { type: this.value, valeur: (draft.arrhes && draft.arrhes.valeur) || 0 } : null;
      renderEditorBody();
    });
    if ($("ed-arrhes-valeur")) $("ed-arrhes-valeur").addEventListener("input", function () { draft.arrhes.valeur = +this.value || 0; });
    if ($("ed-lieu")) $("ed-lieu").querySelectorAll('input[name="ed-lieu-r"]').forEach(function (r) {
      r.addEventListener("change", function () { draft.lieu = this.value; renderEditorBody(); });
    });
    document.querySelectorAll('input[name="ed-remise-r"]').forEach(function (r) {
      r.addEventListener("change", function () { draft.remise = this.value; });
    });
    if ($("ed-tampon-avant")) $("ed-tampon-avant").addEventListener("input", function () { draft.tamponAvantMin = parseInt(this.value) || 0; renderPreview(); });
    if ($("ed-tampon-apres")) $("ed-tampon-apres").addEventListener("input", function () { draft.tamponApresMin = parseInt(this.value) || 0; renderPreview(); });
    if ($("ed-mode")) $("ed-mode").addEventListener("change", function () { draft.modeReservation = this.value; });
    if ($("ed-delai")) $("ed-delai").addEventListener("input", function () { draft.delaiMinimumHeures = +this.value || 0; });
    if ($("ed-photos")) $("ed-photos").addEventListener("change", function () { draft.photos = this.value; });
  }

  function renderEditor(id) {
    var svc = S.service(id);
    if (!svc) { document.getElementById("pr-editor-body").innerHTML = '<div class="empty-state"><p class="empty-state__title">Prestation introuvable</p></div>'; return; }
    draft = JSON.parse(JSON.stringify(svc));
    document.getElementById("pr-editor-title").textContent = svc.nom;
    renderEditorBody();
  }

  document.getElementById("pr-tabs").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    tab = btn.dataset.tab;
    document.querySelectorAll("#pr-tabs button").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
    renderEditorBody();
  });

  document.getElementById("pr-save").addEventListener("click", function () {
    if (!draft) return;
    S.updateService(draft.id, draft);
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.style.cssText = "position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:95;";
    toast.textContent = "Prestation enregistrée ✓";
    document.body.appendChild(toast);
    window.setTimeout(function () { toast.remove(); }, 2200);
  });

  function route() {
    var id = getId();
    document.getElementById("pr-list-view").hidden = !!id;
    document.getElementById("pr-editor-view").hidden = !id;
    if (id) renderEditor(id); else renderList();
  }

  route();
  window.addEventListener("popstate", route);
  S.subscribe(function () { if (!getId()) renderList(); });
})();
