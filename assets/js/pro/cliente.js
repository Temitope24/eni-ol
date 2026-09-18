/*
  pro/cliente.html — batch B28. Source: PRO R07, read in full, every
  section. Sections that need data no seed client actually has (cheveux,
  mesures, perruques) are skipped rather than rendered empty.
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var T = window.ENIOL_TRAVEL;
  var M = window.ENIOL_MOTION;

  document.getElementById("cl-back").addEventListener("click", function (e) {
    e.preventDefault();
    M.back("clientes.html");
  });

  var STATUT_CHIP = {
    confirmee: ["chip--ok", "✓ Confirmée"], acceptee_arrhes_attendues: ["chip--warn", "◔ Arrhes en attente"],
    nouveau_creneau_propose: ["chip--warn", "◔ Proposition envoyée"], en_attente: ["chip--warn", "◌ En attente"],
    terminee: ["chip--outline", "Terminée"], refusee: ["chip--danger", "Refusée"], expiree: ["chip--outline", "Expirée"],
    annulee_cliente: ["chip--danger", "Annulée"], annulee_pro: ["chip--danger", "Annulée"], absente: ["chip--danger", "Absente"]
  };

  function getId() { return new URLSearchParams(window.location.search).get("id"); }

  function tagLabel(cl) {
    if (cl.tags && cl.tags.indexOf("fidele") >= 0) return "Fidèle";
    if (cl.tags && cl.tags.indexOf("nouvelle") >= 0) return "Nouvelle cliente";
    return null;
  }

  function monthYear(iso) {
    var d = D.parseLocal(iso);
    return D.MONTHS_LONG[d.getMonth()] + " " + d.getFullYear();
  }

  function render() {
    var id = getId();
    var cl = id && S.client(id);
    var main = document.getElementById("cl-main");
    if (!cl) { main.innerHTML = '<div class="empty-state"><p class="empty-state__title">Fiche introuvable</p></div>'; return; }

    var state = S.get();
    var tag = tagLabel(cl);
    var telHref = cl.telephone ? "tel:" + cl.telephone : null;
    var smsHref = cl.telephone ? "sms:" + cl.telephone : null;
    var igHref = cl.instagram ? "https://instagram.com/" + cl.instagram.replace(/^@/, "") : null;

    var html = '<div class="cl-top">' +
      '<span class="cl-avatar">' + cl.prenom.charAt(0) + '</span>' +
      '<div><p class="cl-name">' + cl.prenom + " " + cl.nom + '</p><p class="cl-meta">' + (tag ? '<span class="chip" style="background:var(--tag-bg); color:var(--heart); padding:2px 8px; font-size:12px;">' + tag + '</span> · ' : "") + 'cliente depuis ' + monthYear(cl.creeLe) + '</p></div>' +
    '</div>' +
    '<div class="cl-actions">' +
      (telHref ? '<a class="btn btn--primary" href="' + telHref + '">Appeler</a>' : '<span class="btn btn--primary" aria-disabled="true" style="opacity:.5;">Appeler</span>') +
      (smsHref ? '<a class="btn btn--secondary" href="' + smsHref + '">SMS</a>' : '<span class="btn btn--secondary" aria-disabled="true" style="opacity:.5;">SMS</span>') +
      (igHref ? '<a class="btn btn--secondary" href="' + igHref + '" target="_blank" rel="noopener">Instagram</a>' : '<span class="btn btn--secondary" aria-disabled="true" style="opacity:.5;">Instagram</span>') +
    '</div>' +
    '<div class="stat-grid" style="margin-bottom:18px;">' +
      '<div class="stat-tile"><p class="stat-tile__value">' + cl.stats.rdv + '</p><p class="stat-tile__label">RDV</p></div>' +
      '<div class="stat-tile"><p class="stat-tile__value">' + cl.stats.annulations + '</p><p class="stat-tile__label">Annul.</p></div>' +
      '<div class="stat-tile"><p class="stat-tile__value">' + cl.stats.absences + '</p><p class="stat-tile__label">Absences</p></div>' +
      '<div class="stat-tile"><p class="stat-tile__value">' + D.formatPrice(cl.stats.totalEuros) + '</p><p class="stat-tile__label">Total</p></div>' +
    '</div>';

    // ---- Adresses ----
    if (cl.adresses && cl.adresses.length) {
      html += '<div class="cl-section"><p class="cl-eyebrow">ADRESSES</p><div class="cl-card">';
      cl.adresses.forEach(function (a, i) {
        var min = a.lat != null ? T.estimateMinutes(state.settings.pointDeDepart, a) : null;
        html += (i > 0 ? '<div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--sand);">' : '<div>') +
          '<p style="font-weight:600;">' + (a.libelle || "Chez elle") + " · " + a.zone.split(" · ")[0] + '</p>' +
          (a.ligne1 ? '<p style="color:var(--ink-body); margin-top:2px;">' + a.ligne1 + (a.complement ? " · " + a.complement : "") + (a.codeAcces ? " · code " + a.codeAcces : "") + '</p>' : "") +
          (min ? '<p style="color:var(--ink-2); margin-top:4px;">≈ ' + min + ' min depuis chez moi</p>' : "") +
        '</div>';
      });
      html += '</div></div>';
    }

    // ---- Cheveux ----
    if (cl.cheveux) {
      var c = cl.cheveux;
      html += '<div class="cl-section"><p class="cl-eyebrow">CHEVEUX</p><div class="cl-card">' +
        '<div class="cl-kv"><span class="k">Texture</span><span>' + c.texture + (c.densite ? ", " + c.densite : "") + '</span></div>' +
        (c.longueur ? '<div class="cl-kv"><span class="k">Longueur</span><span>' + c.longueur + '</span></div>' : "") +
        '<div class="cl-kv"><span class="k">Cuir chevelu sensible</span><span>' + (c.cuirCheveluSensible ? "Oui" : "Non") + '</span></div>' +
        (c.colle ? '<div class="cl-kv"><span class="k">Colle</span><span class="chip ' + (c.colle === "ok" ? "chip--ok" : "chip--warn") + '">' + (c.colle === "ok" ? "✓ OK" : c.colle) + '</span></div>' : "") +
        (c.methodePreferee ? '<div class="cl-kv"><span class="k">Méthode préférée</span><span>' + c.methodePreferee + '</span></div>' : "") +
      '</div></div>';
    }

    // ---- Mesures ----
    if (cl.mesures) {
      var m = cl.mesures;
      html += '<div class="cl-section"><div style="display:flex; justify-content:space-between; align-items:baseline;"><p class="cl-eyebrow">MESURES</p><span style="font-family:var(--font-mono); font-size:11px; color:var(--ink-2);">PRISES LE ' + D.formatDateShort(D.parseLocal(m.le)).toUpperCase() + '</span></div>' +
        '<div class="cl-card">' +
          '<div class="cl-kv"><span class="k">Tour de tête</span><span class="field--mono">' + m.tourDeTete + ' cm</span></div>' +
          '<div class="cl-kv"><span class="k">Front → nuque</span><span class="field--mono">' + m.frontNuque + ' cm</span></div>' +
          '<div class="cl-kv"><span class="k">Oreille → oreille (front)</span><span class="field--mono">' + m.oreilleOreilleFront + ' cm</span></div>' +
          '<div class="cl-kv"><span class="k">Oreille → oreille (sommet)</span><span class="field--mono">' + m.oreilleOreilleSommet + ' cm</span></div>' +
          '<div class="cl-kv"><span class="k">Tempe → tempe (arrière)</span><span class="field--mono">' + m.tempeTempeArriere + ' cm</span></div>' +
          '<div class="cl-kv"><span class="k">Largeur de nuque</span><span class="field--mono">' + m.largeurNuque + ' cm</span></div>' +
          '<p style="margin-top:8px; font-size:13px; color:var(--action); text-decoration:underline;">Mettre à jour les mesures</p>' +
        '</div></div>';
    }

    // ---- Perruques ----
    if (cl.perruques && cl.perruques.length) {
      html += '<div class="cl-section"><p class="cl-eyebrow">SES PERRUQUES · ' + cl.perruques.length + '</p><div class="cl-wig-list">' +
        cl.perruques.map(function (p) {
          var laceLabel = (p.lace || "").replace(/(\d)x(\d)/, "$1×$2");
          return '<div class="cl-wig-card"><div class="cl-wig-thumb placeholder-swatch"></div><div style="font-size:13.5px;">' +
            '<p style="margin:0; font-weight:600; font-size:14.5px;">' + (p.type === "lace_frontale" ? "Lace frontale " + laceLabel : p.type === "closure" ? "Closure " + laceLabel : p.type) + '</p>' +
            '<p style="margin:4px 0 0; color:var(--ink-body); font-family:var(--font-mono);">' + p.longueurPouces + '" · ' + p.densitePct + ' % · ' + p.texture + '</p>' +
            '<p style="margin:2px 0 0; color:var(--ink-body);">Couleur ' + p.couleur + ' · bonnet ' + p.tailleBonnet + '</p>' +
            (p.notes ? '<p style="margin:4px 0 0; color:var(--ink-2);">' + p.notes + '</p>' : "") +
          '</div></div>';
        }).join("") + '</div></div>';
    }

    // ---- Avant / Après ----
    html += '<div class="cl-section"><p class="cl-eyebrow">AVANT / APRÈS</p><div class="cl-gallery"><div class="cl-gallery__add">＋</div></div></div>';

    // ---- Historique ----
    var bookings = S.bookingsOfClient(cl.id).slice().sort(function (a, b) { return (b.debut || b.creeLe) < (a.debut || a.creeLe) ? -1 : 1; });
    if (bookings.length) {
      html += '<div class="cl-section"><p class="cl-eyebrow">HISTORIQUE</p><div class="cl-card" style="padding:0;">' +
        bookings.map(function (b) {
          var svc = S.service(b.serviceId);
          var m = STATUT_CHIP[b.statut] || ["chip--outline", b.statut];
          var isPast = ["terminee", "absente"].indexOf(b.statut) >= 0;
          var right = isPast && S.paymentsOf(b.id).length
            ? '<span class="field--mono" style="font-size:13px; color:var(--ink-2);">' + D.formatPrice(S.paymentsOf(b.id).reduce(function (s, p) { return s + p.montantEuros; }, 0)) + ' ' + S.paymentsOf(b.id)[0].moyen.toLowerCase() + '</span>'
            : '<span class="chip ' + m[0] + '" style="font-size:12px;">' + (b.statut === "confirmee" || b.statut === "acceptee_arrhes_attendues" ? "à venir" : m[1]) + '</span>';
          return '<a class="cl-hist-row" href="rdv.html?id=' + b.id + '"><span>' + (b.debut ? D.formatDateShort(D.parseLocal(b.debut)) : "—") + ' · ' + svc.nom + '</span>' + right + '</a>';
        }).join("") + '</div></div>';
    }

    // ---- Notes ----
    html += '<div class="cl-section"><p class="cl-eyebrow">MES NOTES <span style="text-transform:none; letter-spacing:0;">(privées)</span></p><div style="display:flex; flex-direction:column; gap:8px;">' +
      (cl.notes || []).map(function (n) {
        return '<div class="cl-note"><p>' + n.texte + '</p><p>' + D.formatDateShort(D.parseLocal(n.le)).toUpperCase() + '</p></div>';
      }).join("") +
      '<button type="button" class="btn btn--text" id="btn-add-note" style="justify-content:flex-start; padding:8px 0;">＋ Ajouter une note</button>' +
    '</div></div>';

    // ---- Consentements ----
    html += '<div class="cl-section"><p class="cl-eyebrow">CONSENTEMENTS</p><div class="cl-card">' +
      '<div class="cl-kv"><span>Rappel SMS</span><span style="color:' + (cl.consentements.rappelsSms ? "var(--state-ok-ink)" : "var(--ink-2)") + ';">' + (cl.consentements.rappelsSms ? "✓ accepté" : "non") + '</span></div>' +
      '<div class="cl-kv" style="margin-top:6px;"><span>Photos portfolio</span><span style="color:' + (cl.consentements.photosPortfolio ? "var(--state-ok-ink)" : "var(--ink-2)") + ';">' + (cl.consentements.photosPortfolio ? "✓ accepté (sans visage)" : "non") + '</span></div>' +
      '<p style="margin-top:8px; font-size:12.5px; color:var(--ink-2);">Aucune donnée de santé n’est enregistrée ici.</p>' +
    '</div></div>';

    main.innerHTML = html;

    var addNoteBtn = document.getElementById("btn-add-note");
    if (addNoteBtn) addNoteBtn.addEventListener("click", function () { openAddNote(cl.id); });
  }

  function openAddNote(clientId) {
    var overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    overlay.innerHTML = '<button type="button" class="sheet-overlay__backdrop" aria-label="Fermer"></button>' +
      '<form class="sheet" id="note-form"><div class="sheet__handle"></div><p class="sheet__title">Ajouter une note</p>' +
      '<textarea class="field" id="note-text" style="min-height:90px; margin-bottom:18px; background:var(--ground);"></textarea>' +
      '<button type="submit" class="btn btn--primary" style="width:100%; margin-bottom:8px;">Enregistrer</button>' +
      '<button type="button" class="btn btn--text-plain" style="width:100%; text-align:center;" data-close="1">Annuler</button></form>';
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    function close() { overlay.remove(); document.body.style.overflow = ""; }
    overlay.querySelector(".sheet-overlay__backdrop").addEventListener("click", close);
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.querySelector("#note-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var texte = overlay.querySelector("#note-text").value.trim();
      if (texte) S.addNote(clientId, texte);
      close();
    });
  }

  render();
  S.subscribe(render);
})();
