// ====== Page d'inscription de l'étudiant ======
const formulaireInscription = document.getElementById("formulaireInscription");
const champNom = document.getElementById("nom");
const champEmail = document.getElementById("email");
const champMotDePasse = document.getElementById("motDePasse");
const champConfirmation = document.getElementById("confirmation");
const caseAfficher = document.getElementById("afficherMotDePasse");
const boutonInscription = document.getElementById("boutonInscription");
const barreForce = document.getElementById("barreForce");
const texteForce = document.getElementById("texteForce");

// Les 5 niveaux de force possibles (0 à 4 points)
const niveauxForce = [
    { texte: "Très faible", couleur: "var(--danger)", largeur: 15 },
    { texte: "Faible", couleur: "var(--danger)", largeur: 35 },
    { texte: "Moyen", couleur: "var(--accent)", largeur: 55 },
    { texte: "Bon", couleur: "var(--succes)", largeur: 80 },
    { texte: "Excellent", couleur: "var(--succes)", largeur: 100 }
];

// Donne 1 point par critère rempli : longueur, majuscule + minuscule, chiffre, symbole
function calculerForce(motDePasse) {
    let points = 0;
    if (motDePasse.length >= 8) points++;
    if (/[A-Z]/.test(motDePasse) && /[a-z]/.test(motDePasse)) points++;
    if (/[0-9]/.test(motDePasse)) points++;
    if (/[^A-Za-z0-9]/.test(motDePasse)) points++;
    return points;
}

// Met à jour la barre colorée sous le champ du mot de passe
function afficherForce() {
    const motDePasse = champMotDePasse.value;

    if (motDePasse === "") {
        barreForce.style.width = "0";
        texteForce.textContent = "";
        return;
    }

    const niveau = niveauxForce[calculerForce(motDePasse)];
    barreForce.style.width = niveau.largeur + "%";
    barreForce.style.background = niveau.couleur;
    texteForce.textContent = `Force du mot de passe : ${niveau.texte}`;
}

function emailValide(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

champMotDePasse.addEventListener("input", afficherForce);

// Afficher ou cacher les deux mots de passe
caseAfficher.innerHTML = icone("eye", 20);
caseAfficher.addEventListener("click", () => {
    const visible = champMotDePasse.type === "password";
    champMotDePasse.type = champConfirmation.type = visible ? "text" : "password";
    caseAfficher.innerHTML = icone(visible ? "eye-off" : "eye", 20);
    caseAfficher.setAttribute("aria-pressed", String(visible));
    caseAfficher.setAttribute("aria-label", visible ? "Masquer les mots de passe" : "Afficher les mots de passe");
});

formulaireInscription.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();

    const nom = champNom.value.trim();
    const email = champEmail.value.trim();
    const motDePasse = champMotDePasse.value;

    // Vérifications dans l'ordre des champs
    if (nom === "") { marquerErreur(champNom); afficherNotification("Le nom est obligatoire.", "erreur"); return; }
    if (!emailValide(email)) { marquerErreur(champEmail); afficherNotification("Email invalide.", "erreur"); return; }
    if (motDePasse.length < 8) { marquerErreur(champMotDePasse); afficherNotification("Le mot de passe doit contenir au moins 8 caractères.", "erreur"); return; }
    if (motDePasse !== champConfirmation.value) { marquerErreur(champConfirmation); afficherNotification("Les mots de passe ne sont pas identiques.", "erreur"); return; }

    boutonInscription.disabled = true;
    boutonInscription.textContent = "Création du compte...";

    try {
        await appeler("/auth/inscription", {
            method: "POST",
            body: JSON.stringify({ nom, email, mot_de_passe: motDePasse })
        });

        afficherNotification("Compte créé ! Vous allez être redirigé.", "succes");
        // On laisse 1,5 seconde pour lire le message avant de changer de page
        setTimeout(() => { window.location.href = "connexion.html"; }, 1500);
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
        boutonInscription.disabled = false;
        boutonInscription.textContent = "S'inscrire";
    }
});
