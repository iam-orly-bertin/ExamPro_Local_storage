// ====== Fonctions communes à toutes les pages étudiant ======
const pagesEtudiant = [
    { cle: "tableau_de_bord", titre: "Tableau de bord", lien: "tableau_de_bord.html", icone: "layout-dashboard" },
    { cle: "examens", titre: "Examens", lien: "examens.html", icone: "file-text" },
    { cle: "resultats", titre: "Mes résultats", lien: "resultats.html", icone: "bar-chart" }
];

// Pages que l'on peut ouvrir sans être connecté
const pagesPubliques = ["connexion", "inscription"];

// ---------- Icônes (SVG en ligne, style trait fin) ----------
const ICONES = {
    "layout-dashboard": '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    "book-open": '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    "file-text": '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    "bar-chart": '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "clipboard-check": '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    "trending-up": '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    "award": '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    "graduation-cap": '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    "menu": '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "x": '<path d="M18 6 6 18M6 6l12 12"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "eye": '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off": '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/>',
    "alert-circle": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    "alert-triangle": '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    "info": '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "help-circle": '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    "flag": '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    "arrow-left": '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    "play": '<path d="m6 3 14 9-14 9z"/>',
    "send": '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    "list-checks": '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/>',
    "keyboard": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
    "mail": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'
};

// Renvoie le code SVG d'une icône (hérite de la couleur du texte)
function icone(nom, taille = 18) {
    return `<svg class="icone" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONES[nom] || ""}</svg>`;
}

// Remplit les éléments <span data-icone="nom"> du HTML avec l'icône correspondante
function remplirIcones(racine = document) {
    racine.querySelectorAll("[data-icone]").forEach(element => {
        element.innerHTML = icone(element.dataset.icone, Number(element.dataset.taille) || 18);
    });
}

// Change le contenu d'un bouton : icône + texte
function definirBouton(bouton, nomIcone, texte) {
    bouton.innerHTML = `${icone(nomIcone)}<span>${echapperHTML(texte)}</span>`;
}

// ---------- Outils généraux ----------

// Crée un élément HTML : balise, classe CSS et texte (facultatifs)
function creerElement(balise, classe = "", texte = "") {
    const element = document.createElement(balise);
    if (classe) element.className = classe;
    if (texte) element.textContent = texte;
    return element;
}

// Empêche l'injection de HTML venant des données
function echapperHTML(valeur) {
    const element = document.createElement("div");
    element.textContent = valeur ?? "";
    return element.innerHTML;
}

// Renvoie l'étudiant enregistré à la connexion (objet vide si personne)
function lireUtilisateur() {
    return JSON.parse(sessionStorage.getItem("utilisateur") || "{}");
}

// Notification qui disparaît seule après quelques secondes
function afficherNotification(message, type = "info", duree = 3500) {
    let zone = document.getElementById("notifications");
    if (!zone) {
        zone = creerElement("div");
        zone.id = "notifications";
        document.body.appendChild(zone);
    }
    const nomIcone = { succes: "check-circle", erreur: "alert-circle" }[type] || "info";
    const notification = creerElement("div", `notification ${type}`);
    notification.setAttribute("role", type === "erreur" ? "alert" : "status");
    notification.innerHTML = `${icone(nomIcone, 20)}<span>${echapperHTML(message)}</span>`;
    zone.appendChild(notification);
    setTimeout(() => notification.remove(), duree);
}

// Fenêtre de confirmation : renvoie une promesse (true si l'étudiant confirme)
// libelleOk = texte du bouton, styleOk = "danger", "succes" ou "" (couleur normale)
function confirmer(message, libelleOk = "Confirmer", styleOk = "danger") {
    return new Promise(resoudre => {
        const fond = creerElement("div", "fond-modale");
        const boite = creerElement("div", "boite-modale");
        boite.setAttribute("role", "alertdialog");
        boite.setAttribute("aria-modal", "true");
        const actions = creerElement("div", "actions");
        const boutonAnnuler = creerElement("button", "bouton secondaire", "Annuler");
        const boutonOk = creerElement("button", `bouton ${styleOk}`, libelleOk);
        boutonAnnuler.type = boutonOk.type = "button";

        const fermer = (reponse) => {
            document.removeEventListener("keydown", surTouche);
            fond.remove();
            resoudre(reponse);
        };
        const surTouche = (evenement) => { if (evenement.key === "Escape") fermer(false); };
        document.addEventListener("keydown", surTouche);
        boutonAnnuler.addEventListener("click", () => fermer(false));
        boutonOk.addEventListener("click", () => fermer(true));
        fond.addEventListener("click", (evenement) => {
            if (evenement.target === fond) fermer(false); // clic en dehors de la boîte
        });

        actions.append(boutonAnnuler, boutonOk);
        const pastille = creerElement("span", `modale-icone ${styleOk === "succes" ? "succes" : ""}`);
        pastille.innerHTML = icone(styleOk === "succes" ? "send" : "alert-triangle", 22);
        boite.append(pastille, creerElement("p", "", message), actions);
        fond.appendChild(boite);
        document.body.appendChild(fond);
        boutonOk.focus();
    });
}

// Met un champ en rouge ; la couleur disparaît dès que l'étudiant écrit
function marquerErreur(champ) {
    champ.classList.add("champ-erreur");
    champ.focus();
    champ.addEventListener("input", () => champ.classList.remove("champ-erreur"), { once: true });
}

// ---------- Notes et dates ----------

function calculerPourcentage(score, total) {
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
}

// La couleur du badge dépend de la note
function niveauNote(pourcentage) {
    if (pourcentage >= 70) return "bon";
    if (pourcentage >= 50) return "moyen";
    return "faible";
}

// Date SQLite (en UTC) convertie en date lisible
function formaterDate(texte) {
    const date = new Date(texte.replace(" ", "T") + "Z");
    return date.toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

// Fait défiler un nombre de 0 jusqu'à sa valeur finale (suffixe : " %" par exemple)
function animerCompteur(idElement, valeurFinale, suffixe = "") {
    const element = document.getElementById(idElement);
    const pas = Math.max(1, Math.ceil(valeurFinale / 30));
    let valeur = 0;

    const minuteur = setInterval(() => {
        valeur += pas;
        if (valeur >= valeurFinale) {
            valeur = valeurFinale;
            clearInterval(minuteur); // on arrête l'animation
        }
        element.textContent = valeur + suffixe;
    }, 30);
}

// ---------- Thème clair / sombre ----------
// Choix mémorisé dans le navigateur ; sinon on suit le réglage de l'appareil
function themeEstSombre() {
    const choix = localStorage.getItem("theme");
    if (choix) return choix === "sombre";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function appliquerTheme() {
    document.documentElement.classList.toggle("sombre", themeEstSombre());
}

function majBoutonTheme() {
    const sombre = document.documentElement.classList.contains("sombre");
    const bouton = document.getElementById("boutonTheme");
    if (!bouton) return;
    if (bouton.classList.contains("bouton-icone-entete")) {
        // Version compacte (pendant un examen) : icône seule
        bouton.innerHTML = icone(sombre ? "sun" : "moon", 20);
        bouton.setAttribute("aria-label", sombre ? "Passer en mode clair" : "Passer en mode sombre");
    } else {
        bouton.innerHTML = `${icone(sombre ? "sun" : "moon")}<span>${sombre ? "Mode clair" : "Mode sombre"}</span>`;
    }
}

function basculerTheme() {
    const estSombre = document.documentElement.classList.toggle("sombre");
    localStorage.setItem("theme", estSombre ? "sombre" : "clair");
    majBoutonTheme();
}

function deconnecter() {
    sessionStorage.clear();
    window.location.href = "connexion.html";
}

// Ouvre ou ferme le menu (version téléphone et tablette)
function basculerMenu(ouvert) {
    document.body.classList.toggle("menu-ouvert", ouvert);
    const bouton = document.getElementById("boutonMenu");
    if (bouton) {
        bouton.setAttribute("aria-expanded", String(ouvert));
        bouton.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
        bouton.innerHTML = icone(ouvert ? "x" : "menu", 24);
    }
}

// Construit le menu en HTML et branche ses boutons
function construireMenu() {
    const entete = document.getElementById("entete");
    if (!entete) return;

    const pageActive = document.body.dataset.page;
    const enExamen = pageActive === "passer_examen";

    const logo = `
        <a class="logo" ${enExamen ? 'href="#" aria-disabled="true" tabindex="-1"' : 'href="tableau_de_bord.html"'} aria-label="ExamPro">
            <span class="logo-marque">${icone("graduation-cap", 20)}</span>
            <span class="logo-texte"><strong>ExamPro</strong><small>Espace étudiant</small></span>
        </a>`;

    // Pendant un examen : pas de liens, pour éviter de quitter la page par erreur
    if (enExamen) {
        entete.innerHTML = `
            <div class="entete-haut">${logo}</div>
            <div class="entete-examen-droite">
                <span class="mode-examen">Examen en cours</span>
                <button type="button" id="boutonTheme" class="bouton-icone-entete"></button>
            </div>`;
        entete.querySelector(".logo").addEventListener("click", (evenement) => evenement.preventDefault());
        majBoutonTheme();
        document.getElementById("boutonTheme").addEventListener("click", basculerTheme);
        return;
    }

    const utilisateur = lireUtilisateur();
    const nom = utilisateur.nom || "Étudiant";

    const liens = pagesEtudiant.map(page => {
        const actif = page.cle === pageActive;
        return `<a href="${page.lien}" class="${actif ? "actif" : ""}"${actif ? ' aria-current="page"' : ""}>${icone(page.icone, 20)}<span>${page.titre}</span></a>`;
    }).join("");

    entete.innerHTML = `
        <div class="entete-haut">
            ${logo}
            <button type="button" id="boutonMenu" class="bouton-menu" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="tiroir">${icone("menu", 24)}</button>
        </div>
        <div class="tiroir" id="tiroir">
            <nav id="navigation" aria-label="Navigation principale">${liens}</nav>
            <div class="entete-bas">
                <div class="profil">
                    <span class="avatar">${echapperHTML(nom.trim().charAt(0).toUpperCase())}</span>
                    <div><strong>${echapperHTML(nom)}</strong><small>Étudiant</small></div>
                </div>
                <div class="entete-boutons">
                    <button type="button" id="boutonTheme" class="bouton-entete"></button>
                    <button type="button" id="boutonDeconnexion" class="bouton-entete">${icone("log-out")}<span>Déconnexion</span></button>
                </div>
            </div>
        </div>`;

    const voile = creerElement("div");
    voile.id = "voile";
    document.body.appendChild(voile);

    majBoutonTheme();

    document.getElementById("boutonMenu").addEventListener("click", () => {
        basculerMenu(!document.body.classList.contains("menu-ouvert"));
    });
    voile.addEventListener("click", () => basculerMenu(false));
    document.getElementById("navigation").addEventListener("click", (evenement) => {
        if (evenement.target.closest("a")) basculerMenu(false);
    });
    document.addEventListener("keydown", (evenement) => {
        if (evenement.key === "Escape") basculerMenu(false);
    });
    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) basculerMenu(false);
    });

    document.getElementById("boutonTheme").addEventListener("click", basculerTheme);
    document.getElementById("boutonDeconnexion").addEventListener("click", deconnecter);
}

// ---------- Exécuté au chargement de chaque page ----------
appliquerTheme();

if (!pagesPubliques.includes(document.body.dataset.page)) {
    const utilisateur = lireUtilisateur();

    // Il faut un jeton ET être un étudiant (les admins ont leur propre espace)
    if (!sessionStorage.getItem("jeton") || utilisateur.role !== "etudiant") {
        sessionStorage.clear();
        window.location.href = "connexion.html";
    } else {
        construireMenu();
    }
}

remplirIcones();

// ---------- Points et correction (pages « Passer un examen » et « Résultats ») ----------

const LIBELLES_TYPES_QUESTION = {
    choix_unique: "Choix unique",
    choix_multiple: "Choix multiple",
    vrai_faux: "Vrai / Faux"
};

// 2 -> "2", 1.5 -> "1,5"
function formaterPoints(nombre) {
    return String(Math.round(Number(nombre) * 100) / 100).replace(".", ",");
}

// Construit la liste des questions corrigées (bonnes réponses, vos réponses, explications)
function construireCorrection(questions) {
    const conteneur = creerElement("div", "correction");

    questions.forEach((question, index) => {
        const statut = !question.repondu
            ? ["Sans réponse", "moyen"]
            : question.correcte ? ["Correcte", "bon"] : ["Incorrecte", "faible"];

        const carte = creerElement("div", "question-correction");

        const entete = creerElement("div", "entete-correction");
        entete.append(
            creerElement("strong", "", `${index + 1}. ${question.texte}`),
            creerElement("span", `badge ${statut[1]}`, statut[0])
        );

        const type = LIBELLES_TYPES_QUESTION[question.type] || "Choix unique";
        const infos = creerElement(
            "small",
            "points-correction",
            `${type} • ${formaterPoints(question.points_obtenus)} / ${formaterPoints(question.points)} point(s)`
        );

        const liste = creerElement("ul");
        question.choix.forEach(choix => {
            const marques = [];
            if (choix.est_correcte) marques.push(`<span class="marque">${icone("check")}Bonne réponse</span>`);
            if (choix.choisi) marques.push(`<span class="marque">${icone("user")}Votre réponse</span>`);

            const classe = choix.est_correcte ? "choix-juste" : (choix.choisi ? "choix-faux" : "");
            const ligne = creerElement("li", classe);
            ligne.innerHTML = `<span>${echapperHTML(choix.texte)}</span>${marques.length ? `<span class="marques">${marques.join("")}</span>` : ""}`;
            liste.appendChild(ligne);
        });

        carte.append(entete, infos, liste);

        if (question.explication) {
            const explication = creerElement("p", "explication-correction");
            explication.append(
                creerElement("strong", "", "Explication : "),
                document.createTextNode(question.explication)
            );
            carte.appendChild(explication);
        }

        conteneur.appendChild(carte);
    });

    return conteneur;
}

// ---------- Vérification de la session ----------
// Sans serveur, il n'y a plus de jeton qui expire : on vérifie simplement,
// toutes les 10 minutes et au retour sur l'onglet, que le compte existe toujours.
(function () {
    const INTERVALLE_MS = 10 * 60 * 1000;

    async function verifierSession() {
        if (!sessionStorage.getItem("jeton") || typeof appeler !== "function") return;

        try {
            await appeler("/auth/renouveler", { method: "POST" });
        } catch (erreur) {
            // appeler() renvoie déjà vers la connexion si le compte a disparu
        }
    }

    setInterval(verifierSession, INTERVALLE_MS);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) verifierSession();
    });
})();
