/*
  pro/clientes.html — batch B29. Source: PRO R13 (table + drawer), read in
  full. Desktop: R13's table, with the drawer open on the first client by
  default as R13 draws it. Mobile (no artboard): one card per client that
  links to the full fiche — see the HTML file's header comment.
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;
  var T = window.ENIOL_TRAVEL;

  var query = "";
  var openDrawerId; // undefined until the first render picks R13's default

  function isDesktop() { return window.innerWidth >= 900; }
  function primaryAddress(cl) { return (cl.adresses && cl.adresses[0]) || null; }
  function arrondissement(zone) { return zone.split(" · ")[0]; }

  function lastBookingLabel(cl) {
    var bs = S.bookingsOfClient(cl.id).filter(function (b) { return b.debut; }).sort(function (a, b) { return b.debut < a.debut ? -1 : 1; });
    if (!bs.length) return "—";
    var past = bs.filter(function (b) { return ["terminee", "absente"].indexOf(b.statut) >= 0; });
    if (past.length) return D.formatDateShort(D.parseLocal(past[0].debut)).replace(/^\S+\s/, "");
    var future = bs[0];
    return "à venir " + D.parseLocal(future.debut).getDate() + "/" + ("0" + (D.parseLocal(future.debut).getMonth() + 1)).slice(-2);
  }

  function rowSubtitle(cl) {
    var bs = S.bookingsOfClient(cl.id);
    if (bs.some(function (b) { return b.statut === "acceptee_arrhes_attendues"; })) return { text: "Arrhes en attente", color: "var(--state-warn-ink)" };
    if (bs.some(function (b) { return S.service(b.serviceId).modeReservation === "projet" && ["en_attente", "acceptee_arrhes_attendues", "confirmee"].indexOf(b.statut) >= 0; })) return { text: "✦ Projet en cours", color: "var(--state-project-ink)" };
    if (cl.stats.absences > 0) return { text: cl.stats.absences + " absence" + (cl.stats.absences > 1 ? "s" : ""), color: "var(--state-danger-ink)" };
    if (cl.tags && cl.tags.indexOf("fidele") >= 0) return { text: "Fidèle · " + cl.stats.rdv + "ᵉ RDV", color: "var(--ink-2)" };
    return null;
  }

  function matches(cl, q) {
    if (!q) return true;
    var addr = primaryAddress(cl);
    var hay = (cl.prenom + " " + cl.nom + " " + (addr ? addr.zone + " " + (addr.ligne1 || "") : "")).toLowerCase();
    return hay.indexOf(q.toLowerCase()) >= 0;
  }

  function render() {
    var state = S.get();
    var list = state.clients.filter(function (cl) { return matches(cl, query); });
    if (openDrawerId === undefined) openDrawerId = isDesktop() && list[0] ? list[0].id : null;
    document.getElementById("cls-count").textContent = state.clients.length + " FICHE" + (state.clients.length > 1 ? "S" : "");

    // ---- mobile cards ----
    document.getElementById("cls-mobile").innerHTML = list.map(function (cl) {
      var addr = primaryAddress(cl);
      var sub = rowSubtitle(cl);
      return '<a class="cls-mobile-row" href="cliente.html?id=' + cl.id + '">' +
        '<span class="data-table__avatar">' + cl.prenom.charAt(0) + '</span>' +
        '<span class="cls-mobile-row__meta"><p class="cls-mobile-row__name">' + cl.prenom + " " + cl.nom + '</p><p class="cls-mobile-row__sub">' + (sub ? '<span style="color:' + sub.color + ';">' + sub.text + '</span> · ' : "") + (addr ? addr.zone : "Sans déplacement") + '</p></span>' +
        '<span class="cls-mobile-row__stat">' + lastBookingLabel(cl) + '<br>' + cl.stats.rdv + ' RDV</span>' +
      '</a>';
    }).join("");

    // ---- desktop table (R13) ----
    document.getElementById("cls-table-body").innerHTML = list.map(function (cl) {
      var addr = primaryAddress(cl);
      var sub = rowSubtitle(cl);
      return '<div class="data-table__row' + (cl.id === openDrawerId ? " is-active" : "") + '" data-id="' + cl.id + '">' +
        '<div style="flex:1.4 1 0; min-width:0; display:flex; align-items:center; gap:10px;"><span class="data-table__avatar">' + cl.prenom.charAt(0) + '</span>' +
          '<div style="min-width:0;"><p style="margin:0; font-weight:600;">' + cl.prenom + " " + cl.nom + '</p>' + (sub ? '<p style="margin:1px 0 0; font-size:12.5px; color:' + sub.color + ';">' + sub.text + '</p>' : '') + '</div></div>' +
        (addr ? '<span style="flex:1.4 1 0; min-width:0;">' + addr.zone + '</span>' : '<span style="flex:1.4 1 0; min-width:0; color:var(--ink-2);">Sans déplacement</span>') +
        '<span style="flex:0 0 110px; font-family:var(--font-mono); font-size:13px;">' + lastBookingLabel(cl) + '</span>' +
        '<span style="flex:0 0 72px; text-align:center; font-family:var(--font-mono);">' + cl.stats.rdv + '</span>' +
        '<span style="flex:0 0 86px; text-align:right; font-family:var(--font-mono);">' + (cl.stats.totalEuros ? D.formatPrice(cl.stats.totalEuros) : "—") + '</span>' +
      '</div>';
    }).join("");
    document.querySelectorAll(".data-table__row").forEach(function (row) {
      row.addEventListener("click", function () { openDrawerId = row.dataset.id; render(); });
    });

    renderDrawer(state);
  }

  // R13's drawer boxes: --ground on the drawer's --surface, radius 12.
  function box(eyebrow, inner) {
    return '<div style="background:var(--ground); border:1px solid var(--rule); border-radius:12px; padding:12px; font-size:14px;">' +
      '<p style="margin:0 0 6px; font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.06em; color:var(--ink-3);">' + eyebrow + '</p>' + inner + '</div>';
  }

  function renderDrawer(state) {
    var drawer = document.getElementById("cls-drawer");
    var cl = openDrawerId && S.client(openDrawerId);
    if (!cl) { drawer.classList.remove("is-open"); drawer.innerHTML = ""; return; }
    drawer.classList.add("is-open");

    var addr = primaryAddress(cl);
    var lastNote = (cl.notes || [])[0];

    var html = '<div style="display:flex; align-items:center; gap:12px;">' +
      '<span class="data-table__avatar" style="width:48px; height:48px; font-size:20px;">' + cl.prenom.charAt(0) + '</span>' +
      '<div style="flex:1;"><p style="margin:0; font-family:var(--font-display); font-size:22px;">' + cl.prenom + " " + cl.nom + '</p><p style="margin:1px 0 0; font-size:13px; color:var(--ink-2);">Cliente depuis ' + monthYear(cl.creeLe) + '</p></div>' +
      '<button type="button" id="drawer-close" style="background:none; border:0; font-size:18px; color:var(--ink-2); cursor:pointer;" aria-label="Fermer">✕</button>' +
    '</div>' +
    '<div class="stat-grid">' +
      [[cl.stats.rdv, "RDV"], [cl.stats.annulations, "Annul."], [cl.stats.absences, "Absences"], [D.formatPrice(cl.stats.totalEuros), "Total"]].map(function (t) {
        return '<div class="stat-tile" style="background:var(--ground);"><p class="stat-tile__value">' + t[0] + '</p><p class="stat-tile__label">' + t[1] + '</p></div>';
      }).join("") +
    '</div>';

    if (addr) {
      var min = addr.lat != null ? T.estimateMinutes(state.settings.pointDeDepart, addr) : null;
      var line2 = [addr.complementCourt || addr.complement, addr.codeAcces ? "code " + addr.codeAcces : null, min ? "≈ " + min + " min" : null].filter(Boolean).join(" · ");
      html += box("ADRESSE PRINCIPALE",
        '<p style="margin:0; font-weight:600;">' + (addr.ligne1 ? addr.ligne1 + " · " + arrondissement(addr.zone) : addr.zone) + '</p>' +
        (line2 ? '<p style="margin:2px 0 0; color:var(--ink-body);">' + line2 + '</p>' : ""));
    }

    if (cl.cheveux || cl.mesures) {
      var h = cl.cheveux, m = cl.mesures, inner = "";
      if (h) {
        inner += '<p style="margin:0; color:var(--ink-body);">' + [
          [h.texture, h.densite].filter(Boolean).join(" "),
          h.longueur ? h.longueur.replace(" · ", " ").toLowerCase() : null,
          h.colle ? "colle " + (h.colle === "ok" ? "OK" : h.colle) : null
        ].filter(Boolean).join(" · ") + '</p>';
      }
      if (m) {
        inner += '<p style="margin:' + (h ? "4px" : "0") + ' 0 0; font-family:var(--font-mono); font-size:13px; color:var(--ink-body);">Tour ' + m.tourDeTete + ' · front-nuque ' + m.frontNuque + ' · ' + D.formatDateShort(D.parseLocal(m.le), { withYear: true }).replace(/^\S+\s/, "") + '</p>';
      }
      html += box("CHEVEUX &amp; MESURES", inner);
    }

    if (cl.perruques && cl.perruques.length) {
      html += '<div><p style="margin:0 0 8px; font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.06em; color:var(--ink-3);">SES PERRUQUES · ' + cl.perruques.length + '</p><div style="display:flex; gap:8px;">' +
        cl.perruques.slice(0, 2).map(function (p) {
          var lace = (p.lace || "").replace(/(\d)x(\d)/, "$1×$2");
          var title = p.type === "lace_frontale" ? "Frontale " + lace : p.type === "closure" ? "Closure " + lace : p.type;
          return '<div style="flex:1; background:var(--ground); border:1px solid var(--rule); border-radius:10px; padding:10px;">' +
            '<div class="placeholder-swatch" style="height:64px; border-radius:8px; border:1px solid var(--rule); margin-bottom:8px;"></div>' +
            '<p style="margin:0; font-size:13px; font-weight:600;">' + title + '</p>' +
            '<p style="margin:2px 0 0; font-family:var(--font-mono); font-size:12px; color:var(--ink-2);">' + p.longueurPouces + '" · ' + p.densitePct + ' % · ' + p.couleur + '</p></div>';
        }).join("") + '</div></div>';
    }

    if (lastNote) {
      html += '<div style="background:var(--sand); border-radius:12px; padding:12px; font-size:14px;">' +
        '<p style="margin:0 0 4px; font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.06em; color:var(--action);">MA DERNIÈRE NOTE</p>' +
        '<p style="margin:0; color:#3A2A1E;">' + lastNote.texte + '</p>' +
      '</div>';
    }

    html += '<div style="margin-top:auto; display:flex; gap:8px;">' +
      '<a class="btn btn--primary" href="cliente.html?id=' + cl.id + '" style="flex:1; padding:15px 8px; font-size:14px; box-shadow:2px 2px 0 var(--ink);">Ouvrir la fiche</a>' +
      '<button type="button" class="btn btn--secondary" style="flex:1; padding:15px 8px; font-size:14px;" data-open="ajouter-rdv">＋ RDV</button>' +
    '</div>';

    drawer.innerHTML = html;
    document.getElementById("drawer-close").addEventListener("click", function () { openDrawerId = null; render(); });
  }

  function monthYear(iso) {
    var d = D.parseLocal(iso);
    return D.MONTHS_LONG[d.getMonth()] + " " + d.getFullYear();
  }

  document.getElementById("cls-search").addEventListener("input", function () { query = this.value; render(); });

  render();
  S.subscribe(render);
})();
