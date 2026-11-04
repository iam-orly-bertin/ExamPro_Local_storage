// ====== Tableau de bord : statistiques et derniers utilisateurs ======
const titreSalutation = document.getElementById("salutation");
const corpsUtilisateurs = document.getElementById("derniersUtilisateurs");

// Message de bienvenue selon l'heure de la journée
function afficherSalutation() {
    const heure = new Date().getHours();
    const formule = heure < 18 ? "Bonjour" : "Bonsoir";
    const utilisateur = JSON.parse(sessionStorage.getItem("utilisateur") || "{}");
    titreSalutation.textContent = `${formule}, ${utilisateur.nom || "administrateur"}`;
    const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    document.getElementById("dateJour").textContent = date.charAt(0).toUpperCase() + date.slice(1);
}

// Fait défiler un nombre de 0 jusqu'à sa valeur finale
function animerCompteur(idElement, valeurFinale) {
    const element = document.getElementById(idElement);
    const pas = Math.max(1, Math.ceil(valeurFinale / 30));
    let valeur = 0;

    const minuteur = setInterval(() => {
        valeur += pas;
        if (valeur >= valeurFinale) {
            valeur = valeurFinale;
            clearInterval(minuteur); // on arrête l'animation
        }
        element.textContent = valeur;
    }, 30);
}

function afficherUtilisateurs(utilisateurs) {
    if (utilisateurs.length === 0) {
        corpsUtilisateurs.innerHTML = `<tr><td colspan="3" class="vide">Aucun utilisateur.</td></tr>`;
        return;
    }
    corpsUtilisateurs.innerHTML = utilisateurs.map(utilisateur => `
        <tr>
            <td data-label="Nom">${echapperHTML(utilisateur.nom)}</td>
            <td data-label="Email">${echapperHTML(utilisateur.email)}</td>
            <td data-label="Rôle"><span class="badge ${utilisateur.role}">${utilisateur.role === "admin" ? "Administrateur" : "Étudiant"}</span></td>
        </tr>`).join("");
}

async function chargerTableauDeBord() {
    try {
        // Les deux requêtes partent en même temps
        const [statistiques, recents] = await Promise.all([
            appeler("/admin/statistiques"),
            appeler("/admin/utilisateurs/recents")
        ]);

        animerCompteur("nbEtudiants", statistiques.etudiants);
        animerCompteur("nbCours", statistiques.cours);
        animerCompteur("nbExamens", statistiques.examens);
        animerCompteur("nbResultats", statistiques.resultats);
        afficherUtilisateurs(recents);
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

afficherSalutation();
chargerTableauDeBord();
