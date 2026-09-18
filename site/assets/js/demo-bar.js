/*
  MODE DÉMO pill + panel — batch B9.
  Source: PDC §8 (bottom-left, above everything at z 90, 40 px tall, never
  covering the sticky action bar, which gains 48 px of padding) and the C01
  "pilule démo" states (closed pill "● MODE DÉMO"; open panel "MODE DÉMO ·
  11 SEPT. 2026", "Côté cliente / Côté Eni'ol", "Réinitialiser la démo",
  "Données fictives · prix provisoires" — C01's wording, used over PDC §8's
  slightly different prose).

  The switch supports the validation round trip (BUILD-PLAN §3): after the
  client sends a request, "Côté Eni'ol" opens the requests inbox, and back
  on "Côté cliente" it opens that request's tracking page.

  Sets body.has-demo-bar; pages with a fixed sticky bar use
  var(--demo-bar-clearance) for its extra bottom padding.
*/

(function () {
  var S = window.ENIOL_STORE;
  var D = window.ENIOL_DATES;

  function inPro() { return /\/pro\//.test(window.location.pathname); }
  function root() { return inPro() ? "../" : ""; }

  function hrefs() {
    var st = S.get();
    var ref = st.demo && st.demo.lastRef;
    var created = ref ? S.bookingByRef(ref) : null;
    return {
      cliente: root() + (created ? "ma-reservation.html?ref=" + encodeURIComponent(ref) : "index.html"),
      pro: root() + "pro/" + (created && created.statut === "en_attente" ? "demandes.html" : "index.html")
    };
  }

  function dateLabel() {
    var d = S.now();
    return d.getDate() + " " + D.formatDateShort(d).split(" ")[2].toUpperCase() + " " + d.getFullYear();
  }

  function build() {
    if (document.getElementById("demo-bar")) return;
    var pro = inPro(), h = hrefs();

    var bar = document.createElement("div");
    bar.className = "demo-bar";
    bar.id = "demo-bar";
    bar.innerHTML =
      '<button type="button" class="demo-pill" aria-expanded="false" aria-controls="demo-panel">● MODE DÉMO</button>' +
      '<div class="demo-panel on-deep" id="demo-panel" hidden>' +
        '<p class="demo-panel__label">MODE DÉMO · ' + dateLabel() + '</p>' +
        '<div class="demo-panel__switch">' +
          '<a data-side="cliente" href="' + h.cliente + '"' + (pro ? '' : ' class="is-active" aria-current="page"') + '>Côté cliente</a>' +
          '<a data-side="pro" href="' + h.pro + '"' + (pro ? ' class="is-active" aria-current="page"' : '') + '>Côté Eni’ol</a>' +
        '</div>' +
        '<button type="button" class="demo-panel__reset">Réinitialiser la démo</button>' +
        '<p class="demo-panel__note">Données fictives · prix provisoires</p>' +
      '</div>';
    document.body.appendChild(bar);
    document.body.classList.add("has-demo-bar");

    var pill = bar.querySelector(".demo-pill");
    var panel = bar.querySelector(".demo-panel");

    function setOpen(open) {
      panel.hidden = !open;
      pill.setAttribute("aria-expanded", open ? "true" : "false");
    }

    pill.addEventListener("click", function () { setOpen(panel.hidden); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { setOpen(false); pill.focus(); }
    });

    document.addEventListener("click", function (e) {
      if (!panel.hidden && !bar.contains(e.target)) setOpen(false);
    });

    bar.querySelector(".demo-panel__reset").addEventListener("click", function () {
      S.reset();
      window.location.reload();
    });

    S.subscribe(function () {
      var next = hrefs();
      bar.querySelector('[data-side="cliente"]').setAttribute("href", next.cliente);
      bar.querySelector('[data-side="pro"]').setAttribute("href", next.pro);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
