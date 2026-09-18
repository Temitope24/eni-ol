/*
  Booking status machine — batch B9.
  Source: DATA-MODEL.md §5 (statuses table + transition diagram), read in
  full this session. Pure functions that mutate a state object; store.js
  wraps them with persistence and change notifications.

  --- Beyond the §5 diagram, from the maquettes (maquette wins) ---
  - en_attente -> annulee_cliente: P10 ("En attente · Annuler ma demande")
    and C01 both render this button; the diagram doesn't list it.
  - "J'ai envoyé les arrhes" (P10 A) is a client declaration, not a status
    change — PDC §8: the arrhes are never "payé" in the demo. Only the pro
    logging receipt (R06 history "Arrhes reçues · confirmée") confirms.
  - A proposed slot waits 48 h for the client: P10 C shows "Répondre avant
    dim. 13 sept. 18:40", i.e. 48 h after the pinned demo "now".
  - Arrhes are due when free cancellation ends (start − 48 h): P10 B's
    "Annulation gratuite jusqu'au jeudi 17 sept. 13:00" for a 19 sept 13:00
    booking. (Inès's seed keeps P10 A's literal "20:00"; P10 A also calls
    17 sept a "mercredi" — it's a Thursday, formatDateLong will say jeudi.)

  --- Implementation choice ---
  - An unanswered proposal expires like an unanswered request (the diagram
    is silent on it).
*/

window.ENIOL_STATUS = (function () {
  var D = window.ENIOL_DATES;

  var LABELS = {
    en_attente:                { cliente: "Demande envoyée",             pro: "À valider" },
    nouveau_creneau_propose:   { cliente: "Nouveau créneau proposé",     pro: "Proposition envoyée" },
    acceptee_arrhes_attendues: { cliente: "Acceptée — arrhes à envoyer", pro: "Arrhes en attente" },
    confirmee:                 { cliente: "Confirmée ♡",                 pro: "Confirmée" },
    terminee:                  { cliente: "Terminée",                    pro: "Terminée" },
    refusee:                   { cliente: "Non disponible",              pro: "Refusée" },
    expiree:                   { cliente: "Demande expirée",             pro: "Expirée" },
    annulee_cliente:           { cliente: "Annulée",                     pro: "Annulée par la cliente" },
    annulee_pro:               { cliente: "Annulée par Eni’ol",          pro: "Annulée par moi" },
    absente:                   { cliente: null,                          pro: "Absente" }
  };

  var PROPOSITION_REPONSE_HEURES = 48;

  var ACTIONS = {
    accepter:            { from: ["en_attente"], par: "pro" },
    proposer:            { from: ["en_attente"], par: "pro" },
    refuser:             { from: ["en_attente"], par: "pro" },
    expirer:             { from: ["en_attente", "nouveau_creneau_propose"], par: "systeme" },
    accepterProposition: { from: ["nouveau_creneau_propose"], par: "cliente" },
    refuserProposition:  { from: ["nouveau_creneau_propose"], par: "cliente" },
    declarerArrhes:      { from: ["acceptee_arrhes_attendues"], par: "cliente" },
    arrhesRecues:        { from: ["acceptee_arrhes_attendues"], par: "pro" },
    terminer:            { from: ["confirmee"], par: "pro" },
    marquerAbsente:      { from: ["confirmee"], par: "pro" },
    annulerCliente:      { from: ["en_attente", "acceptee_arrhes_attendues", "confirmee"], par: "cliente" },
    annulerPro:          { from: ["acceptee_arrhes_attendues", "confirmee"], par: "pro" }
  };

  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  function uniqueId(list, prefix) {
    var n = list.length + 1;
    while (findById(list, prefix + "-" + n)) n++;
    return prefix + "-" + n;
  }

  function setStatus(b, statut, par, nowIso) {
    b.statut = statut;
    b.historique = b.historique || [];
    b.historique.push({ statut: statut, le: nowIso, par: par });
  }

  /** Shared by "accepter" (pro) and "accepterProposition" (client) — §5: "(as accepter)". */
  function goToAccepted(state, b, par, nowIso) {
    b.repondreAvant = null;
    if (b.arrhesAttenduesEuros > 0) {
      b.arrhesDateLimite = b.debut ? D.addHours(b.debut, -state.settings.annulation.gratuiteJusquaHeures) : null;
      setStatus(b, "acceptee_arrhes_attendues", par, nowIso);
    } else {
      setStatus(b, "confirmee", par, nowIso);
    }
  }

  /**
   * Run one action on one booking. Returns { ok: true, booking } or
   * { ok: false, error } — a refused action changes nothing.
   */
  function apply(state, bookingId, action, params, nowIso) {
    var b = findById(state.bookings, bookingId);
    if (!b) return { ok: false, error: "Rendez-vous introuvable" };
    var def = ACTIONS[action];
    if (!def) return { ok: false, error: "Action inconnue : " + action };
    if (def.from.indexOf(b.statut) < 0) return { ok: false, error: "« " + action + " » impossible depuis « " + b.statut + " »" };
    params = params || {};

    switch (action) {
      case "accepter":
        if (params.prixEuros != null) b.prixEuros = params.prixEuros;
        if (params.fraisDeplacementEuros != null) b.fraisDeplacementEuros = params.fraisDeplacementEuros;
        if (params.arrhesEuros !== undefined) b.arrhesAttenduesEuros = params.arrhesEuros;
        if (params.message) b.messagePro = params.message;
        goToAccepted(state, b, "pro", nowIso);
        break;

      case "proposer":
        if (!params.debut || !params.fin) return { ok: false, error: "Nouveau créneau manquant" };
        b.creneauInitial = { debut: b.debut, fin: b.fin };
        b.debut = params.debut;
        b.fin = params.fin;
        b.repondreAvant = D.addHours(nowIso, PROPOSITION_REPONSE_HEURES);
        if (params.message) b.messagePro = params.message;
        setStatus(b, "nouveau_creneau_propose", "pro", nowIso);
        break;

      case "refuser":
        if (params.message) b.messagePro = params.message;
        setStatus(b, "refusee", "pro", nowIso);
        break;

      case "expirer":
        setStatus(b, "expiree", "systeme", nowIso);
        break;

      case "accepterProposition":
        goToAccepted(state, b, "cliente", nowIso);
        break;

      case "refuserProposition":
        setStatus(b, "annulee_cliente", "cliente", nowIso);
        break;

      case "declarerArrhes":
        b.arrhesDeclareesLe = nowIso;
        break;

      case "arrhesRecues":
        state.payments.push({
          id: uniqueId(state.payments, "pay"), rdvId: b.id, clienteId: b.clienteId, type: "arrhes",
          montantEuros: params.montantEuros != null ? params.montantEuros : b.arrhesAttenduesEuros,
          moyen: params.moyen || "Autre", encaisseLe: params.le || nowIso, note: params.note || null
        });
        setStatus(b, "confirmee", "pro", nowIso);
        break;

      case "terminer":
        setStatus(b, "terminee", "pro", nowIso);
        break;

      case "marquerAbsente":
        setStatus(b, "absente", "pro", nowIso);
        break;

      case "annulerCliente":
      case "annulerPro":
        b.annulation = { le: nowIso, par: def.par, motif: params.motif || null };
        setStatus(b, action === "annulerCliente" ? "annulee_cliente" : "annulee_pro", def.par, nowIso);
        break;
    }
    return { ok: true, booking: b };
  }

  /** Requests/proposals whose answer window has passed become "expiree". Returns how many changed. */
  function expireOverdue(state, nowIso) {
    var n = 0;
    state.bookings.forEach(function (b) {
      if (ACTIONS.expirer.from.indexOf(b.statut) >= 0 && b.repondreAvant && b.repondreAvant <= nowIso) {
        apply(state, b.id, "expirer", null, nowIso);
        n++;
      }
    });
    return n;
  }

  /** Actions available on a booking, optionally for one side ("pro" | "cliente"). */
  function allowedActions(b, par) {
    var out = [];
    for (var k in ACTIONS) {
      if (ACTIONS[k].from.indexOf(b.statut) >= 0 && ACTIONS[k].par !== "systeme" && (!par || ACTIONS[k].par === par)) out.push(k);
    }
    return out;
  }

  function label(statut, cote) { return LABELS[statut] ? LABELS[statut][cote || "pro"] : statut; }

  /** End of free cancellation (start − 48 h), or null for bookings without a date. */
  function finAnnulationGratuite(state, b) {
    return b.debut ? D.addHours(b.debut, -state.settings.annulation.gratuiteJusquaHeures) : null;
  }

  return {
    LABELS: LABELS,
    ACTIONS: ACTIONS,
    apply: apply,
    expireOverdue: expireOverdue,
    allowedActions: allowedActions,
    label: label,
    finAnnulationGratuite: finAnnulationGratuite
  };
})();
