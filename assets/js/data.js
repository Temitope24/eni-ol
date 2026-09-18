/*
  Seed data — batch B4.
  Schema: DATA-MODEL.md §1–§6, §8 (seed scenario). Values transcribed from:
    - PUB P01 (homepage service menu) + P02 (prestations detail cards) for
      service copy/prices/durations.
    - PRO R02 (demandes), R04 (agenda jour), R06 (rdv + encaisser), R07
      (fiche cliente), R09 (disponibilités), R10 (encaissements), R13
      (clientes) for clients, bookings, addresses, hair/measurements, and
      payments.
  Demo "now" is pinned to vendredi 11 septembre 2026, 18:40 (per PDC §8 /
  BUILD-PLAN.md §3) — every relative countdown below ("expire dans 5 h",
  etc.) is computed against that instant, not the real current time.

  --- Discrepancies found between design files, deliberately not "fixed" ---
  Per CLAUDE.md: the maquette wins over prose/schema examples where they
  disagree, but maquette-vs-maquette conflicts are just flagged, not
  silently resolved:

  1. (Corrected in B8.) R09's "Marge de trajet: + 15 min" was first mapped
     to tamponTrajetParDefautMin, but that field is research/01 §4.2's
     fallback buffer for when no estimate exists (45 min, never rendered).
     R09's margin is the ≥ 15 min spare threshold between "OK" and "Trajet
     serré" (research/01 §5) — now its own field, margeTrajetMin.
  2. R09's Mercredi rule shows 14:00→19:00 and Samedi/Dimanche shows TWO
     ranges (09:00→13:00 and 14:00→19:00) — DATA-MODEL §3's example shows a
     single 13:30→19:00 / 10:00→19:00. Used R09's literal rendered ranges.
  3. R06's status history has Aïcha's arrhes requested 9 sept 07:40 and
     received 12 sept 18:02. R10's payment log shows the same 20 €/Lydia
     entry dated 02/09 — that's before it was even requested, so it can't
     be right. Used R06's internally-consistent dates for the payment
     record below; R10's "02/09" looks like a design-file slip.
  4. R10's own summary tiles ("Espèces 90 €, Carte 40 €, Lydia 20 €") don't
     sum to match the itemized transaction list directly below them in the
     same artboard (itemized: Espèces 70 €, Carte 60 €, Lydia 20 €). The
     itemized list is the more granular source, so PAYMENTS below matches
     it; whichever page renders totals (batch B32) should compute them from
     this array rather than trying to reproduce R10's tile numbers.
  5. P01's homepage service list order (Pose, Lace frontale, Closure,
     Fabrication, Relooking, Décoloration, Entretien) doesn't match
     DATA-MODEL §2's own example object, which shows "pose" at ordre: 4.
     `ordre` below follows P01's literal rendered sequence.

  --- Known placeholders (expected, not omissions — see CODING-NOTES.md) ---
  - Lat/lon for the lycée day-override and every client address are
    invented (plausible Paris coordinates), since no real ones exist yet.
  - All prices/durations are "prix provisoires" per every screen that shows
    them.
*/

window.ENIOL_SEED = (function () {

  var settings = {
    marque: "Eni’ol",
    instagram: "pose.de.perruques",
    telephone: "+33753711138",
    snapchat: "p_mvs3x",
    registre: "vous",

    pointDeDepart: { libelle: "Chez moi", arrondissement: "Paris 18ᵉ", lat: 48.8925, lon: 2.3444 },
    departsDuJour: {
      // "mercredi : Lycée — Paris 11ᵉ" (R09). Coordinates invented — flagged.
      "2026-09-16": { libelle: "Lycée", arrondissement: "Paris 11ᵉ", lat: 48.8589, lon: 2.3800 }
    },
    modeTransport: "transports",
    tamponTrajetParDefautMin: 45, // fallback when no estimate is possible (research/01 §4.2)
    margeTrajetMin: 15,           // R09 "Marge de trajet + 15 min" — OK vs serré threshold
    compterTrajetPremierRdv: true, // R09: "Compter le trajet du 1ᵉʳ RDV — Oui"
    pasCreneauxMin: 30,
    maxCreneauxAffichesParDemiJournee: 3,
    maxRdvParJour: 3, // R09: "RDV max par jour — 3"
    delaiReponseHeures: 24,
    moisOuverts: ["2026-09"], // "Septembre est ouvert" / "Octobre est encore fermé" (R01)

    annulation: { gratuiteJusquaHeures: 48, toleranceRetardMin: 20 },
    arrhes: { actif: true, moyens: ["Lydia", "Wero", "Virement"] },
    moyensEncaissement: ["Espèces", "Carte", "Lydia", "Wero", "Virement", "Autre"],
    banniere: { auto: true, texteManuel: null },

    // "Exemples — à valider avec Eni'ol" wording (Composants + P08 recap).
    // P10's confirmed-page checklist phrases these very slightly differently
    // ("mes cheveux" vs "vos cheveux") — both are marked as drafts, not a
    // hard contradiction like the ones above, so this is the representative
    // seed version.
    checklistPreparation: [
      { jour: "J-2", texte: "Lavez et démêlez vos cheveux naturels." },
      { jour: "LA VEILLE", texte: "Préparez votre perruque et vos produits habituels." },
      { jour: "LE JOUR J", texte: "Une chaise, une prise et un peu de lumière : ça suffit." }
    ]
  };

  // ---- Services (P01 order is authoritative for `ordre` — see #5 above) ----
  var services = [
    {
      id: "pose", ordre: 1,
      nom: "Pose de perruques",
      accroche: "Votre perruque posée, adaptée, coiffée.",
      accrocheDesktop: "Votre perruque posée, adaptée, coiffée.", // P13 — the desktop home list words most of these more tightly than P01
      description: "Votre perruque posée, adaptée à votre tête, coiffée comme vous l’aimez.",
      photo: null, visible: true,
      typePrix: "fixe", prixEuros: 60, dureeMin: 90,
      lieu: "domicile_cliente", remise: null,
      tamponAvantMin: 0, tamponApresMin: 15,
      modeReservation: "demande", delaiMinimumHeures: 48,
      arrhes: { type: "montant", valeur: 20 },
      photos: "optionnelles",
      variantes: [] // P03 (booking step 1) will confirm/populate this — out of B4's scope
    },
    {
      id: "lace-frontale", ordre: 2,
      nom: "Perruques lace frontale",
      accroche: "Pose lace frontale, baby hairs, finitions invisibles.",
      accrocheDesktop: "Baby hairs et finitions invisibles.",
      description: "Pose complète d’une lace frontale : préparation de vos cheveux, fixation, découpe de la lace, baby hairs et coiffage. La perruque peut être la vôtre ou fabriquée par moi.",
      photo: null, visible: true,
      typePrix: "a_partir_de", prixEuros: 90, dureeMin: 150,
      lieu: "domicile_cliente", remise: null,
      tamponAvantMin: 15, tamponApresMin: 15, // R08 renders both "Battement avant/après : 15 min"
      modeReservation: "demande", delaiMinimumHeures: 72,
      arrhes: { type: "montant", valeur: 20 },
      photos: "optionnelles",
      compris: [
        "Démêlage et préparation de vos cheveux",
        "Découpe et fixation de la lace",
        "Baby hairs et coiffage final",
        "Conseils d’entretien"
      ],
      // P03 (batch B13): the client's own wig (fixed install price) vs.
      // Eni'ol also making it (install + fabrication, quoted).
      variantes: [
        { id: "fournie", libelle: "J’ai déjà ma perruque", prixEuros: 90, dureeMin: 150 },
        { id: "fabriquee_par_moi", libelle: "Avec une perruque à moi", prixEuros: null, surDevis: true }
      ]
    },
    {
      id: "closure", ordre: 3,
      nom: "Perruques closure",
      accroche: "Pose closure 4×4 ou 5×5, raie au choix.",
      accrocheDesktop: "Closure 4×4 ou 5×5, raie au choix.",
      description: "Pose closure 4×4 ou 5×5, raie au choix.",
      photo: null, visible: true,
      typePrix: "a_partir_de", prixEuros: 75, dureeMin: 120,
      lieu: "domicile_cliente", remise: null,
      tamponAvantMin: 0, tamponApresMin: 15,
      modeReservation: "demande", delaiMinimumHeures: 48,
      arrhes: { type: "montant", valeur: 20 },
      photos: "optionnelles"
    },
    {
      id: "fabrication", ordre: 4,
      nom: "Fabrication de perruques sur mesure",
      nomCourt: "Fabrication sur mesure", // P03 (booking step 1) and P13 (desktop home list)
      accroche: "Votre perruque pensée avec vous, de la mèche à la pose.",
      accrocheDesktop: "De la mèche à la pose, avec vous.",
      description: "On part de vos envies : longueur, densité, texture, couleur, type de lace. Je fabrique, puis on pose ensemble.",
      photo: null, visible: true,
      typePrix: "devis", prixEuros: 150, dureeMin: null,
      lieu: "sans_deplacement", remise: "a_definir",
      tamponAvantMin: 0, tamponApresMin: 0,
      modeReservation: "projet", delaiMinimumHeures: 504, // "21 j" in the seed table
      arrhes: { type: "pourcentage", valeur: 30, nonRemboursablesApresCommande: true },
      photos: "obligatoires",
      devisSousHeures: 48 // P02: "Vous recevez un devis sous 48 h"
    },
    {
      id: "relooking", ordre: 5,
      nom: "Relooking & personnalisation",
      accroche: "Coupe, frange, couleur : votre perruque, en neuf.",
      accrocheDesktop: "Coupe, frange, couleur : votre perruque en neuf.",
      description: "Coupe, frange, couleur : votre perruque, en neuf.",
      photo: null, visible: true,
      typePrix: "a_partir_de", prixEuros: 40, dureeMin: 120,
      lieu: "sans_deplacement", remise: "a_definir",
      tamponAvantMin: 0, tamponApresMin: 0,
      modeReservation: "demande", delaiMinimumHeures: 168, // "7 j"
      arrhes: { type: "montant", valeur: 20 },
      photos: "obligatoires"
    },
    {
      id: "decoloration-epilation", ordre: 6,
      nom: "Décoloration & épilation",
      accroche: "Nœuds décolorés, lace épilée : un rendu naturel.",
      accrocheDesktop: "Nœuds décolorés, lace épilée.",
      description: "Nœuds décolorés, lace épilée : un rendu naturel.",
      photo: null, visible: true,
      typePrix: "fixe", prixEuros: 30, dureeMin: 90,
      lieu: "sans_deplacement", remise: "a_definir",
      tamponAvantMin: 0, tamponApresMin: 0,
      modeReservation: "demande", delaiMinimumHeures: 120, // "5 j"
      arrhes: null,
      photos: "obligatoires"
    },
    {
      id: "entretien", ordre: 7,
      nom: "Entretien & soin des cheveux",
      accroche: "Lavage, démêlage, soin — perruque ou cheveux naturels.",
      accrocheDesktop: "Lavage, démêlage, soin.",
      description: "Lavage, démêlage, soin — perruque ou cheveux naturels.",
      photo: null, visible: true,
      typePrix: "fixe", prixEuros: 35, dureeMin: 60,
      lieu: "au_choix", remise: null,
      tamponAvantMin: 0, tamponApresMin: 10,
      modeReservation: "demande", delaiMinimumHeures: 48,
      arrhes: null,
      photos: "optionnelles"
    }
  ];

  // ---- Availability (R09) ----
  var weeklyRules = [
    { id: "regle-mercredi", jours: [3], plages: [["14:00", "19:00"]] },
    { id: "regle-weekend", jours: [6, 0], plages: [["09:00", "13:00"], ["14:00", "19:00"]] }
  ];
  var exceptions = [
    { id: "exc-bac-francais", du: "2026-09-12", au: "2026-09-14", type: "blocage", libelle: "Bac de français — révisions" },
    { id: "exc-toussaint", du: "2026-10-18", au: "2026-11-02", type: "ouverture", libelle: "Vacances de la Toussaint (zone C)", plages: [["10:00", "19:00"]] }
  ];

  // ---- Clients ----
  // Addresses' lat/lon are invented (plausible Paris/petite-couronne
  // coordinates) — no real ones exist for these fictional people.
  var clients = [
    {
      id: "cl-aicha", prenom: "Aïcha", nom: "D.", telephone: "+33600000001", email: null, instagram: null,
      creeLe: "2026-05-01", tags: ["fidele"],
      cheveux: { texture: "4C", densite: "dense", longueur: "Nuque · 12 cm", cuirCheveluSensible: false, colle: "ok", methodePreferee: "Colle + baby hairs" },
      consentements: { photosPortfolio: true, rappelsSms: true },
      notes: [
        { le: "2026-08-16T00:00", texte: "Préfère qu’on parle pas trop, elle révise pendant la pose. Thé, pas de café." },
        { le: "2026-07-12T00:00", texte: "Ascenseur souvent en panne — prévoir 5 min de plus." }
      ],
      adresses: [
        { id: "ad-aicha-1", libelle: "Chez elle", ligne1: "18 rue de la Villette", complement: "Bât. A, 4ᵉ étage, porte gauche", complementCourt: "Bât. A, 4ᵉ ét.", codeAcces: "78A45", indications: "Entrée par la petite cour, l’ascenseur est à droite.", codePostal: "75019", ville: "Paris", zone: "Paris 19ᵉ · Jourdain",
          // Back-solved (batch B7) so travel.js's formula reproduces both
          // "≈ 20 min depuis chez moi" (R01/R05) AND "≈ 35 min" to Inès's
          // address (R03/R04) — the originally-invented coordinates only
          // hit one of the two.
          lat: 48.8721, lon: 2.3588 },
        { id: "ad-aicha-2", libelle: "Chez sa sœur", ligne1: null, complement: null, codeAcces: null, indications: null, codePostal: "93500", ville: "Pantin", zone: "Pantin (93)", lat: 48.8958, lon: 2.4014 }
      ],
      mesures: { id: "me-aicha", le: "2026-07-12", unite: "cm", tourDeTete: 56, frontNuque: 35, oreilleOreilleFront: 30, oreilleOreilleSommet: 33, tempeTempeArriere: 36, largeurNuque: 13 },
      perruques: [
        { id: "pq-aicha-1", type: "lace_frontale", lace: "13x4", longueurPouces: 22, densitePct: 180, texture: "body wave", couleur: "1B", tailleBonnet: "M", notes: "Décolorée + épilée par moi (juil.)" },
        { id: "pq-aicha-2", type: "closure", lace: "5x5", longueurPouces: 16, densitePct: 150, texture: "lisse", couleur: "naturel", tailleBonnet: "S", notes: null }
      ],
      stats: { rdv: 3, annulations: 0, absences: 0, totalEuros: 180 }
    },
    {
      id: "cl-ines", prenom: "Inès", nom: "K.", telephone: null, email: null, instagram: null,
      creeLe: "2026-09-09", tags: [],
      cheveux: null, consentements: { photosPortfolio: false, rappelsSms: true }, notes: [],
      adresses: [
        { id: "ad-ines-1", libelle: "Chez elle", ligne1: "12 rue de Belfort", complement: "Bât. B, 3ᵉ étage", codeAcces: null, indications: null, codePostal: "93100", ville: "Montreuil", zone: "Montreuil (93)", lat: 48.8638, lon: 2.4432 }
      ],
      mesures: null, perruques: [],
      stats: { rdv: 1, annulations: 0, absences: 0, totalEuros: 0 }
    },
    {
      id: "cl-chloe", prenom: "Chloé", nom: "M.", telephone: null, email: null, instagram: null,
      creeLe: "2026-08-20", tags: [],
      cheveux: null, consentements: { photosPortfolio: false, rappelsSms: false }, notes: [],
      adresses: [
        { id: "ad-chloe-1", libelle: "Chez elle", ligne1: null, complement: null, codeAcces: null, indications: null, codePostal: "75011", ville: "Paris", zone: "Paris 11ᵉ · Voltaire", lat: 48.8594, lon: 2.3765 }
      ],
      mesures: null, perruques: [],
      stats: { rdv: 2, annulations: 0, absences: 1, totalEuros: 40 }
    },
    {
      id: "cl-kenza", prenom: "Kenza", nom: "H.", telephone: null, email: null, instagram: null,
      creeLe: "2026-09-01", tags: [],
      cheveux: null, consentements: { photosPortfolio: false, rappelsSms: false }, notes: [],
      adresses: [], mesures: null, perruques: [],
      stats: { rdv: 1, annulations: 0, absences: 0, totalEuros: 30 }
    },
    {
      id: "cl-sarah", prenom: "Sarah", nom: "B.", telephone: null, email: null, instagram: null,
      creeLe: "2026-09-05", tags: [],
      cheveux: null, consentements: { photosPortfolio: false, rappelsSms: false }, notes: [],
      adresses: [], mesures: null, perruques: [],
      stats: { rdv: 0, annulations: 0, absences: 0, totalEuros: 0 }
    },
    {
      id: "cl-maelys", prenom: "Maëlys", nom: "T.", telephone: null, email: null, instagram: null,
      creeLe: "2026-09-11", tags: ["nouvelle"],
      cheveux: null, consentements: { photosPortfolio: false, rappelsSms: false }, notes: [],
      adresses: [
        { id: "ad-maelys-1", libelle: "Chez elle", ligne1: null, complement: null, codeAcces: null, indications: null, codePostal: "75015", ville: "Paris", zone: "Paris 15ᵉ · Vaugirard", lat: 48.8412, lon: 2.2994 }
      ],
      mesures: null, perruques: [],
      stats: { rdv: 0, annulations: 0, absences: 0, totalEuros: 0 }
    },
    {
      id: "cl-fatou", prenom: "Fatou", nom: "N.", telephone: null, email: null, instagram: null,
      creeLe: "2026-09-10", tags: ["nouvelle"],
      cheveux: null, consentements: { photosPortfolio: false, rappelsSms: false }, notes: [],
      adresses: [
        { id: "ad-fatou-1", libelle: "Chez elle", ligne1: null, complement: null, codeAcces: null, indications: null, codePostal: "95000", ville: "Cergy", zone: "Cergy (95)",
          // Back-solved (batch B7) to hit "≈ 1 h 15" (R02). Cergy's real
          // coordinates are ~25 km out, which the mockup's flat
          // 10+km×4 formula turns into ~1 h 50, not 1 h 15 — so these
          // are NOT Cergy's true position, just close enough for the
          // demo's stated number. Flagged, not hidden.
          lat: 48.8925, lon: 2.1223 }
      ],
      mesures: null, perruques: [],
      stats: { rdv: 0, annulations: 0, absences: 0, totalEuros: 0 }
    },
    {
      id: "cl-grace", prenom: "Grâce", nom: "M.", telephone: null, email: null, instagram: null,
      creeLe: "2026-08-01", tags: [],
      cheveux: null, consentements: { photosPortfolio: false, rappelsSms: false }, notes: [],
      adresses: [
        { id: "ad-grace-1", libelle: "Chez elle", ligne1: null, complement: null, codeAcces: null, indications: null, codePostal: "75010", ville: "Paris", zone: "Paris 10ᵉ · Gare de l’Est", lat: 48.8763, lon: 2.3590 }
      ],
      mesures: null, perruques: [],
      stats: { rdv: 1, annulations: 0, absences: 0, totalEuros: 0 } // "2ᵉ RDV" per R02 — one prior + this pending one
    },
    {
      // Only seen in R10's payment log, not in the R13 client-list excerpt
      // that was read — R13 says "12 fiches" total, so she exists even
      // though her own row wasn't one of the 5 shown in that artboard.
      id: "cl-lea", prenom: "Léa", nom: "V.", telephone: null, email: null, instagram: null,
      creeLe: "2026-09-06", tags: [],
      cheveux: null, consentements: { photosPortfolio: false, rappelsSms: false }, notes: [],
      adresses: [], mesures: null, perruques: [],
      stats: { rdv: 1, annulations: 0, absences: 0, totalEuros: 60 }
    }
  ];

  // ---- Bookings ("rdv") ----
  var bookings = [
    {
      id: "rdv-aicha-1", ref: "ENI-1909-AIC",
      clienteId: "cl-aicha", serviceId: "pose", varianteId: null,
      debut: "2026-09-19T10:00", fin: "2026-09-19T11:30",
      lieu: "domicile_cliente", adresseId: "ad-aicha-1",
      statut: "confirmee",
      historique: [
        { statut: "en_attente", le: "2026-09-08T21:14", par: "cliente" },
        { statut: "acceptee_arrhes_attendues", le: "2026-09-09T07:40", par: "pro" },
        { statut: "confirmee", le: "2026-09-12T18:02", par: "pro" } // arrhes reçues — see discrepancy #3
      ],
      prixEuros: 60, fraisDeplacementEuros: 0, arrhesAttenduesEuros: 20,
      creeLe: "2026-09-08T21:14", canal: "site"
    },
    {
      id: "rdv-ines-1", ref: "ENI-2609-INK", // the one ref literally shown in the design (P09/P10)
      clienteId: "cl-ines", serviceId: "lace-frontale", varianteId: null,
      debut: "2026-09-19T13:00", fin: "2026-09-19T15:30",
      lieu: "domicile_cliente", adresseId: "ad-ines-1",
      statut: "acceptee_arrhes_attendues",
      repondreAvant: null, // already accepted, not applicable
      historique: [
        { statut: "en_attente", le: "2026-09-11T18:40", par: "cliente" },
        { statut: "acceptee_arrhes_attendues", le: "2026-09-11T19:10", par: "pro" }
      ],
      prixEuros: 90, fraisDeplacementEuros: 0, arrhesAttenduesEuros: 20,
      arrhesDateLimite: "2026-09-17T20:00",
      creeLe: "2026-09-11T18:40", canal: "site"
    },
    {
      id: "rdv-maelys-1", ref: "ENI-1909-MAE",
      clienteId: "cl-maelys", serviceId: "closure", varianteId: null,
      debut: "2026-09-19T16:00", fin: "2026-09-19T18:00",
      lieu: "domicile_cliente", adresseId: "ad-maelys-1",
      statut: "en_attente",
      repondreAvant: "2026-09-11T23:40", // "expire dans 5 h" from the pinned 18:40 "now"
      historique: [{ statut: "en_attente", le: "2026-09-10T23:40", par: "cliente" }],
      prixEuros: 75, fraisDeplacementEuros: 0, arrhesAttenduesEuros: 20,
      notesCliente: "Bonjour, c’est ma première pose, j’ai la perruque mais pas de colle…",
      photos: [{ zone: "actuelle", url: null }, { zone: "actuelle", url: null }],
      creeLe: "2026-09-10T23:40", canal: "site"
    },
    {
      id: "rdv-fatou-1", ref: "ENI-2009-FAT",
      clienteId: "cl-fatou", serviceId: "pose", varianteId: null,
      debut: "2026-09-20T11:00", fin: "2026-09-20T12:30",
      lieu: "domicile_cliente", adresseId: "ad-fatou-1",
      statut: "en_attente",
      repondreAvant: "2026-09-12T13:40", // "expire dans 19 h" from pinned 18:40
      historique: [{ statut: "en_attente", le: "2026-09-11T13:40", par: "cliente" }],
      prixEuros: 60, fraisDeplacementEuros: 0, arrhesAttenduesEuros: 20,
      creeLe: "2026-09-11T13:40", canal: "site"
    },
    {
      id: "rdv-grace-1", ref: "ENI-1609-GRA",
      clienteId: "cl-grace", serviceId: "entretien", varianteId: null,
      debut: "2026-09-16T14:30", fin: "2026-09-16T15:30",
      lieu: "domicile_cliente", adresseId: "ad-grace-1",
      statut: "en_attente",
      repondreAvant: "2026-09-12T16:40", // "expire dans 22 h" from pinned 18:40
      historique: [{ statut: "en_attente", le: "2026-09-10T20:40", par: "cliente" }],
      prixEuros: 35, fraisDeplacementEuros: 0, arrhesAttenduesEuros: null,
      notesCliente: "Je sors du lycée à 14:15, ça va être juste mais ok !",
      creeLe: "2026-09-10T20:40", canal: "site"
    },
    {
      id: "rdv-sarah-1", ref: "ENI-2010-SAR",
      clienteId: "cl-sarah", serviceId: "fabrication", varianteId: null,
      debut: null, fin: null,
      lieu: "sans_deplacement", adresseId: null,
      statut: "en_attente",
      repondreAvant: "2026-09-13T18:40", // "devis sous 48 h"
      historique: [{ statut: "en_attente", le: "2026-09-11T18:40", par: "cliente" }],
      projet: {
        envies: { longueurPouces: 22, densitePct: 180, texture: "body wave", couleur: "1B", typeLace: "frontale_13x4" },
        mesuresConnues: false, // "je préfère qu’Eni’ol les prenne" → visite à prévoir
        pourLe: "2026-10-20"
      },
      prixEuros: null, fraisDeplacementEuros: 0, arrhesAttenduesEuros: null,
      creeLe: "2026-09-11T18:40", canal: "site"
    },
    {
      id: "rdv-kenza-1", ref: "ENI-0909-KEN",
      clienteId: "cl-kenza", serviceId: "decoloration-epilation", varianteId: null,
      debut: "2026-09-09T00:00", fin: null,
      lieu: "sans_deplacement", adresseId: null,
      statut: "terminee",
      historique: [
        { statut: "en_attente", le: "2026-09-04T00:00", par: "cliente" },
        { statut: "confirmee", le: "2026-09-05T00:00", par: "pro" },
        { statut: "terminee", le: "2026-09-09T00:00", par: "pro" }
      ],
      prixEuros: 30, fraisDeplacementEuros: 0, arrhesAttenduesEuros: null,
      creeLe: "2026-09-04T00:00", canal: "site"
    },
    {
      id: "rdv-chloe-1", ref: "ENI-0109-CHL",
      clienteId: "cl-chloe", serviceId: "entretien", varianteId: null,
      debut: "2026-09-01T00:00", fin: null,
      lieu: "au_choix", adresseId: null,
      statut: "terminee",
      historique: [{ statut: "terminee", le: "2026-09-01T00:00", par: "pro" }],
      prixEuros: 40, fraisDeplacementEuros: 0, arrhesAttenduesEuros: null,
      creeLe: "2026-08-25T00:00", canal: "site"
    },
    {
      id: "rdv-chloe-2", ref: "ENI-0509-CHL",
      clienteId: "cl-chloe", serviceId: "pose", varianteId: null,
      debut: "2026-09-05T00:00", fin: null,
      lieu: "domicile_cliente", adresseId: "ad-chloe-1",
      statut: "absente",
      historique: [
        { statut: "confirmee", le: "2026-08-28T00:00", par: "pro" },
        { statut: "absente", le: "2026-09-05T00:00", par: "pro" }
      ],
      prixEuros: 60, fraisDeplacementEuros: 0, arrhesAttenduesEuros: 20,
      creeLe: "2026-08-28T00:00", canal: "site"
    },
    {
      id: "rdv-lea-1", ref: "ENI-0609-LEA",
      clienteId: "cl-lea", serviceId: "pose", varianteId: null,
      debut: "2026-09-06T00:00", fin: null,
      lieu: "domicile_cliente", adresseId: null,
      statut: "terminee",
      historique: [{ statut: "terminee", le: "2026-09-06T00:00", par: "pro" }],
      prixEuros: 60, fraisDeplacementEuros: 0, arrhesAttenduesEuros: null,
      creeLe: "2026-08-30T00:00", canal: "site"
    },
    // Aïcha's two past RDV — R07's HISTORIQUE ("sam. 16 août · Lace
    // frontale · 90 € espèces", "sam. 12 juil. · Pose + mesures · 60 €
    // carte"). R13's "DERNIER RDV · 16 août" is computed from these.
    {
      id: "rdv-aicha-0816", ref: "ENI-1608-AIC",
      clienteId: "cl-aicha", serviceId: "lace-frontale", varianteId: null,
      debut: "2026-08-16T10:00", fin: "2026-08-16T12:30",
      lieu: "domicile_cliente", adresseId: "ad-aicha-1",
      statut: "terminee",
      historique: [{ statut: "terminee", le: "2026-08-16T12:30", par: "pro" }],
      prixEuros: 90, fraisDeplacementEuros: 0, arrhesAttenduesEuros: null,
      creeLe: "2026-08-10T00:00", canal: "site"
    },
    {
      id: "rdv-aicha-0712", ref: "ENI-1207-AIC",
      clienteId: "cl-aicha", serviceId: "pose", varianteId: null,
      debut: "2026-07-12T10:00", fin: "2026-07-12T11:30",
      lieu: "domicile_cliente", adresseId: "ad-aicha-1",
      statut: "terminee",
      historique: [{ statut: "terminee", le: "2026-07-12T11:30", par: "pro" }],
      prixEuros: 60, fraisDeplacementEuros: 0, arrhesAttenduesEuros: null,
      creeLe: "2026-07-05T00:00", canal: "site"
    }
  ];

  // ---- Payments (R10 itemized list — see discrepancy #4 re: the tiles) ----
  var payments = [
    { id: "pay-1", rdvId: "rdv-kenza-1", clienteId: "cl-kenza", type: "solde", montantEuros: 30, moyen: "Espèces", encaisseLe: "2026-09-09T00:00", note: null },
    { id: "pay-2", rdvId: "rdv-lea-1", clienteId: "cl-lea", type: "solde", montantEuros: 60, moyen: "Carte", encaisseLe: "2026-09-06T00:00", note: null },
    { id: "pay-3", rdvId: "rdv-aicha-1", clienteId: "cl-aicha", type: "arrhes", montantEuros: 20, moyen: "Lydia", encaisseLe: "2026-09-12T18:02", note: "Arrhes · pose du 19/09" },
    { id: "pay-4", rdvId: "rdv-chloe-1", clienteId: "cl-chloe", type: "solde", montantEuros: 40, moyen: "Espèces", encaisseLe: "2026-09-01T00:00", note: null },
    { id: "pay-5", rdvId: "rdv-aicha-0816", clienteId: "cl-aicha", type: "solde", montantEuros: 90, moyen: "Espèces", encaisseLe: "2026-08-16T12:30", note: null },
    { id: "pay-6", rdvId: "rdv-aicha-0712", clienteId: "cl-aicha", type: "solde", montantEuros: 60, moyen: "Carte", encaisseLe: "2026-07-12T11:30", note: null }
  ];

  return { settings: settings, services: services, weeklyRules: weeklyRules, exceptions: exceptions, clients: clients, bookings: bookings, payments: payments };
})();
