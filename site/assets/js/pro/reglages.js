/*
  pro/reglages.html — batch B34. Source: PRO R14 (mobile) + R14-desktop,
  both read in full — delivered, designed to spec, nothing extrapolated.

  "Arrhes pour une prestation à domicile" / "…fabrication sur mesure" have
  no dedicated settings field in DATA-MODEL.md — each service carries its
  own arrhes. R14 shows them as two single editable numbers, so editing
  the first here bulk-sets every domicile_cliente/au_choix montant-type
  service's arrhes at once, and the second sets the fabrication service's
  own percentage — a real, wired interpretation of what R14 draws, not a
  new invented data-model field.
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var M = window.ENIOL_MOTION;

  function commonArrhesDomicile(state) {
    var svc = state.services.filter(function (s) { return s.lieu !== "sans_deplacement" && s.arrhes && s.arrhes.type === "montant"; })[0];
    return svc ? svc.arrhes.valeur : 0;
  }
  function fabricationService(state) { return state.services.filter(function (s) { return s.modeReservation === "projet"; })[0]; }

  function render() {
    var state = S.get(), settings = state.settings;
    var registre = settings.registre;
    var exampleVous = "Je vous réponds sous 24 h", exampleTu = "Je te réponds sous 24 h";
    var fab = fabricationService(state);

    document.getElementById("rg-root").innerHTML =
      // ---- Registre ----
      '<div class="rg-section"><p class="rg-eyebrow">REGISTRE</p>' +
        '<div class="segmented segmented--thumb" id="rg-registre" style="width:100%; max-width:280px; display:flex; margin-bottom:12px;">' +
          '<div class="segmented__thumb"></div>' +
          '<label class="segmented__item" style="flex:1; text-align:center;"><input type="radio" name="rg-registre-r" value="vous" class="sr-only"' + (registre === "vous" ? " checked" : "") + '>Vous</label>' +
          '<label class="segmented__item" style="flex:1; text-align:center;"><input type="radio" name="rg-registre-r" value="tu" class="sr-only"' + (registre === "tu" ? " checked" : "") + '>Tu</label>' +
        '</div>' +
        '<p style="margin:0 0 10px; font-size:13.5px; color:var(--ink-body);">Ce choix change chaque phrase du site public, pas seulement ce mot.</p>' +
        '<div class="rg-example"><p>« ' + exampleVous + ' »</p><p>→ en tu : « ' + exampleTu + ' »</p></div>' +
      '</div>' +

      // ---- Arrhes & annulation ----
      '<div class="rg-section"><p class="rg-eyebrow">ARRHES &amp; ANNULATION</p><div class="rg-card">' +
        '<div class="rg-row"><label class="field-label" for="rg-arrhes-domicile">Arrhes pour une prestation à domicile</label>' +
          '<input class="field field--mono" id="rg-arrhes-domicile" value="' + commonArrhesDomicile(state) + ' €"></div>' +
        (fab ? '<div class="rg-row"><label class="field-label" for="rg-arrhes-fabrication">Arrhes pour la fabrication sur mesure</label>' +
          '<input class="field field--mono" id="rg-arrhes-fabrication" value="' + fab.arrhes.valeur + ' %">' +
          '<p style="margin:8px 0 0; font-size:12.5px; color:var(--ink-2);">Non remboursables une fois les matières commandées.</p></div>' : "") +
        '<div class="rg-row rg-row--flex"><span style="font-size:14.5px;">Délai d’annulation gratuite</span><input class="field field--mono" id="rg-delai-annulation" style="max-width:90px; text-align:right;" value="' + settings.annulation.gratuiteJusquaHeures + ' h"></div>' +
        '<div class="rg-row rg-row--flex"><span style="font-size:14.5px;">Tolérance de retard / absence</span><input class="field field--mono" id="rg-tolerance" style="max-width:90px; text-align:right;" value="' + settings.annulation.toleranceRetardMin + ' min"></div>' +
      '</div>' +
      '<p style="margin:14px 0 8px; font-size:13px; font-weight:500;">Moyens acceptés pour recevoir les arrhes</p>' +
      '<div style="display:flex; flex-wrap:wrap; gap:8px;" id="rg-moyens">' +
        settings.arrhes.moyens.map(function (m) {
          return '<span style="display:inline-flex; align-items:center; gap:6px; background:var(--action); color:var(--surface); border-radius:999px; padding:10px 14px; font-size:13.5px; font-weight:500;">✓ ' + m + '</span>';
        }).join("") +
      '</div>' +
      '<p style="margin:8px 0 0; font-size:12.5px; color:var(--ink-3);">Affichés en texte simple à la cliente — jamais de logo de service de paiement.</p>' +
      '</div>' +

      // ---- Coordonnées & liens ----
      '<div class="rg-section"><p class="rg-eyebrow">COORDONNÉES &amp; LIENS</p><div class="rg-card">' +
        '<div class="rg-row rg-row--flex"><span style="font-size:14.5px;">Téléphone</span><span class="field--mono" style="font-size:14px;">' + D.formatPhoneFr(settings.telephone) + '</span></div>' +
        '<div class="rg-row rg-row--flex"><span style="font-size:14.5px;">Instagram</span><span class="field--mono" style="font-size:14px; color:var(--action);">@' + settings.instagram + '</span></div>' +
        '<div class="rg-row rg-row--flex"><span style="font-size:14.5px;">Snapchat</span><span class="field--mono" style="font-size:14px; color:var(--action);">@' + settings.snapchat + '</span></div>' +
      '</div>' +
      '<p style="margin:12px 0 6px; font-size:12.5px; color:var(--ink-3);">APERÇU DU LIEN DM</p>' +
      '<div style="border:1px dashed var(--slot-unavailable-border); border-radius:10px; padding:11px; font-family:var(--font-mono); font-size:12.5px; color:var(--ink-2); word-break:break-all;" id="rg-dm-preview">ig.me/m/' + settings.instagram + '</div>' +
      '</div>' +

      // ---- Bandeau du site ----
      '<div class="rg-section"><p class="rg-eyebrow">BANDEAU DU SITE</p>' +
        '<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;" id="rg-banniere">' +
          '<label class="rg-lieu-label' + (settings.banniere.auto ? " is-checked" : "") + '"><input type="radio" name="rg-banniere-r" value="auto" class="sr-only"' + (settings.banniere.auto ? " checked" : "") + '>' +
            '<span style="width:20px; height:20px; border-radius:50%; border:' + (settings.banniere.auto ? "6px solid var(--action)" : "1px solid var(--ink-3)") + '; flex:none; margin-top:2px;"></span>' +
            '<span><p style="margin:0; font-weight:600; font-size:15px;">Automatique</p><p style="margin:3px 0 0; font-size:13px; color:var(--ink-2);">Généré selon les mois que tu ouvres aux réservations.</p></span></label>' +
          '<label class="rg-lieu-label' + (!settings.banniere.auto ? " is-checked" : "") + '"><input type="radio" name="rg-banniere-r" value="manuel" class="sr-only"' + (!settings.banniere.auto ? " checked" : "") + '>' +
            '<span style="width:20px; height:20px; border-radius:50%; border:' + (!settings.banniere.auto ? "6px solid var(--action)" : "1px solid var(--ink-3)") + '; flex:none; margin-top:2px;"></span>' +
            '<span><p style="margin:0; font-weight:600; font-size:15px;">Texte personnalisé</p><p style="margin:3px 0 0; font-size:13px; color:var(--ink-2);">Tu écris toi-même le bandeau, par exemple pour une pause.</p></span></label>' +
        '</div>' +
        (!settings.banniere.auto ? '<input class="field" id="rg-banniere-texte" style="margin-bottom:12px;" value="' + (settings.banniere.texteManuel || "") + '" placeholder="Ex. : En pause jusqu’au 3 novembre">' : "") +
        '<div class="rg-banner-preview"><p style="margin:0 0 6px; font-family:var(--font-mono); font-size:10px; letter-spacing:0.06em; color:var(--ink-2-on-deep);">APERÇU DU BANDEAU PUBLIC</p><p style="margin:0; font-size:14px; color:var(--ink-on-deep);" id="rg-banniere-preview-text"></p></div>' +
      '</div>' +

      // ---- Mentions légales ----
      '<div class="rg-section' + (window.innerWidth >= 900 ? '" style="grid-column:1/-1;' : '') + '"><p class="rg-eyebrow">MENTIONS LÉGALES</p>' +
        '<div style="background:var(--sand); border-radius:12px; padding:14px; display:flex; align-items:center; gap:12px;">' +
          '<p style="margin:0; flex:1; font-size:13.5px; color:#3A2A1E;">Les arrhes, l’annulation et les mentions légales détaillées vivent sur la page Conditions — pas de doublon ici.</p>' +
        '</div>' +
        '<a class="btn btn--secondary" href="../conditions.html" style="display:block; text-align:center; margin-top:10px;">Modifier les conditions →</a>' +
      '</div>';

    renderBanniereText();
    wire(state);
    M.segmented(document.getElementById("rg-registre"));
  }

  function renderBanniereText() {
    var state = S.get(), settings = state.settings;
    var el = document.getElementById("rg-banniere-preview-text");
    if (!el) return;
    if (settings.banniere.auto) {
      var open = settings.moisOuverts.slice().sort();
      var lastOpen = open[open.length - 1];
      var monthName = lastOpen ? D.MONTHS_LONG[D.parseLocal(lastOpen + "-01").getMonth()] : "";
      var de = /^[aeiouh]/i.test(monthName) ? "d’" : "de ";
      el.textContent = monthName ? "🌟 Les réservations " + de + monthName + " sont ouvertes 🌟" : "🌟 Aucun mois ouvert pour l’instant 🌟";
    } else {
      el.textContent = settings.banniere.texteManuel ? "🌟 " + settings.banniere.texteManuel + " 🌟" : "(texte à écrire)";
    }
  }

  function wire(state) {
    document.querySelectorAll('input[name="rg-registre-r"]').forEach(function (r) {
      r.addEventListener("change", function () { S.updateSettings({ registre: this.value }); });
    });

    var domInput = document.getElementById("rg-arrhes-domicile");
    if (domInput) domInput.addEventListener("change", function () {
      var v = parseInt(this.value) || 0;
      state.services.forEach(function (s) {
        if (s.lieu !== "sans_deplacement" && s.arrhes && s.arrhes.type === "montant") S.updateService(s.id, { arrhes: { type: "montant", valeur: v } });
      });
    });
    var fabInput = document.getElementById("rg-arrhes-fabrication");
    if (fabInput) fabInput.addEventListener("change", function () {
      var fab = fabricationService(state);
      S.updateService(fab.id, { arrhes: { type: "pourcentage", valeur: parseInt(this.value) || 0, nonRemboursablesApresCommande: true } });
    });
    var delaiInput = document.getElementById("rg-delai-annulation");
    if (delaiInput) delaiInput.addEventListener("change", function () { S.updateSettings({ annulation: extend(state.settings.annulation, { gratuiteJusquaHeures: parseInt(this.value) || 0 }) }); });
    var tolInput = document.getElementById("rg-tolerance");
    if (tolInput) tolInput.addEventListener("change", function () { S.updateSettings({ annulation: extend(state.settings.annulation, { toleranceRetardMin: parseInt(this.value) || 0 }) }); });

    document.querySelectorAll('input[name="rg-banniere-r"]').forEach(function (r) {
      r.addEventListener("change", function () { S.updateSettings({ banniere: extend(state.settings.banniere, { auto: this.value === "auto" }) }); });
    });
    var bannierText = document.getElementById("rg-banniere-texte");
    if (bannierText) bannierText.addEventListener("input", function () {
      S.updateSettings({ banniere: extend(state.settings.banniere, { texteManuel: this.value }) });
      renderBanniereText();
    });
  }

  function extend(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  render();
  S.subscribe(render);
})();
