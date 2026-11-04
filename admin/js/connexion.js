// ====== Page de connexion de l'administrateur ======
const formulaireConnexion = document.getElementById("formulaireConnexion");
const champEmail = document.getElementById("email");
const champMotDePasse = document.getElementById("motDePasse");
const caseAfficher = document.getElementById("afficherMotDePasse");
const boutonConnexion = document.getElementById("boutonConnexion");

// Afficher ou cacher le mot de passe
caseAfficher.innerHTML = icone("eye", 20);
caseAfficher.addEventListener("click", () => {
    const visible = champMotDePasse.type === "password";
    champMotDePasse.type = visible ? "text" : "password";
    caseAfficher.innerHTML = icone(visible ? "eye-off" : "eye", 20);
    caseAfficher.setAttribute("aria-pressed", String(visible));
    caseAfficher.setAttribute("aria-label", visible ? "Masquer le mot de passe" : "Afficher le mot de passe");
});

formulaireConnexion.addEventListener("submit", async (evenement) => {
    evenement.preventDefault(); // empêche le rechargement de la page

    const email = champEmail.value.trim();
    const motDePasse = champMotDePasse.value;

    if (email === "") { marquerErreur(champEmail); return; }
    if (motDePasse === "") { marquerErreur(champMotDePasse); return; }

    boutonConnexion.disabled = true;
    boutonConnexion.textContent = "Connexion...";

    try {
        const reponse = await appeler("/auth/connexion", {
            method: "POST",
            body: JSON.stringify({ email, mot_de_passe: motDePasse })
        });

        if (reponse.utilisateur.role !== "admin") {
            afficherNotification("Accès réservé aux administrateurs.", "erreur");
            return;
        }

        sessionStorage.setItem("jeton", reponse.jeton);
        sessionStorage.setItem("utilisateur", JSON.stringify(reponse.utilisateur));
        window.location.href = "tableau_de_bord.html";
    } catch (erreur) {
        afficherNotification(erreur.message, "erreur");
    } finally {
        boutonConnexion.disabled = false;
        boutonConnexion.textContent = "Se connecter";
    }
});
