/*
  pro/encaissements.html — batch B32. Source: PRO R10, read in full.
*/
(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;

  var pad2 = function (n) { return (n < 10 ? "0" : "") + n; };
  var isoDate = function (d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };
  function addMonths(yyyyMm, n) { var d = D.parseLocal(yyyyMm + "-01"); d.setMonth(d.getMonth() + n); return d.getFullYear() + "-" + pad2(d.getMonth() + 1); }
  function monthLabel(yyyyMm) { var d = D.parseLocal(yyyyMm + "-01"); return D.MONTHS_LONG[d.getMonth()] + " " + d.getFullYear(); }

  var month = isoDate(S.now()).slice(0, 7);

  function render() {
    var state = S.get();
    document.getElementById("enc-month-label").textContent = monthLabel(month);

    var payments = state.payments.filter(function (p) { return p.encaisseLe.slice(0, 7) === month; })
      .sort(function (a, b) { return b.encaisseLe < a.encaisseLe ? -1 : 1; });

    var totalMonth = payments.reduce(function (s, p) { return s + p.montantEuros; }, 0);
    var byMoyen = {};
    payments.forEach(function (p) { byMoyen[p.moyen] = (byMoyen[p.moyen] || 0) + p.montantEuros; });

    var resteTotal = state.bookings
      .filter(function (b) { return ["acceptee_arrhes_attendues", "confirmee"].indexOf(b.statut) >= 0; })
      .reduce(function (s, b) { return s + Math.max(0, S.resteAEncaisser(b)); }, 0);

    var pendingArrhes = state.bookings.filter(function (b) { return b.statut === "acceptee_arrhes_attendues" && b.arrhesAttenduesEuros > 0; })
      .sort(function (a, b) { return (a.arrhesDateLimite || "9") < (b.arrhesDateLimite || "9") ? -1 : 1; });
    var arrhesTotal = pendingArrhes.reduce(function (s, b) { return s + b.arrhesAttenduesEuros; }, 0);

    document.getElementById("enc-tiles").innerHTML =
      '<div class="enc-tile enc-tile--dark"><p class="enc-tile__eyebrow" style="color:var(--ink-2-on-deep);">ENCAISSÉ EN ' + D.MONTHS_SHORT[D.parseLocal(month + "-01").getMonth()].toUpperCase() + '</p><p class="enc-tile__value">' + D.formatPrice(totalMonth) + '</p></div>' +
      '<div class="enc-tile enc-tile--light"><p class="enc-tile__eyebrow" style="color:var(--ink-3);">RESTE À ENCAISSER</p><p class="enc-tile__value">' + D.formatPrice(resteTotal) + '</p></div>' +
      '<div class="enc-tile enc-tile--light"><p class="enc-tile__eyebrow" style="color:var(--ink-3);">PAR MOYEN</p><p style="margin-top:6px; font-size:13px; color:var(--ink-body);">' + (Object.keys(byMoyen).length ? Object.keys(byMoyen).map(function (m) { return m + " " + D.formatPrice(byMoyen[m]); }).join("<br>") : "—") + '</p></div>' +
      '<div class="enc-tile enc-tile--warn"><p class="enc-tile__eyebrow" style="color:var(--state-warn-ink);">ARRHES EN ATTENTE</p><p class="enc-tile__value" style="color:#5C380A;">' + D.formatPrice(arrhesTotal) + '</p>' +
      (pendingArrhes.length ? '<p style="margin-top:2px; font-size:12.5px; color:var(--state-warn-ink);">' + clientName(pendingArrhes[0]) + (pendingArrhes[0].arrhesDateLimite ? " · avant " + D.formatDateShort(D.parseLocal(pendingArrhes[0].arrhesDateLimite)).replace(/^\S+\s/, "") + " " + D.formatTime(D.parseLocal(pendingArrhes[0].arrhesDateLimite)) : "") + '</p>' : "") +
      '</div>';

    document.getElementById("enc-rows").innerHTML = payments.length
      ? payments.map(function (p) {
        var b = S.booking(p.rdvId), svc = b ? S.service(b.serviceId) : null;
        var d = D.parseLocal(p.encaisseLe);
        return '<div class="enc-row"><span style="width:52px; font-family:var(--font-mono); font-size:12px; color:var(--ink-2);">' + pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + '</span>' +
          '<span style="flex:1;"><p style="margin:0; font-weight:500;">' + clientName(p) + '</p><p style="margin:1px 0 0; font-size:12.5px; color:var(--ink-2);">' + (p.note || (svc ? svc.nom : p.type)) + '</p></span>' +
          '<span style="width:64px; font-size:12.5px;">' + p.moyen + '</span>' +
          '<span style="width:60px; text-align:right; font-family:var(--font-mono);">' + D.formatPrice(p.montantEuros) + '</span></div>';
      }).join("")
      : '<div class="empty-state" style="border:0;"><p class="empty-state__title">Aucun encaissement ce mois-ci</p></div>';

    var absentThisMonth = state.bookings.filter(function (b) { return b.statut === "absente" && b.debut && b.debut.slice(0, 7) === month; });
    document.getElementById("enc-note").textContent = absentThisMonth.length
      ? "Une absence (" + clientNameForBooking(absentThisMonth[0]) + ", " + D.formatDateShort(D.parseLocal(absentThisMonth[0].debut)).replace(/^\S+\s/, "") + ") n’apparaît pas ici : aucune recette encaissée."
      : "";
  }

  function clientName(p) {
    var cl = S.client(p.clienteId);
    return cl ? cl.prenom + " " + cl.nom : "";
  }
  function clientNameForBooking(b) {
    var cl = S.client(b.clienteId);
    return cl ? cl.prenom + " " + cl.nom : "";
  }

  document.getElementById("enc-prev").addEventListener("click", function () { month = addMonths(month, -1); render(); });
  document.getElementById("enc-next").addEventListener("click", function () { month = addMonths(month, 1); render(); });

  document.getElementById("enc-export").addEventListener("click", function () {
    var state = S.get();
    var payments = state.payments.filter(function (p) { return p.encaisseLe.slice(0, 7) === month; });
    var rows = [["Date d'encaissement", "Cliente", "Prestation", "Type", "Moyen", "Montant (€)", "Réf. RDV"]];
    payments.forEach(function (p) {
      var b = S.booking(p.rdvId), svc = b ? S.service(b.serviceId) : null;
      rows.push([p.encaisseLe.slice(0, 10), clientName(p), svc ? svc.nom : "", p.type, p.moyen, p.montantEuros, b ? b.ref : ""]);
    });
    var csv = rows.map(function (r) { return r.map(csvEscape).join(";"); }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "encaissements-" + month + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  function csvEscape(v) {
    v = String(v == null ? "" : v);
    return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  render();
  S.subscribe(render);
})();
