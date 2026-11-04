// ====== Tableau de bord : statistiques, prochain examen et derniers résultats ======
const titreSalutation = document.getElementById("salutation");
const zoneProchainExamen = document.getElementById("prochainExamen");
const corpsResultats = document.getElementById("derniersResultats");

// Message de bienvenue selon l'heure de la journée
function afficherSalutation() {
    const heure = new Date().getHours();
    const formule = heure < 18 ? "Bonjour" : "Bonsoir";
    titreSalutation.textContent = `${formule}, ${lireUtilisateur().nom || "étudiant"}`;
    const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    document.getElementById("dateJour").textContent = date.charAt(0).toUpperCase() + date.slice(1);
}

// Affiche le premier examen que l'étudiant n'a pas encore passé
function afficherProchainExamen(examensAPasser) {
    if (examensAPasser.length === 0) {
        zoneProchainExamen.innerHTML = `
            <div class="etat-vide">
                <span class="stat-icone">${icone("check-circle", 24)}</span>
                <p>Aucun examen en attente. Vous êtes à jour.</p>
            </div>`;
        return;
    }

    const examen = examensAPasser[0];
    zoneProchainExamen.innerHTML = `
        <div class="prochain-examen">
            <span class="stat-icone">${icone("file-text", 24)}</span>
            <div class="infos">
                <h3>${echapperHTML(examen.titre)}</h3>
                <div class="meta-ligne">
                    <span class="badge neutre">${echapperHTML(examen.cours)}</span>
                    <span class="element">${icone("clock")}${examen.duree_minutes} minutes</span>
                </div>
            </div>
            <a href="examens.html" class="bouton">${icone("arrow-right")}<span>Voir les examens</span></a>
        </div>`;
}

function afficherDerniersResultats(resultats) {
    if (resultats.length === 0) {
        corpsResultats.innerHTML = `<tr><td colspan="4" class="vide">Vous n'avez encore passé aucun examen.</td></tr>`;
        return;
    }

    corpsResultats.innerHTML = resultats.map(resultat => {
        const pourcentage = calculerPourcentage(resultat.score, resultat.total_questions);
        return `
        <tr>
            <td data-label="Examen">${echapperHTML(resultat.examen)}</td>
            <td data-label="Score">${formaterPoints(resultat.score)} / ${formaterPoints(resultat.total_questions)}</td>
            <td data-label="Note"><span class="badge ${niveauNote(pourcentage)}">${pourcentage} %</span></td>
            <td data-label="Date">${formaterDate(resultat.date_passage)}</td>
        </tr>`;
    }).join("");
}

async function chargerTableauDeBord() {
    try {
        // Les deux requêtes partent en même temps
        const [examens, resultats] = await Promise.all([
            appeler("/examens"),
            appeler("/examens/resultats/mes-resultats")
        ]);

        const examensAPasser = examens.filter(examen => !examen.deja_passe);
        const pourcentages = resultats.map(resultat =>
            calculerPourcentage(resultat.score, resultat.total_questions)
        );

        // reduce() additionne tous les pourcentages pour calculer la moyenne
        const somme = pourcentages.reduce((total, valeur) => total + valeur, 0);
        const moyenne = pourcentages.length > 0 ? Math.round(somme / pourcentages.length) : 0;
        const meilleure = pourcentages.length > 0 ? Math.max(...pourcentages) : 0;

        animerCompteur("nbAPasser", examensAPasser.length);
        animerCompteur("nbPasses", resultats.length);
        animerCompteur("moyenne", moyenne, " %");
        animerCompteur("meilleure", meilleure, " %");

        afficherProchainExamen(examensAPasser);
        afficherDerniersResultats(resultats.slice(0, 5)); // les 5 plus récents
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

afficherSalutation();
chargerTableauDeBord();
