// ====== Fonctions communes à toutes les pages admin ======
const pagesAdmin = [
    { cle: "tableau_de_bord", titre: "Tableau de bord", lien: "tableau_de_bord.html", icone: "layout-dashboard" },
    { cle: "cours", titre: "Cours", lien: "cours.html", icone: "book-open" },
    { cle: "examens", titre: "Examens", lien: "examens.html", icone: "file-text" },
    { cle: "resultats", titre: "Résultats", lien: "resultats.html", icone: "bar-chart" },
    { cle: "utilisateurs", titre: "Utilisateurs", lien: "utilisateurs.html", icone: "users" }
];

// ---------- Icônes (SVG en ligne, style trait fin) ----------
const ICONES = {
    "layout-dashboard": '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    "book-open": '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    "file-text": '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    "bar-chart": '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "shield": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
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
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "pencil": '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    "trash": '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    "copy": '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    "eye": '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off": '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/>',
    "alert-circle": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    "alert-triangle": '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    "info": '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
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

// Notification qui disparaît seule après quelques secondes
function afficherNotification(message, type = "info") {
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
    setTimeout(() => notification.remove(), type === "erreur" ? 6000 : 3500);
}

// Fenêtre de confirmation : renvoie une promesse (true si l'utilisateur confirme)
function confirmer(message) {
    return new Promise(resoudre => {
        const fond = creerElement("div", "fond-modale");
        const boite = creerElement("div", "boite-modale");
        boite.setAttribute("role", "alertdialog");
        boite.setAttribute("aria-modal", "true");
        const actions = creerElement("div", "actions");
        const boutonAnnuler = creerElement("button", "bouton secondaire", "Annuler");
        const boutonOk = creerElement("button", "bouton danger", "Confirmer");
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
        const pastille = creerElement("span", "modale-icone");
        pastille.innerHTML = icone("alert-triangle", 22);
        boite.append(pastille, creerElement("p", "", message), actions);
        fond.appendChild(boite);
        document.body.appendChild(fond);
        boutonAnnuler.focus();
    });
}

// Met un champ en rouge ; la couleur disparaît dès que l'utilisateur écrit
function marquerErreur(champ) {
    champ.classList.add("champ-erreur");
    champ.focus();
    champ.addEventListener("input", () => champ.classList.remove("champ-erreur"), { once: true });
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
    const bouton = document.getElementById("boutonTheme");
    if (!bouton) return;
    const sombre = document.documentElement.classList.contains("sombre");
    bouton.innerHTML = `${icone(sombre ? "sun" : "moon")}<span>${sombre ? "Mode clair" : "Mode sombre"}</span>`;
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
    const utilisateur = JSON.parse(sessionStorage.getItem("utilisateur") || "{}");
    const nom = utilisateur.nom || "Administrateur";

    const liens = pagesAdmin.map(page => {
        const actif = page.cle === pageActive;
        return `<a href="${page.lien}" class="${actif ? "actif" : ""}"${actif ? ' aria-current="page"' : ""}>${icone(page.icone, 20)}<span>${page.titre}</span></a>`;
    }).join("");

    entete.innerHTML = `
        <div class="entete-haut">
            <a class="logo" href="tableau_de_bord.html" aria-label="ExamPro, tableau de bord">
                <span class="logo-marque">${icone("graduation-cap", 20)}</span>
                <span class="logo-texte"><strong>ExamPro</strong><small>Administration</small></span>
            </a>
            <button type="button" id="boutonMenu" class="bouton-menu" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="tiroir">${icone("menu", 24)}</button>
        </div>
        <div class="tiroir" id="tiroir">
            <nav id="navigation" aria-label="Navigation principale">${liens}</nav>
            <div class="entete-bas">
                <div class="profil">
                    <span class="avatar">${echapperHTML(nom.trim().charAt(0).toUpperCase())}</span>
                    <div><strong>${echapperHTML(nom)}</strong><small>Administrateur</small></div>
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

    document.getElementById("boutonTheme").addEventListener("click", () => {
        const estSombre = document.documentElement.classList.toggle("sombre");
        localStorage.setItem("theme", estSombre ? "sombre" : "clair");
        majBoutonTheme();
    });

    document.getElementById("boutonDeconnexion").addEventListener("click", deconnecter);
}

// Exécuté au chargement de chaque page
appliquerTheme();

if (document.body.dataset.page !== "connexion") {
    if (!sessionStorage.getItem("jeton")) {
        window.location.href = "connexion.html"; // pas connecté : retour à la connexion
    } else {
        construireMenu();
    }
}

remplirIcones();

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