// ====== Page Cours : ajouter, modifier, supprimer et rechercher ======
const formulaireCours = document.getElementById("formulaireCours");
const champTitre = document.getElementById("titre");
const champDescription = document.getElementById("description");
const compteurCaracteres = document.getElementById("compteurCaracteres");
const titreFormulaire = document.getElementById("titreFormulaire");
const boutonEnregistrer = document.getElementById("boutonEnregistrer");
const boutonAnnuler = document.getElementById("boutonAnnuler");
const champRecherche = document.getElementById("recherche");
const corpsCours = document.getElementById("listeCours");

let tousLesCours = [];
let idEnModification = null; // null = on ajoute ; sinon on modifie ce cours

async function chargerCours() {
    try {
        tousLesCours = await appeler("/admin/cours");
        afficherCours();
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

// Affiche les cours qui correspondent à la recherche
function afficherCours() {
    const mot = champRecherche.value.trim().toLowerCase();
    const coursFiltres = tousLesCours.filter(cours => cours.titre.toLowerCase().includes(mot));

    if (coursFiltres.length === 0) {
        corpsCours.innerHTML = `<tr><td colspan="3" class="vide">Aucun cours trouvé.</td></tr>`;
        return;
    }

    corpsCours.innerHTML = coursFiltres.map(cours => `
        <tr>
            <td data-label="Titre"><strong>${echapperHTML(cours.titre)}</strong></td>
            <td data-label="Description">${echapperHTML(cours.description || "—")}</td>
            <td class="cellule-actions"><div class="actions">
                <button class="bouton secondaire petit" data-action="modifier" data-id="${cours.id}">${icone("pencil")}<span>Modifier</span></button>
                <button class="bouton danger petit" data-action="supprimer" data-id="${cours.id}">${icone("trash")}<span>Supprimer</span></button>
            </div></td>
        </tr>`).join("");
}

// Compteur de caractères qui devient rouge près de la limite
function mettreAJourCompteur() {
    const longueur = champDescription.value.length;
    compteurCaracteres.textContent = `${longueur} / 200`;
    compteurCaracteres.classList.toggle("alerte", longueur > 180);
}

function reinitialiserFormulaire() {
    formulaireCours.reset();
    idEnModification = null;
    titreFormulaire.textContent = "Ajouter un cours";
    boutonEnregistrer.textContent = "Enregistrer";
    boutonAnnuler.hidden = true;
    mettreAJourCompteur();
}

// Remplit le formulaire avec le cours choisi
function preparerModification(id) {
    const cours = tousLesCours.find(element => element.id === id);
    idEnModification = id;
    champTitre.value = cours.titre;
    champDescription.value = cours.description || "";
    titreFormulaire.textContent = "Modifier le cours";
    boutonEnregistrer.textContent = "Mettre à jour";
    boutonAnnuler.hidden = false;
    mettreAJourCompteur();
    formulaireCours.scrollIntoView({ behavior: "smooth" });
    champTitre.focus();
}

async function supprimerCours(id) {
    if (!await confirmer("Voulez-vous vraiment supprimer ce cours ?")) return;
    try {
        await appeler(`/admin/cours/${id}`, { method: "DELETE" });
        afficherNotification("Cours supprimé.", "succes");
        chargerCours();
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

formulaireCours.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();

    const titre = champTitre.value.trim();
    if (titre === "") {
        marquerErreur(champTitre);
        afficherNotification("Le titre est obligatoire.", "erreur");
        return;
    }

    const donnees = { titre, description: champDescription.value.trim() };
    const estModification = idEnModification !== null;

    try {
        await appeler(estModification ? `/admin/cours/${idEnModification}` : "/admin/cours", {
            method: estModification ? "PUT" : "POST",
            body: JSON.stringify(donnees)
        });
        afficherNotification(estModification ? "Cours modifié." : "Cours ajouté.", "succes");
        reinitialiserFormulaire();
        chargerCours();
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
});

// Un seul écouteur pour tous les boutons du tableau (délégation d'événements)
corpsCours.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button");
    if (!bouton) return;

    const id = Number(bouton.dataset.id);
    if (bouton.dataset.action === "modifier") preparerModification(id);
    if (bouton.dataset.action === "supprimer") supprimerCours(id);
});

champRecherche.addEventListener("input", afficherCours);
champDescription.addEventListener("input", mettreAJourCompteur);
boutonAnnuler.addEventListener("click", reinitialiserFormulaire);

chargerCours();
