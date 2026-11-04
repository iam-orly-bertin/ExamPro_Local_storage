// ====== Page Examens : créer, modifier, dupliquer, lister, supprimer ======
// Règle importante : un examen que des étudiants ont déjà commencé est VERROUILLÉ.
// Il ne peut plus être modifié ni supprimé (on protège les notes déjà enregistrées).
// On peut seulement le DUPLIQUER pour créer une nouvelle version.

const formulaireExamen = document.getElementById("formulaireExamen");
const boutonAfficherFormulaire = document.getElementById("boutonAfficherFormulaire");
const boutonAjouterQuestion = document.getElementById("boutonAjouterQuestion");
const boutonEnregistrer = document.getElementById("boutonEnregistrer");
const boutonAnnuler = document.getElementById("boutonAnnuler");
const titreFormulaire = document.getElementById("titreFormulaire");
const messageMode = document.getElementById("messageMode");
const listeCoursSelect = document.getElementById("coursId");
const champTitreExamen = document.getElementById("titreExamen");
const champDuree = document.getElementById("dureeExamen");
const zoneQuestions = document.getElementById("zoneQuestions");
const corpsExamens = document.getElementById("listeExamens");
const resumeExamens = document.getElementById("resumeExamens");

const blocBase = document.getElementById("blocBase");
const blocQuestions = document.getElementById("blocQuestions");

let numeroQuestion = 0;        // sert à donner un nom unique aux boutons radio
let idExamenModifie = null;    // null = on crée un examen ; sinon = identifiant de l'examen modifié

// ---------- Construction dynamique du formulaire ----------

const LIBELLES_TYPES = {
    choix_unique: "Choix unique (une bonne réponse)",
    choix_multiple: "Choix multiple (plusieurs bonnes réponses)",
    vrai_faux: "Vrai / Faux"
};
const CHOIX_MAX = 10;

// Lit les choix actuellement saisis dans un bloc question
function lireChoixDuBloc(bloc) {
    return Array.from(bloc.querySelectorAll(".ligne-choix")).map(ligne => ({
        texte: ligne.querySelector(".champ-choix").value.trim(),
        est_correcte: ligne.querySelector(".case-bonne").checked
    }));
}

// Ajoute une ligne de choix : case "bonne réponse" + texte + bouton retirer.
// Choix unique et Vrai/Faux : bouton radio. Choix multiple : case à cocher.
// Vrai/Faux : les deux textes sont imposés et ne peuvent pas être retirés.
function ajouterChoix(bloc, donnees = null) {
    const type = bloc.querySelector(".champ-type").value;
    const zoneChoix = bloc.querySelector(".zone-choix");
    const ligne = creerElement("div", "ligne-choix");

    const case_ = creerElement("input", "case-bonne");
    case_.type = type === "choix_multiple" ? "checkbox" : "radio";
    case_.name = `bonne_reponse_${bloc.dataset.numero}`; // un seul radio coché par question
    case_.title = "Bonne réponse";

    const texte = creerElement("input", "champ-choix");
    texte.type = "text";
    texte.placeholder = "Texte du choix";

    if (donnees) {
        texte.value = donnees.texte;
        case_.checked = donnees.est_correcte;
    }

    ligne.append(case_, texte);

    if (type === "vrai_faux") {
        texte.readOnly = true;
    } else {
        const boutonRetirer = creerElement("button", "bouton danger petit icone-seule");
        boutonRetirer.innerHTML = icone("x");
        boutonRetirer.title = "Retirer ce choix";
        boutonRetirer.setAttribute("aria-label", "Retirer ce choix");
        boutonRetirer.type = "button";
        boutonRetirer.addEventListener("click", () => {
            if (zoneChoix.children.length <= 2) {
                afficherNotification("Une question doit avoir au moins 2 choix.", "erreur");
                return;
            }
            ligne.remove();
        });
        ligne.append(boutonRetirer);
    }

    zoneChoix.appendChild(ligne);
}

// Redessine tous les choix d'un bloc selon son type
function afficherChoix(bloc, choix) {
    bloc.querySelector(".zone-choix").replaceChildren();
    choix.forEach(element => ajouterChoix(bloc, element));
    bloc.querySelector(".bouton-ajouter-choix").hidden =
        bloc.querySelector(".champ-type").value === "vrai_faux";
}

// Quand l'admin change le type : on adapte les choix existants
function changerType(bloc) {
    const type = bloc.querySelector(".champ-type").value;
    let choix = lireChoixDuBloc(bloc);

    if (type === "vrai_faux") {
        choix = [
            { texte: "Vrai", est_correcte: true },
            { texte: "Faux", est_correcte: false }
        ];
    } else if (type === "choix_unique") {
        // Une seule bonne réponse : on garde la première cochée
        let trouvee = false;
        choix = choix.map(element => {
            const correcte = element.est_correcte && !trouvee;
            if (correcte) trouvee = true;
            return { ...element, est_correcte: correcte };
        });
    }

    while (choix.length < 2) {
        choix.push({ texte: "", est_correcte: false });
    }

    afficherChoix(bloc, choix);
}

// Ajoute un bloc question.
// Sans "donnees" : question vide avec 2 choix. Avec "donnees" : question pré-remplie.
function ajouterQuestion(donnees = null) {
    numeroQuestion++;

    const bloc = creerElement("div", "bloc-question");
    bloc.dataset.numero = numeroQuestion;

    const entete = creerElement("div", "ligne-entete");
    const titre = creerElement("strong", "titre-question");
    const boutonSupprimer = creerElement("button", "bouton danger petit");
    boutonSupprimer.innerHTML = `${icone("trash")}<span>Supprimer la question</span>`;
    boutonSupprimer.type = "button";
    boutonSupprimer.addEventListener("click", () => {
        bloc.remove();
        renumeroterQuestions();
        mettreAJourTotalPoints();
    });
    entete.append(titre, boutonSupprimer);

    const champQuestion = creerElement("input", "champ-question");
    champQuestion.type = "text";
    champQuestion.placeholder = "Texte de la question";

    // Type de question et nombre de points
    const ligneOptions = creerElement("div", "ligne-options");

    const selectType = creerElement("select", "champ-type");
    selectType.title = "Type de question";
    Object.entries(LIBELLES_TYPES).forEach(([valeur, libelle]) => {
        const option = creerElement("option", "", libelle);
        option.value = valeur;
        selectType.appendChild(option);
    });
    selectType.addEventListener("change", () => changerType(bloc));

    const etiquettePoints = creerElement("label", "etiquette-points", "Points");
    const champPoints = creerElement("input", "champ-points");
    champPoints.type = "number";
    champPoints.min = "0.25";
    champPoints.max = "100";
    champPoints.step = "0.25";
    champPoints.value = "1";
    champPoints.title = "Points de la question";
    champPoints.addEventListener("input", mettreAJourTotalPoints);
    etiquettePoints.appendChild(champPoints);

    ligneOptions.append(selectType, etiquettePoints);

    const zoneChoix = creerElement("div", "zone-choix");
    const boutonChoix = creerElement("button", "bouton secondaire petit bouton-ajouter-choix");
    boutonChoix.innerHTML = `${icone("plus")}<span>Ajouter un choix</span>`;
    boutonChoix.type = "button";
    boutonChoix.addEventListener("click", () => {
        if (zoneChoix.children.length >= CHOIX_MAX) {
            afficherNotification(`Une question peut avoir ${CHOIX_MAX} choix au maximum.`, "erreur");
            return;
        }
        ajouterChoix(bloc);
    });

    const champExplication = creerElement("textarea", "champ-explication");
    champExplication.rows = 2;
    champExplication.maxLength = 1000;
    champExplication.placeholder = "Explication affichée à l'étudiant après la correction (facultatif)";

    bloc.append(entete, champQuestion, ligneOptions, zoneChoix, boutonChoix, champExplication);
    zoneQuestions.appendChild(bloc);

    if (donnees) {
        champQuestion.value = donnees.texte;
        selectType.value = LIBELLES_TYPES[donnees.type] ? donnees.type : "choix_unique";
        champPoints.value = donnees.points ?? 1;
        champExplication.value = donnees.explication || "";
        afficherChoix(bloc, donnees.choix);
    } else {
        afficherChoix(bloc, [
            { texte: "", est_correcte: false },
            { texte: "", est_correcte: false }
        ]);
    }

    renumeroterQuestions();
    mettreAJourTotalPoints();
}

// Réécrit "Question 1", "Question 2"... après un ajout ou une suppression
function renumeroterQuestions() {
    document.querySelectorAll(".titre-question").forEach((titre, index) => {
        titre.textContent = `Question ${index + 1}`;
    });
}

// Affiche le total des points de l'examen
function mettreAJourTotalPoints() {
    const total = Array.from(document.querySelectorAll(".champ-points"))
        .reduce((somme, champ) => somme + (Number(champ.value) || 0), 0);
    const nombre = document.querySelectorAll(".bloc-question").length;

    document.getElementById("totalPoints").textContent =
        `${nombre} question(s) • total : ${Math.round(total * 100) / 100} point(s)`;
}

// ---------- Lecture et vérification du formulaire ----------

// Transforme le formulaire en tableau de questions pour le serveur
function lireQuestions() {
    const blocs = Array.from(document.querySelectorAll(".bloc-question"));

    return blocs.map(bloc => ({
        texte: bloc.querySelector(".champ-question").value.trim(),
        type: bloc.querySelector(".champ-type").value,
        points: Number(bloc.querySelector(".champ-points").value),
        explication: bloc.querySelector(".champ-explication").value.trim(),
        choix: lireChoixDuBloc(bloc)
    }));
}

// Renvoie un message d'erreur, ou "" si tout est correct
function verifierExamen(coursId, titre, duree, questions) {
    if (coursId === "") return "Choisissez un cours.";
    if (titre === "") return "Le titre est obligatoire.";
    if (!(duree > 0)) return "La durée doit être supérieure à 0.";
    if (questions.length === 0) return "Ajoutez au moins une question.";

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const numero = i + 1;
        if (question.texte === "") return `Le texte de la question ${numero} est vide.`;
        if (!(question.points > 0) || question.points > 100) {
            return `Les points de la question ${numero} doivent être entre 0,25 et 100.`;
        }
        if (question.choix.some(choix => choix.texte === "")) return `La question ${numero} a un choix vide.`;

        const nombreBonnes = question.choix.filter(choix => choix.est_correcte).length;

        if (question.type === "choix_multiple") {
            if (nombreBonnes < 1) return `La question ${numero} doit avoir au moins une bonne réponse.`;
        } else if (nombreBonnes !== 1) {
            return `La question ${numero} doit avoir une seule bonne réponse.`;
        }
    }
    return "";
}

// ---------- Ouverture et fermeture du formulaire ----------

// mode = "creer", "modifier" ou "dupliquer" : change seulement les textes affichés
function afficherFormulaire(mode) {
    const titres = {
        creer: "Créer un examen",
        modifier: "Modifier l'examen",
        dupliquer: "Dupliquer l'examen"
    };

    titreFormulaire.textContent = titres[mode];
    boutonEnregistrer.textContent =
        mode === "modifier" ? "Enregistrer les modifications" : "Enregistrer l'examen";

    // Petit message pour expliquer ce qui va se passer
    messageMode.hidden = mode === "creer";
    if (mode === "modifier") {
        messageMode.innerHTML = `${icone("pencil")}<span>Vous modifiez un examen que personne n'a encore commencé.</span>`;
    } else if (mode === "dupliquer") {
        messageMode.innerHTML = `${icone("copy")}<span>Une copie sera enregistrée comme nouvel examen. L'original ne change pas.</span>`;
    }

    formulaireExamen.hidden = false;
    definirBouton(boutonAfficherFormulaire, "x", "Fermer le formulaire");
}

function reinitialiserFormulaire() {
    formulaireExamen.reset();
    blocBase.hidden = false;
    blocQuestions.hidden = false;
    zoneQuestions.replaceChildren();
    formulaireExamen.hidden = true;
    messageMode.hidden = true;
    definirBouton(boutonAfficherFormulaire, "plus", "Nouvel examen");
    idExamenModifie = null;
}

// Charge un examen depuis le serveur et remplit le formulaire avec ses données.
// mode "modifier" : on garde son identifiant pour le mettre à jour ensuite.
// mode "dupliquer" : pas d'identifiant, donc l'enregistrement créera un nouvel examen.
async function preparerExamenDansFormulaire(id, mode) {
    try {
        const examen = await appeler(`/admin/examens/${id}`);

        reinitialiserFormulaire();

        listeCoursSelect.value = String(examen.cours_id);
        champTitreExamen.value = mode === "dupliquer" ? `${examen.titre} (copie)` : examen.titre;
        champDuree.value = examen.duree_minutes;
        examen.questions.forEach(question => ajouterQuestion(question));

        idExamenModifie = mode === "modifier" ? examen.id : null;
        afficherFormulaire(mode);
        formulaireExamen.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

// ---------- Échanges avec le serveur ----------

async function chargerCoursDansListe() {
    try {
        const cours = await appeler("/admin/cours");
        listeCoursSelect.innerHTML = `<option value="">Choisir un cours</option>` +
            cours.map(element => `<option value="${element.id}">${echapperHTML(element.titre)}</option>`).join("");
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

// Un examen est verrouillé dès qu'un étudiant l'a commencé ou terminé
function estVerrouille(examen) {
    return examen.nombre_tentatives > 0 || examen.nombre_resultats > 0;
}

function creerLigneExamen(examen) {
    const verrouille = estVerrouille(examen);

    // Colonne "Étudiants" : combien l'ont commencé
    const etudiants = verrouille
        ? `<span class="badge verrouille" title="Examen verrouillé : des étudiants l'ont commencé">${icone("lock")}${Math.max(examen.nombre_tentatives, examen.nombre_resultats)}</span>`
        : `<span class="badge libre" title="Aucun étudiant ne l'a encore commencé">0</span>`;

    // Boutons : un examen verrouillé ne peut être que dupliqué
    const boutons = verrouille
        ? `<button class="bouton secondaire petit" data-action="dupliquer" data-id="${examen.id}">${icone("copy")}<span>Dupliquer</span></button>`
        : `<button class="bouton secondaire petit" data-action="modifier" data-id="${examen.id}">${icone("pencil")}<span>Modifier</span></button>
           <button class="bouton secondaire petit" data-action="dupliquer" data-id="${examen.id}">${icone("copy")}<span>Dupliquer</span></button>
           <button class="bouton danger petit" data-action="supprimer" data-id="${examen.id}">${icone("trash")}<span>Supprimer</span></button>`;

    return `
        <tr>
            <td data-label="Titre"><strong>${echapperHTML(examen.titre)}</strong></td>
            <td data-label="Cours">${echapperHTML(examen.cours_titre)}</td>
            <td data-label="Durée">${examen.duree_minutes} min</td>
            <td data-label="Questions">${examen.nombre_questions}</td>
            <td data-label="Étudiants">${etudiants}</td>
            <td class="cellule-actions"><div class="actions">${boutons}</div></td>
        </tr>`;
}

async function chargerExamens() {
    try {
        const examens = await appeler("/admin/examens");

        // reduce() additionne le nombre de questions de tous les examens
        const totalQuestions = examens.reduce((somme, examen) => somme + examen.nombre_questions, 0);
        const nombreVerrouilles = examens.filter(estVerrouille).length;
        resumeExamens.textContent =
            `${examens.length} examen(s) • ${totalQuestions} question(s) au total • ${nombreVerrouilles} verrouillé(s)`;

        if (examens.length === 0) {
            corpsExamens.innerHTML = `<tr><td colspan="6" class="vide">Aucun examen.</td></tr>`;
            return;
        }

        corpsExamens.innerHTML = examens.map(creerLigneExamen).join("");
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

// Enregistrement : POST pour créer, PUT pour modifier
formulaireExamen.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();

    const questions = lireQuestions();
    const message = verifierExamen(listeCoursSelect.value, champTitreExamen.value.trim(), Number(champDuree.value), questions);

    if (message !== "") {
        afficherNotification(message, "erreur");
        return;
    }

    const enModification = idExamenModifie !== null;
    const chemin = enModification ? `/admin/examens/${idExamenModifie}` : "/admin/examens";

    boutonEnregistrer.disabled = true;

    try {
        await appeler(chemin, {
            method: enModification ? "PUT" : "POST",
            body: JSON.stringify({
                cours_id: Number(listeCoursSelect.value),
                titre: champTitreExamen.value.trim(),
                duree_minutes: Number(champDuree.value),
                questions
            })
        });
        afficherNotification(enModification ? "Examen modifié avec succès." : "Examen créé avec succès.", "succes");
        reinitialiserFormulaire();
        chargerExamens();
    } catch (erreur) {
        // Exemple : un étudiant a commencé l'examen pendant que vous le modifiiez
        afficherNotification(erreur.message, "erreur");
        chargerExamens(); // on rafraîchit la liste pour afficher l'état réel (verrouillé ou non)
    } finally {
        boutonEnregistrer.disabled = false;
    }
});

// Un seul écouteur pour tous les boutons du tableau (délégation d'événement)
corpsExamens.addEventListener("click", async (evenement) => {
    const bouton = evenement.target.closest("button");
    if (!bouton) return;

    const id = Number(bouton.dataset.id);
    const action = bouton.dataset.action;

    if (action === "modifier" || action === "dupliquer") {
        preparerExamenDansFormulaire(id, action);
        return;
    }

    if (action === "supprimer") {
        if (!await confirmer("Supprimer cet examen et ses questions ?")) return;
        try {
            await appeler(`/admin/examens/${id}`, { method: "DELETE" });
            afficherNotification("Examen supprimé.", "succes");
            chargerExamens();
        } catch (erreur) {
            afficherNotification(erreur.message, "erreur");
            chargerExamens(); // l'examen a peut-être été verrouillé entre-temps
        }
    }
});

// Afficher ou cacher le formulaire
boutonAfficherFormulaire.addEventListener("click", () => {
    if (!formulaireExamen.hidden) {
        reinitialiserFormulaire(); // le formulaire est ouvert : on le ferme
        return;
    }
    afficherFormulaire("creer");
    ajouterQuestion();
});

boutonAjouterQuestion.addEventListener("click", () => ajouterQuestion());
boutonAnnuler.addEventListener("click", reinitialiserFormulaire);

chargerCoursDansListe();
chargerExamens();