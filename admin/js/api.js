// ====== Communication avec la base locale (remplace le serveur) ======
// Les pages appellent toujours appeler("/chemin", options) comme avant :
// la requête est maintenant traitée par base_locale.js, dans le navigateur.

async function appeler(chemin, options = {}) {
    const jeton = sessionStorage.getItem("jeton");

    try {
        return await executerLocal(chemin, options);
    } catch (erreur) {
        // Session invalide (compte supprimé...) : retour à la connexion
        // (sauf à la connexion / l'inscription : là, le message d'erreur doit rester affiché)
        const estAuthentification = chemin === "/auth/connexion" || chemin === "/auth/inscription";

        if (erreur.statut === 401 && jeton && !estAuthentification) {
            sessionStorage.clear();
            window.location.href = "connexion.html";
        }

        if (erreur.statut === undefined) {
            console.error(erreur);
            const inattendue = new Error("Une erreur est survenue.");
            inattendue.statut = 500;
            throw inattendue;
        }

        throw erreur; // contient .message et .statut (403, 409...)
    }
}
