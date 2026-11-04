// ====== Page « Passer un examen » ======
// Fonctionnement :
//  1. On lit l'identifiant de l'examen dans l'adresse (?id=3).
//  2. Le serveur nous donne les questions et l'heure de début.
//  3. Un chronomètre compte à rebours jusqu'à l'heure de fin.
//  4. Les réponses sont gardées en mémoire (et sauvegardées dans le navigateur).
//  5. À la fin du temps ou au clic sur "Terminer", on envoie les réponses.

// ---------- Éléments de la page ----------
const zoneChargement = document.getElementById("zoneChargement");
const zoneErreur = document.getElementById("zoneErreur");
const zoneAccueil = document.getElementById("zoneAccueil");
const zoneExamen = document.getElementById("zoneExamen");
const zoneResultat = document.getElementById("zoneResultat");

const titreExamen = document.getElementById("titreExamen");
const coursExamen = document.getElementById("coursExamen");
const blocChrono = document.getElementById("chrono");
const tempsRestant = document.getElementById("tempsRestant");
const barreProgression = document.getElementById("barreProgression");
const texteProgression = document.getElementById("texteProgression");
const numeroQuestion = document.getElementById("numeroQuestion");
const texteQuestion = document.getElementById("texteQuestion");
const listeChoix = document.getElementById("listeChoix");
const indiceQuestion = document.getElementById("indiceQuestion");
const zonePastilles = document.getElementById("pastilles");
const boutonMarquer = document.getElementById("boutonMarquer");
const boutonPrecedent = document.getElementById("boutonPrecedent");
const boutonSuivant = document.getElementById("boutonSuivant");
const boutonTerminer = document.getElementById("boutonTerminer");

// ---------- Données de l'examen ----------
const examenId = Number(new URLSearchParams(window.location.search).get("id"));
// La clé change à chaque tentative (voir lancerTentative)
let CLE_SAUVEGARDE = `reponses_examen_${lireUtilisateur().id}_${examenId}`;

let examen = null;              // examen reçu du serveur (titre, durée, questions...)
let indexQuestion = 0;          // position de la question affichée (0 = première)
let reponses = {};              // { idQuestion: [idChoix, ...] }
let questionsMarquees = [];     // identifiants des questions marquées
let heureFin = 0;               // moment où l'examen se termine (en millisecondes)
let decalageHorloge = 0;        // différence entre l'horloge du serveur et celle du navigateur
let minuteur = null;            // identifiant du setInterval du chronomètre
let examenTermine = false;
let envoiEnCours = false;
let changementsOnglet = 0;
let alerteCinqMinutes = false;
let alerteUneMinute = false;

// ---------- Affichage des différentes zones ----------

function afficherZone(zone) {
    [zoneChargement, zoneErreur, zoneAccueil, zoneExamen, zoneResultat].forEach(element => {
        element.hidden = element !== zone;
    });
}

function afficherErreur(message) {
    examenTermine = true; // plus besoin d'avertir avant de quitter la page
    clearInterval(minuteur);
    document.getElementById("messageErreur").textContent = message;
    afficherZone(zoneErreur);
}

// ---------- Sauvegarde dans le navigateur (si la page est actualisée) ----------

function sauvegarder() {
    try {
        localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({ reponses, questionsMarquees }));
    } catch (erreur) {
        // Stockage plein ou interdit : ce n'est pas grave, on continue
    }
}

function chargerSauvegarde() {
    try {
        const sauvegarde = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || "null");
        if (!sauvegarde) return;

        // On ne garde que les réponses qui correspondent vraiment à cet examen
        examen.questions.forEach(question => {
            // Ancien format : un nombre. Nouveau format : une liste.
            const enregistres = [].concat(sauvegarde.reponses[question.id] ?? []);
            const valides = question.choix
                .map(choix => choix.id)
                .filter(id => enregistres.includes(id));

            if (valides.length > 0) {
                reponses[question.id] = question.type === "choix_multiple"
                    ? valides : [valides[0]];
            }
            if (sauvegarde.questionsMarquees.includes(question.id)) {
                questionsMarquees.push(question.id);
            }
        });
    } catch (erreur) {
        reponses = {};
        questionsMarquees = [];
    }
}

// ---------- Chronomètre ----------

function millisecondesRestantes() {
    return heureFin - (Date.now() + decalageHorloge);
}

function formaterTemps(millisecondes) {
    const totalSecondes = Math.ceil(millisecondes / 1000);
    const minutes = Math.floor(totalSecondes / 60);
    const secondes = totalSecondes % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secondes).padStart(2, "0")}`;
}

// Appelée toutes les secondes
function mettreAJourChronometre() {
    const reste = millisecondesRestantes();

    if (reste <= 0) {
        tempsRestant.textContent = "00:00";
        clearInterval(minuteur);
        afficherNotification("Temps écoulé : envoi automatique de vos réponses.", "erreur", 5000);
        soumettre();
        return;
    }

    tempsRestant.textContent = formaterTemps(reste);

    // La couleur change quand le temps devient court
    blocChrono.classList.toggle("alerte", reste <= 5 * 60 * 1000 && reste > 60 * 1000);
    blocChrono.classList.toggle("critique", reste <= 60 * 1000);

    // Messages d'avertissement (une seule fois chacun)
    if (reste <= 5 * 60 * 1000 && !alerteCinqMinutes) {
        alerteCinqMinutes = true;
        afficherNotification("Il reste 5 minutes.", "info", 4000);
    }
    if (reste <= 60 * 1000 && !alerteUneMinute) {
        alerteUneMinute = true;
        afficherNotification("Il reste moins d'une minute !", "erreur", 4000);
    }
}

function lancerChronometre() {
    mettreAJourChronometre();
    minuteur = setInterval(mettreAJourChronometre, 1000);
}

// ---------- Affichage d'une question ----------

function compterReponses() {
    return Object.keys(reponses).length;
}

function mettreAJourProgression() {
    const total = examen.questions.length;
    const repondues = compterReponses();
    barreProgression.style.width = `${(repondues / total) * 100}%`;
    texteProgression.textContent = `${repondues} / ${total} question(s) répondue(s)`;
}

// Colore les pastilles de navigation selon l'état de chaque question
function mettreAJourPastilles() {
    Array.from(zonePastilles.children).forEach((pastille, index) => {
        const question = examen.questions[index];
        pastille.classList.toggle("repondue", reponses[question.id] !== undefined);
        pastille.classList.toggle("marquee", questionsMarquees.includes(question.id));
        pastille.classList.toggle("courante", index === indexQuestion);
    });
}

function construirePastilles() {
    zonePastilles.replaceChildren();
    examen.questions.forEach((question, index) => {
        const pastille = creerElement("button", "pastille", String(index + 1));
        pastille.type = "button";
        pastille.addEventListener("click", () => allerALaQuestion(index));
        zonePastilles.appendChild(pastille);
    });
}

// Coche visuellement les choix sélectionnés (idsChoix = liste d'identifiants)
function marquerChoixSelectionne(idsChoix = []) {
    Array.from(listeChoix.children).forEach(ligne => {
        const estSelectionne = idsChoix.includes(Number(ligne.dataset.id));
        ligne.classList.toggle("selectionne", estSelectionne);
        ligne.querySelector("input").checked = estSelectionne;
    });
}

function afficherQuestion() {
    const question = examen.questions[indexQuestion];

    numeroQuestion.textContent = `Question ${indexQuestion + 1} sur ${examen.questions.length}`;
    texteQuestion.textContent = question.texte;

    const multiple = question.type === "choix_multiple";
    const points = `${formaterPoints(question.points)} point(s)`;
    indiceQuestion.textContent = multiple
        ? `Plusieurs réponses possibles : cochez toutes les bonnes réponses • ${points}`
        : question.type === "vrai_faux"
            ? `Vrai ou faux • ${points}`
            : `Une seule réponse • ${points}`;
    definirBouton(boutonMarquer, "flag", questionsMarquees.includes(question.id) ? "Marquée" : "Marquer");
    boutonMarquer.classList.toggle("actif", questionsMarquees.includes(question.id));

    // Construction des choix : A, B, C, D... (cases à cocher si choix multiple)
    listeChoix.replaceChildren();
    question.choix.forEach((choix, position) => {
        const ligne = creerElement("label", "choix");
        ligne.dataset.id = choix.id;

        const radio = creerElement("input");
        radio.type = multiple ? "checkbox" : "radio";
        radio.name = "choix";
        radio.addEventListener("change", () => choisirReponse(choix.id));

        const lettre = creerElement("span", "lettre", String.fromCharCode(65 + position));
        const texte = creerElement("span", "", choix.texte);

        ligne.append(radio, lettre, texte);
        listeChoix.appendChild(ligne);
    });

    marquerChoixSelectionne(reponses[question.id]);

    definirBouton(boutonPrecedent, "arrow-left", "Précédente");
    boutonSuivant.innerHTML = `<span>Suivante</span>${icone("arrow-right")}`;
    boutonPrecedent.disabled = indexQuestion === 0;
    boutonSuivant.disabled = indexQuestion === examen.questions.length - 1;
    mettreAJourPastilles();
}

// ---------- Actions de l'étudiant ----------

function choisirReponse(idChoix) {
    const question = examen.questions[indexQuestion];

    if (question.type === "choix_multiple") {
        // Un clic coche ou décoche ce choix
        const actuels = reponses[question.id] || [];
        const nouveaux = actuels.includes(idChoix)
            ? actuels.filter(id => id !== idChoix)
            : [...actuels, idChoix];

        if (nouveaux.length === 0) {
            delete reponses[question.id];
        } else {
            reponses[question.id] = nouveaux;
        }
    } else {
        reponses[question.id] = [idChoix];
    }

    sauvegarder();
    marquerChoixSelectionne(reponses[question.id]);
    mettreAJourPastilles();
    mettreAJourProgression();
}

function allerALaQuestion(index) {
    if (index < 0 || index >= examen.questions.length) return;
    indexQuestion = index;
    afficherQuestion();
}

function basculerMarquage() {
    const question = examen.questions[indexQuestion];

    if (questionsMarquees.includes(question.id)) {
        questionsMarquees = questionsMarquees.filter(id => id !== question.id);
    } else {
        questionsMarquees.push(question.id);
    }

    sauvegarder();
    afficherQuestion();
}

// Demande une confirmation avant d'envoyer
async function demanderTerminer() {
    const sansReponse = examen.questions.length - compterReponses();

    const message = sansReponse > 0
        ? `Il reste ${sansReponse} question(s) sans réponse : elles compteront comme fausses. Terminer quand même ?`
        : "Vous avez répondu à toutes les questions. Envoyer vos réponses ?";

    if (await confirmer(message, "Envoyer", "succes")) {
        soumettre();
    }
}

// ---------- Envoi des réponses au serveur ----------

async function soumettre() {
    if (envoiEnCours || examenTermine) return;
    envoiEnCours = true;
    boutonTerminer.disabled = true;
    definirBouton(boutonTerminer, "send", "Envoi...");

    // Transforme { 5: [12, 13] } en [{ question_id: 5, choix_ids: [12, 13] }]
    const liste = Object.entries(reponses).map(([idQuestion, idsChoix]) => ({
        question_id: Number(idQuestion),
        choix_ids: idsChoix
    }));

    try {
        const resultat = await appeler(`/examens/${examenId}/soumettre`, {
            method: "POST",
            body: JSON.stringify({ reponses: liste })
        });

        examenTermine = true;
        clearInterval(minuteur);
        localStorage.removeItem(CLE_SAUVEGARDE);
        afficherResultat(resultat);
    } catch (erreur) {
        envoiEnCours = false;

        // 403 ou 409 : le serveur a refusé définitivement (temps dépassé, déjà soumis)
        if (erreur.statut === 403 || erreur.statut === 409) {
            localStorage.removeItem(CLE_SAUVEGARDE);
            afficherErreur(erreur.message);
            return;
        }

        // Autre erreur (réseau...) : on permet de réessayer
        afficherNotification(erreur.message, "erreur", 5000);
        boutonTerminer.disabled = false;
        definirBouton(boutonTerminer, "send", "Terminer l'examen");

        // Si le temps est fini, on réessaie seul dans 5 secondes
        if (millisecondesRestantes() <= 0) {
            setTimeout(soumettre, 5000);
        }
    }
}

// ---------- Résultat final ----------

// Fait monter le cercle de 0 jusqu'à la note obtenue
function animerCercle(pourcentage) {
    const cercle = document.getElementById("cercleNote");
    const nombre = document.getElementById("pourcentageFinal");
    const couleurs = { bon: "var(--succes)", moyen: "var(--accent)", faible: "var(--danger)" };
    cercle.style.setProperty("--couleur-note", couleurs[niveauNote(pourcentage)]);

    let valeur = 0;
    const animation = setInterval(() => {
        valeur++;
        nombre.textContent = valeur;
        cercle.style.setProperty("--pct", valeur);
        if (valeur >= pourcentage) clearInterval(animation);
    }, 15);
}

function afficherResultat(resultat) {
    const pourcentage = resultat.pourcentage;
    let message = "Courage, continuez à réviser.";
    if (pourcentage >= 70) message = "Excellent travail !";
    else if (pourcentage >= 50) message = "Bien, mais vous pouvez encore progresser.";

    document.getElementById("scoreFinal").textContent =
        `Vous avez obtenu ${formaterPoints(resultat.score)} point(s) sur ${formaterPoints(resultat.total_questions)}.`;
    document.getElementById("messageFinal").textContent = message;

    // Correction : seulement si l'étudiant ne peut plus repasser l'examen
    const zoneCorrection = document.getElementById("zoneCorrection");
    const noteCorrection = document.getElementById("noteCorrection");
    zoneCorrection.replaceChildren();

    if (resultat.correction) {
        noteCorrection.hidden = true;
        zoneCorrection.appendChild(construireCorrection(resultat.correction));
    } else {
        noteCorrection.hidden = false;
    }

    afficherZone(zoneResultat);
    animerCercle(pourcentage);
}

// ---------- Démarrage de la page ----------

function preparerExamen() {
    // Heure de fin = heure de début donnée par le serveur + durée de l'examen
    heureFin = Date.parse(examen.date_debut) + examen.duree_minutes * 60 * 1000;

    if (Number.isNaN(heureFin)) {
        afficherErreur("Impossible de lire l'heure de début de l'examen.");
        return;
    }

    // Si le serveur envoie son heure, on corrige l'horloge du navigateur
    if (examen.maintenant) {
        decalageHorloge = Date.parse(examen.maintenant) - Date.now();
    }

    titreExamen.textContent = examen.titre;
    coursExamen.textContent = `Durée : ${examen.duree_minutes} minutes • ${examen.questions.length} question(s)`;

    chargerSauvegarde();
    construirePastilles();
    afficherQuestion();
    mettreAJourProgression();
    afficherZone(zoneExamen);
    lancerChronometre();
}

// Affiche l'écran « Commencer » : le chronomètre n'a pas encore démarré
function afficherAccueil(info) {
    document.getElementById("accueilTitre").textContent = info.titre;
    document.getElementById("accueilCours").textContent = info.cours;

    const lignes = [
        ["clock", `Durée : ${info.duree_minutes} minutes`],
        ["help-circle", `${info.nombre_questions} question(s)`]
    ];

    document.getElementById("accueilInfos").replaceChildren(
        ...lignes.map(([nomIcone, texte]) => {
            const ligne = creerElement("li");
            ligne.innerHTML = `${icone(nomIcone, 20)}<span>${echapperHTML(texte)}</span>`;
            return ligne;
        })
    );
    afficherZone(zoneAccueil);
}

// Démarre (ou reprend) la tentative : c'est ICI que le chronomètre commence
async function lancerTentative() {
    try {
        examen = await appeler(`/examens/${examenId}/demarrer`, { method: "POST" });

        // Une clé par tentative : les réponses d'un ancien essai ne reviennent pas
        CLE_SAUVEGARDE = `reponses_examen_${lireUtilisateur().id}_${examenId}_${examen.numero}`;
        preparerExamen();
    } catch (erreur) {
        afficherErreur(erreur.message);
    }
}

async function demarrer() {
    if (!Number.isInteger(examenId) || examenId < 1) {
        afficherErreur("Examen invalide.");
        return;
    }

    try {
        const info = await appeler(`/examens/${examenId}`);

        if (info.en_cours) {
            // Tentative déjà commencée (page actualisée) : on la reprend directement
            await lancerTentative();
        } else if (!info.peut_passer) {
            afficherErreur(info.message_blocage || "Cet examen n'est pas disponible.");
        } else {
            afficherAccueil(info);
        }
    } catch (erreur) {
        afficherErreur(erreur.message);
    }
}

const boutonCommencer = document.getElementById("boutonCommencer");

boutonCommencer.addEventListener("click", () => {
    boutonCommencer.disabled = true;
    definirBouton(boutonCommencer, "play", "Démarrage...");
    lancerTentative();
});

// ---------- Écouteurs d'événements ----------

definirBouton(boutonTerminer, "send", "Terminer l'examen");

boutonPrecedent.addEventListener("click", () => allerALaQuestion(indexQuestion - 1));
boutonSuivant.addEventListener("click", () => allerALaQuestion(indexQuestion + 1));
boutonMarquer.addEventListener("click", basculerMarquage);
boutonTerminer.addEventListener("click", demanderTerminer);

// Raccourcis clavier : flèches pour naviguer, lettres pour répondre
document.addEventListener("keydown", (evenement) => {
    const modaleOuverte = document.querySelector(".fond-modale");
    if (examenTermine || zoneExamen.hidden || modaleOuverte) return;

    if (evenement.key === "ArrowRight") {
        evenement.preventDefault(); // évite que le bouton radio change tout seul
        allerALaQuestion(indexQuestion + 1);
    } else if (evenement.key === "ArrowLeft") {
        evenement.preventDefault();
        allerALaQuestion(indexQuestion - 1);
    } else if (evenement.key.length === 1 && !evenement.ctrlKey && !evenement.metaKey) {
        // A -> 0, B -> 1, C -> 2...
        const position = "abcdef".indexOf(evenement.key.toLowerCase());
        const choix = examen.questions[indexQuestion].choix[position];
        if (position !== -1 && choix) choisirReponse(choix.id);
    }
});

// Avertir l'étudiant s'il essaie de fermer la page pendant l'examen
window.addEventListener("beforeunload", (evenement) => {
    if (!examenTermine && examen) {
        evenement.preventDefault();
        evenement.returnValue = "";
    }
});

// Signaler quand l'étudiant quitte l'onglet de l'examen
document.addEventListener("visibilitychange", () => {
    if (document.hidden && examen && !examenTermine) {
        changementsOnglet++;
        // Le message s'affiche au retour de l'étudiant sur la page
        document.addEventListener("visibilitychange", () => {
            afficherNotification(`Vous avez quitté l'onglet de l'examen (${changementsOnglet} fois).`, "erreur", 4000);
        }, { once: true });
    }
});

demarrer();