// ====== Page Mes résultats : statistiques, graphique, recherche, tri et export ======
const champRecherche = document.getElementById("recherche");
const listeNiveau = document.getElementById("filtreNiveau");
const boutonExporter = document.getElementById("boutonExporter");
const corpsResultats = document.getElementById("listeResultats");
const zoneGraphique = document.getElementById("graphique");
const enTetes = document.querySelectorAll("th[data-cle]");

let tousLesResultats = [];
let resultatsAffiches = []; // la liste actuellement visible (sert à l'export)
let cleTri = "date_passage";
let triCroissant = false;

function pourcentageDe(resultat) {
    return calculerPourcentage(resultat.score, resultat.total_questions);
}

// Valeur utilisée pour comparer deux lignes selon la colonne choisie
function valeurDeTri(resultat) {
    if (cleTri === "pourcentage") return pourcentageDe(resultat);
    if (cleTri === "examen") return resultat.examen.toLowerCase();
    return resultat[cleTri];
}

// ---------- Statistiques du haut de page ----------

function afficherStatistiques() {
    const pourcentages = tousLesResultats.map(pourcentageDe);
    const somme = pourcentages.reduce((total, valeur) => total + valeur, 0);
    const moyenne = pourcentages.length > 0 ? Math.round(somme / pourcentages.length) : 0;
    const meilleure = pourcentages.length > 0 ? Math.max(...pourcentages) : 0;

    animerCompteur("nbResultats", tousLesResultats.length);
    animerCompteur("moyenne", moyenne, " %");
    animerCompteur("meilleure", meilleure, " %");
}

// ---------- Graphique en barres (8 derniers examens) ----------

function afficherGraphique() {
    zoneGraphique.replaceChildren();

    if (tousLesResultats.length === 0) {
        zoneGraphique.appendChild(creerElement("p", "vide", "Aucun résultat à afficher."));
        return;
    }

    // Les résultats arrivent du plus récent au plus ancien : on inverse pour lire dans l'ordre
    const recents = [...tousLesResultats].reverse().slice(-8);

    recents.forEach(resultat => {
        const pourcentage = pourcentageDe(resultat);
        const ligne = creerElement("div", "barre-ligne");
        const nom = creerElement("span", "nom", resultat.examen);
        const rail = creerElement("div", "rail");
        const remplissage = creerElement("div", `remplissage ${niveauNote(pourcentage)}`);
        const valeur = creerElement("span", "valeur", `${pourcentage} %`);

        nom.title = resultat.examen;
        rail.appendChild(remplissage);
        ligne.append(nom, rail, valeur);
        zoneGraphique.appendChild(ligne);

        // On attend un instant pour que la barre grandisse en douceur
        setTimeout(() => { remplissage.style.width = `${pourcentage}%`; }, 80);
    });
}

// ---------- Tableau : filtrer, trier, afficher ----------

function afficherResultats() {
    const mot = champRecherche.value.trim().toLowerCase();
    const niveau = listeNiveau.value;

    // 1. Filtrer
    const liste = tousLesResultats.filter(resultat => {
        if (!resultat.examen.toLowerCase().includes(mot)) return false;
        if (niveau !== "tous" && niveauNote(pourcentageDe(resultat)) !== niveau) return false;
        return true;
    });

    // 2. Trier
    liste.sort((a, b) => {
        const valeurA = valeurDeTri(a);
        const valeurB = valeurDeTri(b);
        if (valeurA < valeurB) return triCroissant ? -1 : 1;
        if (valeurA > valeurB) return triCroissant ? 1 : -1;
        return 0;
    });

    resultatsAffiches = liste;

    // 3. Afficher
    if (liste.length === 0) {
        corpsResultats.innerHTML = `<tr><td colspan="5" class="vide">Aucun résultat trouvé.</td></tr>`;
        return;
    }

    corpsResultats.innerHTML = liste.map(resultat => {
        const pourcentage = pourcentageDe(resultat);
        return `
            <tr>
                <td data-label="Examen">${echapperHTML(resultat.examen)}</td>
                <td data-label="Score">${formaterPoints(resultat.score)} / ${formaterPoints(resultat.total_questions)}</td>
                <td data-label="Note"><span class="badge ${niveauNote(pourcentage)}">${pourcentage} %</span></td>
                <td data-label="Date">${formaterDate(resultat.date_passage)}</td>
                <td class="cellule-actions"><div class="actions"><button type="button" class="bouton secondaire petit" data-correction="${resultat.id}">${icone("eye")}<span>Voir la correction</span></button></div></td>
            </tr>`;
    }).join("");
}

// Flèche ▲ ▼ sur la colonne triée (la flèche est dessinée par le CSS)
function marquerColonneTriee() {
    enTetes.forEach(entete => {
        entete.classList.remove("tri-croissant", "tri-decroissant");
        if (entete.dataset.cle === cleTri) {
            entete.classList.add(triCroissant ? "tri-croissant" : "tri-decroissant");
        }
    });
}

// ---------- Export CSV ----------

function exporterCSV() {
    if (resultatsAffiches.length === 0) {
        afficherNotification("Aucun résultat à exporter.", "erreur");
        return;
    }

    const lignes = [["Examen", "Score", "Total", "Note (%)", "Date"]];
    resultatsAffiches.forEach(resultat => {
        lignes.push([
            resultat.examen,
            resultat.score,
            resultat.total_questions,
            pourcentageDe(resultat),
            formaterDate(resultat.date_passage)
        ]);
    });

    // Chaque case est entourée de guillemets, séparée par un point-virgule (Excel français)
    const texte = lignes
        .map(ligne => ligne.map(case_ => `"${String(case_).replace(/"/g, '""')}"`).join(";"))
        .join("\n");

    // "\ufeff" permet à Excel d'afficher correctement les accents
    const fichier = new Blob(["\ufeff" + texte], { type: "text/csv;charset=utf-8;" });
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(fichier);
    lien.download = "mes_resultats.csv";
    lien.click();
    URL.revokeObjectURL(lien.href);

    afficherNotification("Fichier exporté.", "succes");
}

// ---------- Correction d'un examen ----------

const dialogueCorrection = document.getElementById("dialogueCorrection");
const contenuCorrection = document.getElementById("contenuCorrection");

async function voirCorrection(id) {
    try {
        const correction = await appeler(`/examens/resultats/${id}/correction`);
        const pourcentage = pourcentageDe(correction);

        const titre = creerElement("h2", "", correction.examen);
        const resume = creerElement(
            "p",
            "sous-titre",
            `${formaterPoints(correction.score)} / ${formaterPoints(correction.total_questions)} point(s) (${pourcentage} %)`
        );

        contenuCorrection.replaceChildren(titre, resume);

        if (correction.copie_enregistree) {
            contenuCorrection.appendChild(construireCorrection(correction.questions));
        } else {
            contenuCorrection.appendChild(creerElement(
                "p",
                "vide",
                "Aucune réponse enregistrée pour ce passage (temps écoulé sans envoi, ou passage ancien)."
            ));
        }

        dialogueCorrection.showModal();
    } catch (erreur) {
        // Exemple : "La correction sera disponible quand vous aurez utilisé toutes vos tentatives."
        afficherNotification(erreur.message, "erreur", 5000);
    }
}

corpsResultats.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-correction]");
    if (bouton) voirCorrection(Number(bouton.dataset.correction));
});

document.getElementById("fermerCorrection")
    .addEventListener("click", () => dialogueCorrection.close());

// ---------- Écouteurs et chargement ----------

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
listeNiveau.addEventListener("change", afficherResultats);
boutonExporter.addEventListener("click", exporterCSV);

async function chargerResultats() {
    try {
        tousLesResultats = await appeler("/examens/resultats/mes-resultats");
        afficherStatistiques();
        afficherGraphique();
        marquerColonneTriee();
        afficherResultats();
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

chargerResultats();
