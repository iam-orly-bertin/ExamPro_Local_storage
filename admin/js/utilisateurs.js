// ====== Page Utilisateurs : liste avec recherche et filtre par rôle ======
const champRecherche = document.getElementById("recherche");
const filtreRole = document.getElementById("filtreRole");
const corpsUtilisateurs = document.getElementById("listeUtilisateurs");

let tousLesUtilisateurs = [];

function afficherUtilisateurs() {
    const mot = champRecherche.value.trim().toLowerCase();
    const role = filtreRole.value;

    const liste = tousLesUtilisateurs.filter(utilisateur => {
        const correspondALaRecherche = `${utilisateur.nom} ${utilisateur.email}`.toLowerCase().includes(mot);
        const correspondAuRole = role === "tous" || utilisateur.role === role;
        return correspondALaRecherche && correspondAuRole;
    });

    if (liste.length === 0) {
        corpsUtilisateurs.innerHTML = `<tr><td colspan="4" class="vide">Aucun utilisateur trouvé.</td></tr>`;
        return;
    }

    corpsUtilisateurs.innerHTML = liste.map(utilisateur => `
        <tr>
            <td data-label="ID">${utilisateur.id}</td>
            <td data-label="Nom"><div class="cellule-identite"><span class="avatar">${echapperHTML(String(utilisateur.nom || "?").trim().charAt(0).toUpperCase())}</span><span>${echapperHTML(utilisateur.nom)}</span></div></td>
            <td data-label="Email">${echapperHTML(utilisateur.email)}</td>
            <td data-label="Rôle"><span class="badge ${utilisateur.role}">${utilisateur.role === "admin" ? "Administrateur" : "Étudiant"}</span></td>
        </tr>`).join("");
}

async function chargerUtilisateurs() {
    try {
        tousLesUtilisateurs = await appeler("/admin/utilisateurs");

        document.getElementById("totalUtilisateurs").textContent = tousLesUtilisateurs.length;
        document.getElementById("totalEtudiants").textContent = tousLesUtilisateurs.filter(u => u.role === "etudiant").length;
        document.getElementById("totalAdmins").textContent = tousLesUtilisateurs.filter(u => u.role === "admin").length;

        afficherUtilisateurs();
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    }
}

champRecherche.addEventListener("input", afficherUtilisateurs);
filtreRole.addEventListener("change", afficherUtilisateurs);

chargerUtilisateurs();
