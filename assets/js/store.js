/*
  Demo state store — batch B9.
  Source: BUILD-PLAN.md §3 (the demo trick: shared state through
  localStorage so a request made on reserver.html shows up in
  pro/demandes.html in the same browser), PDC §8 (Mode démo), DATA-MODEL.md
  §5/§6.

  - Seeds from data.js on first load and on "Réinitialiser la démo".
  - Versioned key "eniol.demo.v1" — bump VERSION when the seed shape changes
    so old demo state doesn't collide with it.
  - Every storage call is in try/catch; if localStorage is blocked (private
    mode, some in-app browsers) the demo keeps working in memory for the
    page's lifetime.
  - The clock is pinned to vendredi 11 septembre 2026, 18:40 so the seed
    scenario always shows its intended states (Maëlys "expire dans 5 h",
    etc.). Every "now" in the demo comes from here.
  - Photos from the booking flow are stored as names only, never image data
    — a few phone photos as data URLs would exceed localStorage's ~5 MB.

  Load order: data.js, dates.js, travel.js, availability.js, status.js,
  store.js, then demo-bar.js.
*/

window.ENIOL_STORE = (function () {
  var D = window.ENIOL_DATES;
  var KEY = "eniol.demo.v1";
  var VERSION = 4; // 2 (B14): lace-frontale.variantes, settings.margeTrajetMin,
                    // per-service tampon fields. 3: services gained
                    // accrocheDesktop / nomCourt (P13/P03 wording).
                    // 4: Aïcha's quartier + short complement, her 2 past
                    // RDV (R07), client order (R13).
  var DEMO_NOW = "2026-09-11T18:40";

  var state = null;
  var persistent = true;
  var listeners = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  function seed() {
    var s = clone(window.ENIOL_SEED);
    s.version = VERSION;
    s.demo = { lastRef: null };
    return s;
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      persistent = false;
      return null;
    }
  }

  function write() {
    if (!persistent) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { persistent = false; }
  }

  function notify() { listeners.slice().forEach(function (fn) { fn(state); }); }

  function nowIso() { return DEMO_NOW; }
  function now() { return D.parseLocal(DEMO_NOW); }

  function load() {
    if (state) return state;
    var s = read();
    state = s && s.version === VERSION ? s : seed();
    if (window.ENIOL_STATUS) window.ENIOL_STATUS.expireOverdue(state, DEMO_NOW);
    write();
    return state;
  }

  function reset() {
    state = seed();
    write();
    notify();
    return state;
  }

  /** Mutate the state, then persist and notify. Returns whatever fn returns. */
  function update(fn) {
    load();
    var result = fn(state);
    write();
    notify();
    return result;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  // Another tab of the same demo changed the state (e.g. client tab + pro tab side by side).
  if (window.addEventListener) {
    window.addEventListener("storage", function (e) {
      if (e.key !== KEY && e.key !== null) return;
      state = null;
      load();
      notify();
    });
  }

  // ---- selectors ----
  function service(id) { return findById(load().services, id); }
  function client(id) { return findById(load().clients, id); }
  function booking(id) { return findById(load().bookings, id); }
  function bookingByRef(ref) {
    var list = load().bookings;
    for (var i = 0; i < list.length; i++) if (list[i].ref === ref) return list[i];
    return null;
  }
  function address(id) {
    var cs = load().clients;
    for (var i = 0; i < cs.length; i++) {
      var a = findById(cs[i].adresses || [], id);
      if (a) return a;
    }
    return null;
  }
  function bookingsOfClient(clientId) {
    return load().bookings.filter(function (b) { return b.clienteId === clientId; });
  }
  function paymentsOf(bookingId) {
    return load().payments.filter(function (p) { return p.rdvId === bookingId; });
  }
  /** DATA-MODEL §6: resteAEncaisser = prix + frais − Σ paiements */
  function resteAEncaisser(b) {
    var paid = paymentsOf(b.id).reduce(function (sum, p) { return sum + p.montantEuros; }, 0);
    return (b.prixEuros || 0) + (b.fraisDeplacementEuros || 0) - paid;
  }
  /** "À valider", most urgent first (R02 / R12 side panel). */
  function requestsToValidate() {
    return load().bookings
      .filter(function (b) { return b.statut === "en_attente"; })
      .sort(function (a, b) { return (a.repondreAvant || "9") < (b.repondreAvant || "9") ? -1 : 1; });
  }

  // ---- status transitions ----
  function act(bookingId, action, params) {
    return update(function (s) { return window.ENIOL_STATUS.apply(s, bookingId, action, params, DEMO_NOW); });
  }

  // ---- mutations used by the booking flow and the pro pages ----
  function stripAccents(s) { return s.normalize ? s.normalize("NFD").replace(/\p{Diacritic}/gu, "") : s; }
  function digits(s) { return (s || "").replace(/\D/g, ""); }

  /** "ENI-1909-INK": DDMM of the appointment + first two letters of the first name + initial — the one literal ref in the design (P09/P10). */
  function makeRef(s, whenIso, prenom, nom) {
    var dd = whenIso.slice(8, 10), mm = whenIso.slice(5, 7);
    var tag = stripAccents((prenom || "XX").slice(0, 2) + (nom || "X").slice(0, 1)).toUpperCase();
    var base = "ENI-" + dd + mm + "-" + tag, ref = base, n = 2;
    while (s.bookings.some(function (b) { return b.ref === ref; })) ref = base + n++;
    return ref;
  }

  function uid(prefix) { return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /** Match an existing client by phone/email, or create one — shared by
      createRequest (client-side) and createManualBooking (pro-side). */
  function findOrCreateClient(s, c) {
    var cl = null;
    s.clients.forEach(function (x) {
      if (cl) return;
      if (c.telephone && digits(x.telephone).slice(-9) === digits(c.telephone).slice(-9) && digits(c.telephone).length >= 9) cl = x;
      else if (c.email && x.email && x.email.toLowerCase() === c.email.toLowerCase()) cl = x;
    });
    if (!cl) {
      cl = {
        id: uid("cl"), prenom: c.prenom || "", nom: c.nom || "", telephone: c.telephone || null,
        email: c.email || null, instagram: c.instagram || null, creeLe: DEMO_NOW, tags: ["nouvelle"],
        cheveux: null, consentements: { photosPortfolio: !!c.photosPortfolio, rappelsSms: !!c.rappelsSms },
        notes: [], adresses: [], mesures: null, perruques: [],
        stats: { rdv: 0, annulations: 0, absences: 0, totalEuros: 0 }
      };
      s.clients.push(cl);
    }
    return cl;
  }

  /**
   * Create a request from the booking flow (reserver.html step 6 / the
   * fabrication project flow). Returns the new booking.
   * payload: { serviceId, varianteId, lieu, adresse {ligne1, complement,
   *   codeAcces, indications, codePostal, ville, zone, lat, lon}, debut, fin,
   *   photos [{zone, nom}], liens [], notesCliente, projet,
   *   contact { prenom, nom, telephone, email, instagram, rappelsSms, photosPortfolio } }
   */
  function createRequest(p) {
    return update(function (s) {
      var svc = findById(s.services, p.serviceId);
      var cl = findOrCreateClient(s, p.contact || {});

      var adresseId = null;
      if (p.adresse) {
        var a = clone(p.adresse);
        a.id = uid("ad");
        a.libelle = a.libelle || "Chez elle";
        cl.adresses.push(a);
        adresseId = a.id;
      }

      var variante = p.varianteId && svc.variantes ? findById(svc.variantes, p.varianteId) : null;
      var prix = variante ? variante.prixEuros : (svc.typePrix === "devis" ? null : svc.prixEuros);
      var arrhes = svc.arrhes && svc.arrhes.type === "montant" ? svc.arrhes.valeur : null;
      var delai = svc.modeReservation === "projet" && svc.devisSousHeures ? svc.devisSousHeures : s.settings.delaiReponseHeures;
      var when = p.debut || (p.projet && p.projet.pourLe) || DEMO_NOW;

      var b = {
        id: uid("rdv"), ref: makeRef(s, when, cl.prenom, cl.nom),
        clienteId: cl.id, serviceId: svc.id, varianteId: p.varianteId || null,
        debut: p.debut || null, fin: p.fin || null,
        lieu: p.lieu || svc.lieu, adresseId: adresseId,
        statut: "en_attente",
        repondreAvant: D.addHours(DEMO_NOW, delai),
        historique: [{ statut: "en_attente", le: DEMO_NOW, par: "cliente" }],
        prixEuros: prix, fraisDeplacementEuros: 0, arrhesAttenduesEuros: arrhes,
        notesCliente: p.notesCliente || null, photos: p.photos || [], liens: p.liens || [],
        projet: p.projet || null, creeLe: DEMO_NOW, canal: "site"
      };
      s.bookings.push(b);
      s.demo.lastRef = b.ref;
      return b;
    });
  }

  /**
   * "Ajouter un RDV" (R11, pro/agenda.html + pro/index.html's FAB) — a
   * booking she takes down herself (DM, phone). Created straight through
   * the existing accepter/arrhesRecues transitions in status.js rather than
   * a bespoke statut, so it lands in exactly the same acceptee_arrhes_attendues
   * / confirmee state a client-submitted request would after she accepts it.
   * payload: { clientId | contact {prenom,nom,telephone,...}, serviceId,
   *   varianteId, lieu, adresseId | adresse {...}, debut, fin,
   *   fraisDeplacementEuros, arrhesEuros, arrhesDejaRecues, moyenArrhes,
   *   noteInterne }
   * Returns the new booking.
   */
  function createManualBooking(p) {
    return update(function (s) {
      var svc = findById(s.services, p.serviceId);
      var cl = p.clientId ? findById(s.clients, p.clientId) : findOrCreateClient(s, p.contact || {});

      var adresseId = p.adresseId || null;
      if (!adresseId && p.adresse) {
        var a = clone(p.adresse);
        a.id = uid("ad");
        a.libelle = a.libelle || "Chez elle";
        cl.adresses.push(a);
        adresseId = a.id;
      }

      var variante = p.varianteId && svc.variantes ? findById(svc.variantes, p.varianteId) : null;
      var prix = p.prixEuros != null ? p.prixEuros : (variante ? variante.prixEuros : (svc.typePrix === "devis" ? null : svc.prixEuros));

      var b = {
        id: uid("rdv"), ref: makeRef(s, p.debut || DEMO_NOW, cl.prenom, cl.nom),
        clienteId: cl.id, serviceId: svc.id, varianteId: p.varianteId || null,
        debut: p.debut || null, fin: p.fin || null,
        lieu: p.lieu || svc.lieu, adresseId: adresseId,
        statut: "en_attente", repondreAvant: null,
        historique: [{ statut: "en_attente", le: DEMO_NOW, par: "pro" }],
        prixEuros: prix, fraisDeplacementEuros: 0, arrhesAttenduesEuros: null,
        notesCliente: null, photos: [], liens: [], projet: null,
        noteInterne: p.noteInterne || null, creeLe: DEMO_NOW, canal: "manuel"
      };
      s.bookings.push(b);
      s.demo.lastRef = b.ref;

      window.ENIOL_STATUS.apply(s, b.id, "accepter", {
        fraisDeplacementEuros: p.fraisDeplacementEuros || 0,
        arrhesEuros: p.arrhesEuros != null ? p.arrhesEuros : null
      }, DEMO_NOW);

      if (p.arrhesDejaRecues && b.arrhesAttenduesEuros > 0) {
        window.ENIOL_STATUS.apply(s, b.id, "arrhesRecues", {
          montantEuros: b.arrhesAttenduesEuros, moyen: p.moyenArrhes || "Autre"
        }, DEMO_NOW);
      }
      return b;
    });
  }

  function addPayment(p) {
    return update(function (s) {
      var pay = clone(p);
      pay.id = uid("pay");
      pay.encaisseLe = pay.encaisseLe || DEMO_NOW;
      s.payments.push(pay);
      return pay;
    });
  }

  function addNote(clientId, texte) {
    return update(function (s) {
      var cl = findById(s.clients, clientId);
      if (!cl) return null;
      var n = { le: DEMO_NOW, texte: texte };
      cl.notes.unshift(n);
      return n;
    });
  }

  /** pro/disponibilites.html (B31) — replaces the whole array; the editor
      always works from the full current list, so a targeted patch would
      just be this same clone-then-reassign one level up. */
  function updateWeeklyRules(rules) { return update(function (s) { s.weeklyRules = rules; return s.weeklyRules; }); }
  function updateExceptions(exceptions) { return update(function (s) { s.exceptions = exceptions; return s.exceptions; }); }

  function updateService(id, patch) {
    return update(function (s) {
      var svc = findById(s.services, id);
      if (!svc) return null;
      for (var k in patch) svc[k] = patch[k];
      return svc;
    });
  }

  function updateSettings(patch) {
    return update(function (s) {
      for (var k in patch) s.settings[k] = patch[k];
      return s.settings;
    });
  }

  function setMonthOpen(mois, open) {
    return update(function (s) {
      var list = s.settings.moisOuverts.filter(function (m) { return m !== mois; });
      if (open) list.push(mois);
      s.settings.moisOuverts = list.sort();
      return s.settings.moisOuverts;
    });
  }

  return {
    KEY: KEY,
    now: now,
    nowIso: nowIso,
    get: load,
    reset: reset,
    update: update,
    subscribe: subscribe,
    isPersistent: function () { load(); return persistent; },

    service: service,
    client: client,
    booking: booking,
    bookingByRef: bookingByRef,
    address: address,
    bookingsOfClient: bookingsOfClient,
    paymentsOf: paymentsOf,
    resteAEncaisser: resteAEncaisser,
    requestsToValidate: requestsToValidate,

    act: act,
    createRequest: createRequest,
    createManualBooking: createManualBooking,
    addPayment: addPayment,
    addNote: addNote,
    updateService: updateService,
    updateWeeklyRules: updateWeeklyRules,
    updateExceptions: updateExceptions,
    updateSettings: updateSettings,
    setMonthOpen: setMonthOpen
  };
})();
