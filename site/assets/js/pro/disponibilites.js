/*
  pro/disponibilites.html — batch B31. Source: PRO R09, read in full, every
  section. Adding a brand-new custom day-group isn't drawn anywhere in R09
  (only the 3 raccourcis + editing existing groups' hours) so that's the
  one thing this editor doesn't support — everything R09 actually shows is
  real and wired to store.js.
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;

  var PRESETS = [
    { id: "regle-mercredi", label: "Mercredi après-midi", jours: [3], plages: [["14:00", "19:00"]] },
    { id: "regle-soirs", label: "Soirs de semaine", jours: [1, 2, 3, 4, 5], plages: [["18:00", "20:00"]] },
    { id: "regle-weekend", label: "Week-end", jours: [6, 0], plages: [["09:00", "13:00"], ["14:00", "19:00"]] }
  ];
  var TOUSSAINT = { id: "exc-toussaint", du: "2026-10-18", au: "2026-11-02", type: "ouverture", libelle: "Vacances de la Toussaint (zone C)", plages: [["10:00", "19:00"]] };

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function addMonths(yyyyMm, n) { var d = D.parseLocal(yyyyMm + "-01"); d.setMonth(d.getMonth() + n); return d.getFullYear() + "-" + pad2(d.getMonth() + 1); }
  function monthLabel(yyyyMm) { var d = D.parseLocal(yyyyMm + "-01"); return D.MONTHS_LONG[d.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + " " + d.getFullYear(); }

  function dayGroupLabel(jours) {
    return jours.map(function (j) { return D.DAYS_LONG[j].replace(/^./, function (c) { return c.toUpperCase(); }); }).join(" · ");
  }
  function closedDays(rules) {
    var covered = {};
    rules.forEach(function (r) { r.jours.forEach(function (j) { covered[j] = true; }); });
    var out = [];
    for (var j = 0; j < 7; j++) if (!covered[j]) out.push(j);
    return out;
  }

  function renderRaccourcis(rules) {
    return '<div class="dp-section"><p class="dp-eyebrow">RACCOURCIS</p><div style="display:flex; flex-wrap:wrap; gap:8px;">' +
      PRESETS.map(function (p) {
        var on = rules.some(function (r) { return r.id === p.id; });
        return '<button type="button" class="dp-chip' + (on ? " is-on" : "") + '" data-preset="' + p.id + '">' + p.label + (on ? " ✓" : "") + '</button>';
      }).join("") + '</div></div>';
  }

  function renderHoraires(rules) {
    var closed = closedDays(rules);
    var html = '<div class="dp-section"><p class="dp-eyebrow">MES HORAIRES</p><div class="dp-list">';
    rules.forEach(function (r, ri) {
      html += '<div style="padding:14px; border-bottom:1px solid var(--sand);">' +
        '<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">' +
          '<button type="button" class="hours-row__check" aria-checked="true" data-remove-rule="' + r.id + '">✓</button>' +
          '<span style="font-weight:600; font-size:14.5px;">' + dayGroupLabel(r.jours) + '</span>' +
        '</div>' +
        r.plages.map(function (pl, pi) {
          return '<div class="hours-row__range">' +
            '<input class="hours-row__time" type="time" value="' + pl[0] + '" data-rule="' + ri + '" data-plage="' + pi + '" data-part="0">' +
            '<span style="color:var(--ink-2);">→</span>' +
            '<input class="hours-row__time" type="time" value="' + pl[1] + '" data-rule="' + ri + '" data-plage="' + pi + '" data-part="1">' +
            (r.plages.length > 1 ? '<button type="button" style="margin-left:auto; background:none; border:0; font-size:15px; color:var(--ink-2); cursor:pointer;" data-remove-plage="' + ri + ':' + pi + '">✕</button>' : '<button type="button" style="margin-left:auto; font-size:13px; color:var(--action); background:none; border:0; cursor:pointer;" data-add-plage="' + ri + '">＋ plage</button>') +
          '</div>';
        }).join("") +
      '</div>';
    });
    if (closed.length) {
      html += '<div style="padding:14px; display:flex; align-items:center; gap:8px; color:var(--ink-2);">' +
        '<span style="width:20px; height:20px; border:1px solid var(--ink-3); border-radius:5px;"></span>' +
        '<span style="font-size:14.5px;">' + closed.map(function (j) { return D.DAYS_LONG[j].replace(/^./, function (c) { return c.toUpperCase(); }); }).join(" · ") + '</span>' +
        '<span style="margin-left:auto; font-size:13px;">fermé</span>' +
      '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function renderExceptions(exceptions) {
    var hasToussaint = exceptions.some(function (e) { return e.id === TOUSSAINT.id; });
    return '<div class="dp-section"><p class="dp-eyebrow">EXCEPTIONS</p>' +
      '<div style="display:flex; gap:8px; margin-bottom:10px;">' +
        '<button type="button" class="btn btn--secondary" style="flex:1; padding:14px 8px;" id="btn-bloquer">Bloquer une période</button>' +
        '<button type="button" class="btn btn--secondary" style="flex:1; padding:14px 8px;" id="btn-ouvrir">Ouvrir exceptionnellement</button>' +
      '</div>' +
      (exceptions.length ? '<div class="dp-list">' + exceptions.map(function (e) {
        return '<div class="dp-list-row"><span><p style="margin:0; font-weight:500;">' + e.libelle + '</p>' +
          '<p style="margin:2px 0 0; font-family:var(--font-mono); font-size:12.5px; color:var(--ink-2);">' + D.formatDateShort(D.parseLocal(e.du)).replace(/^\S+\s/, "") + " → " + D.formatDateShort(D.parseLocal(e.au)).replace(/^\S+\s/, "") + " · " + (e.plages ? e.plages[0][0] + "–" + e.plages[0][1] : "toute la journée") + '</p></span>' +
          '<button type="button" style="background:none; border:0; color:var(--state-danger-ink); font-size:15px; cursor:pointer;" data-remove-exc="' + e.id + '">✕</button></div>';
      }).join("") + '</div>' : "") +
      '<div style="background:var(--sand); border-radius:12px; padding:12px; margin-top:10px; display:flex; align-items:center; gap:12px;">' +
        '<p style="margin:0; flex:1; font-size:13.5px; color:#3A2A1E;">' + (hasToussaint ? "Vacances scolaires (zone C) déjà ajoutées comme journées ouvertes." : "Ajouter les vacances scolaires (zone C) comme journées ouvertes.") + '</p>' +
        (hasToussaint ? "" : '<button type="button" class="btn btn--primary" style="padding:12px 14px; min-height:0;" id="btn-add-toussaint">Ajouter</button>') +
      '</div>' +
    '</div>';
  }

  function renderOuverture(settings) {
    var thisMonth = isoDate(S.now()).slice(0, 7);
    var months = [thisMonth, addMonths(thisMonth, 1), addMonths(thisMonth, 2)];
    var lastOpenMonth = settings.moisOuverts.slice().sort().pop() || thisMonth;
    var monthNameOnly = D.MONTHS_LONG[D.parseLocal(lastOpenMonth + "-01").getMonth()];
    // "d'octobre"/"d'avril"/"d'août" — the strings.js seed string ("de
    // septembre") never needed this elision, but a dynamically-picked month
    // starting with a vowel does.
    var de = /^[aeiouh]/i.test(monthNameOnly) ? "d’" : "de ";
    var bannerText = settings.banniere.auto
      ? "🌟 Les réservations " + de + monthNameOnly + " sont ouvertes 🌟"
      : (settings.banniere.texteManuel || "");
    return '<div class="dp-section"><p class="dp-eyebrow">OUVERTURE DES RÉSERVATIONS</p><div class="dp-list">' +
      months.map(function (m) {
        var open = settings.moisOuverts.indexOf(m) >= 0;
        return '<div class="dp-list-row"><span>' + monthLabel(m) + '</span><button type="button" class="switch" role="switch" aria-checked="' + open + '" data-toggle-month="' + m + '"><span class="switch__thumb"></span></button></div>';
      }).join("") + '</div>' +
      '<div class="dp-banner-preview"><p style="margin:0 0 6px; font-family:var(--font-mono); font-size:10px; letter-spacing:0.06em; color:var(--ink-2-on-deep);">APERÇU DU BANDEAU PUBLIC</p><p style="margin:0; font-size:14px; color:var(--ink-on-deep);">' + bannerText + '</p></div>' +
    '</div>';
  }

  function renderDeplacements(settings) {
    return '<div class="dp-section"><p class="dp-eyebrow">DÉPLACEMENTS</p><div class="dp-list">' +
      '<div class="dp-list-row"><span>Point de départ</span><span style="text-align:right; color:var(--ink-body);">' + settings.pointDeDepart.libelle + " — " + settings.pointDeDepart.arrondissement +
        (Object.keys(settings.departsDuJour || {}).length ? '<br><span style="font-size:13px; color:var(--ink-2);">' + Object.keys(settings.departsDuJour).map(function (d) { return D.DAYS_LONG[D.parseLocal(d).getDay()] + " : " + settings.departsDuJour[d].libelle + " — " + settings.departsDuJour[d].arrondissement; }).join(", ") + '</span>' : "") + '</span></div>' +
      '<div class="dp-list-row"><span>Transport</span><select class="field" id="dp-transport" style="max-width:150px; padding:10px;"><option value="transports"' + (settings.modeTransport === "transports" ? " selected" : "") + '>Métro / bus</option><option value="voiture"' + (settings.modeTransport === "voiture" ? " selected" : "") + '>Voiture</option></select></div>' +
      '<div class="dp-list-row"><span>Marge de trajet</span><input class="field field--mono" id="dp-marge" style="max-width:100px; text-align:right;" value="' + settings.margeTrajetMin + '"></div>' +
      '<div class="dp-list-row"><span>Compter le trajet du 1ᵉʳ RDV</span><button type="button" class="switch" role="switch" aria-checked="' + settings.compterTrajetPremierRdv + '" id="dp-compter-premier"><span class="switch__thumb"></span></button></div>' +
      '<div class="dp-list-row"><span>Délai de réponse</span><input class="field field--mono" id="dp-delai" style="max-width:100px; text-align:right;" value="' + settings.delaiReponseHeures + '"></div>' +
      '<div class="dp-list-row"><span>RDV max par jour</span><input class="field field--mono" id="dp-max-rdv" style="max-width:100px; text-align:right;" value="' + settings.maxRdvParJour + '"></div>' +
    '</div></div>';
  }

  function render() {
    var state = S.get();
    var root = document.getElementById("dp-root");
    root.innerHTML = renderRaccourcis(state.weeklyRules) + renderHoraires(state.weeklyRules) + renderExceptions(state.exceptions) + renderOuverture(state.settings) + renderDeplacements(state.settings);
    wire(state);
  }

  function wire(state) {
    document.querySelectorAll("[data-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var preset = PRESETS.filter(function (p) { return p.id === btn.dataset.preset; })[0];
        var rules = state.weeklyRules.slice();
        var idx = rules.findIndex(function (r) { return r.id === preset.id; });
        if (idx >= 0) rules.splice(idx, 1); else rules.push(JSON.parse(JSON.stringify(preset)));
        S.updateWeeklyRules(rules);
      });
    });

    document.querySelectorAll("[data-remove-rule]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        S.updateWeeklyRules(state.weeklyRules.filter(function (r) { return r.id !== btn.dataset.removeRule; }));
      });
    });

    document.querySelectorAll(".hours-row__time").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var rules = JSON.parse(JSON.stringify(state.weeklyRules));
        rules[+inp.dataset.rule].plages[+inp.dataset.plage][+inp.dataset.part] = inp.value;
        S.updateWeeklyRules(rules);
      });
    });
    document.querySelectorAll("[data-add-plage]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var rules = JSON.parse(JSON.stringify(state.weeklyRules));
        rules[+btn.dataset.addPlage].plages.push(["09:00", "18:00"]);
        S.updateWeeklyRules(rules);
      });
    });
    document.querySelectorAll("[data-remove-plage]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var parts = btn.dataset.removePlage.split(":");
        var rules = JSON.parse(JSON.stringify(state.weeklyRules));
        rules[+parts[0]].plages.splice(+parts[1], 1);
        S.updateWeeklyRules(rules);
      });
    });

    document.querySelectorAll("[data-remove-exc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        S.updateExceptions(state.exceptions.filter(function (e) { return e.id !== btn.dataset.removeExc; }));
      });
    });
    var addToussaint = document.getElementById("btn-add-toussaint");
    if (addToussaint) addToussaint.addEventListener("click", function () { S.updateExceptions(state.exceptions.concat([TOUSSAINT])); });
    document.getElementById("btn-bloquer").addEventListener("click", function () { openExceptionSheet("blocage"); });
    document.getElementById("btn-ouvrir").addEventListener("click", function () { openExceptionSheet("ouverture"); });

    document.querySelectorAll("[data-toggle-month]").forEach(function (sw) {
      sw.addEventListener("click", function () { S.setMonthOpen(sw.dataset.toggleMonth, sw.getAttribute("aria-checked") !== "true"); });
    });

    document.getElementById("dp-transport").addEventListener("change", function () { S.updateSettings({ modeTransport: this.value }); });
    document.getElementById("dp-marge").addEventListener("change", function () { S.updateSettings({ margeTrajetMin: +this.value || 0 }); });
    document.getElementById("dp-compter-premier").addEventListener("click", function () { S.updateSettings({ compterTrajetPremierRdv: this.getAttribute("aria-checked") !== "true" }); });
    document.getElementById("dp-delai").addEventListener("change", function () { S.updateSettings({ delaiReponseHeures: +this.value || 0 }); });
    document.getElementById("dp-max-rdv").addEventListener("change", function () { S.updateSettings({ maxRdvParJour: +this.value || 1 }); });
  }

  function openExceptionSheet(type) {
    var overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    overlay.innerHTML = '<button type="button" class="sheet-overlay__backdrop" aria-label="Fermer"></button>' +
      '<form class="sheet" id="exc-form"><div class="sheet__handle"></div><p class="sheet__title">' + (type === "blocage" ? "Bloquer une période" : "Ouvrir exceptionnellement") + '</p>' +
      '<label class="field-label" for="exc-libelle">Intitulé</label><input class="field" id="exc-libelle" style="margin-bottom:14px; background:var(--ground);" placeholder="Ex. : Vacances">' +
      '<div style="display:flex; gap:10px; margin-bottom:' + (type === "ouverture" ? "14px" : "18px") + ';">' +
        '<div style="flex:1;"><label class="field-label" for="exc-du">Du</label><input class="field field--mono" type="date" id="exc-du" style="background:var(--ground);"></div>' +
        '<div style="flex:1;"><label class="field-label" for="exc-au">Au</label><input class="field field--mono" type="date" id="exc-au" style="background:var(--ground);"></div>' +
      '</div>' +
      (type === "ouverture" ? '<div style="display:flex; gap:10px; margin-bottom:18px;"><div style="flex:1;"><label class="field-label" for="exc-debut">De</label><input class="field field--mono" type="time" id="exc-debut" value="10:00" style="background:var(--ground);"></div><div style="flex:1;"><label class="field-label" for="exc-fin">À</label><input class="field field--mono" type="time" id="exc-fin" value="19:00" style="background:var(--ground);"></div></div>' : "") +
      '<button type="submit" class="btn btn--primary" style="width:100%; margin-bottom:8px;">Enregistrer</button>' +
      '<button type="button" class="btn btn--text-plain" style="width:100%; text-align:center;" data-close="1">Annuler</button></form>';
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    function close() { overlay.remove(); document.body.style.overflow = ""; }
    overlay.querySelector(".sheet-overlay__backdrop").addEventListener("click", close);
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.querySelector("#exc-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var libelle = overlay.querySelector("#exc-libelle").value || (type === "blocage" ? "Période bloquée" : "Ouverture exceptionnelle");
      var exc = {
        id: "exc-" + Date.now().toString(36), du: overlay.querySelector("#exc-du").value, au: overlay.querySelector("#exc-au").value,
        type: type, libelle: libelle
      };
      if (type === "ouverture") exc.plages = [[overlay.querySelector("#exc-debut").value, overlay.querySelector("#exc-fin").value]];
      S.updateExceptions(S.get().exceptions.concat([exc]));
      close();
    });
  }

  render();
  S.subscribe(render);
})();
