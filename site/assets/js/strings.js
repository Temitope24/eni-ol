/*
  Copy deck — batch B5.
  Source: "Plan de conception.dc.html" §6 (Répertoire de copie), which is
  explicitly normative — "les maquettes les reprennent mot pour mot" — plus
  the "Variantes « tu »" table in the same section. Cross-checked against
  the literal rendered strings in PUB (P01–P14) and PRO (R01–R14) already
  read in full earlier this session.

  Scope decision: this file holds the STRINGS THAT ARE REUSED ACROSS SCREENS
  or that need runtime vous/tu switching (per settings.registre in data.js).
  Long screen-specific paragraphs (a service description, a single FAQ
  answer, legal text) are NOT duplicated here — each page batch (B10–B34)
  transcribes those directly from its own "read this artboard in full"
  instruction in CODE-BATCHES.md, since that's the literal source for that
  one screen. Centralizing everything here would mean re-copying entire
  pages' text into one file with no benefit.

  Espace pro strings have no vous/tu split — per §6's own note: "elle se
  parle à elle-même, déjà en tu" — so PRO below is flat strings, not
  {vous, tu} pairs.

  --- A real content gap found while transcribing (not a design choice) ---
  P01's FAQ accordion shows all 7 questions, but only the FIRST one has its
  answer written anywhere in the delivered design (PDC §6 just says "FAQ (7
  questions, verbatim §6.1)" — no such §6.1 subsection with the other 6
  answers actually exists in Plan de conception.dc.html, and P01's mockup
  renders questions 2–7 collapsed with no answer text under them). Answers
  2–7 are placeholder TODOs below — inventing business-policy answers isn't
  something to do without asking Eni'ol or sending a follow-up to Claude
  Design. Flagged again in OPEN-QUESTIONS.md territory if the user wants to
  chase it.
*/

window.ENIOL_STRINGS = (function () {

  function t(key) {
    var entry = PUBLIC[key];
    if (!entry) return null;
    // Reads the LIVE demo state (store.js), not the static seed, so
    // toggling the registre on pro/reglages.html actually changes the
    // public site's copy — falls back to the seed only when store.js
    // hasn't loaded (e.g. a page that only needs data.js).
    var registre = (window.ENIOL_STORE ? window.ENIOL_STORE.get().settings.registre
      : (window.ENIOL_SEED && window.ENIOL_SEED.settings.registre)) || "vous";
    return entry[registre] || entry.vous;
  }

  // ---- index.html — Accueil ----
  var PUBLIC = {
    banniereOuverte: { vous: "🌟 Les réservations de septembre sont ouvertes 🌟", tu: "🌟 Les réservations de septembre sont ouvertes 🌟" },
    heroTagline: { vous: "Vos cheveux, ma spécialité", tu: "Vos cheveux, ma spécialité" }, // "inchangé (marque)" per the tu table
    heroSous: { vous: "Pose et fabrication de perruques. Je me déplace chez vous, partout à Paris.", tu: "Pose et fabrication de perruques. Je me déplace chez toi, partout à Paris." },
    ctaReserver: { vous: "Réserver", tu: "Réserver" },
    ctaReserverSous: { vous: "Je vous réponds sous 24 h", tu: "Je te réponds sous 24 h" },
    ctaInstagram: { vous: "Écrire sur Instagram", tu: "Écrire sur Instagram" },

    jeViensChezVousEyebrow: { vous: "Pas de salon", tu: "Pas de salon" },
    jeViensChezVousTitre: { vous: "Je viens chez vous", tu: "Je viens chez toi" },
    etape1: { vous: "Vous m’envoyez votre demande", tu: "Tu m’envoies ta demande" },
    etape1Desc: { vous: "Prestation, adresse, créneau. 3 minutes.", tu: "Prestation, adresse, créneau. 3 minutes." },
    etape2: { vous: "Je vous réponds sous 24 h", tu: "Je te réponds sous 24 h" },
    etape2Desc: { vous: "J’accepte, ou je vous propose un autre créneau.", tu: "J’accepte, ou je te propose un autre créneau." },
    etape3: { vous: "J’arrive chez vous avec tout mon matériel", tu: "J’arrive chez toi avec tout mon matériel" },
    etape3Desc: { vous: "Vous ne bougez pas. Une chaise et une prise suffisent.", tu: "Tu ne bouges pas. Une chaise et une prise suffisent." },

    mesPrestations: { vous: "Mes prestations", tu: "Mes prestations" },
    voirLes7: { vous: "Voir les 7 prestations en détail", tu: "Voir les 7 prestations en détail" },
    prixProvisoires: { vous: "PRIX PROVISOIRES", tu: "PRIX PROVISOIRES" },
    badgeJeMeDeplace: { vous: "🚶‍♀️ Je me déplace", tu: "🚶‍♀️ Je me déplace" },
    badgeSansDeplacement: { vous: "🏠 Sans déplacement", tu: "🏠 Sans déplacement" },
    badgeAuChoix: { vous: "↔ Au choix", tu: "↔ Au choix" },

    avantApres: { vous: "Avant / Après", tu: "Avant / Après" },
    avantApresAide: { vous: "Faites glisser pour comparer", tu: "Fais glisser pour comparer" },
    avantApresLegende: { vous: "Photos de mon travail — Paris, 2026", tu: "Photos de mon travail — Paris, 2026" },

    moiCestEniol: { vous: "Moi, c’est Eni’ol", tu: "Moi, c’est Eni’ol" },
    signatureBisous: { vous: "Bisous,", tu: "Bisous," },
    exergueAnglais: { vous: "“Life isn’t perfect but your wig can be 💕”", tu: "“Life isn’t perfect but your wig can be 💕”" },

    paiementTitre: { vous: "Espèces ou carte, sur place ♡", tu: "Espèces ou carte, sur place ♡" },
    paiementDesc: { vous: "Des arrhes de 20 € sont demandées après mon accord · annulation gratuite jusqu’à 48 h avant.", tu: "Des arrhes de 20 € sont demandées après mon accord · annulation gratuite jusqu’à 48 h avant." },
    lireLesConditions: { vous: "Lire les conditions", tu: "Lire les conditions" },

    avisVideTitre: { vous: "Vos avis arrivent bientôt ♡", tu: "Tes avis arrivent bientôt ♡" },
    avisVideDesc: { vous: "Vous êtes déjà passée entre mes mains ? Écrivez-moi, avec plaisir.", tu: "Tu es déjà passée entre mes mains ? Écris-moi, avec plaisir." },

    faqTitre: { vous: "Questions fréquentes", tu: "Questions fréquentes" },
    // All 7 question titles are verbatim from P01. Only Q1 has a written
    // answer anywhere in the delivered design — see the file header note.
    faq: [
      {
        question: { vous: "Vous vous déplacez où ?", tu: "Tu te déplaces où ?" },
        reponse: { vous: "Dans tout Paris et en petite couronne. Je viens en transports : dites-moi votre adresse au moment de la demande, je vous dis si je peux être là à l’heure voulue. Aucune adresse n’est refusée d’avance.", tu: "Dans tout Paris et en petite couronne. Je viens en transports : dis-moi ton adresse au moment de la demande, je te dis si je peux être là à l’heure voulue. Aucune adresse n’est refusée d’avance." }
      },
      { question: { vous: "Comment fonctionnent les arrhes ?", tu: "Comment fonctionnent les arrhes ?" }, reponse: null /* TODO — not written anywhere in the delivered design */ },
      { question: { vous: "Puis-je annuler ?", tu: "Puis-je annuler ?" }, reponse: null /* TODO */ },
      { question: { vous: "Comment je paie ?", tu: "Comment je paie ?" }, reponse: null /* TODO */ },
      { question: { vous: "Que dois-je préparer ?", tu: "Que dois-je préparer ?" }, reponse: null /* TODO */ },
      { question: { vous: "Combien de temps dure une pose ?", tu: "Combien de temps dure une pose ?" }, reponse: null /* TODO */ },
      { question: { vous: "Faites-vous des perruques sur mesure ?", tu: "Fais-tu des perruques sur mesure ?" }, reponse: null /* TODO */ }
    ],

    meJoindreTitre: { vous: "Me joindre", tu: "Me joindre" },
    meJoindreInstagram: { vous: "Instagram (le plus rapide)", tu: "Instagram (le plus rapide)" },

    // ---- reserver.html — chrome shared by all 6 steps ----
    etapeSurTotal: { vous: "Étape {n} sur 6 · Suivant : {suivant}", tu: "Étape {n} sur 6 · Suivant : {suivant}" },
    surPlace: { vous: "SUR PLACE", tu: "SUR PLACE" },
    continuer: { vous: "Continuer", tu: "Continuer" },
    retour: { vous: "Retour", tu: "Retour" },

    // Step 1 — Prestation
    step1Titre: { vous: "Quelle prestation ?", tu: "Quelle prestation ?" },
    step1Aide: { vous: "Vous hésitez ? Écrivez-moi, je vous conseille.", tu: "Tu hésites ? Écris-moi, je te conseille." },
    toggleADomicile: { vous: "À domicile", tu: "À domicile" },
    toggleSansDeplacement: { vous: "Sans déplacement", tu: "Sans déplacement" },

    // Step 2 — Adresse
    step2Titre: { vous: "Où est-ce que je vous retrouve ? 📍", tu: "Où est-ce que je te retrouve ? 📍" },
    adresseLabel: { vous: "Adresse", tu: "Adresse" },
    adressePlaceholder: { vous: "12 rue de Belleville, Paris 20ᵉ", tu: "12 rue de Belleville, Paris 20ᵉ" },
    complementLabel: { vous: "Complément (bâtiment, étage, appartement)", tu: "Complément (bâtiment, étage, appartement)" },
    plusDeDetails: { vous: "+ Plus de détails", tu: "+ Plus de détails" },
    codeAccesLabel: { vous: "Code d’accès / interphone", tu: "Code d’accès / interphone" },
    indicationsLabel: { vous: "Indications pour me trouver", tu: "Indications pour me trouver" },
    indicationsPlaceholder: { vous: "Ex. : 2ᵉ cour à gauche, ascenseur jusqu’au 4ᵉ", tu: "Ex. : 2ᵉ cour à gauche, ascenseur jusqu’au 4ᵉ" },
    adresseConfidentielle: { vous: "🔒 Votre adresse n’est visible que par moi.", tu: "🔒 Ton adresse n’est visible que par moi." },
    enregistrerAdresse: { vous: "Enregistrer cette adresse", tu: "Enregistrer cette adresse" },
    calculTrajet: { vous: "Calcul du trajet…", tu: "Calcul du trajet…" },
    adresseConfirmee: { vous: "Je me déplace à {ville} ✓", tu: "Je me déplace à {ville} ✓" },

    // Step 3 — Date & heure
    step3Titre: { vous: "Quel jour vous arrange ?", tu: "Quel jour t’arrange ?" },
    ongletProchaines: { vous: "Prochaines disponibilités", tu: "Prochaines disponibilités" },
    ongletCalendrier: { vous: "Voir le calendrier", tu: "Voir le calendrier" },
    matin: { vous: "MATIN", tu: "MATIN" },
    apresMidi: { vous: "APRÈS-MIDI", tu: "APRÈS-MIDI" },
    soir: { vous: "SOIR", tu: "SOIR" },
    conseille: { vous: "♡ Conseillé", tu: "♡ Conseillé" },
    finPrevueVers: { vous: "Fin prévue vers {heure}", tu: "Fin prévue vers {heure}" },
    annulationGratuite48: { vous: "Annulation gratuite jusqu’à 48 h avant.", tu: "Annulation gratuite jusqu’à 48 h avant." },
    moisFerme: { vous: "Les réservations d’{mois} ouvrent bientôt — suivez @pose.de.perruques", tu: "Les réservations d’{mois} ouvrent bientôt — suis @pose.de.perruques" },
    preavisMessage: { vous: "Cette prestation se réserve au moins {delai} à l’avance.", tu: "Cette prestation se réserve au moins {delai} à l’avance." },
    semaineVide: { vous: "Rien cette semaine — voir la semaine prochaine", tu: "Rien cette semaine — voir la semaine prochaine" },

    // Step 4 — Photos
    step4Titre: { vous: "Montrez-moi", tu: "Montre-moi" },
    zoneCheveux: { vous: "Mes cheveux / ma perruque actuelle", tu: "Mes cheveux / ma perruque actuelle" },
    zoneInspiration: { vous: "Mon inspiration", tu: "Mon inspiration" },
    ajouterLien: { vous: "Ajouter un lien (Instagram, TikTok, Pinterest)", tu: "Ajouter un lien (Instagram, TikTok, Pinterest)" },
    notesPlaceholder: { vous: "Ex. : raie au milieu, lace transparente, 22 pouces, couleur 1B…", tu: "Ex. : raie au milieu, lace transparente, 22 pouces, couleur 1B…" },
    passerEtape: { vous: "Passer cette étape", tu: "Passer cette étape" },
    erreurPhotoManquante: { vous: "Ajoutez au moins une photo de vos cheveux : j’en ai besoin pour préparer.", tu: "Ajoute au moins une photo de tes cheveux : j’en ai besoin pour préparer." },

    // Step 5 — Coordonnées
    step5Titre: { vous: "Comment je vous joins ?", tu: "Comment je te joins ?" },
    prenomLabel: { vous: "Prénom", tu: "Prénom" },
    nomLabel: { vous: "Nom", tu: "Nom" },
    telephoneLabel: { vous: "Téléphone", tu: "Téléphone" },
    telephoneAide: { vous: "Uniquement pour vous confirmer le rendez-vous et vous le rappeler.", tu: "Uniquement pour te confirmer le rendez-vous et te le rappeler." },
    emailLabel: { vous: "E-mail", tu: "E-mail" },
    instagramLabelFacultatif: { vous: "@Instagram (facultatif)", tu: "@Instagram (facultatif)" },
    rappelSms: { vous: "Me rappeler par SMS la veille", tu: "Me rappeler par SMS la veille" },
    consentementPhotos: { vous: "J’autorise Eni’ol à publier des photos (sans mon visage)", tu: "J’autorise Eni’ol à publier des photos (sans mon visage)" },

    // Step 6 — Récapitulatif
    step6Titre: { vous: "On récapitule", tu: "On récapitule" },
    arrhesApresAccord: { vous: "À envoyer après mon accord : {montant} d’arrhes", tu: "À envoyer après mon accord : {montant} d’arrhes" },
    surPlaceMontant: { vous: "Sur place : {montant} (espèces ou carte)", tu: "Sur place : {montant} (espèces ou carte)" },
    conditionsAcceptation: { vous: "J’accepte les conditions d’annulation et le versement des arrhes.", tu: "J’accepte les conditions d’annulation et le versement des arrhes." },
    envoyerMaDemande: { vous: "Envoyer ma demande", tu: "Envoyer ma demande" },
    combienCouteAnnulation: { vous: "Combien coûte une annulation", tu: "Combien coûte une annulation" },
    pourBienPreparer: { vous: "Pour bien préparer la séance", tu: "Pour bien préparer la séance" },

    // Demande envoyée
    demandeEnvoyeeTitre: { vous: "Demande envoyée ♡", tu: "Demande envoyée ♡" },
    jeVousRepondsAvant: { vous: "Je vous réponds avant demain 18:40", tu: "Je te réponds avant demain 18:40" },
    voirMaDemande: { vous: "Voir ma demande", tu: "Voir ma demande" },
    ajouterCalendrier: { vous: "Ajouter à mon calendrier (provisoire)", tu: "Ajouter à mon calendrier (provisoire)" },
    uneQuestion: { vous: "Une question ? Écrivez-moi sur Instagram", tu: "Une question ? Écris-moi sur Instagram" },

    // ---- ma-reservation.html — one text block per status ----
    statutEnAttenteTitre: { vous: "J’ai bien reçu votre demande", tu: "J’ai bien reçu ta demande" },
    statutEnAttenteCompteARebours: { vous: "Réponse avant demain 18:40 · il reste {duree}", tu: "Réponse avant demain 18:40 · il reste {duree}" },
    statutEnAttenteAnnuler: { vous: "Annuler ma demande", tu: "Annuler ma demande" },

    statutProposeTitre: { vous: "Je vous propose un autre créneau", tu: "Je te propose un autre créneau" },
    statutProposeAccepter: { vous: "Accepter ce créneau", tu: "Accepter ce créneau" },
    statutProposeRefuser: { vous: "Refuser et en chercher un autre", tu: "Refuser et en chercher un autre" },

    statutAccepteeTitre: { vous: "C’est d’accord pour {jour} à {heure} ♡", tu: "C’est d’accord pour {jour} à {heure} ♡" },
    statutAccepteeArrhesMessage: { vous: "Il reste à m’envoyer {montant} d’arrhes avant le {date} pour bloquer le créneau.", tu: "Il reste à m’envoyer {montant} d’arrhes avant le {date} pour bloquer le créneau." },
    statutAccepteeMoyens: { vous: "Par Lydia, Wero ou virement au 07 53 71 11 38 — précisez votre prénom.", tu: "Par Lydia, Wero ou virement au 07 53 71 11 38 — précise ton prénom." },
    jaiEnvoyeLesArrhes: { vous: "J’ai envoyé les arrhes", tu: "J’ai envoyé les arrhes" },

    statutConfirmeeTitre: { vous: "Votre séance est dans {n} jours", tu: "Ta séance est dans {n} jours" },
    statutConfirmeeHoraire: { vous: "J’arrive vers {heure} (± 15 min), fin prévue vers {heureFin}.", tu: "J’arrive vers {heure} (± 15 min), fin prévue vers {heureFin}." },
    modifier: { vous: "Modifier", tu: "Modifier" },
    annuler: { vous: "Annuler", tu: "Annuler" },
    conditionsAnnulationConfirmee: { vous: "Gratuit jusqu’au {date} ; après, les arrhes restent acquises.", tu: "Gratuit jusqu’au {date} ; après, les arrhes restent acquises." },

    statutTermineeTitre: { vous: "Merci pour votre confiance ♡", tu: "Merci pour ta confiance ♡" },
    reprendreRendezVous: { vous: "Reprendre rendez-vous", tu: "Reprendre rendez-vous" },

    statutRefuseeTitre: { vous: "Je ne peux pas ce jour-là, désolée", tu: "Je ne peux pas ce jour-là, désolée" },
    statutExpireeTitre: { vous: "Cette demande a expiré", tu: "Cette demande a expiré" },
    statutAnnuleeTitre: { vous: "Demande annulée", tu: "Demande annulée" }
  };

  // ---- pro/ — key strings (no vous/tu split: "elle se parle à elle-même, déjà en tu") ----
  var PRO = {
    bonjourEniol: "Bonjour Eni’ol ♡",
    jePartsDe: "Je pars de :",
    prochainRdv: "Prochain RDV",
    itineraire: "Itinéraire",
    appeler: "Appeler",
    demandesAValider: "{n} demandes à valider",
    plusUrgenteExpire: "La plus urgente expire dans {duree}",
    cetteSemaine: "CETTE SEMAINE",
    resteAEncaisser: "RESTE À ENCAISSER",
    moisOuvert: "{mois} est ouvert",
    ouvrirMois: "Ouvrir {mois}",

    demandesOnglets: ["À valider", "À venir", "Passés", "Annulés"],
    tagNouvelleCliente: "Nouvelle cliente",
    tagNiemeRdv: "{n}ᵉ RDV",
    expireDans: "Expire dans {duree}",
    signalTrajetOk: "≈ {duree} depuis {origine}",
    signalTrajetServe: "Trajet serré : {marge} de marge",
    signalNeTientPas: "Ne tient pas : il manque ≈ {manque}",
    signalLoin: "Loin : ≈ {duree} en transports",
    accepter: "Accepter",
    proposerAutreCreneau: "Proposer un autre créneau",
    refuser: "Refuser",

    feuilleAccepterTitre: "Accepter cette demande ?",
    fraisDeplacementFacultatif: "Frais de déplacement (facultatif)",
    arrhesADemander: "Arrhes à demander",
    messageALaClienteFacultatif: "Message à la cliente (facultatif)",
    confirmerAcceptation: "Confirmer l’acceptation",
    toastRdvAccepte: "RDV accepté ✓",

    agendaOnglets: ["Jour", "Semaine", "Liste", "Carte"],
    partirA: "partir à {heure}",
    tempsLibre: "Temps libre · {duree}",
    demandeEnAttente: "Demande en attente",

    encaisser: "Encaisser",
    moyensEncaissement: ["Espèces", "Carte", "Lydia", "Wero", "Virement", "Autre"],
    resteAEncaisserMontant: "Reste à encaisser {montant}",
    termine: "Terminé",
    absente: "Absente",
    modifier: "Modifier",
    annuler: "Annuler",
    avertissementAnnulationDouble: "Si vous annulez, les arrhes sont dues au double.",

    mesHoraires: "Mes horaires",
    presetMercrediApresMidi: "Mercredi après-midi",
    presetSoirsDeSemaine: "Soirs de semaine",
    presetWeekEnd: "Week-end",
    ajouterVacancesScolaires: "Ajouter les vacances scolaires (zone C)",
    bloquerUnePeriode: "Bloquer une période",
    ouvrirExceptionnellement: "Ouvrir exceptionnellement",
    ouvertureDesReservations: "Ouverture des réservations",

    livreDesRecettes: "Livre des recettes",
    exporterCsv: "Exporter (CSV)",
    arrhesEnAttente: "Arrhes en attente"
  };

  return { t: t, PUBLIC: PUBLIC, PRO: PRO };
})();
