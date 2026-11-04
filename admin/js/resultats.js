// ====== Page Résultats : recherche, tri par colonne et statistiques ======
const champRecherche = document.getElementById("recherche");
const corpsResultats = document.getElementById("listeResultats");
const enTetes = document.querySelectorAll("th[data-cle]");

let tousLesResultats = [];
let cleTri = "date_passage";
let triCroissant = false;

function calculerPourcentage(resultat) {
    if (resultat.total_questions === 0) return 0;
    return Math.round((resultat.score / resultat.total_questions) * 100);
}

// Date SQLite (UTC) convertie en date lisible
function formaterDate(texte) {
    const date = new Date(texte.replace(" ", "T") + "Z");
    return date.toLocaleString("fr-FR");
}

// Valeur utilisée pour comparer deux lignes selon la colonne choisie
function valeurDeTri(resultat) {
    if (cleTri === "pourcentage") return calculerPourcentage(resultat);
    return resultat[cleTri] ?? "";
}

function afficherResultats() {
    const mot = champRecherche.value.trim().toLowerCase();

    // 1. Filtrer
    const liste = tousLesResultats.filter(resultat =>
        `${resultat.etudiant_nom} ${resultat.etudiant_email} ${resultat.examen_titre}`.toLowerCase().includes(mot)
    );

    // 2. Trier
    liste.sort((a, b) => {
        const valeurA = valeurDeTri(a);
        const valeurB = valeurDeTri(b);
        if (valeurA < valeurB) return triCroissant ? -1 : 1;
        if (valeurA > valeurB) return triCroissant ? 1 : -1;
        return 0;
    });

    // 3. Statistiques sur la liste affichée
    const pourcentages = liste.map(calculerPourcentage);
    const somme = pourcentages.reduce((total, valeur) => total + valeur, 0);
    document.getElementById("nbResultats").textContent = liste.length;
    document.getElementById("moyenne").textContent = (liste.length ? Math.round(somme / liste.length) : 0) + " %";
    document.getElementById("meilleure").textContent = (liste.length ? Math.max(...pourcentages) : 0) + " %";

    // 4. Afficher
    if (liste.length === 0) {
        corpsResultats.innerHTML = `<tr><td colspan="6" class="vide">Aucun résultat trouvé.</td></tr>`;
        return;
    }

    corpsResultats.innerHTML = liste.map(resultat => {
        const pourcentage = calculerPourcentage(resultat);
        // La couleur du badge dépend de la note
        const niveau = pourcentage >= 70 ? "bon" : pourcentage >= 50 ? "moyen" : "faible";

        return `
            <tr>
                <td data-label="Étudiant"><div class="cellule-identite"><span class="avatar">${echapperHTML(String(resultat.etudiant_nom || "?").trim().charAt(0).toUpperCase())}</span><div><strong>${echapperHTML(resultat.etudiant_nom || "Inconnu")}</strong><small>${echapperHTML(resultat.etudiant_email || "")}</small></div></div></td>
                <td data-label="Examen"><div>${echapperHTML(resultat.examen_titre || "Inconnu")}${resultat.tentative_numero > 1 ? `<small>Tentative n°${resultat.tentative_numero}</small>` : ""}</div></td>
                <td data-label="Note">${formaterPoints(resultat.score)} / ${formaterPoints(resultat.total_questions)}</td>
                <td data-label="Pourcentage"><span class="badge ${niveau}">${pourcentage} %</span></td>
                <td data-label="Date">${formaterDate(resultat.date_passage)}</td>
                <td class="cellule-actions"><div class="actions">
                    <button class="bouton secondaire petit" data-action="copie" data-id="${resultat.id}">${icone("eye")}<span>Voir la copie</span></button>
                    <button class="bouton secondaire petit" data-action="autoriser" data-examen="${resultat.examen_id}" data-etudiant="${resultat.utilisateur_id}">${icone("rotate-ccw")}<span>Nouvelle tentative</span></button>
                </div></td>
            </tr>`;
    }).join("");
}

// Flèche sur la colonne triée (la flèche est dessinée par le CSS)
function marquerColonneTriee() {
    enTetes.forEach(entete => {
        entete.classList.remove("tri-croissant", "tri-decroissant");
        if (entete.dataset.cle === cleTri) {
            entete.classList.add(triCroissant ? "tri-croissant" : "tri-decroissant");
        }
    });
}

enTetes.forEach(entete => {
    entete.addEventListener("click", () => {
        // Deuxième clic sur la même colonne : on inverse le sens
        triCroissant = (cleTri === entete.dataset.cle) ? !triCroissant : true;
        cleTri = entete.dataset.cle;
        marquerColonneTriee();
        afficherResultats();
    });
});

champRecherche.addEventListener("input", afficherResultats);

async function chargerResultats() {
    try {
        tousLesResultats = await appeler("/admin/resultats");
        marquerColonneTriee();
        afficherResultats();
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

// ---------- Copie détaillée d'un étudiant ----------
const dialogueCopie = document.getElementById("dialogueCopie");
const contenuCopie = document.getElementById("contenuCopie");

const LIBELLES_TYPES = {
    choix_unique: "Choix unique",
    choix_multiple: "Choix multiple",
    vrai_faux: "Vrai / Faux"
};

// 2 -> "2", 1.5 -> "1,5"
function formaterPoints(nombre) {
    return String(Math.round(Number(nombre) * 100) / 100).replace(".", ",");
}

function creerBlocQuestionCopie(question, numero) {
    const statut = !question.repondu
        ? ["Sans réponse", "moyen"]
        : question.correcte ? ["Correcte", "bon"] : ["Incorrecte", "faible"];

    const choix = question.choix.map(element => {
        const marques = [];
        if (element.est_correcte) marques.push(`<span class="marque">${icone("check")}Bonne réponse</span>`);
        if (element.choisi) marques.push(`<span class="marque">${icone("user")}Réponse de l'étudiant</span>`);

        const classe = element.est_correcte ? "choix-juste" : (element.choisi ? "choix-faux" : "");
        const note = marques.length ? marques.join("") : "";
        return `<li class="${classe}">${echapperHTML(element.texte)}${note}</li>`;
    }).join("");

    const typeQuestion = LIBELLES_TYPES[question.type] || "Choix unique";
    const explication = question.explication
        ? `<p class="explication-copie"><strong>Explication :</strong> ${echapperHTML(question.explication)}</p>`
        : "";

    return `
        <div class="question-copie">
            <div class="ligne-copie">
                <strong>${numero}. ${echapperHTML(question.texte)}</strong>
                <span class="badge ${statut[1]}">${statut[0]}</span>
            </div>
            <small class="meta-question">${typeQuestion} • ${formaterPoints(question.points_obtenus)} / ${formaterPoints(question.points)} point(s)</small>
            <ul>${choix}</ul>
            ${explication}
        </div>`;
}

async function voirCopie(id) {
    try {
        const copie = await appeler(`/admin/resultats/${id}/copie`);
        const pourcentage = calculerPourcentage(copie);
        const reussi = pourcentage >= copie.note_reussite;

        const detail = copie.copie_enregistree
            ? copie.questions.map((question, index) => creerBlocQuestionCopie(question, index + 1)).join("")
            : `<p class="vide">Aucune réponse enregistrée pour ce passage (temps écoulé sans envoi, ou passage antérieur à cette fonction).</p>`;

        contenuCopie.innerHTML = `
            <h2>${echapperHTML(copie.examen_titre || "Examen")}</h2>
            <p>${echapperHTML(copie.etudiant_nom || "Inconnu")} (${echapperHTML(copie.etudiant_email || "")})
               ${copie.tentative_numero ? ` • tentative n°${copie.tentative_numero}` : ""}
               • ${formaterDate(copie.date_passage)}</p>
            <p><strong>${formaterPoints(copie.score)} / ${formaterPoints(copie.total_questions)} point(s)</strong> (${pourcentage} %)
               <span class="badge ${reussi ? "bon" : "faible"}">${reussi ? "Réussi" : "Échec"}</span></p>
            ${detail}`;

        dialogueCopie.showModal();
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

async function autoriserTentative(examenId, etudiantId) {
    if (!await confirmer("Autoriser une nouvelle tentative à cet étudiant pour cet examen ?")) return;

    try {
        const reponse = await appeler(`/admin/examens/${examenId}/autoriser-tentative`, {
            method: "POST",
            body: JSON.stringify({ utilisateur_id: Number(etudiantId) })
        });
        afficherNotification(reponse.message, "succes");

        if (reponse.avertissement) {
            afficherNotification(reponse.avertissement, "erreur");
        }
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

corpsResultats.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-action]");
    if (!bouton) return;

    if (bouton.dataset.action === "copie") {
        voirCopie(Number(bouton.dataset.id));
    } else if (bouton.dataset.action === "autoriser") {
        autoriserTentative(bouton.dataset.examen, bouton.dataset.etudiant);
    }
});

document.getElementById("fermerCopie").addEventListener("click", () => dialogueCopie.close());

chargerResultats();