// ====== Page Examens : recherche, filtre, tri et démarrage d'un examen ======
const champRecherche = document.getElementById("recherche");
const listeFiltre = document.getElementById("filtreEtat");
const listeTri = document.getElementById("triExamens");
const zoneExamens = document.getElementById("listeExamens");
const resumeExamens = document.getElementById("resumeExamens");

let tousLesExamens = [];

// Trie une copie de la liste selon le choix de l'étudiant
function trierExamens(liste) {
    const copie = [...liste];

    if (listeTri.value === "titre") {
        copie.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
    } else if (listeTri.value === "duree") {
        copie.sort((a, b) => a.duree_minutes - b.duree_minutes);
    } else {
        copie.sort((a, b) => b.id - a.id); // plus récents d'abord
    }
    return copie;
}

// Fabrique le HTML d'une carte d'examen
function creerCarteExamen(examen) {
    let etat;
    let bouton;
    let note = "";

    // Dernière note obtenue, s'il y en a une
    if (examen.deja_passe) {
        const pourcentage = calculerPourcentage(examen.score_precedent, examen.total_precedent);
        note = `<span class="badge ${niveauNote(pourcentage)}">${formaterPoints(examen.score_precedent)} / ${formaterPoints(examen.total_precedent)} (${pourcentage} %)</span>`;
    }

    if (examen.en_cours) {
        etat = `<span class="badge attente">${icone("clock")}En cours</span>`;
        bouton = `<button type="button" class="bouton petit" data-id="${examen.id}">${icone("play")}<span>Reprendre</span></button>`;
    } else if (examen.peut_passer) {
        etat = note || `<span class="badge attente">À passer</span>`;
        bouton = `<button type="button" class="bouton petit" data-id="${examen.id}">${icone(examen.deja_passe ? "rotate-ccw" : "play")}<span>${examen.deja_passe ? "Nouvelle tentative" : "Commencer"}</span></button>`;
    } else {
        etat = note || `<span class="badge neutre">Terminé</span>`;
        bouton = `<button type="button" class="bouton secondaire petit" disabled>${icone("check")}<span>Déjà passé</span></button>`;
    }

    return `
        <article class="carte carte-examen">
            <div class="tete">
                <h2>${echapperHTML(examen.titre)}</h2>
            </div>
            <div class="meta-ligne">
                <span class="badge neutre">${echapperHTML(examen.cours)}</span>
                <span class="element">${icone("clock")}${examen.duree_minutes} min</span>
            </div>
            <div class="pied">${etat}${bouton}</div>
        </article>`;
}

// 1. Filtrer  2. Trier  3. Afficher
function afficherExamens() {
    const mot = champRecherche.value.trim().toLowerCase();
    const etat = listeFiltre.value;

    const filtres = tousLesExamens.filter(examen => {
        const texte = `${examen.titre} ${examen.cours}`.toLowerCase();
        if (!texte.includes(mot)) return false;
        if (etat === "a_passer" && examen.deja_passe) return false;
        if (etat === "passes" && !examen.deja_passe) return false;
        return true;
    });

    const liste = trierExamens(filtres);
    resumeExamens.textContent = `${liste.length} examen(s) affiché(s) sur ${tousLesExamens.length}`;

    if (liste.length === 0) {
        zoneExamens.innerHTML = `<p class="vide vide-grille">Aucun examen trouvé.</p>`;
        return;
    }
    zoneExamens.innerHTML = liste.map(creerCarteExamen).join("");
}

async function chargerExamens() {
    try {
        tousLesExamens = await appeler("/examens");
        afficherExamens();
    } catch (erreur) {
        resumeExamens.textContent = "";
        afficherNotification(erreur.message, "erreur");
    }
}

// Un seul écouteur pour tous les boutons (délégation d'événement).
// La page de l'examen affiche elle-même l'écran « Commencer ».
zoneExamens.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-id]");
    if (!bouton) return;

    window.location.href = `passer_examen.html?id=${bouton.dataset.id}`;
});

champRecherche.addEventListener("input", afficherExamens);
listeFiltre.addEventListener("change", afficherExamens);
listeTri.addEventListener("change", afficherExamens);

chargerExamens();