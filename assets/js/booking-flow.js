/*
  reserver.html step machine — B12 (shell), B13 (step 1, P03), B14 (step 2,
  P04), B15 (step 3, P05 A/B + the P14 desktop chrome), then reworked after
  the client review:

  - Nothing inside a step re-renders the step. Choosing a prestation drops
    its options down (and closes the previous card's) in place; the "Où ?"
    toggle slides its thumb; the address states swap with a height
    animation; slots, days, tabs and months update in place.
  - Changing step is a full-width push (motion.js push()): forward slides
    the new step in from the right, back slides the current one away.
  - The progress bar eases like a loading bar; the step label, sticky
    price/date, Continuer label and the desktop summary values roll.
  - ✕ just leaves (back to the previous page, sliding back) — there is no
    quit-confirmation in the design, and the browser's confirm() box was
    both ugly and blocked in some embedded browsers.
  - Defaults the design draws as already chosen: "À domicile" for the
    au-choix service (P03), "J'ai déjà ma perruque" for the lace frontale
    (P03 — and its 90 € in the sticky bar).

  Step 3 renders availability.js's real output (slotsForDay /
  monthCalendar), never copies of P05/P14's literal times — see
  availability.js's header for why those exact times can't exist.
  Steps 4–6 are stubs for B16/B17/B18.
*/

(function () {
  var S = window.ENIOL_STORE, D = window.ENIOL_DATES, A = window.ENIOL_AVAILABILITY, M = window.ENIOL_MOTION;
  var storeState = S.get();
  var services = storeState.services.filter(function (s) { return s.visible !== false; });
  var settings = storeState.settings;
  var IG_PROFILE = "https://www.instagram.com/pose.de.perruques/";
  var IG_DM = "https://ig.me/m/pose.de.perruques";
  var NB = D.NBSP;

  function findService(id) { return services.filter(function (s) { return s.id === id; })[0] || null; }
  function stripAccents(s) { return s.normalize ? s.normalize("NFD").replace(/\p{Diacritic}/gu, "") : s; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; });
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function addDays(iso, n) { var d = D.parseLocal(iso); d.setDate(d.getDate() + n); return isoDate(d); }
  function extend(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  var SAMPLE_ADDRESSES = [
    { ligne1: "12 rue de Belleville", codePostal: "75020", ville: "Paris", zone: "Paris 20ᵉ", lat: 48.8720, lon: 2.3830 },
    { ligne1: "12 rue de Belfort", codePostal: "93100", ville: "Montreuil", zone: "Montreuil (93)", lat: 48.8638, lon: 2.4432 },
    { ligne1: "12 rue Belliard", codePostal: "75018", ville: "Paris", zone: "Paris 18ᵉ", lat: 48.8950, lon: 2.3440 },
    { ligne1: "12 avenue Belfort", codePostal: "94300", ville: "Vincennes", zone: "Vincennes (94)", lat: 48.8470, lon: 2.4380 },
    { ligne1: "5 rue de la Roquette", codePostal: "75011", ville: "Paris", zone: "Paris 11ᵉ", lat: 48.8583, lon: 2.3735 },
    { ligne1: "8 rue du Faubourg Saint-Antoine", codePostal: "75012", ville: "Paris", zone: "Paris 12ᵉ", lat: 48.8523, lon: 2.3765 },
    { ligne1: "20 rue de Ménilmontant", codePostal: "75020", ville: "Paris", zone: "Paris 20ᵉ", lat: 48.8657, lon: 2.3874 },
    { ligne1: "3 rue de Paris", codePostal: "93100", ville: "Montreuil", zone: "Montreuil (93)", lat: 48.8614, lon: 2.4361 },
    { ligne1: "15 avenue Jean Jaurès", codePostal: "93500", ville: "Pantin", zone: "Pantin (93)", lat: 48.8964, lon: 2.4013 },
    { ligne1: "7 rue de la République", codePostal: "93200", ville: "Saint-Denis", zone: "Saint-Denis (93)", lat: 48.9362, lon: 2.3574 },
    { ligne1: "22 rue de Vaugirard", codePostal: "75015", ville: "Paris", zone: "Paris 15ᵉ", lat: 48.8459, lon: 2.3097 },
    { ligne1: "10 rue de Charonne", codePostal: "75011", ville: "Paris", zone: "Paris 11ᵉ", lat: 48.8548, lon: 2.3789 },
    { ligne1: "4 rue des Pyrénées", codePostal: "75020", ville: "Paris", zone: "Paris 20ᵉ", lat: 48.8636, lon: 2.3948 },
    { ligne1: "18 rue de Fontenay", codePostal: "94300", ville: "Vincennes", zone: "Vincennes (94)", lat: 48.8465, lon: 2.4351 },
    { ligne1: "6 rue de la Mare", codePostal: "75020", ville: "Paris", zone: "Paris 20ᵉ", lat: 48.8697, lon: 2.3893 }
  ];

  // ---- Flow state ----
  var params = new URLSearchParams(window.location.search);
  var flow = {
    step: 1,
    serviceId: null, varianteId: null, lieu: null,
    addressStatus: "empty", addressQuery: "", adresse: null, pending: null,
    complement: "", codeAcces: "", indications: "", detailsOpen: false, saveAddress: true,
    // step 3: slot = { date "YYYY-MM-DD", time "HH:MM", fin "HH:MM" }
    dateTab: "liste", calMonth: null, calDay: null, slot: null,
    photos: [], liens: [], notesCliente: "",
    contact: { prenom: "", nom: "", telephone: "", email: "", instagram: "", rappelsSms: false, photosPortfolio: false },
    // Fabrication sur mesure (P11) — a "projet" flow, not an appointment.
    envies: { longueur: null, densite: null, texture: null, couleur: null, typeLace: null },
    mesuresConnues: null, // true "je les connais" / false "Eni'ol les prend"
    mesures: { tourDeTete: "", frontNuque: "", oreilleOreilleFront: "", oreilleOreilleSommet: "", tempeTempeArriere: "", largeurNuque: "" },
    pourQuand: null, pourQuandDate: "",
    acceptConditions: false,
    submitted: null // set to the created booking on submit
  };

  function applyServiceDefaults(svc) {
    flow.varianteId = svc && svc.variantes && svc.variantes.length ? svc.variantes[0].id : null;
    flow.lieu = svc && svc.lieu === "au_choix" ? "domicile_cliente" : null;
    flow.envies = { longueur: null, densite: null, texture: null, couleur: null, typeLace: null };
    flow.mesuresConnues = null;
    flow.mesures = { tourDeTete: "", frontNuque: "", oreilleOreilleFront: "", oreilleOreilleSommet: "", tempeTempeArriere: "", largeurNuque: "" };
    flow.pourQuand = null; flow.pourQuandDate = "";
  }
  if (findService(params.get("service"))) {
    flow.serviceId = params.get("service");
    applyServiceDefaults(findService(flow.serviceId));
  }

  function currentService() { return flow.serviceId ? findService(flow.serviceId) : null; }
  function currentVariant() {
    var svc = currentService();
    if (!svc || !svc.variantes) return null;
    return svc.variantes.filter(function (v) { return v.id === flow.varianteId; })[0] || null;
  }
  function currentDuration() {
    var svc = currentService(), v = currentVariant();
    if (!svc) return null;
    return (v && v.dureeMin) || svc.dureeMin || null;
  }
  function needsAddress() {
    var svc = currentService();
    if (!svc) return false;
    if (svc.lieu === "domicile_cliente") return true;
    if (svc.lieu === "au_choix") return flow.lieu === "domicile_cliente";
    return false;
  }
  function totalPriceEuros() {
    var svc = currentService();
    if (!svc) return null;
    if (svc.variantes && svc.variantes.length) {
      var v = currentVariant();
      return v ? (v.surDevis ? null : v.prixEuros) : (svc.typePrix === "devis" ? null : svc.prixEuros);
    }
    return svc.typePrix === "devis" ? null : svc.prixEuros;
  }
  function durationLabel(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h ? (h + " h" + (m ? " " + m : "")) : (m + " min");
  }
  /* The design's own notice wording: "72 h", "5 jours", "7 jours", "3 semaines". */
  function preavisLabel(hours) {
    if (hours % 24 !== 0 || hours <= 72) return hours + " h";
    var d = hours / 24;
    return (d > 7 && d % 7 === 0) ? (d / 7) + " semaines" : d + " jours";
  }
  var TRAVEL_BADGE = { domicile_cliente: "🚶‍♀️ Je me déplace", sans_deplacement: "🏠 Sans déplacement", au_choix: "↔ Au choix" };

  /* Fabrication sur mesure branches into its own 6-step "projet" flow the
     moment it's selected in step 1 (P03: "Ce choix ouvre un parcours dédié
     →"). P11 draws only Envies (étape 2 sur 6) and Mesures (étape 3 sur 6,
     "Suivant : pour quand ?") — its own progress bar confirms the order
     1 Prestation · 2 Envies · 3 Mesures · 4 Pour quand ? · 5 Coordonnées ·
     6 Récapitulatif, matching CODE-BATCHES.md's L10 note once "Inspiration"
     is read as folded into Envies rather than its own numbered step (the
     only reading that doesn't contradict Envies/Mesures' own drawn 33%/50%
     widths). data.js's fabrication.photos:"obligatoires" therefore collects
     its photos on the Envies screen — the one extrapolated placement in
     this flow, flagged again on that step below. */
  function inProjet() { var svc = currentService(); return !!(svc && svc.modeReservation === "projet"); }
  // Step 1 (Prestation) is always STEPS[1], never PROJET_STEPS — it's the
  // one step shared by both flows, rendered before the branch is even
  // chosen. Wrapping the lookup here (rather than at each call site) is
  // what makes that true regardless of which flow is currently active.
  function activeSteps() {
    var real = inProjet() ? PROJET_STEPS : STEPS;
    return { 1: STEPS[1], 2: real[2], 3: real[3], 4: real[4], 5: real[5], 6: real[6] };
  }

  // =====================================================================
  // Chrome — built once, then updated in place (roll / progress)
  // =====================================================================
  var NEXT_LABELS = { 1: "adresse", 2: "date & heure", 3: "photos", 4: "coordonnées", 5: "récapitulatif" };
  var STEP_TITLES = ["Prestation", "Adresse", "Date & heure", "Photos & détails", "Coordonnées", "Récapitulatif"];
  var PROJET_NEXT_LABELS = { 1: "envies", 2: "mesures", 3: "pour quand ?", 4: "coordonnées", 5: "récapitulatif" };
  var PROJET_STEP_TITLES = ["Prestation", "Envies", "Mesures", "Pour quand ?", "Coordonnées", "Récapitulatif"];
  var elFill = document.getElementById("progress-fill");
  var elLabel = document.getElementById("step-label");
  var elPrice = document.getElementById("sticky-price");
  var elEyebrow = document.getElementById("sticky-eyebrow");
  var elBack = document.getElementById("btn-back");
  var elCont = document.getElementById("btn-continue");
  var elContD = document.getElementById("btn-continue-desktop");
  var stepsOl = document.getElementById("booking-steps-list");
  var navDir = "forward";

  function nextLabelFor(n) {
    if (inProjet()) return PROJET_NEXT_LABELS[n];
    return (n === 1 && !needsAddress()) ? NEXT_LABELS[2] : NEXT_LABELS[n];
  }
  function slotDateShort() { return D.formatDateShort(D.parseLocal(flow.slot.date)); }
  function stepLabelText() {
    return flow.step < 6 ? "Étape " + flow.step + " sur 6 · Suivant : " + nextLabelFor(flow.step) : "Étape 6 sur 6 · Dernière étape";
  }
  /* P05/P06/P07: "SAM. 19 SEPT. 13:00" once a slot is chosen (steps 3–5); otherwise "SUR PLACE". */
  function stickyEyebrow() {
    if (flow.slot && flow.step >= 3 && flow.step <= 5) return slotDateShort().toUpperCase() + " " + flow.slot.time;
    if (inProjet()) return "DEVIS SOUS " + (currentService() ? currentService().devisSousHeures : 48) + " H";
    return "SUR PLACE";
  }

  function renderChrome(instant) {
    if (flow.step > 6) return; // confirmation screen (P09) has no shared chrome
    M.progress(elFill, Math.round((flow.step / 6) * 100));
    var price = totalPriceEuros();
    M.roll(elLabel, esc(stepLabelText()), { dir: navDir === "back" ? "down" : "up", instant: instant });
    M.roll(elPrice, price == null ? "—" : D.formatPrice(price), { instant: instant });
    M.roll(elEyebrow, esc(stickyEyebrow()), { instant: instant });
    elBack.classList.toggle("is-hidden", flow.step === 1);
    updateStepList(instant);
    updateSummary(instant);
  }

  function updateContinueButton(instant) {
    var step = activeSteps()[flow.step];
    var ok = step && step.canContinue ? step.canContinue() : false;
    var label = flow.step === 6 ? "Envoyer ma demande" : "Continuer";
    [elCont, elContD].forEach(function (b) {
      b.disabled = !ok;
      M.roll(b, label, { instant: instant });
    });
  }

  // ---- P14 left column: step list ----
  function stepDoneSub(n) {
    var svc = currentService();
    if (n === 1) return svc ? (svc.nomCourt || svc.nom) : "";
    if (inProjet()) {
      if (n === 2) return [flow.envies.longueur, flow.envies.texture].filter(Boolean).join(" · ");
      if (n === 3) return flow.mesuresConnues == null ? "" : (flow.mesuresConnues ? "Mesures prises" : "Visite de mesures");
      if (n === 4) return POUR_QUAND_LABELS[flow.pourQuand] || "";
      return "";
    }
    if (n === 2) return needsAddress() ? (flow.adresse ? flow.adresse.zone : "") : "Sans déplacement";
    if (n === 3) return flow.slot ? slotDateShort() + " · " + flow.slot.time : "";
    return "";
  }
  function buildStepList() {
    var titles = inProjet() ? PROJET_STEP_TITLES : STEP_TITLES;
    stepsOl.innerHTML = titles.map(function (title, i) {
      var n = i + 1;
      return "<li class=\"booking-steps__item\" data-n=\"" + n + "\">" +
        "<button type=\"button\" class=\"booking-steps__link\" data-go=\"" + n + "\" disabled>" +
          "<span class=\"booking-steps__marker\" aria-hidden=\"true\"><span class=\"booking-steps__dot\">" +
            "<span class=\"booking-steps__num\">" + n + "</span><span class=\"booking-steps__check\">✓</span></span>" +
            (n < 6 ? "<span class=\"booking-steps__line\"></span>" : "") + "</span>" +
          "<span class=\"booking-steps__text\"><span class=\"booking-steps__title\">" + esc(title) + "</span>" +
            "<span class=\"booking-steps__sub\" hidden></span></span>" +
        "</button></li>";
    }).join("");
  }
  stepsOl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]");
    if (!b || b.disabled) return;
    var n = +b.getAttribute("data-go");
    if (n < flow.step) { flow.step = n; renderStep("back"); }
  });
  var stepListIsProjet = null;
  function updateStepList(instant) {
    if (stepListIsProjet !== inProjet()) { buildStepList(); stepListIsProjet = inProjet(); instant = true; }
    stepsOl.querySelectorAll(".booking-steps__item").forEach(function (li) {
      var n = +li.getAttribute("data-n");
      var state = n < flow.step ? "done" : (n === flow.step ? "current" : "todo");
      li.className = "booking-steps__item is-" + state;
      if (state === "current") li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      li.querySelector("button").disabled = !(state === "done" && !(n === 2 && !inProjet() && !needsAddress()));
      var sub = state === "current" ? "En cours" : (state === "done" ? stepDoneSub(n) : "");
      var subEl = li.querySelector(".booking-steps__sub");
      subEl.hidden = !sub;
      M.roll(subEl, esc(sub), { instant: instant });
    });
  }

  // ---- P14 right column: "Ma demande" ----
  function buildSummary() {
    document.getElementById("summary-body").innerHTML =
      "<div class=\"summary-rows\">" +
        "<div><span>Prestation</span><span class=\"summary-strong\" id=\"sum-svc\">—</span></div>" +
        "<div class=\"collapse is-open\" id=\"sum-dur-row\"><div class=\"collapse__inner\"><div class=\"summary-row\"><span>Durée</span><span class=\"summary-mono\" id=\"sum-dur\">—</span></div></div></div>" +
        "<div><span>Où</span><span id=\"sum-ou\">—</span></div>" +
        "<div><span>Quand</span><span class=\"summary-mono\" id=\"sum-quand\">—</span></div>" +
      "</div>" +
      "<div class=\"summary-prices\">" +
        "<div class=\"summary-prices__row\"><span>Prestation</span><span class=\"summary-mono\" id=\"sum-prix\">—</span></div>" +
        "<div class=\"collapse\" id=\"sum-frais\" inert><div class=\"collapse__inner\"><div class=\"summary-prices__row is-muted\"><span>Frais de déplacement</span><span class=\"summary-mono\">aucun</span></div></div></div>" +
        "<div class=\"collapse\" id=\"sum-arrhes-row\" inert><div class=\"collapse__inner\"><div class=\"summary-prices__row\"><span>Arrhes après accord</span><span class=\"summary-mono\" id=\"sum-arrhes\">—</span></div></div></div>" +
      "</div>" +
      "<div class=\"summary-total\"><span>Sur place</span><span id=\"sum-total\">—</span></div>";
    document.getElementById("summary-cancel").textContent = "✓ Annulation gratuite jusqu’à " + settings.annulation.gratuiteJusquaHeures + " h avant";
    document.getElementById("summary-note").textContent = "Rien n’est payé maintenant · je réponds sous " + settings.delaiReponseHeures + " h";
  }
  function updateSummary(instant) {
    var svc = currentService(), dur = currentDuration(), price = totalPriceEuros();
    var o = { instant: instant };
    var projet = inProjet();
    var ou = "—", quand = "—", prixLabel = "—", total = "—";
    if (svc && projet) {
      ou = flow.mesuresConnues === false ? "Visite de mesures" : "—";
      quand = POUR_QUAND_LABELS[flow.pourQuand] || "—";
      prixLabel = "sur devis";
      total = "sur devis";
    } else if (svc) {
      if (needsAddress()) ou = "Chez vous" + (flow.adresse ? "<br>" + esc(flow.adresse.zone) : "");
      else if (svc.lieu === "sans_deplacement" || flow.lieu === "sans_deplacement") ou = "Sans déplacement";
      quand = flow.slot ? slotDateShort() + "<br>" + flow.slot.time + " → " + flow.slot.fin : "—";
      prixLabel = price == null ? "sur devis" : D.formatPrice(price);
    }
    var arrhes = !projet && svc && svc.arrhes && svc.arrhes.type === "montant" ? svc.arrhes.valeur : null;
    M.roll(document.getElementById("sum-svc"), svc ? esc(svc.nom) : "—", o);
    M.setOpen(document.getElementById("sum-dur-row"), !projet);
    M.roll(document.getElementById("sum-dur"), dur ? D.formatDuration(dur * 60000) : "—", o);
    M.roll(document.getElementById("sum-ou"), ou, o);
    M.roll(document.getElementById("sum-quand"), quand, o);
    M.roll(document.getElementById("sum-prix"), prixLabel, o);
    M.setOpen(document.getElementById("sum-frais"), !projet && needsAddress());
    M.setOpen(document.getElementById("sum-arrhes-row"), arrhes != null);
    if (arrhes != null) M.roll(document.getElementById("sum-arrhes"), D.formatPrice(arrhes), o);
    if (!svc) total = "—"; else if (!projet) total = price == null ? "sur devis" : D.formatPrice(price - (arrhes || 0));
    M.roll(document.getElementById("sum-total"), total, o);
  }

  // =====================================================================
  // Step router — one pane per step, pushed in/out
  // =====================================================================
  var STEPS = {}, PROJET_STEPS = {};
  var root = document.getElementById("step-root");
  var hasRenderedOnce = false;

  // The projet flow never skips a step (no address gate at step 1 the way
  // the general flow does — Fabrication is always sans_deplacement).
  function nextStepAfter(n) { return inProjet() ? n + 1 : (n === 1 ? (needsAddress() ? 2 : 3) : n + 1); }
  function prevStepBefore(n) { return inProjet() ? n - 1 : (n === 3 ? (needsAddress() ? 2 : 1) : n - 1); }

  function renderStep(direction) {
    navDir = direction || "forward";
    var old = root.querySelector(".step-pane");
    var pane = document.createElement("div");
    pane.className = "step-pane";
    pane.setAttribute("data-step", flow.step);
    var step = activeSteps()[flow.step];
    if (step) step.render(pane);
    root.appendChild(pane);
    if (old) {
      if (hasRenderedOnce) M.push(root, old, pane, navDir);
      else old.remove();
    }
    if (step && step.mounted) step.mounted(pane);
    window.scrollTo({ top: 0, behavior: "instant" });
    renderChrome(!hasRenderedOnce);
    updateContinueButton(!hasRenderedOnce);
    if (hasRenderedOnce) {
      var h = pane.querySelector("h1");
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
    hasRenderedOnce = true;
  }

  function goNext() {
    var step = activeSteps()[flow.step];
    if (!step || (step.canContinue && !step.canContinue())) return;
    if (flow.step === 6) { submitBooking(); return; }
    flow.step = nextStepAfter(flow.step);
    renderStep("forward");
  }
  function goBack() {
    if (flow.step === 1) { M.back(params.get("service") ? "prestations.html" : "index.html"); return; }
    flow.step = prevStepBefore(flow.step);
    renderStep("back");
  }

  // =====================================================================
  // Step 1 — Prestation (P03)
  // =====================================================================
  function collapseHtml(open, inner, cls) {
    return "<div class=\"collapse " + (cls || "") + (open ? " is-open" : "") + "\"" + (open ? "" : " inert") + "><div class=\"collapse__inner\">" + inner + "</div></div>";
  }
  function serviceMeta(svc) {
    if (svc.modeReservation === "projet") return "✦ Projet · devis sous " + svc.devisSousHeures + " h · préavis " + preavisLabel(svc.delaiMinimumHeures);
    // P03: "2 h 30 · 🚶‍♀️ Je me déplace · préavis 72 h" but no notice for 48 h services.
    return [svc.dureeMin ? durationLabel(svc.dureeMin) : null, TRAVEL_BADGE[svc.lieu],
      svc.delaiMinimumHeures > 48 ? "préavis " + preavisLabel(svc.delaiMinimumHeures) : null]
      .filter(Boolean).join(" · ");
  }
  function optionHtml(svc) {
    var selected = svc.id === flow.serviceId;
    var sub = "";
    if (svc.variantes && svc.variantes.length) {
      sub = collapseHtml(selected,
        "<fieldset class=\"option-card__sub\"><legend class=\"option-card__sub-legend\">VOTRE PERRUQUE</legend>" +
        svc.variantes.map(function (v, i) {
          var checked = selected ? v.id === flow.varianteId : i === 0;
          return "<label class=\"choice\"><input type=\"radio\" class=\"choice__input\" name=\"variante-" + svc.id + "\" value=\"" + v.id + "\"" + (checked ? " checked" : "") + ">" +
            "<span class=\"choice__dot\" aria-hidden=\"true\"></span>" + v.libelle +
            "<span class=\"price\">" + (v.surDevis ? "+ sur devis" : D.formatPrice(v.prixEuros)) + "</span></label>";
        }).join("") + "</fieldset>", "option-card__collapse");
    } else if (svc.lieu === "au_choix") {
      var lieu = selected && flow.lieu ? flow.lieu : "domicile_cliente";
      sub = collapseHtml(selected,
        "<fieldset class=\"option-card__sub option-card__sub--lieu\"><legend class=\"option-card__sub-legend\">OÙ" + NB + "?</legend>" +
          "<div class=\"segmented segmented--thumb segmented--full\"><span class=\"segmented__thumb\" aria-hidden=\"true\"></span>" +
          [["domicile_cliente", "À domicile"], ["sans_deplacement", "Sans déplacement"]].map(function (o) {
            return "<label class=\"segmented__item\"><input type=\"radio\" name=\"lieu-" + svc.id + "\" value=\"" + o[0] + "\"" + (lieu === o[0] ? " checked" : "") + ">" + o[1] + "</label>";
          }).join("") +
          "</div>" +
          "<p class=\"option-card__hint\">Sans déplacement" + NB + ": on convient ensemble du dépôt de la perruque.</p>" +
        "</fieldset>", "option-card__collapse");
    }
    return "<div class=\"option-card\" data-service-id=\"" + svc.id + "\">" +
      "<input type=\"radio\" name=\"service\" id=\"svc-" + svc.id + "\" value=\"" + svc.id + "\"" + (selected ? " checked" : "") + " class=\"option-card__input\">" +
      "<label for=\"svc-" + svc.id + "\" class=\"option-card__row\">" +
        "<span class=\"option-card__dot\" aria-hidden=\"true\"></span>" +
        "<span class=\"option-card__body\">" +
          "<span class=\"option-card__top\"><span class=\"option-card__name\">" + (svc.nomCourt || svc.nom) + "</span><span class=\"price\">" + D.formatServicePrice(svc) + "</span></span>" +
          "<span class=\"option-card__meta\">" + serviceMeta(svc) + "</span>" +
          (svc.modeReservation === "projet" ? "<span class=\"option-card__projet\">Ce choix ouvre un parcours dédié →</span>" : "") +
        "</span>" +
      "</label>" +
      sub +
      "</div>";
  }

  function selectService(pane, id) {
    flow.serviceId = id;
    applyServiceDefaults(findService(id));
    flow.slot = null;
    pane.querySelectorAll(".option-card").forEach(function (card) {
      var col = card.querySelector(".option-card__collapse");
      if (!col) return;
      var mine = card.getAttribute("data-service-id") === id;
      if (mine) {
        // Back to the drawn defaults before it drops down.
        col.querySelectorAll("input[type=radio]").forEach(function (r) { r.checked = r.value === flow.varianteId || r.value === flow.lieu; });
        col.querySelectorAll(".segmented--thumb").forEach(function (s) { if (s.__place) s.__place(false); });
      }
      M.setOpen(col, mine);
    });
    renderChrome();
    updateContinueButton();
  }

  STEPS[1] = {
    render: function (pane) {
      var sorted = services.slice().sort(function (a, b) { return a.ordre - b.ordre; });
      pane.innerHTML =
        "<h1>Quelle prestation" + NB + "?</h1>" +
        "<p class=\"step-intro\">Vous hésitez" + NB + "? <a href=\"" + IG_DM + "\">Écrivez-moi</a>, je vous conseille.</p>" +
        "<fieldset class=\"option-list\"><legend class=\"sr-only\">Prestation</legend>" + sorted.map(optionHtml).join("") + "</fieldset>";
      pane.addEventListener("change", function (e) {
        var t = e.target;
        if (t.name === "service") selectService(pane, t.value);
        else if (t.name.indexOf("variante-") === 0) { flow.varianteId = t.value; flow.slot = null; renderChrome(); updateContinueButton(); }
        else if (t.name.indexOf("lieu-") === 0) { flow.lieu = t.value; flow.slot = null; renderChrome(); updateContinueButton(); }
        else return;
        // Whatever just opened/grew (the card itself, or its sub-panel
        // widening with a hint line) should end up fully on screen.
        M.reveal(t.closest(".option-card"));
      });
    },
    mounted: function (pane) { pane.querySelectorAll(".segmented--thumb").forEach(M.segmented); },
    canContinue: function () {
      var svc = currentService();
      if (!svc) return false;
      if (svc.lieu === "au_choix" && !flow.lieu) return false;
      if (svc.variantes && svc.variantes.length && !flow.varianteId) return false;
      return true;
    }
  };

  // =====================================================================
  // Step 2 — Adresse, 3 states (P04), swapped in place
  // =====================================================================
  function matchAddresses(q) {
    var norm = stripAccents(q).toLowerCase();
    if (norm.length < 2) return [];
    return SAMPLE_ADDRESSES.filter(function (a) {
      return stripAccents(a.ligne1 + " " + a.zone).toLowerCase().indexOf(norm) >= 0;
    }).slice(0, 5);
  }
  var PRIVACY = "🔒 Votre adresse n’est visible que par moi.";

  function addrHtml() {
    if (flow.addressStatus === "loading" && flow.pending) {
      return "<div class=\"addr-display addr-first\">" + esc(flow.pending.ligne1 + ", " + flow.pending.zone) + "</div>" +
        "<div class=\"addr-loading\" aria-live=\"polite\"><span class=\"addr-loading__spinner\" aria-hidden=\"true\"></span><span>Calcul du trajet…</span></div>" +
        "<p class=\"address-privacy address-privacy--loading\">" + PRIVACY + "</p>";
    }
    if (flow.addressStatus === "confirmed" && flow.adresse) {
      var a = flow.adresse;
      return "<div class=\"addr-confirmed addr-first\">" +
          "<span class=\"addr-confirmed__pin\" aria-hidden=\"true\">📍</span>" +
          "<div><p>Je me déplace à " + esc(a.zone) + " ✓</p><p class=\"addr-confirmed__line\" id=\"addr-line\">" + esc(a.ligne1 + (flow.complement ? " · " + flow.complement : "")) + "</p></div>" +
          "<button type=\"button\" class=\"addr-confirmed__edit\" id=\"addr-edit\" aria-label=\"Modifier l’adresse\">✎</button>" +
        "</div>" +
        "<label class=\"field-label\" for=\"addr-complement\">Complément (bâtiment, étage, appartement)</label>" +
        "<input type=\"text\" class=\"field addr-complement\" id=\"addr-complement\" value=\"" + esc(flow.complement) + "\">" +
        "<div class=\"addr-details\">" +
          "<button type=\"button\" class=\"address-detail-toggle\" id=\"addr-detail-toggle\" aria-expanded=\"" + flow.detailsOpen + "\" aria-controls=\"addr-detail-body\"><span id=\"addr-detail-sign\">" + (flow.detailsOpen ? "−" : "+") + "</span> Plus de détails</button>" +
          "<div class=\"collapse" + (flow.detailsOpen ? " is-open" : "") + "\" id=\"addr-detail-body\"" + (flow.detailsOpen ? "" : " inert") + "><div class=\"collapse__inner\"><div class=\"addr-details__fields\">" +
            "<label class=\"field-label\" for=\"addr-code\">Code d’accès / interphone</label>" +
            "<input type=\"text\" class=\"field field--mono\" id=\"addr-code\" placeholder=\"Ex." + NB + ": 45B12 · interphone KOFFI\" value=\"" + esc(flow.codeAcces) + "\">" +
            "<label class=\"field-label\" for=\"addr-indications\">Indications pour me trouver</label>" +
            "<textarea class=\"field\" id=\"addr-indications\" rows=\"2\" placeholder=\"Ex." + NB + ": 2ᵉ cour à gauche, ascenseur jusqu’au 4ᵉ\">" + esc(flow.indications) + "</textarea>" +
          "</div></div></div>" +
        "</div>" +
        "<label class=\"address-save-check\"><input type=\"checkbox\" id=\"addr-save\"" + (flow.saveAddress ? " checked" : "") + "><span class=\"check\" aria-hidden=\"true\">✓</span>Enregistrer cette adresse</label>" +
        "<p class=\"address-privacy address-privacy--confirmed\">" + PRIVACY + "</p>";
    }
    return "<p class=\"step-intro\">J’ai besoin de l’adresse avant les horaires" + NB + ": mes créneaux dépendent de mes trajets.</p>" +
      "<label class=\"field-label\" for=\"addr-input\">Adresse</label>" +
      "<div class=\"address-field-group\">" +
        "<input type=\"text\" class=\"field address-input\" id=\"addr-input\" value=\"" + esc(flow.addressQuery) + "\" placeholder=\"12 rue de Belleville, Paris 20ᵉ\" autocomplete=\"off\"" +
          " role=\"combobox\" aria-autocomplete=\"list\" aria-expanded=\"false\" aria-controls=\"addr-suggestions\">" +
        "<ul class=\"address-suggestions\" id=\"addr-suggestions\" role=\"listbox\" aria-label=\"Adresses proposées\" hidden></ul>" +
      "</div>" +
      "<p class=\"address-privacy\">" + PRIVACY + "</p>";
  }

  function paintAddr(body, focusSel) {
    M.swap(body, function () { body.innerHTML = addrHtml(); }, { dir: "up", duration: 320 });
    if (flow.addressStatus === "empty") renderSuggestions(body);
    if (focusSel) { var f = body.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
  }

  function renderSuggestions(body) {
    var input = body.querySelector("#addr-input"), list = body.querySelector("#addr-suggestions");
    if (!input) return;
    var matches = matchAddresses(input.value);
    var wasHidden = list.hidden;
    body.__matches = matches;
    body.__active = -1;
    input.classList.toggle("is-open", matches.length > 0);
    input.setAttribute("aria-expanded", matches.length ? "true" : "false");
    input.removeAttribute("aria-activedescendant");
    list.hidden = !matches.length;
    list.innerHTML = matches.map(function (a, i) {
      return "<li role=\"option\" id=\"addr-opt-" + i + "\" data-i=\"" + i + "\">📍 <strong>" + a.ligne1 + "</strong><span class=\"muted\"> · " + a.zone + "</span></li>";
    }).join("");
    if (wasHidden && matches.length) {
      list.classList.add("is-entering");
      window.setTimeout(function () { list.classList.remove("is-entering"); }, 400);
    }
  }
  function moveActive(body, delta) {
    var list = body.querySelector("#addr-suggestions"), input = body.querySelector("#addr-input");
    var items = list.querySelectorAll("li");
    if (!items.length) return;
    body.__active = (body.__active + delta + items.length) % items.length;
    items.forEach(function (li, i) { li.classList.toggle("is-active", i === body.__active); li.setAttribute("aria-selected", i === body.__active ? "true" : "false"); });
    input.setAttribute("aria-activedescendant", "addr-opt-" + body.__active);
  }

  function selectAddress(body, a) {
    flow.pending = a;
    flow.addressStatus = "loading";
    flow.slot = null; // slots depend on the address (travel)
    paintAddr(body);
    updateContinueButton();
    window.setTimeout(function () {
      if (flow.pending !== a) return;
      flow.adresse = a;
      flow.pending = null;
      flow.addressStatus = "confirmed";
      if (body.isConnected && flow.step === 2) paintAddr(body);
      renderChrome();
      updateContinueButton();
    }, 900);
  }

  /* Shared by step 2 (Adresse) and the projet flow's Mesures step, when
     "Eni'ol les prend" needs an address for the measurement visit. */
  function wireAddressBody(body) {
    body.addEventListener("input", function (e) {
      var t = e.target;
      if (t.id === "addr-input") { flow.addressQuery = t.value; renderSuggestions(body); }
      else if (t.id === "addr-complement") {
        flow.complement = t.value;
        var line = body.querySelector("#addr-line");
        if (line && flow.adresse) line.textContent = flow.adresse.ligne1 + (flow.complement ? " · " + flow.complement : "");
      }
      else if (t.id === "addr-code") flow.codeAcces = t.value;
      else if (t.id === "addr-indications") flow.indications = t.value;
    });
    body.addEventListener("change", function (e) { if (e.target.id === "addr-save") flow.saveAddress = e.target.checked; });
    body.addEventListener("keydown", function (e) {
      if (e.target.id !== "addr-input") return;
      if (e.key === "ArrowDown") { e.preventDefault(); moveActive(body, 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(body, -1); }
      else if (e.key === "Enter" && body.__matches && body.__matches[body.__active]) { e.preventDefault(); selectAddress(body, body.__matches[body.__active]); }
      else if (e.key === "Escape") { body.querySelector("#addr-suggestions").hidden = true; e.target.classList.remove("is-open"); }
    });
    body.addEventListener("click", function (e) {
      var li = e.target.closest("#addr-suggestions li");
      if (li) { selectAddress(body, body.__matches[+li.getAttribute("data-i")]); return; }
      if (e.target.closest("#addr-edit")) {
        flow.addressStatus = "empty"; flow.adresse = null; flow.slot = null;
        paintAddr(body, "#addr-input");
        renderChrome(); updateContinueButton();
        return;
      }
      if (e.target.closest("#addr-detail-toggle")) {
        flow.detailsOpen = !flow.detailsOpen;
        M.setOpen(body.querySelector("#addr-detail-body"), flow.detailsOpen);
        body.querySelector("#addr-detail-toggle").setAttribute("aria-expanded", flow.detailsOpen ? "true" : "false");
        body.querySelector("#addr-detail-sign").textContent = flow.detailsOpen ? "−" : "+";
      }
    });
  }

  STEPS[2] = {
    render: function (pane) {
      pane.innerHTML = "<h1>Où est-ce que je vous retrouve" + NB + "? 📍</h1><div class=\"addr-body\"></div>";
      var body = pane.querySelector(".addr-body");
      body.innerHTML = addrHtml();
      wireAddressBody(body);
    },
    mounted: function (pane) {
      var body = pane.querySelector(".addr-body");
      renderSuggestions(body);
      var i = pane.querySelector("#addr-input");
      if (i) i.focus({ preventScroll: true });
    },
    canContinue: function () { return flow.addressStatus === "confirmed"; }
  };

  // =====================================================================
  // Step 3 — Date & heure (P05 A "Prochaines disponibilités", P05 B
  // "Calendrier", P14 desktop) — updated in place
  // =====================================================================
  var LIST_DAYS_WITH_SLOTS = 3;
  var LIST_HORIZON_DAYS = 60;
  var DAY_REASONS = { ferme: "fermé", trop_tot: "trop tôt", complet: "complet", mois_ferme: "réservations pas encore ouvertes", projet: "indisponible", inconnu: "indisponible" };
  var TABS = ["liste", "calendrier"];

  function engineOpts(extra) {
    return extend({
      serviceId: flow.serviceId,
      now: S.now(),
      clientLocation: needsAddress() && flow.adresse ? { lat: flow.adresse.lat, lon: flow.adresse.lon } : null,
      dureeMin: currentDuration()
    }, extra || {});
  }
  function todayIso() { return isoDate(S.now()); }
  function dayOfMonth(d) { return d.getDate() === 1 ? "1er" : String(d.getDate()); }
  function monthName(ym) { return D.MONTHS_LONG[+ym.slice(5, 7) - 1]; }
  function deMois(ym) { var m = monthName(ym); return (/^[aeiouy]/.test(m) ? "d’" : "de ") + m; }
  function relativeTag(iso) {
    var n = Math.round((D.parseLocal(iso) - D.parseLocal(todayIso())) / 86400000);
    return n === 0 ? "AUJOURD’HUI" : (n === 1 ? "DEMAIN" : "DANS " + n + " JOURS");
  }
  function validateSlot() {
    if (!flow.slot) return;
    var r = A.slotsForDay(S.get(), engineOpts({ date: flow.slot.date }));
    var s = r.slots.filter(function (x) { return x.time === flow.slot.time; })[0];
    if (!s) flow.slot = null;
    else flow.slot.fin = s.fin;
  }

  function renderSlot(date, s) {
    var checked = flow.slot && flow.slot.date === date && flow.slot.time === s.time;
    return "<label class=\"slot\"><input type=\"radio\" class=\"slot__input\" name=\"creneau\" value=\"" + date + "|" + s.time + "\"" +
      " data-fin=\"" + s.fin + "\"" + (checked ? " checked" : "") + "><span class=\"slot__time\">" + s.time + "</span></label>";
  }
  function renderTaken(t) {
    return "<label class=\"slot is-taken\"><input type=\"radio\" class=\"slot__input\" disabled>" +
      "<span class=\"slot__time\">" + t.time + "<span class=\"slot__suffix\"> · pris</span></span></label>";
  }
  function renderDayBlock(r, tag) {
    var label = D.formatDateLong(D.parseLocal(r.date));
    var head = "<p>" + label + "</p>" + (tag ? "<span>" + tag + "</span>" : "");
    if (r.status !== "ok") {
      return "<div class=\"day-block\"><div class=\"day-head\">" + head + "</div><p class=\"day-empty\">Rien de libre ce jour-là.</p></div>";
    }
    var halves = A.DEMI_JOURNEES.map(function (hd) {
      var items = r.slots.filter(function (s) { return s.halfDay === hd.id; })
        .map(function (s) { return { time: s.time, html: renderSlot(r.date, s) }; })
        .concat(r.taken.filter(function (t) { return t.halfDay === hd.id; })
          .map(function (t) { return { time: t.time, html: renderTaken(t) }; }))
        .sort(function (a, b) { return a.time < b.time ? -1 : 1; });
      if (!items.length) return "";
      var c = r.slots.filter(function (s) { return s.halfDay === hd.id && s.conseille; })[0];
      return "<div class=\"halfday\">" +
        "<p class=\"halfday__label\">" + hd.label + "</p>" +
        "<div class=\"slot-grid\">" + items.map(function (i) { return i.html; }).join("") +
          (c ? "<span class=\"conseille-pill\">♡ " + c.time + " conseillé</span>" : "") + "</div>" +
        (c ? "<div class=\"conseille-note\"><span aria-hidden=\"true\">♡</span><p><strong>" + c.time + " · créneau conseillé</strong> — c’est celui qui s’enchaîne le mieux avec ma journée.</p></div>" : "") +
        "</div>";
    }).join("");
    return "<fieldset class=\"day-block\"><legend class=\"sr-only\">" + label + "</legend>" +
      "<div class=\"day-head\" aria-hidden=\"true\">" + head + "</div>" +
      "<div class=\"halfdays\">" + halves + "</div></fieldset>";
  }

  /* P05 A's box under the chosen day (mobile only — P14 has the side card). */
  function summaryInner() {
    var s = flow.slot;
    return "<p><strong class=\"slot-summary__main\">" + s.time + " → fin prévue vers " + s.fin + "</strong></p>" +
      (needsAddress() ? "<p class=\"slot-summary__arrive\">J’arrive vers " + s.time + " (± 15 min), le temps du métro.</p>" : "") +
      "<p class=\"slot-summary__ok\">✓ Annulation gratuite jusqu’à " + settings.annulation.gratuiteJusquaHeures + " h avant.</p>";
  }
  function summaryWrap(date) {
    var open = !!(flow.slot && flow.slot.date === date);
    return "<div class=\"collapse slot-summary-wrap" + (open ? " is-open" : "") + "\" data-date=\"" + date + "\"" + (open ? "" : " inert") + ">" +
      "<div class=\"collapse__inner\"><div class=\"slot-summary-pad\"><div class=\"slot-summary\">" + (open ? summaryInner() : "") + "</div></div></div></div>";
  }

  function closedMonthBox(ym) {
    return "<div class=\"month-closed\"><p class=\"month-closed__title\">" + monthName(ym) + " " + ym.slice(0, 4) + "</p>" +
      "<p>Les réservations " + deMois(ym) + " ouvrent bientôt — suivez <a href=\"" + IG_PROFILE + "\">@pose.de.perruques</a></p></div>";
  }
  function noticeWindow() {
    var svc = currentService();
    if (!svc || !svc.delaiMinimumHeures) return null;
    var now = S.now(), earliest = new Date(now.getTime() + svc.delaiMinimumHeures * 3600000);
    var to = isoDate(earliest);
    if (earliest.getHours() === 0 && earliest.getMinutes() === 0) to = addDays(to, -1);
    return { from: isoDate(now), to: to, hours: svc.delaiMinimumHeures };
  }
  function tooEarlyBox(w) {
    var a = D.parseLocal(w.from), b = D.parseLocal(w.to), bMonth = D.MONTHS_LONG[b.getMonth()];
    var range = w.from === w.to
      ? "Le " + dayOfMonth(b) + " " + bMonth
      : "Du " + dayOfMonth(a) + (a.getMonth() === b.getMonth() ? "" : " " + D.MONTHS_LONG[a.getMonth()]) + " au " + dayOfMonth(b) + " " + bMonth;
    return "<div class=\"notice-warn\"><p>◔ <strong>" + range + NB + ": trop tôt.</strong><br>" +
      "Cette prestation se réserve au moins " + preavisLabel(w.hours) + " à l’avance.</p></div>";
  }

  /* P05 A: consecutive working days (full days included, as "Rien de libre
     ce jour-là."), until 3 bookable days or the first closed month. */
  /* Only days with something bookable are shown — a fully-booked day is
     skipped rather than listed as "Rien de libre ce jour-là." (client
     request: jump straight to the next day that actually has a slot,
     rather than making them scroll past dead days). */
  function listPanelHtml() {
    var st = S.get(), d = todayIso(), days = [], closed = null;
    for (var i = 0; i < LIST_HORIZON_DAYS && days.length < LIST_DAYS_WITH_SLOTS; i++) {
      var r = A.slotsForDay(st, engineOpts({ date: d }));
      if (r.status === "mois_ferme") { closed = d.slice(0, 7); break; }
      if (r.status === "ok") days.push(r);
      d = addDays(d, 1);
    }
    var html = days.map(function (r, idx) {
      return renderDayBlock(r, idx === 0 ? relativeTag(r.date) : null) + summaryWrap(r.date);
    }).join("");
    if (closed) html += closedMonthBox(closed);
    return "<div class=\"day-list\">" + html + "</div>";
  }

  // ---- Calendar (P05 B) ----
  var calState = { ouvert: true };
  function calMonthYm() {
    var thisMonth = todayIso().slice(0, 7);
    var ym = flow.calMonth || (flow.slot ? flow.slot.date.slice(0, 7) : thisMonth);
    if (ym < thisMonth) ym = thisMonth;
    flow.calMonth = ym;
    return ym;
  }
  function calDetailHtml() {
    var ym = calMonthYm();
    if (!flow.calDay || flow.calDay.slice(0, 7) !== ym) return "";
    var r = A.slotsForDay(S.get(), engineOpts({ date: flow.calDay }));
    return r.status === "ok" ? renderDayBlock(r, relativeTag(r.date)) + summaryWrap(r.date) : "";
  }
  function calMonthHtml() {
    var st = S.get(), ym = calMonthYm();
    var cal = A.monthCalendar(st, engineOpts({ year: +ym.slice(0, 4), month: +ym.slice(5, 7) }));
    calState.ouvert = cal.ouvert;
    var nextYm = addDays(ym + "-28", 7).slice(0, 7);
    var cells = "", lead = (cal.jours[0].jourSemaine + 6) % 7;
    var prevLast = D.parseLocal(ym + "-01"); prevLast.setDate(0);
    for (var i = lead; i > 0; i--) cells += "<span class=\"cal-day is-outside\" aria-hidden=\"true\">" + (prevLast.getDate() - i + 1) + "</span>";
    cal.jours.forEach(function (j) {
      var cls = ["cal-day"], reason = null;
      if (j.status === "passe") { cls.push("is-past"); reason = "passé"; }
      else if (j.status === "ok") { cls.push("is-available"); if (j.date === flow.calDay) cls.push("is-selected"); }
      else { cls.push("is-off"); reason = DAY_REASONS[j.status] || "indisponible"; }
      if (j.aujourdhui) cls.push("is-today");
      var label = D.formatDateLong(D.parseLocal(j.date)) + (j.aujourdhui ? ", aujourd’hui" : "") + (reason ? " — " + reason : "");
      cells += "<button type=\"button\" class=\"" + cls.join(" ") + "\" data-date=\"" + j.date + "\" aria-label=\"" + label + "\"" +
        (reason ? " aria-disabled=\"true\"" : " aria-pressed=\"" + (j.date === flow.calDay) + "\"") + ">" + j.jour + "</button>";
    });
    var notices = "";
    var w = noticeWindow();
    if (cal.ouvert && w && w.from <= cal.jours[cal.jours.length - 1].date && w.to >= cal.jours[0].date) notices += tooEarlyBox(w);
    var closedYm = !cal.ouvert ? ym : (A.monthIsOpen(st, nextYm + "-01") ? null : nextYm);
    if (closedYm) notices += closedMonthBox(closedYm);
    return "<div class=\"cal-weekdays\" aria-hidden=\"true\"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>" +
      "<div class=\"cal-grid\">" + cells + "</div>" +
      "<div class=\"cal-legend\">" +
        "<span class=\"cal-legend__item\"><span class=\"cal-legend__swatch\"></span>Disponible</span>" +
        "<span class=\"cal-legend__item\"><span class=\"cal-legend__swatch is-selected\"></span>Sélectionné</span>" +
        "<span class=\"cal-legend__item\"><span class=\"cal-legend__swatch is-off\"></span>Trop tôt / complet</span>" +
      "</div>" +
      "<div class=\"cal-detail\">" + calDetailHtml() + "</div>" +
      notices;
  }
  function calendarPanelHtml() {
    var ym = calMonthYm(), body = calMonthHtml(), thisMonth = todayIso().slice(0, 7);
    return "<div class=\"cal-nav\">" +
        "<button type=\"button\" class=\"cal-nav__btn\" id=\"cal-prev\" aria-label=\"Mois précédent\"" + (ym <= thisMonth ? " disabled" : "") + ">‹</button>" +
        "<p class=\"cal-nav__title\" id=\"cal-title\">" + monthName(ym) + " " + ym.slice(0, 4) + "</p>" +
        "<button type=\"button\" class=\"cal-nav__btn\" id=\"cal-next\" aria-label=\"Mois suivant\"" + (calState.ouvert ? "" : " disabled") + ">›</button>" +
      "</div>" +
      "<div class=\"cal-month\">" + body + "</div>";
  }
  function panelHtml() { return flow.dateTab === "calendrier" ? calendarPanelHtml() : listPanelHtml(); }

  function announce(pane, msg) {
    var el = pane.querySelector(".slot-status");
    if (!el) return;
    el.textContent = "";
    window.setTimeout(function () { el.textContent = msg; }, 30);
  }
  function freeCountLabel(date) {
    var n = A.slotsForDay(S.get(), engineOpts({ date: date })).slots.length;
    return D.formatDateLong(D.parseLocal(date)) + NB + ": " + n + " créneau" + (n > 1 ? "x" : "") + " libre" + (n > 1 ? "s" : "") + ".";
  }

  function onSlot(pane, input) {
    var parts = input.value.split("|");
    var sameDay = flow.slot && flow.slot.date === parts[0];
    flow.slot = { date: parts[0], time: parts[1], fin: input.getAttribute("data-fin") };
    flow.calDay = parts[0];
    pane.querySelectorAll(".slot-summary-wrap").forEach(function (w) {
      var mine = w.getAttribute("data-date") === flow.slot.date;
      var box = w.querySelector(".slot-summary");
      if (mine) {
        var main = box.querySelector(".slot-summary__main");
        if (sameDay && main && w.classList.contains("is-open")) {
          M.roll(main, flow.slot.time + " → fin prévue vers " + flow.slot.fin);
          var arrive = box.querySelector(".slot-summary__arrive");
          if (arrive) M.roll(arrive, "J’arrive vers " + flow.slot.time + " (± 15 min), le temps du métro.");
        } else {
          box.innerHTML = summaryInner();
        }
      }
      M.setOpen(w, mine);
    });
    renderChrome();
    updateContinueButton();
    announce(pane, flow.slot.time + " → fin prévue vers " + flow.slot.fin + ".");
  }

  function onDay(pane, btn) {
    if (btn.getAttribute("aria-disabled") === "true") return;
    var date = btn.getAttribute("data-date");
    if (date === flow.calDay) return;
    flow.calDay = date;
    pane.querySelectorAll(".cal-day.is-available").forEach(function (b) {
      var on = b.getAttribute("data-date") === date;
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var detail = pane.querySelector(".cal-detail");
    M.swap(detail, function () { detail.innerHTML = calDetailHtml(); }, { dir: "up" });
    announce(pane, freeCountLabel(date));
  }

  function onMonth(pane, delta) {
    var d = D.parseLocal(calMonthYm() + "-01");
    d.setMonth(d.getMonth() + delta);
    flow.calMonth = isoDate(d).slice(0, 7);
    var monthEl = pane.querySelector(".cal-month");
    M.swap(monthEl, function () { monthEl.innerHTML = calMonthHtml(); }, { dir: delta > 0 ? "forward" : "back", distance: 56 });
    M.roll(pane.querySelector("#cal-title"), monthName(flow.calMonth) + " " + flow.calMonth.slice(0, 4), { dir: delta > 0 ? "up" : "down" });
    var prev = pane.querySelector("#cal-prev"), next = pane.querySelector("#cal-next");
    prev.disabled = flow.calMonth <= todayIso().slice(0, 7);
    next.disabled = !calState.ouvert;
    var self = delta > 0 ? next : prev, other = delta > 0 ? prev : next;
    if (self.disabled) other.focus();
    announce(pane, monthName(flow.calMonth) + " " + flow.calMonth.slice(0, 4));
  }

  function switchTab(pane, tab) {
    if (tab === flow.dateTab) return;
    var dir = TABS.indexOf(tab) > TABS.indexOf(flow.dateTab) ? "forward" : "back";
    flow.dateTab = tab;
    pane.querySelectorAll(".date-tab").forEach(function (t) {
      var on = t.getAttribute("data-tab") === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    var panel = pane.querySelector(".date-panel");
    panel.setAttribute("aria-labelledby", "tab-" + tab);
    M.swap(panel, function () { panel.innerHTML = panelHtml(); }, { dir: dir, distance: 56 });
    pane.querySelector("#tab-" + tab).focus();
  }

  STEPS[3] = {
    render: function (pane) {
      validateSlot();
      if (flow.slot && !flow.calDay) flow.calDay = flow.slot.date;
      var a = flow.adresse, html = "";
      if (needsAddress() && a) {
        html += "<div class=\"step3-address\"><span aria-hidden=\"true\">📍</span>" +
          "<div class=\"step3-address__text\"><p>" + esc(a.zone) + "</p><p>" + esc(a.ligne1 + (flow.complement ? " · " + flow.complement : "")) + "</p></div>" +
          "<button type=\"button\" class=\"step3-address__edit\">Modifier</button></div>";
      }
      html += "<h1 class=\"step3-title\">Quel jour vous arrange" + NB + "?</h1>";
      if (needsAddress()) html += "<p class=\"step3-intro\">Les créneaux affichés tiennent compte de mes trajets jusqu’à chez vous.</p>";
      html += "<div class=\"date-tabs\" role=\"tablist\" aria-label=\"Affichage des disponibilités\">" +
          TABS.map(function (t) {
            var on = t === flow.dateTab;
            return "<button type=\"button\" class=\"date-tab\" role=\"tab\" id=\"tab-" + t + "\" data-tab=\"" + t + "\" aria-controls=\"date-panel\" aria-selected=\"" + on + "\" tabindex=\"" + (on ? 0 : -1) + "\">" +
              (t === "liste" ? "Prochaines disponibilités" : "Calendrier") + "</button>";
          }).join("") +
        "</div>" +
        "<div class=\"date-panel\" id=\"date-panel\" role=\"tabpanel\" aria-labelledby=\"tab-" + flow.dateTab + "\">" + panelHtml() + "</div>" +
        "<p class=\"sr-only slot-status\" aria-live=\"polite\"></p>";
      pane.innerHTML = html;

      pane.addEventListener("click", function (e) {
        if (e.target.closest(".step3-address__edit")) { flow.step = 2; renderStep("back"); return; }
        var tab = e.target.closest(".date-tab");
        if (tab) { switchTab(pane, tab.getAttribute("data-tab")); return; }
        var day = e.target.closest(".cal-day[data-date]");
        if (day) { onDay(pane, day); return; }
        var nav = e.target.closest(".cal-nav__btn");
        if (nav && !nav.disabled) onMonth(pane, nav.id === "cal-next" ? 1 : -1);
      });
      pane.addEventListener("change", function (e) {
        if (e.target.name === "creneau" && !e.target.disabled) onSlot(pane, e.target);
      });
      pane.addEventListener("keydown", function (e) {
        var tab = e.target.closest && e.target.closest(".date-tab");
        if (!tab || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
        e.preventDefault();
        var i = TABS.indexOf(tab.getAttribute("data-tab"));
        switchTab(pane, TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length]);
      });
    },
    canContinue: function () { return !!flow.slot; }
  };

  // =====================================================================
  // Step 4 — Photos & détails (P06)
  // =====================================================================
  function zonePhotos(zone) { return flow.photos.filter(function (p) { return p.zone === zone; }); }
  function countLabel(zone) { return zonePhotos(zone).length + " / 5 photos"; }
  function photoZoneHtml(zone) {
    var items = zonePhotos(zone);
    if (!items.length) {
      return "<label class=\"photo-upload-zone\">" +
        "<span class=\"photo-upload-zone__icon\" aria-hidden=\"true\">＋</span>" +
        "<span class=\"photo-upload-zone__label\">Ajouter des photos</span>" +
        "<span class=\"photo-upload-zone__hint\">jusqu’à 5" + NB + "· JPG ou PNG</span>" +
        "<input type=\"file\" accept=\"image/*\" multiple class=\"sr-only\" data-zone=\"" + zone + "\"></label>";
    }
    var cells = items.map(function (p, i) {
      return "<div class=\"photo-grid__item\"><img src=\"" + p.dataUrl + "\" alt=\"\">" +
        "<button type=\"button\" class=\"photo-grid__remove\" data-remove-zone=\"" + zone + "\" data-i=\"" + i + "\" aria-label=\"Supprimer cette photo\">✕</button></div>";
    }).join("");
    var add = items.length < 5
      ? "<label class=\"photo-grid__add\"><span aria-hidden=\"true\">＋</span><span>Ajouter</span><input type=\"file\" accept=\"image/*\" multiple data-zone=\"" + zone + "\"></label>"
      : "";
    return "<div class=\"photo-grid\">" + cells + add + "</div>";
  }
  function linkHtml(url, i) {
    return "<div class=\"link-row\"><span class=\"link-row__icon\" aria-hidden=\"true\">🔗</span>" +
      "<span class=\"link-row__url\">" + esc(url) + "</span>" +
      "<button type=\"button\" class=\"link-row__remove\" data-remove-link=\"" + i + "\" aria-label=\"Retirer ce lien\">✕</button></div>";
  }

  function refreshPhotoZone(pane, zone) {
    var wrap = pane.querySelector(".photo-zone[data-zone=\"" + zone + "\"]");
    M.swap(wrap, function () { wrap.innerHTML = photoZoneHtml(zone); });
    M.roll(pane.querySelector(".photo-count[data-zone=\"" + zone + "\"]"), countLabel(zone));
    if (zone === "cheveux") {
      var err = pane.querySelector("#photo-error");
      if (err) M.setOpen(err, zonePhotos("cheveux").length === 0);
    }
    updateContinueButton();
  }
  function handlePhotoFiles(pane, zone, files) {
    var room = 5 - zonePhotos(zone).length;
    Array.prototype.slice.call(files, 0, Math.max(0, room)).forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        flow.photos.push({ zone: zone, nom: file.name, dataUrl: reader.result });
        refreshPhotoZone(pane, zone);
      };
      reader.readAsDataURL(file);
    });
  }

  STEPS[4] = {
    render: function (pane) {
      var svc = currentService();
      var required = svc && svc.photos === "obligatoires";
      pane.innerHTML =
        "<h1>Montrez-moi</h1>" +
        "<p class=\"step-intro\">Ces photos me disent quoi prévoir dans ma valise. Elles restent entre nous.</p>" +
        "<div class=\"photo-section\"><p class=\"photo-section__label\">Mes cheveux / ma perruque actuelle" + (required ? " <span class=\"required\">*</span>" : "") + "</p>" +
          "<div class=\"photo-zone\" data-zone=\"cheveux\">" + photoZoneHtml("cheveux") + "</div>" +
          "<p class=\"photo-count\" data-zone=\"cheveux\">" + countLabel("cheveux") + "</p></div>" +
        "<div class=\"photo-section\"><p class=\"photo-section__label\">Mon inspiration</p>" +
          "<div class=\"photo-zone\" data-zone=\"inspiration\">" + photoZoneHtml("inspiration") + "</div>" +
          "<p class=\"photo-count\" data-zone=\"inspiration\">" + countLabel("inspiration") + "</p></div>" +
        "<div id=\"link-list\">" + flow.liens.map(linkHtml).join("") + "</div>" +
        "<button type=\"button\" class=\"add-link-btn\" id=\"btn-add-link\">＋ Ajouter un lien (Instagram, TikTok, Pinterest)</button>" +
        "<div class=\"collapse\" id=\"link-form-wrap\" inert><div class=\"collapse__inner\"><div class=\"link-add-form\">" +
          "<input type=\"url\" class=\"field\" id=\"link-input\" placeholder=\"https://…\">" +
          "<button type=\"button\" class=\"btn btn--secondary\" id=\"btn-link-save\">Ajouter</button>" +
        "</div></div></div>" +
        "<label class=\"field-label\" for=\"notes-cliente\">Ce que je veux, en quelques mots</label>" +
        "<textarea class=\"field\" id=\"notes-cliente\" rows=\"3\" placeholder=\"Ex." + NB + ": raie au milieu, lace transparente, 22 pouces, couleur 1B…\">" + esc(flow.notesCliente) + "</textarea>" +
        "<div class=\"photo-hint\"><p>♡ Astuce" + NB + ": une photo à la lumière du jour, cheveux détachés, me suffit.</p></div>" +
        (required
          ? "<div class=\"collapse\" id=\"photo-error\"><div class=\"collapse__inner\"><div class=\"step-error-banner\">" +
              "<p>✕ État requis" + NB + ": «" + NB + "Ajoutez au moins une photo de vos cheveux" + NB + ": j’en ai besoin pour préparer. »</p></div></div></div>"
          : "<button type=\"button\" class=\"btn btn--secondary skip-step-btn\" id=\"btn-skip-photos\">Passer cette étape</button>");
      if (required) M.setOpen(pane.querySelector("#photo-error"), zonePhotos("cheveux").length === 0);

      pane.addEventListener("change", function (e) {
        if (e.target.matches("input[type=file]")) handlePhotoFiles(pane, e.target.getAttribute("data-zone"), e.target.files);
      });
      pane.addEventListener("click", function (e) {
        var rm = e.target.closest("[data-remove-zone]");
        if (rm) {
          var zone = rm.getAttribute("data-remove-zone"), i = +rm.getAttribute("data-i");
          var items = zonePhotos(zone);
          flow.photos.splice(flow.photos.indexOf(items[i]), 1);
          refreshPhotoZone(pane, zone);
          return;
        }
        var rl = e.target.closest("[data-remove-link]");
        if (rl) {
          var list = pane.querySelector("#link-list");
          M.swap(list, function () { flow.liens.splice(+rl.getAttribute("data-remove-link"), 1); list.innerHTML = flow.liens.map(linkHtml).join(""); });
          return;
        }
        if (e.target.closest("#btn-add-link")) {
          var wrapEl = pane.querySelector("#link-form-wrap");
          M.setOpen(wrapEl, true);
          pane.querySelector("#link-input").focus();
          return;
        }
        if (e.target.closest("#btn-link-save")) {
          var input = pane.querySelector("#link-input"), url = input.value.trim();
          if (!url) return;
          var list2 = pane.querySelector("#link-list");
          flow.liens.push(url);
          M.swap(list2, function () { list2.innerHTML = flow.liens.map(linkHtml).join(""); });
          input.value = "";
          M.setOpen(pane.querySelector("#link-form-wrap"), false);
          return;
        }
        if (e.target.closest("#btn-skip-photos")) { goNext(); }
      });
      pane.addEventListener("keydown", function (e) {
        if (e.target.id === "link-input" && e.key === "Enter") { e.preventDefault(); pane.querySelector("#btn-link-save").click(); }
      });
      pane.addEventListener("input", function (e) {
        if (e.target.id === "notes-cliente") flow.notesCliente = e.target.value;
      });
    },
    canContinue: function () {
      var svc = currentService();
      if (svc && svc.photos === "obligatoires") return zonePhotos("cheveux").length > 0;
      return true;
    }
  };

  // =====================================================================
  // Step 5 — Coordonnées (P07) — shared by the general flow and, unchanged,
  // by the projet flow's own step 5 (CODE-BATCHES.md's B21 note: "reuse the
  // general flow's already-built components").
  // =====================================================================
  function digitsOnly(s) { return (s || "").replace(/\D/g, ""); }
  function isValidEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

  function coordonneesRender(pane) {
    var c = flow.contact;
    pane.innerHTML =
      "<h1>Comment je vous joins" + NB + "?</h1>" +
      "<div class=\"field-row-pair field-group\">" +
        "<div><label class=\"field-label\" for=\"c-prenom\">Prénom</label><input class=\"field\" id=\"c-prenom\" value=\"" + esc(c.prenom) + "\"></div>" +
        "<div><label class=\"field-label\" for=\"c-nom\">Nom</label><input class=\"field\" id=\"c-nom\" value=\"" + esc(c.nom) + "\"></div>" +
      "</div>" +
      "<div class=\"field-group\">" +
        "<label class=\"field-label\" for=\"c-tel\">Téléphone</label>" +
        "<input class=\"field field--mono\" id=\"c-tel\" inputmode=\"tel\" value=\"" + esc(c.telephone) + "\">" +
        "<p class=\"field-help\" id=\"c-tel-help\">Uniquement pour vous confirmer le rendez-vous et vous le rappeler.</p>" +
      "</div>" +
      "<div class=\"field-group\"><label class=\"field-label\" for=\"c-email\">E-mail</label><input class=\"field\" id=\"c-email\" type=\"email\" value=\"" + esc(c.email) + "\">" +
        "<p class=\"field-help\" id=\"c-email-help\" hidden>✕ Cette adresse ne semble pas valide.</p></div>" +
      "<div class=\"field-group\"><label class=\"field-label\" for=\"c-ig\">@Instagram <span style=\"font-weight:400; color:var(--ink-2);\">(facultatif)</span></label>" +
        "<input class=\"field\" id=\"c-ig\" placeholder=\"@votre_compte\" value=\"" + esc(c.instagram) + "\"></div>" +
      "<div class=\"consent-list\">" +
        // P07's literal wording is "e-mail", not strings.js's `rappelSms` key
        // ("SMS") — the artboard wins on that disagreement.
        "<label class=\"check-row\"><input type=\"checkbox\" id=\"c-rappel\"" + (c.rappelsSms ? " checked" : "") + "><span class=\"check\" aria-hidden=\"true\">✓</span><span>Me rappeler par e-mail la veille du rendez-vous</span></label>" +
        "<label class=\"check-row\"><input type=\"checkbox\" id=\"c-portfolio\"" + (c.photosPortfolio ? " checked" : "") + "><span class=\"check\" aria-hidden=\"true\">✓</span><span>J’autorise Eni’ol à publier des photos de ma pose (sans mon visage) <span class=\"check-hint\" style=\"display:inline; color:var(--ink-2);\">— facultatif, révocable à tout moment</span></span></label>" +
      "</div>" +
      "<p class=\"privacy-note\">🔒 Vos coordonnées ne servent qu’à nos rendez-vous. Aucune publicité, aucun partage. <a href=\"conditions.html\">En savoir plus</a></p>";

    function validate() {
      var telOk = digitsOnly(c.telephone).length >= 9;
      var emailOk = !c.email || isValidEmail(c.email);
      pane.querySelector("#c-tel").classList.toggle("has-error", !!c.telephone && !telOk);
      var emailField = pane.querySelector("#c-email");
      emailField.classList.toggle("has-error", !!c.email && !emailOk);
      pane.querySelector("#c-email-help").hidden = emailOk;
      updateContinueButton();
    }
    pane.addEventListener("input", function (e) {
      var m = { "c-prenom": "prenom", "c-nom": "nom", "c-tel": "telephone", "c-email": "email", "c-ig": "instagram" }[e.target.id];
      if (m) { c[m] = e.target.value; validate(); }
    });
    pane.addEventListener("change", function (e) {
      if (e.target.id === "c-rappel") c.rappelsSms = e.target.checked;
      else if (e.target.id === "c-portfolio") c.photosPortfolio = e.target.checked;
    });
  }
  function coordonneesCanContinue() {
    var c = flow.contact;
    return !!(c.prenom.trim() && c.nom.trim() && digitsOnly(c.telephone).length >= 9 && c.email.trim() && isValidEmail(c.email));
  }
  STEPS[5] = { render: coordonneesRender, canContinue: coordonneesCanContinue };

  // =====================================================================
  // Step 6 — Récapitulatif (P08)
  // =====================================================================
  function recapRow(label, value, meta, editStep) {
    return "<div class=\"recap-card__row\"><div><p class=\"recap-card__label\">" + label.toUpperCase() + "</p>" +
      "<p class=\"recap-card__value\">" + value + "</p>" +
      (meta ? "<p class=\"recap-card__meta\">" + meta + "</p>" : "") + "</div>" +
      "<button type=\"button\" class=\"recap-card__edit\" data-edit-step=\"" + editStep + "\" aria-label=\"Modifier\">✎</button></div>";
  }
  function prepChecklistHtml(vousForm) {
    var items = vousForm
      ? ["Lavez et démêlez vos cheveux naturels.", "Sortez votre perruque et vos produits habituels.", "Une chaise, une prise, un peu de lumière" + NB + ": ça suffit."]
      : ["Laver et démêler mes cheveux", "Sortir ma perruque et mes produits", "Une chaise, une prise, de la lumière"];
    var tags = ["J-2", "LA VEILLE", "LE JOUR J"];
    return "<ul>" + items.map(function (t, i) { return "<li><span aria-hidden=\"true\">♡</span><span><strong>" + tags[i] + "</strong> — " + t + "</span></li>"; }).join("") + "</ul>";
  }
  function cancellationTimelineHtml() {
    var deadline = D.addHours(flow.slot.date + "T" + flow.slot.time, -settings.annulation.gratuiteJusquaHeures);
    var deadlineLabel = D.formatDateShort(D.parseLocal(deadline)) + " " + deadline.slice(11, 16);
    var todayLabel = D.formatDateShort(S.now());
    var rdvLabel = D.formatDateShort(D.parseLocal(flow.slot.date)) + " · " + flow.slot.time;
    return "<div class=\"timeline-card\"><p class=\"timeline-card__title\">Combien coûte une annulation" + NB + "?</p>" +
      timelineRow("var(--action)", todayLabel, "Demande envoyée, rien à payer", "var(--ink-body)") +
      timelineRow("var(--state-ok-ink)", "Jusqu’au " + deadlineLabel, "Annulation gratuite, arrhes remboursées", "var(--state-ok-ink)") +
      timelineRow("var(--state-danger-ink)", "Après " + deadlineLabel, "Les " + D.formatPrice(flow.__arrhes) + " d’arrhes restent acquises", "var(--state-danger-ink)") +
      timelineRow(null, rdvLabel, "Notre rendez-vous ♡", "var(--ink-body)", true) +
      "</div>";
  }
  function timelineRow(dotColor, when, desc, descColor, isLast) {
    return "<div class=\"timeline-row\"><div class=\"timeline-row__rail\">" +
      "<span class=\"timeline-row__dot\" style=\"" + (dotColor ? "background:" + dotColor : "border:2px solid var(--ink)") + "\"></span>" +
      (isLast ? "" : "<span class=\"timeline-row__line\"></span>") + "</div>" +
      "<div class=\"timeline-row__body\"><p class=\"timeline-row__when\">" + when + "</p>" +
      "<p class=\"timeline-row__desc\" style=\"color:" + descColor + "\">" + desc + "</p></div></div>";
  }

  STEPS[6] = {
    render: function (pane) {
      var svc = currentService(), v = currentVariant(), price = totalPriceEuros();
      var arrhes = svc.arrhes && svc.arrhes.type === "montant" ? svc.arrhes.valeur : null;
      flow.__arrhes = arrhes;
      var total = price == null ? null : price - (arrhes || 0);
      var prestationMeta = [v ? v.libelle : null, durationLabel(currentDuration())].filter(Boolean).join(" · ");
      var ouValue = needsAddress() ? "Chez vous — " + esc(flow.adresse.zone) : "Sans déplacement";
      var ouMeta = needsAddress() ? esc(flow.adresse.ligne1 + (flow.complement ? " · " + flow.complement : "")) : "";
      var quandValue = D.formatDateLong(D.parseLocal(flow.slot.date)) + " · " + flow.slot.time;
      var quandMeta = "Fin prévue vers " + flow.slot.fin + " · j’arrive vers " + flow.slot.time + " (± 15 min)";
      var photoCount = flow.photos.length, lienCount = flow.liens.length;
      var photoValue = (photoCount ? photoCount + " photo" + (photoCount > 1 ? "s" : "") : "Aucune photo") + (lienCount ? " · " + lienCount + " lien" + (lienCount > 1 ? "s" : "") : "");

      pane.innerHTML =
        "<h1>On récapitule</h1>" +
        "<div class=\"recap-card\">" +
          recapRow("Prestation", esc(svc.nom), esc(prestationMeta), 1) +
          recapRow("Où", ouValue, ouMeta, needsAddress() ? 2 : 1) +
          recapRow("Quand", quandValue, quandMeta, 3) +
          recapRow("Photos & détails", esc(photoValue), flow.notesCliente ? "«" + NB + esc(flow.notesCliente).slice(0, 40) + (flow.notesCliente.length > 40 ? "…" : "") + NB + "»" : "", 4) +
          recapRow("Vous", esc(flow.contact.prenom + " " + flow.contact.nom), esc(flow.contact.telephone), 5) +
        "</div>" +
        "<div class=\"price-card\"><p class=\"price-card__label\">LE PRIX</p>" +
          "<div class=\"price-card__row\"><span>" + esc(svc.nom) + "</span><span class=\"mono\">" + D.formatPrice(price) + "</span></div>" +
          "<div class=\"price-card__row is-divider\"><span>Frais de déplacement</span><span class=\"mono\">" + (needsAddress() ? "aucun" : "—") + "</span></div>" +
          (arrhes != null ? "<div class=\"price-card__row\"><span>À m’envoyer après mon accord</span><span class=\"mono\">" + D.formatPrice(arrhes) + NB + "d’arrhes</span></div>" : "") +
          "<div class=\"price-card__row is-total\"><span>Sur place (espèces ou carte)</span><span class=\"mono\">" + D.formatPrice(total) + "</span></div>" +
          "<p class=\"price-card__note\">Rien n’est payé maintenant. " + (arrhes != null ? "Les arrhes se règlent une fois que j’ai accepté." : "") + "</p>" +
        "</div>" +
        (arrhes != null ? cancellationTimelineHtml() : "") +
        "<div class=\"prep-card\"><p class=\"prep-card__title\">Pour bien préparer la séance</p>" +
          "<p class=\"prep-card__eyebrow\">EXEMPLES — À VALIDER AVEC ENI’OL</p>" + prepChecklistHtml(true) + "</div>" +
        "<label class=\"check-row recap-accept\"><input type=\"checkbox\" id=\"c-accept\"" + (flow.acceptConditions ? " checked" : "") + ">" +
          "<span class=\"check\" aria-hidden=\"true\">✓</span><span>J’accepte les conditions d’annulation et le versement des arrhes. <a href=\"conditions.html\">Lire les conditions</a></span></label>";

      pane.addEventListener("click", function (e) {
        var edit = e.target.closest("[data-edit-step]");
        if (edit) { flow.step = +edit.getAttribute("data-edit-step"); renderStep("back"); }
      });
      pane.addEventListener("change", function (e) {
        if (e.target.id === "c-accept") { flow.acceptConditions = e.target.checked; updateContinueButton(); }
      });
    },
    canContinue: function () { return flow.acceptConditions; }
  };

  // =====================================================================
  // Fabrication sur mesure — "projet" flow (P11 A/B; steps 4–6 extrapolated,
  // see the note by PROJET_STEP_TITLES above).
  // =====================================================================
  /* P11 A: Longueur/Densité/Type de lace chips are set in DM Mono (the
     design's convention for measurements and technical specs); Texture's
     are plain Instrument Sans, and it's the one group with no "conseillez-
     moi" pill drawn. */
  var ENVIES_GROUPS = [
    { key: "longueur", label: "Longueur", options: ["14\"", "18\"", "22\"", "26\""], mono: true },
    { key: "densite", label: "Densité", options: ["130 %", "150 %", "180 %"], mono: true },
    { key: "texture", label: "Texture", options: ["Lisse", "Body wave", "Curly", "Kinky"], noConseil: true },
    { key: "typeLace", label: "Type de lace", options: ["Frontale 13×4", "Closure 5×5", "Full lace"], mono: true }
  ];
  var ENVIES_COLORS = [
    { id: "1B", hex: "#1B1512" }, { id: "#4", hex: "#4A3428" }, { id: "#30", hex: "#8C6239" }, { id: "#613", hex: "#C9A66B" }
  ];
  var CONSEILLEZ_MOI = "Conseillez-moi";

  function envieChip(group, value, active) {
    var isConseil = value === CONSEILLEZ_MOI;
    return "<button type=\"button\" class=\"chip-choice" + (!group.mono || isConseil ? " is-text" : "") +
      (isConseil ? " is-conseillez" : "") + (active ? " is-active" : "") + "\" data-group=\"" + group.key + "\" data-value=\"" + esc(value) + "\">" + esc(value) + "</button>";
  }
  function envieGroupHtml(group) {
    var opts = group.options.slice();
    if (!group.noConseil) opts.push(CONSEILLEZ_MOI);
    return "<div class=\"envies-group\"><p class=\"envies-group__label\">" + group.label + "</p><div class=\"chip-choices\" data-group=\"" + group.key + "\">" +
      opts.map(function (o) { return envieChip(group, o, flow.envies[group.key] === o); }).join("") + "</div></div>";
  }
  function envieColorHtml() {
    return "<div class=\"envies-group\"><p class=\"envies-group__label\">Couleur</p><div class=\"chip-choices\" data-group=\"couleur\">" +
      ENVIES_COLORS.map(function (c) {
        var active = flow.envies.couleur === c.id;
        return "<button type=\"button\" class=\"chip-choice chip-choice--color" + (active ? " is-active" : "") + "\" data-group=\"couleur\" data-value=\"" + c.id + "\">" +
          "<span class=\"chip-choice__swatch\" style=\"background:" + c.hex + "\"></span>" + c.id + "</button>";
      }).join("") + "</div></div>";
  }

  PROJET_STEPS[2] = {
    render: function (pane) {
      var svc = currentService();
      pane.innerHTML =
        "<span class=\"chip chip--projet\">✦ Fabrication sur mesure</span>" +
        "<h1 style=\"margin-top:14px;\">Vos envies</h1>" +
        "<p class=\"step-intro\">Aucune obligation de tout remplir" + NB + ": «" + NB + "conseillez-moi" + NB + "» est une réponse parfaite.</p>" +
        ENVIES_GROUPS.slice(0, 2).map(envieGroupHtml).join("") +
        ENVIES_GROUPS.slice(2, 3).map(envieGroupHtml).join("") +
        envieColorHtml() +
        ENVIES_GROUPS.slice(3).map(envieGroupHtml).join("") +
        // Inspiration/cheveux photos, folded into Envies — see the note
        // above PROJET_STEP_TITLES for why (no separately-numbered step
        // fits the artboard's own progress-bar math).
        "<div class=\"photo-section\" style=\"margin-top:18px;\"><p class=\"photo-section__label\">Vos photos" + (svc.photos === "obligatoires" ? " <span class=\"required\">*</span>" : "") + "</p>" +
          "<div class=\"photo-zone\" data-zone=\"cheveux\">" + photoZoneHtml("cheveux") + "</div>" +
          "<p class=\"photo-count\" data-zone=\"cheveux\">" + countLabel("cheveux") + "</p></div>" +
        (zonePhotos("cheveux").length === 0
          ? "<div class=\"collapse is-open\" id=\"photo-error\"><div class=\"collapse__inner\"><div class=\"step-error-banner\"><p>✕ État requis" + NB + ": «" + NB + "Ajoutez au moins une photo" + NB + ": j’en ai besoin pour préparer. »</p></div></div></div>"
          : "<div class=\"collapse\" id=\"photo-error\" inert><div class=\"collapse__inner\"><div class=\"step-error-banner\"><p></p></div></div></div>");

      pane.addEventListener("click", function (e) {
        var chip = e.target.closest(".chip-choice");
        if (!chip) return;
        var group = chip.getAttribute("data-group"), value = chip.getAttribute("data-value");
        flow.envies[group] = flow.envies[group] === value ? null : value;
        chip.closest(".chip-choices").querySelectorAll(".chip-choice").forEach(function (c) {
          c.classList.toggle("is-active", c.getAttribute("data-value") === flow.envies[group]);
        });
      });
      pane.addEventListener("change", function (e) {
        if (e.target.matches("input[type=file]")) handlePhotoFiles(pane, e.target.getAttribute("data-zone"), e.target.files);
      });
      pane.addEventListener("click", function (e) {
        var rm = e.target.closest("[data-remove-zone]");
        if (!rm) return;
        var zone = rm.getAttribute("data-remove-zone"), i = +rm.getAttribute("data-i");
        var items = zonePhotos(zone);
        flow.photos.splice(flow.photos.indexOf(items[i]), 1);
        refreshPhotoZone(pane, zone);
      });
    },
    canContinue: function () {
      var svc = currentService();
      return svc.photos !== "obligatoires" || zonePhotos("cheveux").length > 0;
    }
  };

  PROJET_STEPS[3] = {
    render: function (pane) {
      var connues = flow.mesuresConnues;
      var fields = [
        ["tourDeTete", "Tour de tête"], ["frontNuque", "Front → nuque"], ["oreilleOreilleFront", "Oreille → oreille (front)"],
        ["oreilleOreilleSommet", "Oreille → oreille (sommet)"], ["tempeTempeArriere", "Tempe → tempe (arrière)"], ["largeurNuque", "Largeur de nuque"]
      ];
      pane.innerHTML =
        "<h1>Vos mesures</h1>" +
        "<p class=\"step-intro\">Une perruque sur mesure tient grâce à six mesures. Deux façons de faire" + NB + ":</p>" +
        "<div class=\"mesures-option\" data-opt=\"connues\">" +
          "<label class=\"mesures-option__row\"><input type=\"radio\" class=\"mesures-option__input\" name=\"mesures-opt\" value=\"connues\"" + (connues === true ? " checked" : "") + ">" +
          "<span class=\"choice__dot\" aria-hidden=\"true\"></span><span><p class=\"mesures-option__title\">Je les connais</p><p class=\"mesures-option__desc\">Vous les saisissez maintenant, avec mon petit guide.</p></span></label>" +
          "<div class=\"collapse" + (connues === true ? " is-open" : "") + "\"" + (connues === true ? "" : " inert") + "><div class=\"collapse__inner\"><div class=\"mesures-fields\">" +
            fields.map(function (f) {
              return "<div class=\"mesures-field\"><span class=\"mesures-field__label\">" + f[1] + "</span>" +
                "<input class=\"mesures-field__input\" data-mesure=\"" + f[0] + "\" inputmode=\"decimal\" placeholder=\"cm\" value=\"" + esc(flow.mesures[f[0]]) + "\"></div>";
            }).join("") +
            "<div class=\"mesures-guide\"><div class=\"mesures-guide__thumb\">SCHÉMA<br>MESURE</div>" +
            "<p>Voir le guide illustré — un mètre ruban souple et deux minutes suffisent. <a href=\"#\" id=\"btn-guide\">Ouvrir le guide</a></p></div>" +
          "</div></div></div>" +
        "</div>" +
        "<div class=\"mesures-option\" data-opt=\"visite\">" +
          "<label class=\"mesures-option__row\"><input type=\"radio\" class=\"mesures-option__input\" name=\"mesures-opt\" value=\"visite\"" + (connues === false ? " checked" : "") + ">" +
          "<span class=\"choice__dot\" aria-hidden=\"true\"></span><span><p class=\"mesures-option__title\">Je préfère qu’Eni’ol les prenne</p>" +
          "<p class=\"mesures-option__desc\">J’ajoute une visite de mesures (20 min, offerte) chez vous — il me faudra donc votre adresse.</p></span></label>" +
          "<div class=\"collapse" + (connues === false ? " is-open" : "") + "\"" + (connues === false ? "" : " inert") + "><div class=\"collapse__inner\"><div class=\"addr-body\" style=\"margin-top:14px; padding-top:14px; border-top:1px solid var(--sand);\">" + addrHtml() + "</div></div></div>" +
        "</div>";

      var addrBody = pane.querySelector(".addr-body");
      wireAddressBody(addrBody);

      function setConnues(val) {
        flow.mesuresConnues = val;
        pane.querySelectorAll(".mesures-option").forEach(function (opt) {
          var mine = (opt.getAttribute("data-opt") === "connues") === val;
          M.setOpen(opt.querySelector(".collapse"), mine);
        });
        if (val === false) renderSuggestions(addrBody);
        updateContinueButton();
      }
      pane.addEventListener("change", function (e) {
        if (e.target.name === "mesures-opt") setConnues(e.target.value === "connues");
        else if (e.target.matches("[data-mesure]")) flow.mesures[e.target.getAttribute("data-mesure")] = e.target.value;
      });
      pane.addEventListener("click", function (e) {
        if (e.target.id === "btn-guide") { e.preventDefault(); window.alert("Guide illustré — à venir."); }
      });
    },
    canContinue: function () {
      if (flow.mesuresConnues == null) return false;
      if (flow.mesuresConnues === false) return flow.addressStatus === "confirmed";
      return true;
    }
  };

  var POUR_QUAND_CHOICES = [
    { id: "des_que_possible", label: "Dès que possible" },
    { id: "dans_le_mois", label: "Dans le mois" },
    { id: "date_precise", label: "Pour une date précise" }
  ];
  var POUR_QUAND_LABELS = { des_que_possible: "Dès que possible", dans_le_mois: "Dans le mois", date_precise: "Date précise" };

  PROJET_STEPS[4] = {
    render: function (pane) {
      pane.innerHTML =
        "<h1>Pour quand" + NB + "?</h1>" +
        "<p class=\"step-intro\">Comptez environ 3 semaines de fabrication une fois le devis accepté" + NB + "; dites-moi si une date compte particulièrement.</p>" +
        "<fieldset class=\"pourquand-choices\"><legend class=\"sr-only\">Pour quand</legend>" +
          POUR_QUAND_CHOICES.map(function (o) {
            return "<label class=\"choice\" style=\"border:1px solid var(--rule); border-radius:12px; padding:14px; min-height:0;\">" +
              "<input type=\"radio\" class=\"choice__input\" name=\"pour-quand\" value=\"" + o.id + "\"" + (flow.pourQuand === o.id ? " checked" : "") + ">" +
              "<span class=\"choice__dot\" aria-hidden=\"true\"></span>" + o.label + "</label>";
          }).join("") +
        "</fieldset>" +
        "<div class=\"collapse" + (flow.pourQuand === "date_precise" ? " is-open" : "") + "\" id=\"pourquand-date-wrap\"" + (flow.pourQuand === "date_precise" ? "" : " inert") + ">" +
          "<div class=\"collapse__inner\"><label class=\"field-label\" for=\"pourquand-date\">Date souhaitée</label>" +
          "<input type=\"date\" class=\"field\" id=\"pourquand-date\" value=\"" + esc(flow.pourQuandDate) + "\" style=\"margin-bottom:14px;\"></div>" +
        "</div>";
      pane.addEventListener("change", function (e) {
        if (e.target.name === "pour-quand") {
          flow.pourQuand = e.target.value;
          M.setOpen(pane.querySelector("#pourquand-date-wrap"), flow.pourQuand === "date_precise");
          updateContinueButton();
        } else if (e.target.id === "pourquand-date") flow.pourQuandDate = e.target.value;
      });
    },
    canContinue: function () { return !!flow.pourQuand && (flow.pourQuand !== "date_precise" || !!flow.pourQuandDate); }
  };

  PROJET_STEPS[5] = { render: coordonneesRender, canContinue: coordonneesCanContinue };

  PROJET_STEPS[6] = {
    render: function (pane) {
      var svc = currentService();
      var envieBits = ENVIES_GROUPS.concat([{ key: "couleur", label: "Couleur" }]).map(function (g) { return flow.envies[g.key]; }).filter(function (v) { return v && v !== CONSEILLEZ_MOI; });
      pane.innerHTML =
        "<h1>On récapitule</h1>" +
        "<div class=\"recap-card\">" +
          recapRow("Prestation", esc(svc.nom), "Fabrication sur mesure", 1) +
          recapRow("Envies", envieBits.length ? esc(envieBits.join(" · ")) : "Vous me conseillez", "", 2) +
          recapRow("Mesures", flow.mesuresConnues ? "Transmises" : "Visite de mesures" + (flow.adresse ? " — " + esc(flow.adresse.zone) : ""), "", 3) +
          recapRow("Pour quand", POUR_QUAND_LABELS[flow.pourQuand] + (flow.pourQuandDate ? " — " + D.formatDateShort(D.parseLocal(flow.pourQuandDate)) : ""), "", 4) +
          recapRow("Vous", esc(flow.contact.prenom + " " + flow.contact.nom), esc(flow.contact.telephone), 5) +
        "</div>" +
        "<div class=\"price-card\"><p class=\"price-card__label\">LE DEVIS</p>" +
          "<div class=\"price-card__row\"><span>" + esc(svc.nom) + "</span><span class=\"mono\">dès " + D.formatPrice(svc.prixEuros) + "</span></div>" +
          "<div class=\"price-card__row is-divider\"><span>Vous recevez un devis précis</span><span class=\"mono\">sous " + svc.devisSousHeures + " h</span></div>" +
          "<div class=\"price-card__row\"><span>Arrhes à la commande</span><span class=\"mono\">30 % du devis</span></div>" +
          "<p class=\"price-card__note\">Les arrhes couvrent l’achat des matières" + NB + "; une fois commandées, elles ne sont plus remboursables.</p>" +
        "</div>" +
        "<label class=\"check-row recap-accept\"><input type=\"checkbox\" id=\"c-accept\"" + (flow.acceptConditions ? " checked" : "") + ">" +
          "<span class=\"check\" aria-hidden=\"true\">✓</span><span>J’accepte les conditions" + NB + ": arrhes de 30" + NB + "% non remboursables une fois les matières commandées. <a href=\"conditions.html\">Lire les conditions</a></span></label>";
      pane.addEventListener("click", function (e) {
        var edit = e.target.closest("[data-edit-step]");
        if (edit) { flow.step = +edit.getAttribute("data-edit-step"); renderStep("back"); }
      });
      pane.addEventListener("change", function (e) {
        if (e.target.id === "c-accept") { flow.acceptConditions = e.target.checked; updateContinueButton(); }
      });
    },
    canContinue: function () { return flow.acceptConditions; }
  };

  // =====================================================================
  // Submit + Demande envoyée (P09) — a full takeover, no shared chrome.
  // =====================================================================
  function submitBooking() {
    var svc = currentService(), projet = inProjet();
    var payload = {
      serviceId: svc.id, varianteId: flow.varianteId,
      lieu: projet ? "sans_deplacement" : (needsAddress() ? "domicile_cliente" : (flow.lieu || svc.lieu)),
      adresse: (projet ? flow.mesuresConnues === false : needsAddress()) && flow.adresse ? extend(flow.adresse, {
        complement: flow.complement, codeAcces: flow.codeAcces, indications: flow.indications
      }) : null,
      debut: projet ? null : (flow.slot.date + "T" + flow.slot.time),
      fin: projet ? null : (flow.slot.date + "T" + flow.slot.fin),
      photos: flow.photos.map(function (p) { return { zone: p.zone, nom: p.nom }; }),
      liens: flow.liens.slice(),
      notesCliente: flow.notesCliente || null,
      projet: projet ? { envies: flow.envies, mesuresConnues: flow.mesuresConnues, pourQuand: flow.pourQuand, pourLe: flow.pourQuandDate || null } : null,
      contact: extend({}, flow.contact)
    };
    flow.submitted = S.createRequest(payload);
    renderConfirmation();
  }

  function heureLimite() {
    var repondreAvant = D.parseLocal(flow.submitted.repondreAvant);
    var today = S.now();
    var jourLabel = (repondreAvant.getDate() === today.getDate() ? "aujourd’hui" :
      (repondreAvant - today < 86400000 ? "demain" : D.formatDateShort(repondreAvant)));
    return jourLabel + " " + D.formatTime(repondreAvant);
  }
  function renderConfirmation() {
    flow.step = 7;
    document.getElementById("confirmation").hidden = false;
    // Step 6 (the recap, where "Envoyer ma demande" sits) is tall enough
    // that the page is usually scrolled well down when this fires — left
    // alone, the confirmation screen would open already scrolled past its
    // own heart/title, looking like the close button was covering them.
    window.scrollTo({ top: 0, behavior: "instant" });
    var b = flow.submitted;
    var rows = [
      { label: "Demande reçue", state: "done", time: D.formatTime(S.now()) },
      { label: "Ma validation", state: "current", time: "sous " + settings.delaiReponseHeures + " h" },
      { label: "Arrhes (" + (flow.__arrhes != null ? D.formatPrice(flow.__arrhes) : "à venir") + ")", state: "todo" },
      { label: "Confirmée", state: "todo" }
    ];
    var el = document.getElementById("confirmation");
    el.innerHTML =
      // A bare floating icon — not a header bar. It was previously a
      // full-width row with its own background, which reserved real
      // layout height above the heart/title (pushing them down, and
      // adding scroll where this short a screen shouldn't need any).
      // position:fixed takes it out of the flow entirely: nothing below
      // it shifts, and unlike position:sticky it can never fail to stay
      // put regardless of which element ends up scrolling.
      "<button type=\"button\" class=\"confirmation__close\" id=\"btn-confirmation-close\" aria-label=\"Fermer et revenir à l’accueil\">✕</button>" +
      "<div class=\"confirmation__body\">" +
        "<p class=\"confirmation__heart heart-moment\" aria-hidden=\"true\">♡</p>" +
        "<h1 class=\"confirmation__title heart-moment\">Demande envoyée ♡</h1>" +
        "<p class=\"confirmation__lede heart-moment\">Je vous réponds avant <strong>" + heureLimite() + "</strong>.</p>" +
        (b.debut ? "<p class=\"confirmation__sub heart-moment\">Votre créneau de " + D.formatDateLong(D.parseLocal(b.debut.slice(0, 10))) + " à " + b.debut.slice(11, 16) + " vous est gardé jusque-là.</p>" : "<p class=\"confirmation__sub heart-moment\">Je reviens vers vous avec un devis dès que possible.</p>") +
        "<div class=\"confirmation__tracker\"><div class=\"confirmation__tracker-list\">" +
          rows.map(function (r, i) {
            var icon = r.state === "done" ? "✓" : (r.state === "current" ? "◔" : "◌");
            return "<div class=\"confirmation__tracker-row is-" + r.state + "\" data-i=\"" + i + "\">" +
              "<span class=\"confirmation__tracker-dot\">" + icon + "</span>" + (r.state === "current" ? "<strong>" + r.label + "</strong>" : "<span>" + r.label + "</span>") +
              (r.time ? "<span class=\"confirmation__tracker-time\">" + r.time + "</span>" : "") + "</div>";
          }).join("") +
        "</div></div>" +
        "<div class=\"confirmation__actions\">" +
          "<a class=\"btn btn--on-deep\" href=\"ma-reservation.html?ref=" + b.ref + "\">Voir ma demande</a>" +
          "<a class=\"btn btn--on-deep-secondary\" href=\"#\" id=\"btn-add-calendar\">Ajouter à mon calendrier (provisoire)</a>" +
          "<a class=\"btn btn--text\" style=\"color:var(--heart-on-deep);\" href=\"" + IG_DM + "\">Une question" + NB + "? Écrivez-moi sur Instagram</a>" +
        "</div>" +
        "<p class=\"confirmation__email\">📧 Un e-mail de confirmation vient de partir à " + esc(flow.contact.email) + ".</p>" +
        "<p class=\"confirmation__signoff\">Merci de votre confiance — à bientôt, j’espère ♡<br>Eni’ol</p>" +
      "</div>" +
      "<div class=\"confirmation__footer\"><span>RÉF. DEMANDE</span><span>" + b.ref + "</span></div>";

    el.querySelector("#btn-add-calendar").addEventListener("click", function (e) { e.preventDefault(); window.alert("Ajout au calendrier — provisoire, à venir."); });
    el.querySelector("#btn-confirmation-close").addEventListener("click", function () { M.back("index.html"); });
    playHeartMoment(el);
  }

  /* PDC §5's signature entrance: ♡ scale .86→1, title +80 ms, then each
     tracker row +120 ms — all ≤ 900 ms, once. The client also asked for
     the heart to keep a gentle heartbeat afterwards (not in PDC — a
     direct request, so it wins): once the entrance settles, a slow
     "lub-dub, rest" loop takes over — see .confirmation__heart--pulse.
     Reduced motion skips both and jumps straight to the end state
     (heart-moment's own rule in booking-flow.css). */
  function playHeartMoment(el) {
    if (M.reduced()) return;
    var ease = "cubic-bezier(.2,.7,.3,1)";
    var heart = null, heartEntrance = null;
    el.querySelectorAll(".heart-moment").forEach(function (n, i) {
      var isHeart = n.classList.contains("confirmation__heart");
      // "both": holds the opacity:0 start through the delay AND keeps the
      // end state once done — "backwards" alone only covers the delay,
      // so every row snapped back to invisible the instant its animation
      // finished (that's why the tracker card rendered as an empty box).
      var a = n.animate(
        isHeart ? [{ transform: "scale(.86)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }] : [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 320, delay: isHeart ? 0 : 80, easing: ease, fill: "both" }
      );
      if (isHeart) { heart = n; heartEntrance = a; }
    });
    // A plain timer matching the entrance's own duration, rather than
    // chaining onto that animation's `.finished` promise — the promise
    // approach silently never added the pulse class at all in some runs
    // (a rejected/cancelled Animation, e.g. from the page's own
    // View-Transition machinery touching the DOM around the same moment,
    // skips `.finished` resolving without necessarily hitting the reject
    // handler either). A timeout can't be skipped that way.
    //
    // Cancelling the entrance animation here (not just letting it sit
    // finished) matters: fill:"both" keeps it permanently "in effect", so
    // even once finished it goes on asserting transform:scale(1) as an
    // active effect on the stack — script-created animations composite
    // above the CSS @keyframes animation the pulse class starts, so
    // without this cancel the entrance's leftover effect silently pins
    // the heart at scale(1) forever and the pulse keyframes never
    // actually show, despite genuinely running underneath (confirmed via
    // getAnimations() during testing — it reported "running" the whole
    // time; the bug was which of two simultaneously-active effects wins,
    // not whether the pulse was there at all). The element's own CSS has
    // no opacity/transform of its own, so cancelling loses nothing.
    if (heart) window.setTimeout(function () {
      if (heartEntrance) heartEntrance.cancel();
      heart.classList.add("confirmation__heart--pulse");
    }, 320);
    el.querySelectorAll(".confirmation__tracker-row").forEach(function (row, i) {
      row.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 260, delay: 160 + i * 120, easing: ease, fill: "both" });
    });
  }

  // ---- Wire chrome + init ----
  buildStepList();
  buildSummary();
  elBack.addEventListener("click", goBack);
  document.getElementById("btn-close").addEventListener("click", function () { M.back("index.html"); });
  elCont.addEventListener("click", goNext);
  elContD.addEventListener("click", goNext);

  renderStep();
})();
