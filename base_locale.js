// ====== ExamPro : base de données locale (remplace entièrement le backend) ======
//
// Plus de serveur, plus de SQLite : toutes les données sont enregistrées dans le
// localStorage du navigateur, sous UNE seule clé (CLE_BASE).
//
// Ce fichier joue le rôle du serveur : il reçoit les mêmes "requêtes" que
// l'ancien backend (ex. POST /examens/3/soumettre) et renvoie les mêmes réponses.
// Les pages (admin/js/api.js et etudiant/js/api.js) l'appellent via executerLocal().
//
// ATTENTION : les données restent dans CE navigateur, sur CET appareil.
// Un étudiant qui s'inscrit sur son téléphone n'apparaît pas chez l'enseignant sur son ordinateur.

(function () {
    "use strict";

    /* ==================================================
       RÉGLAGES (remplacent le fichier .env du backend)
       ================================================== */

    const CLE_BASE = "exampro_base_v1";
    const TOLERANCE_MS = 30 * 1000;          // marge après la fin du chronomètre
    const CORRECTION_TOUJOURS = false;        // true : correction visible dès la fin de chaque tentative

    // Compte administrateur créé automatiquement à la première ouverture
    const ADMIN_PAR_DEFAUT = {
        nom: "Administrateur",
        email: "admin@exampro.com",
        mot_de_passe: "admin12345"
    };

    // Compte étudiant de démonstration
    const ETUDIANT_DEMO = {
        nom: "Étudiant Démo",
        email: "etudiant.demo@exampro.com",
        mot_de_passe: "demo12345"
    };

    const TYPES = ["choix_unique", "choix_multiple", "vrai_faux"];
    const POINTS_MAX = 100;
    const CHOIX_MAX = 10;
    const EXPLICATION_MAX = 1000;

    // Adresse de ce fichier : sert à retrouver donnees_cours_examens.js, quelle que soit la page
    const ADRESSE_SCRIPT = document.currentScript ? document.currentScript.src : "";

    /* ==================================================
       STOCKAGE (localStorage, avec repli en mémoire si indisponible)
       ================================================== */

    let memoire = null;

    const stockage = (function () {
        try {
            localStorage.setItem("__test__", "1");
            localStorage.removeItem("__test__");
            return {
                lire: () => localStorage.getItem(CLE_BASE),
                ecrire: texte => localStorage.setItem(CLE_BASE, texte),
                effacer: () => localStorage.removeItem(CLE_BASE)
            };
        } catch (erreur) {
            // Navigation privée stricte : les données durent le temps de l'onglet
            return {
                lire: () => memoire,
                ecrire: texte => { memoire = texte; },
                effacer: () => { memoire = null; }
            };
        }
    })();

    class ErreurHTTP extends Error {
        constructor(statut, message) {
            super(message);
            this.statut = statut;
        }
    }

    function baseVide() {
        return {
            seq: {
                utilisateurs: 0, cours: 0, examens: 0, questions: 0,
                choix_reponses: 0, resultats: 0, tentatives: 0,
                reponses_etudiants: 0, autorisations_tentatives: 0
            },
            utilisateurs: [],
            cours: [],
            examens: [],
            questions: [],
            choix_reponses: [],
            resultats: [],
            tentatives: [],
            reponses_etudiants: [],
            autorisations_tentatives: []
        };
    }

    let aModifie = false;

    function charger() {
        const brut = stockage.lire();
        return brut ? JSON.parse(brut) : baseVide();
    }

    function sauvegarder(db) {
        try {
            stockage.ecrire(JSON.stringify(db));
        } catch (erreur) {
            throw new ErreurHTTP(500, "Le stockage du navigateur est plein : impossible d'enregistrer.");
        }
    }

    // Prochain identifiant d'une table (équivalent d'AUTOINCREMENT)
    function nouvelId(db, table) {
        db.seq[table] += 1;
        aModifie = true;
        return db.seq[table];
    }

    // Même format que SQLite (CURRENT_TIMESTAMP) : "2026-11-04 08:41:00" en UTC
    function maintenantSql() {
        return new Date().toISOString().slice(0, 19).replace("T", " ");
    }

    /* ==================================================
       MOTS DE PASSE (PBKDF2 via Web Crypto, remplace bcrypt)
       ================================================== */

    function enHexa(octets) {
        return Array.from(octets, o => o.toString(16).padStart(2, "0")).join("");
    }

    // Repli très simple si Web Crypto est absent (page ouverte hors HTTPS)
    function empreinteSimple(texte) {
        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (let i = 0; i < texte.length; i++) {
            const c = texte.charCodeAt(i);
            h1 = Math.imul(h1 ^ c, 2654435761);
            h2 = Math.imul(h2 ^ c, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }

    async function deriver(motDePasse, sel) {
        if (window.crypto && crypto.subtle) {
            const encodeur = new TextEncoder();
            const cle = await crypto.subtle.importKey(
                "raw", encodeur.encode(motDePasse), "PBKDF2", false, ["deriveBits"]
            );
            const bits = await crypto.subtle.deriveBits(
                { name: "PBKDF2", salt: encodeur.encode(sel), iterations: 100000, hash: "SHA-256" },
                cle, 256
            );
            return "pbkdf2$" + sel + "$" + enHexa(new Uint8Array(bits));
        }
        return "simple$" + sel + "$" + empreinteSimple(sel + ":" + motDePasse);
    }

    async function hacher(motDePasse) {
        const sel = enHexa(crypto.getRandomValues(new Uint8Array(8)));
        return deriver(motDePasse, sel);
    }

    // L'algorithme utilisé est lu dans l'empreinte enregistrée ("pbkdf2$..." ou "simple$..."),
    // pour que la connexion marche même si le contexte du navigateur a changé depuis l'inscription.
    async function verifierMotDePasse(motDePasse, empreinte) {
        const morceaux = String(empreinte).split("$");
        const [algorithme, sel] = morceaux;

        if (!sel) return false;

        if (algorithme === "simple") {
            return empreinte === "simple$" + sel + "$" + empreinteSimple(sel + ":" + motDePasse);
        }

        if (algorithme === "pbkdf2" && window.crypto && crypto.subtle) {
            return (await deriver(motDePasse, sel)) === empreinte;
        }

        return false;
    }

    /* ==================================================
       JETON DE SESSION (remplace le JWT)
       ================================================== */

    function creerJeton(utilisateur) {
        const contenu = JSON.stringify({ id: utilisateur.id, role: utilisateur.role });
        return "local." + btoa(unescape(encodeURIComponent(contenu)));
    }

    function lireJeton(jeton) {
        try {
            if (!jeton || !jeton.startsWith("local.")) return null;
            return JSON.parse(decodeURIComponent(escape(atob(jeton.slice(6)))));
        } catch (erreur) {
            return null;
        }
    }

    // Retrouve l'utilisateur connecté (ou lance une erreur 401)
    function verifierUtilisateur(db) {
        const jeton = sessionStorage.getItem("jeton");

        if (!jeton) {
            throw new ErreurHTTP(401, "Connexion requise.");
        }

        const contenu = lireJeton(jeton);
        const utilisateur = contenu && db.utilisateurs.find(u => u.id === contenu.id);

        if (!utilisateur) {
            throw new ErreurHTTP(401, "Compte introuvable.");
        }

        return { id: utilisateur.id, nom: utilisateur.nom, role: utilisateur.role };
    }

    /* ==================================================
       OUTILS GÉNÉRAUX
       ================================================== */

    // Arrondi à 2 décimales (évite 0.1 + 0.2 = 0.30000000000000004)
    function arrondir(nombre) {
        return Math.round(nombre * 100) / 100;
    }

    function lireIdentifiant(valeur) {
        const id = Number(valeur);
        return Number.isInteger(id) && id >= 1 ? id : null;
    }

    function sommePar(liste, champ) {
        return liste.reduce((somme, ligne) => somme + (ligne[champ] || 0), 0);
    }

    // Dans toutes les réponses, "total_questions" contient le total des POINTS possibles
    function avecTotalPoints(ligne) {
        return {
            ...ligne,
            total_questions: ligne.total_points ?? ligne.total_questions
        };
    }

    /* ==================================================
       VALIDATION DES QUESTIONS (côté admin)
       ================================================== */

    function validerQuestions(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            return { erreur: "Ajoutez au moins une question." };
        }

        const propres = [];

        for (let i = 0; i < questions.length; i++) {
            const numero = i + 1;
            const question = questions[i];

            if (!question || typeof question.texte !== "string" || !question.texte.trim()) {
                return { erreur: `Le texte de la question ${numero} est obligatoire.` };
            }

            const type = question.type === undefined ? "choix_unique" : question.type;

            if (!TYPES.includes(type)) {
                return { erreur: `Le type de la question ${numero} est invalide.` };
            }

            const pointsBruts = question.points === undefined ? 1 : Number(question.points);

            if (!Number.isFinite(pointsBruts) || pointsBruts <= 0 || pointsBruts > POINTS_MAX) {
                return {
                    erreur: `Les points de la question ${numero} doivent être un nombre entre 0,01 et ${POINTS_MAX}.`
                };
            }

            let explication = null;

            if (question.explication !== undefined && question.explication !== null) {
                if (typeof question.explication !== "string") {
                    return { erreur: `L'explication de la question ${numero} est invalide.` };
                }

                explication = question.explication.trim() || null;

                if (explication && explication.length > EXPLICATION_MAX) {
                    return {
                        erreur: `L'explication de la question ${numero} est trop longue (${EXPLICATION_MAX} caractères maximum).`
                    };
                }
            }

            if (!Array.isArray(question.choix)) {
                return { erreur: `La question ${numero} doit avoir des choix.` };
            }

            if (question.choix.length > CHOIX_MAX) {
                return { erreur: `La question ${numero} a trop de choix (${CHOIX_MAX} maximum).` };
            }

            for (const choix of question.choix) {
                if (
                    !choix ||
                    typeof choix.texte !== "string" ||
                    !choix.texte.trim() ||
                    typeof choix.est_correcte !== "boolean"
                ) {
                    return { erreur: `Les choix de la question ${numero} sont invalides.` };
                }
            }

            const nombre = question.choix.length;
            const correctes = question.choix.filter(c => c.est_correcte).length;

            if (type === "vrai_faux") {
                if (nombre !== 2 || correctes !== 1) {
                    return {
                        erreur: `La question ${numero} (vrai/faux) doit avoir 2 choix et une seule bonne réponse.`
                    };
                }
            } else if (nombre < 2) {
                return { erreur: `La question ${numero} doit avoir au moins deux choix.` };
            } else if (type === "choix_unique" && correctes !== 1) {
                return { erreur: `La question ${numero} doit avoir exactement une bonne réponse.` };
            } else if (type === "choix_multiple" && correctes < 1) {
                return { erreur: `La question ${numero} doit avoir au moins une bonne réponse.` };
            }

            propres.push({
                texte: question.texte.trim(),
                type,
                points: arrondir(pointsBruts),
                explication,
                choix: question.choix.map(choix => ({
                    texte: choix.texte.trim(),
                    est_correcte: choix.est_correcte
                }))
            });
        }

        return { questions: propres };
    }

    /* ==================================================
       QUESTIONS ET CORRECTION
       ================================================== */

    // Enregistre des questions déjà validées (avec leurs choix) pour un examen
    function ajouterQuestions(db, examenId, questions) {
        for (const question of questions) {
            const questionId = nouvelId(db, "questions");

            db.questions.push({
                id: questionId,
                examen_id: examenId,
                texte: question.texte,
                type: question.type,
                points: question.points,
                explication: question.explication
            });

            for (const choix of question.choix) {
                db.choix_reponses.push({
                    id: nouvelId(db, "choix_reponses"),
                    question_id: questionId,
                    texte: choix.texte,
                    est_correcte: choix.est_correcte ? 1 : 0
                });
            }
        }
    }

    function supprimerQuestionsExamen(db, examenId) {
        const ids = new Set(db.questions.filter(q => q.examen_id === examenId).map(q => q.id));
        db.choix_reponses = db.choix_reponses.filter(c => !ids.has(c.question_id));
        db.questions = db.questions.filter(q => q.examen_id !== examenId);
        aModifie = true;
    }

    // Toutes les questions d'un examen avec leurs choix (bonnes réponses incluses)
    function lireQuestionsCompletes(db, examenId) {
        return db.questions
            .filter(q => q.examen_id === examenId)
            .sort((a, b) => a.id - b.id)
            .map(question => ({
                id: question.id,
                texte: question.texte,
                type: question.type,
                points: question.points,
                explication: question.explication,
                choix: db.choix_reponses
                    .filter(c => c.question_id === question.id)
                    .sort((a, b) => a.id - b.id)
                    .map(choix => ({
                        id: choix.id,
                        texte: choix.texte,
                        est_correcte: Boolean(choix.est_correcte)
                    }))
            }));
    }

    // Une question rapporte tous ses points seulement si l'étudiant a coché
    // exactement les bonnes réponses (ni une de moins, ni une de plus).
    function corriger(questions, choisis) {
        return questions.map(question => {
            const choix = question.choix.map(element => ({
                ...element,
                choisi: choisis.has(element.id)
            }));

            const repondu = choix.some(element => element.choisi);
            const correcte = repondu && choix.every(
                element => element.est_correcte === element.choisi
            );

            return {
                id: question.id,
                texte: question.texte,
                type: question.type,
                points: question.points,
                explication: question.explication,
                choix,
                repondu,
                correcte,
                points_obtenus: correcte ? question.points : 0
            };
        });
    }

    function totaux(detail) {
        return {
            score: arrondir(sommePar(detail, "points_obtenus")),
            total_points: arrondir(sommePar(detail, "points"))
        };
    }

    /* ==================================================
       PLANNING D'UN EXAMEN
       ================================================== */

    function lireDate(valeur) {
        if (valeur === undefined || valeur === null || valeur === "") {
            return { valeur: null };
        }

        if (typeof valeur !== "string" || Number.isNaN(Date.parse(valeur))) {
            return { erreur: true };
        }

        return { valeur: new Date(valeur).toISOString() };
    }

    function lirePlanning(corps) {
        const statut = corps.statut === undefined ? "publie" : corps.statut;

        if (statut !== "publie" && statut !== "brouillon") {
            return { erreur: "Le statut doit être « publie » ou « brouillon »." };
        }

        const ouverture = lireDate(corps.date_ouverture);
        const fermeture = lireDate(corps.date_fermeture);

        if (ouverture.erreur || fermeture.erreur) {
            return { erreur: "Une date d'ouverture ou de fermeture est invalide." };
        }

        if (
            ouverture.valeur && fermeture.valeur &&
            Date.parse(fermeture.valeur) <= Date.parse(ouverture.valeur)
        ) {
            return { erreur: "La date de fermeture doit être après la date d'ouverture." };
        }

        const note = corps.note_reussite === undefined ? 50 : Number(corps.note_reussite);

        if (!Number.isInteger(note) || note < 0 || note > 100) {
            return { erreur: "La note de réussite doit être un entier entre 0 et 100." };
        }

        const tentatives = corps.nb_tentatives_max === undefined ? 1 : Number(corps.nb_tentatives_max);

        if (!Number.isInteger(tentatives) || tentatives < 1 || tentatives > 20) {
            return { erreur: "Le nombre de tentatives doit être un entier entre 1 et 20." };
        }

        return {
            statut,
            date_ouverture: ouverture.valeur,
            date_fermeture: fermeture.valeur,
            note_reussite: note,
            nb_tentatives_max: tentatives
        };
    }

    // État de l'examen selon son planning : a_venir, ouvert ou ferme
    function etatPlanning(examen, maintenant = Date.now()) {
        const ouverture = examen.date_ouverture ? Date.parse(examen.date_ouverture) : NaN;
        const fermeture = examen.date_fermeture ? Date.parse(examen.date_fermeture) : NaN;

        if (!Number.isNaN(ouverture) && maintenant < ouverture) return "a_venir";
        if (!Number.isNaN(fermeture) && maintenant > fermeture) return "ferme";
        return "ouvert";
    }

    /* ==================================================
       TENTATIVES
       ================================================== */

    function lireTentativeEnCours(db, utilisateurId, examenId) {
        return db.tentatives
            .filter(t =>
                t.utilisateur_id === utilisateurId &&
                t.examen_id === examenId &&
                t.statut === "en_cours")
            .sort((a, b) => b.numero - a.numero)[0] || null;
    }

    function compterTentatives(db, utilisateurId, examenId) {
        return db.tentatives.filter(t =>
            t.utilisateur_id === utilisateurId && t.examen_id === examenId).length;
    }

    function compterSupplementaires(db, utilisateurId, examenId) {
        return sommePar(
            db.autorisations_tentatives.filter(a =>
                a.utilisateur_id === utilisateurId && a.examen_id === examenId),
            "supplementaires"
        );
    }

    function lireExamenPublie(db, examenId) {
        const examen = db.examens.find(e => e.id === examenId && e.statut === "publie");
        if (!examen) return null;

        const cours = db.cours.find(c => c.id === examen.cours_id);
        return { ...examen, cours: cours ? cours.titre : null };
    }

    // Situation d'un étudiant face à un examen : peut-il le passer ?
    function lireSituation(db, utilisateurId, examen) {
        const utilisees = compterTentatives(db, utilisateurId, examen.id);
        const supplementaires = compterSupplementaires(db, utilisateurId, examen.id);
        const enCours = Boolean(lireTentativeEnCours(db, utilisateurId, examen.id));
        const planning = etatPlanning(examen);
        const maximum = examen.nb_tentatives_max + supplementaires;

        let message = null;

        // Une tentative déjà commencée peut toujours être reprise
        if (!enCours) {
            if (planning === "a_venir") {
                message = "Cet examen n'est pas encore ouvert.";
            } else if (planning === "ferme") {
                message = "Cet examen est fermé.";
            } else if (utilisees >= maximum) {
                message = maximum > 1
                    ? "Vous avez utilisé toutes vos tentatives pour cet examen."
                    : "Vous avez déjà passé cet examen.";
            }
        }

        return {
            planning,
            tentatives_utilisees: utilisees,
            tentatives_max: maximum,
            en_cours: enCours,
            peut_passer: enCours || message === null,
            message_blocage: message
        };
    }

    // Le temps de la tentative est-il dépassé ? (marge facultative)
    function tempsEcoule(tentative, examen, marge = 0) {
        const debut = Date.parse(tentative.date_debut);

        return (
            !Number.isNaN(debut) &&
            Date.now() >= debut + examen.duree_minutes * 60 * 1000 + marge
        );
    }

    // La correction n'est visible que lorsque l'étudiant a utilisé toutes ses
    // tentatives et n'en a aucune en cours.
    function correctionAutorisee(db, utilisateurId, examenId) {
        const examen = db.examens.find(e => e.id === examenId);

        if (!examen) return false;

        const utilisees = compterTentatives(db, utilisateurId, examenId);
        const supplementaires = compterSupplementaires(db, utilisateurId, examenId);

        return (
            !lireTentativeEnCours(db, utilisateurId, examenId) &&
            (CORRECTION_TOUJOURS || utilisees >= examen.nb_tentatives_max + supplementaires)
        );
    }

    // Terminer une tentative restée ouverte. Sans réponse soumise, la note est 0.
    function cloturerTentative(db, tentativeId) {
        const tentative = db.tentatives.find(t => t.id === tentativeId);

        if (!tentative || tentative.statut !== "en_cours") return false;

        const resultatExistant = db.resultats.find(r => r.tentative_id === tentativeId);

        if (!resultatExistant) {
            const questions = db.questions.filter(q => q.examen_id === tentative.examen_id);

            db.resultats.push({
                id: nouvelId(db, "resultats"),
                utilisateur_id: tentative.utilisateur_id,
                examen_id: tentative.examen_id,
                score: 0,
                total_questions: questions.length,
                date_passage: maintenantSql(),
                tentative_id: tentativeId,
                total_points: sommePar(questions, "points")
            });
        }

        tentative.statut = "termine";
        tentative.date_fin = new Date().toISOString();
        aModifie = true;

        return true;
    }

    // Clôturer toutes les tentatives dont le temps (plus la marge) est dépassé.
    // Sans serveur pour le faire chaque minute, on le fait à chaque requête.
    function cloturerTentativesExpirees(db) {
        const maintenant = Date.now();

        for (const tentative of db.tentatives) {
            if (tentative.statut !== "en_cours") continue;

            const examen = db.examens.find(e => e.id === tentative.examen_id);
            const debut = Date.parse(tentative.date_debut);

            if (!examen || Number.isNaN(debut)) continue;

            if (maintenant > debut + examen.duree_minutes * 60 * 1000 + TOLERANCE_MS) {
                cloturerTentative(db, tentative.id);
            }
        }
    }

    /* ==================================================
       DONNÉES INITIALES (démo + import du fichier de cours)
       ================================================== */

    const EXAMENS_DEMO = [
        {
            cours: {
                titre: "Introduction à la programmation",
                description: "Les bases : variables, conditions, boucles et fonctions."
            },
            titre: "Quiz de démonstration : bases de la programmation",
            duree_minutes: 15,
            nb_tentatives_max: 3,
            note_reussite: 50,
            questions: [
                {
                    texte: "Quel mot-clé permet de déclarer une constante en JavaScript ?",
                    type: "choix_unique", points: 1,
                    explication: "« const » déclare une variable dont la valeur ne peut pas être réaffectée.",
                    choix: [["const", true], ["var", false], ["let", false], ["static", false]]
                },
                {
                    texte: "Parmi ces langages, lesquels sont des langages de programmation ?",
                    type: "choix_multiple", points: 2,
                    explication: "Python et JavaScript sont des langages de programmation. HTML décrit la structure d'une page et CSS son apparence.",
                    choix: [["Python", true], ["JavaScript", true], ["HTML", false], ["CSS", false]]
                },
                {
                    texte: "Une boucle « for » permet de répéter des instructions.",
                    type: "vrai_faux", points: 1,
                    explication: "Une boucle répète un bloc d'instructions tant qu'une condition est vraie ou pour un nombre de fois donné.",
                    choix: [["Vrai", true], ["Faux", false]]
                },
                {
                    texte: "Que renvoie l'expression 2 + 3 * 4 en JavaScript ?",
                    type: "choix_unique", points: 1.5,
                    explication: "La multiplication est prioritaire sur l'addition : 3 * 4 = 12, puis 2 + 12 = 14.",
                    choix: [["14", true], ["20", false], ["24", false], ["9", false]]
                }
            ]
        },
        {
            cours: {
                titre: "Bases de données",
                description: "SQL, tables, clés et relations."
            },
            titre: "Quiz de démonstration : SQL",
            duree_minutes: 10,
            nb_tentatives_max: 2,
            note_reussite: 60,
            questions: [
                {
                    texte: "Quelle commande SQL permet de lire des données ?",
                    type: "choix_unique", points: 1,
                    explication: "SELECT interroge une table et renvoie des lignes.",
                    choix: [["SELECT", true], ["INSERT", false], ["DELETE", false]]
                },
                {
                    texte: "Quelles commandes SQL modifient les données d'une table ?",
                    type: "choix_multiple", points: 2,
                    explication: "INSERT ajoute, UPDATE modifie et DELETE supprime des lignes. SELECT ne fait que lire.",
                    choix: [["INSERT", true], ["UPDATE", true], ["DELETE", true], ["SELECT", false]]
                },
                {
                    texte: "Une clé primaire peut avoir la même valeur dans deux lignes.",
                    type: "vrai_faux", points: 1,
                    explication: "Faux : une clé primaire identifie une ligne de façon unique.",
                    choix: [["Vrai", false], ["Faux", true]]
                }
            ]
        }
    ];

    function trouverOuCreerCours(db, titre, description) {
        let cours = db.cours.find(c => c.titre === titre);

        if (!cours) {
            cours = { id: nouvelId(db, "cours"), titre, description: description || "" };
            db.cours.push(cours);
        }

        return cours;
    }

    function creerExamen(db, coursId, donnees, questions) {
        const examen = {
            id: nouvelId(db, "examens"),
            cours_id: coursId,
            titre: donnees.titre,
            duree_minutes: donnees.duree_minutes,
            statut: donnees.statut || "publie",
            date_ouverture: donnees.date_ouverture || null,
            date_fermeture: donnees.date_fermeture || null,
            note_reussite: donnees.note_reussite,
            nb_tentatives_max: donnees.nb_tentatives_max
        };

        db.examens.push(examen);
        ajouterQuestions(db, examen.id, questions);

        return examen.id;
    }

    // Données de démonstration : seulement si la base ne contient aucun examen
    function creerDonneesDemo(db) {
        for (const examen of EXAMENS_DEMO) {
            const cours = trouverOuCreerCours(db, examen.cours.titre, examen.cours.description);

            creerExamen(db, cours.id, examen, examen.questions.map(question => ({
                texte: question.texte,
                type: question.type,
                points: question.points,
                explication: question.explication,
                choix: question.choix.map(([texte, correcte]) => ({ texte, est_correcte: correcte }))
            })));
        }
    }

    // Transforme une question du fichier JSON importé. Lance une erreur claire si elle est incorrecte.
    function preparerQuestionImport(q, repere) {
        const texte = String(q.texte || "").trim();
        if (!texte) throw new Error(`${repere} : texte de question vide`);

        const type = q.type || "choix_unique";
        if (!TYPES.includes(type)) {
            throw new Error(`${repere} : type "${type}" inconnu (${TYPES.join(", ")})`);
        }

        let choix;

        if (type === "vrai_faux") {
            if (typeof q.reponse !== "boolean") {
                throw new Error(`${repere} : une question vrai_faux doit avoir "reponse": true ou false`);
            }
            choix = [
                { texte: "Vrai", est_correcte: q.reponse },
                { texte: "Faux", est_correcte: !q.reponse }
            ];
        } else {
            choix = (q.choix || []).map(c => ({
                texte: String(c.texte || "").trim(),
                est_correcte: c.correcte === true
            }));

            if (choix.length < 2 || choix.some(c => !c.texte)) {
                throw new Error(`${repere} : il faut au moins 2 choix non vides`);
            }

            const bonnes = choix.filter(c => c.est_correcte).length;

            if (type === "choix_unique" && bonnes !== 1) {
                throw new Error(`${repere} : choix_unique demande exactement 1 bonne réponse (${bonnes} trouvée(s))`);
            }
            if (type === "choix_multiple" && bonnes < 1) {
                throw new Error(`${repere} : choix_multiple demande au moins 1 bonne réponse`);
            }
        }

        const points = q.points === undefined ? 1 : Number(q.points);
        if (!(points > 0)) throw new Error(`${repere} : points invalides`);

        return {
            texte, type, points,
            explication: q.explication ? String(q.explication).trim() : null,
            choix
        };
    }

    // Import des cours et examens du fichier donnees_cours_examens.js (sans doublons).
    // Tout est vérifié avant l'écriture : en cas d'erreur, rien n'est importé.
    function importerCoursExamens(db, contenu) {
        if (!contenu || !Array.isArray(contenu.cours)) {
            throw new Error('Le fichier doit contenir une liste "cours".');
        }

        const plan = contenu.cours.map((cours, i) => {
            const titreCours = String(cours.titre || "").trim();
            if (!titreCours) throw new Error(`cours n°${i + 1} : titre vide`);

            const examens = (cours.examens || []).map((examen, j) => {
                const titreExamen = String(examen.titre || "").trim();
                const repere = `cours "${titreCours}", examen n°${j + 1}`;
                if (!titreExamen) throw new Error(`${repere} : titre vide`);

                const duree = Number(examen.duree_minutes);
                if (!Number.isInteger(duree) || duree < 1) {
                    throw new Error(`${repere} : duree_minutes doit être un entier >= 1`);
                }

                const questions = (examen.questions || []).map((q, k) =>
                    preparerQuestionImport(q, `${repere}, question n°${k + 1}`)
                );
                if (questions.length === 0) throw new Error(`${repere} : aucune question`);

                return {
                    titre: titreExamen,
                    duree_minutes: duree,
                    note_reussite: Number.isInteger(examen.note_reussite) ? examen.note_reussite : 50,
                    nb_tentatives_max: Number.isInteger(examen.nb_tentatives_max) ? examen.nb_tentatives_max : 1,
                    questions
                };
            });

            return {
                titre: titreCours,
                description: cours.description ? String(cours.description).trim() : "",
                examens
            };
        });

        for (const cours of plan) {
            const ligne = trouverOuCreerCours(db, cours.titre, cours.description);

            for (const examen of cours.examens) {
                const existe = db.examens.some(e =>
                    e.cours_id === ligne.id && e.titre === examen.titre);

                // Un examen existant n'est JAMAIS modifié
                if (!existe) {
                    creerExamen(db, ligne.id, examen, examen.questions);
                }
            }
        }
    }

    // Le fichier de données (86 Ko) n'est chargé que lors de la toute première ouverture
    function chargerFichierDonnees() {
        return new Promise(resolve => {
            if (window.DONNEES_COURS_EXAMENS) return resolve(window.DONNEES_COURS_EXAMENS);

            const base = ADRESSE_SCRIPT.replace(/[^/]*$/, "");
            const balise = document.createElement("script");

            balise.src = base + "donnees_cours_examens.js";
            balise.onload = () => resolve(window.DONNEES_COURS_EXAMENS || null);
            balise.onerror = () => resolve(null);
            setTimeout(() => resolve(null), 8000); // jamais bloqué si le fichier ne répond pas
            document.head.appendChild(balise);
        });
    }

    async function creerBaseInitiale() {
        const db = baseVide();

        db.utilisateurs.push({
            id: nouvelId(db, "utilisateurs"),
            nom: ADMIN_PAR_DEFAUT.nom,
            email: ADMIN_PAR_DEFAUT.email,
            mot_de_passe: await hacher(ADMIN_PAR_DEFAUT.mot_de_passe),
            role: "admin"
        });

        db.utilisateurs.push({
            id: nouvelId(db, "utilisateurs"),
            nom: ETUDIANT_DEMO.nom,
            email: ETUDIANT_DEMO.email,
            mot_de_passe: await hacher(ETUDIANT_DEMO.mot_de_passe),
            role: "etudiant"
        });

        creerDonneesDemo(db);

        try {
            importerCoursExamens(db, await chargerFichierDonnees());
        } catch (erreur) {
            console.error("Import des cours ignoré :", erreur.message);
        }

        sauvegarder(db);
    }

    // Garantit qu'au moins un administrateur existe (compte par défaut recréé sinon)
    async function verifierAdministrateur() {
        const db = charger();

        if (db.utilisateurs.some(u => u.role === "admin")) return;

        const existant = db.utilisateurs.find(u => u.email === ADMIN_PAR_DEFAUT.email);

        if (existant) {
            existant.role = "admin";
        } else {
            db.utilisateurs.push({
                id: nouvelId(db, "utilisateurs"),
                nom: ADMIN_PAR_DEFAUT.nom,
                email: ADMIN_PAR_DEFAUT.email,
                mot_de_passe: await hacher(ADMIN_PAR_DEFAUT.mot_de_passe),
                role: "admin"
            });
        }

        sauvegarder(db);
    }

    // Prête quand la base existe. Une erreur ici ne doit jamais bloquer les pages.
    const pret = (async function () {
        try {
            if (!stockage.lire()) {
                await creerBaseInitiale();
            } else {
                await verifierAdministrateur();
            }
        } catch (erreur) {
            console.error("Initialisation de la base :", erreur);
        }
    })();

    /* ==================================================
       ROUTES (mêmes adresses que l'ancien backend)
       ================================================== */

    const ROUTES = [];

    // acces : "public", "utilisateur" ou "admin"
    function route(methode, modele, acces, gestionnaire) {
        const noms = [];
        const motif = "^" + modele.replace(/:([a-z_]+)/g, (tout, nom) => {
            noms.push(nom);
            return "([^/]+)";
        }) + "$";

        ROUTES.push({ methode, motif: new RegExp(motif), noms, acces, gestionnaire });
    }

    /* ---------- AUTHENTIFICATION ---------- */

    route("POST", "/auth/inscription", "public", async ({ db, corps }) => {
        const { nom, email, mot_de_passe } = corps;

        if (!nom || !email || !mot_de_passe) {
            throw new ErreurHTTP(400, "Tous les champs sont obligatoires.");
        }

        if (mot_de_passe.length < 8) {
            throw new ErreurHTTP(400, "Le mot de passe doit contenir au moins 8 caractères.");
        }

        const adresse = String(email).trim().toLowerCase();

        if (db.utilisateurs.some(u => u.email === adresse)) {
            throw new ErreurHTTP(409, "Cette adresse email est déjà utilisée.");
        }

        const utilisateur = {
            id: nouvelId(db, "utilisateurs"),
            nom: String(nom).trim(),
            email: adresse,
            mot_de_passe: await hacher(mot_de_passe),
            role: "etudiant"
        };

        db.utilisateurs.push(utilisateur);

        return {
            message: "Inscription réussie.",
            utilisateur: {
                id: utilisateur.id,
                nom: utilisateur.nom,
                email: utilisateur.email,
                role: "etudiant"
            }
        };
    });

    route("POST", "/auth/connexion", "public", async ({ db, corps }) => {
        const { email, mot_de_passe } = corps;

        if (!email || !mot_de_passe) {
            throw new ErreurHTTP(400, "Email et mot de passe obligatoires.");
        }

        const utilisateur = db.utilisateurs.find(u =>
            u.email === String(email).trim().toLowerCase());

        if (!utilisateur || !(await verifierMotDePasse(mot_de_passe, utilisateur.mot_de_passe))) {
            throw new ErreurHTTP(401, "Identifiants incorrects.");
        }

        return {
            message: "Connexion réussie.",
            jeton: creerJeton(utilisateur),
            utilisateur: {
                id: utilisateur.id,
                nom: utilisateur.nom,
                email: utilisateur.email,
                role: utilisateur.role
            }
        };
    });

    // Vérifie que le compte existe toujours (appelé automatiquement par les pages)
    route("POST", "/auth/renouveler", "utilisateur", ({ utilisateur }) => {
        return { jeton: creerJeton(utilisateur) };
    });

    /* ---------- ADMIN : COURS ---------- */

    route("GET", "/admin/cours", "admin", ({ db }) => {
        return db.cours
            .map(c => ({ id: c.id, titre: c.titre, description: c.description }))
            .sort((a, b) => b.id - a.id);
    });

    route("POST", "/admin/cours", "admin", ({ db, corps }) => {
        const { titre, description } = corps;

        if (typeof titre !== "string" || !titre.trim()) {
            throw new ErreurHTTP(400, "Le titre du cours est obligatoire.");
        }

        const cours = {
            id: nouvelId(db, "cours"),
            titre: titre.trim(),
            description: typeof description === "string" ? description.trim() : ""
        };

        db.cours.push(cours);

        return { message: "Cours ajouté avec succès.", id: cours.id };
    });

    route("PUT", "/admin/cours/:id", "admin", ({ db, params, corps }) => {
        const id = Number(params.id);
        const { titre, description } = corps;

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErreurHTTP(400, "Identifiant du cours invalide.");
        }

        if (typeof titre !== "string" || !titre.trim()) {
            throw new ErreurHTTP(400, "Le titre du cours est obligatoire.");
        }

        const cours = db.cours.find(c => c.id === id);

        if (!cours) {
            throw new ErreurHTTP(404, "Cours introuvable.");
        }

        cours.titre = titre.trim();
        cours.description = typeof description === "string" ? description.trim() : "";
        aModifie = true;

        return { message: "Cours modifié avec succès." };
    });

    route("DELETE", "/admin/cours/:id", "admin", ({ db, params }) => {
        const id = Number(params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErreurHTTP(400, "Identifiant du cours invalide.");
        }

        if (!db.cours.some(c => c.id === id)) {
            throw new ErreurHTTP(404, "Cours introuvable.");
        }

        if (db.examens.some(e => e.cours_id === id)) {
            throw new ErreurHTTP(409, "Ce cours est associé à des examens. Supprimez ou réaffectez d'abord ces examens.");
        }

        db.cours = db.cours.filter(c => c.id !== id);
        aModifie = true;

        return { message: "Cours supprimé avec succès." };
    });

    /* ---------- ADMIN : EXAMENS ---------- */

    route("GET", "/admin/examens", "admin", ({ db }) => {
        return db.examens
            .map(e => {
                const cours = db.cours.find(c => c.id === e.cours_id);

                return {
                    id: e.id,
                    titre: e.titre,
                    cours_id: e.cours_id,
                    duree_minutes: e.duree_minutes,
                    statut: e.statut,
                    date_ouverture: e.date_ouverture,
                    date_fermeture: e.date_fermeture,
                    note_reussite: e.note_reussite,
                    nb_tentatives_max: e.nb_tentatives_max,
                    cours_titre: cours ? cours.titre : null,
                    nombre_questions: db.questions.filter(q => q.examen_id === e.id).length,
                    nombre_resultats: db.resultats.filter(r => r.examen_id === e.id).length,
                    nombre_tentatives: db.tentatives.filter(t => t.examen_id === e.id).length
                };
            })
            .sort((a, b) => b.id - a.id);
    });

    route("POST", "/admin/examens", "admin", ({ db, corps }) => {
        const { cours_id, titre, duree_minutes, questions } = corps;
        const idCours = Number(cours_id);
        const duree = Number(duree_minutes);

        const planning = lirePlanning(corps);

        if (planning.erreur) throw new ErreurHTTP(400, planning.erreur);

        if (!Number.isInteger(idCours) || idCours <= 0) {
            throw new ErreurHTTP(400, "Veuillez sélectionner un cours valide.");
        }

        if (typeof titre !== "string" || !titre.trim()) {
            throw new ErreurHTTP(400, "Le titre de l'examen est obligatoire.");
        }

        if (!Number.isInteger(duree) || duree <= 0) {
            throw new ErreurHTTP(400, "La durée doit être un nombre entier positif.");
        }

        const verification = validerQuestions(questions);

        if (verification.erreur) throw new ErreurHTTP(400, verification.erreur);

        if (!db.cours.some(c => c.id === idCours)) {
            throw new ErreurHTTP(404, "Le cours sélectionné n'existe pas.");
        }

        const examenId = creerExamen(db, idCours, {
            titre: titre.trim(),
            duree_minutes: duree,
            statut: planning.statut,
            date_ouverture: planning.date_ouverture,
            date_fermeture: planning.date_fermeture,
            note_reussite: planning.note_reussite,
            nb_tentatives_max: planning.nb_tentatives_max
        }, verification.questions);

        return { message: "Examen créé avec succès.", examen_id: examenId };
    });

    route("GET", "/admin/examens/:id", "admin", ({ db, params }) => {
        const id = Number(params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErreurHTTP(400, "Identifiant de l'examen invalide.");
        }

        const examen = db.examens.find(e => e.id === id);

        if (!examen) {
            throw new ErreurHTTP(404, "Examen introuvable.");
        }

        return {
            id: examen.id,
            cours_id: examen.cours_id,
            titre: examen.titre,
            duree_minutes: examen.duree_minutes,
            statut: examen.statut,
            date_ouverture: examen.date_ouverture,
            date_fermeture: examen.date_fermeture,
            note_reussite: examen.note_reussite,
            nb_tentatives_max: examen.nb_tentatives_max,
            questions: lireQuestionsCompletes(db, id)
        };
    });

    route("PUT", "/admin/examens/:id", "admin", ({ db, params, corps }) => {
        const id = Number(params.id);
        const { cours_id, titre, duree_minutes, questions } = corps;
        const idCours = Number(cours_id);
        const duree = Number(duree_minutes);

        const planning = lirePlanning(corps);

        if (planning.erreur) throw new ErreurHTTP(400, planning.erreur);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErreurHTTP(400, "Identifiant de l'examen invalide.");
        }

        if (!Number.isInteger(idCours) || idCours <= 0) {
            throw new ErreurHTTP(400, "Veuillez sélectionner un cours valide.");
        }

        if (typeof titre !== "string" || !titre.trim()) {
            throw new ErreurHTTP(400, "Le titre de l'examen est obligatoire.");
        }

        if (!Number.isInteger(duree) || duree <= 0) {
            throw new ErreurHTTP(400, "La durée doit être un entier positif.");
        }

        const verification = validerQuestions(questions);

        if (verification.erreur) throw new ErreurHTTP(400, verification.erreur);

        const examen = db.examens.find(e => e.id === id);

        if (!examen) {
            throw new ErreurHTTP(404, "Examen introuvable.");
        }

        if (!db.cours.some(c => c.id === idCours)) {
            throw new ErreurHTTP(404, "Le cours sélectionné n'existe pas.");
        }

        // Protéger l'historique des examens déjà passés
        if (db.resultats.some(r => r.examen_id === id)) {
            throw new ErreurHTTP(409, "Cet examen possède déjà des résultats. Pour conserver l'historique, sa modification est bloquée.");
        }

        if (db.tentatives.some(t => t.examen_id === id)) {
            throw new ErreurHTTP(409, "Des étudiants ont déjà commencé cet examen : sa modification est bloquée.");
        }

        examen.cours_id = idCours;
        examen.titre = titre.trim();
        examen.duree_minutes = duree;
        examen.statut = planning.statut;
        examen.date_ouverture = planning.date_ouverture;
        examen.date_fermeture = planning.date_fermeture;
        examen.note_reussite = planning.note_reussite;
        examen.nb_tentatives_max = planning.nb_tentatives_max;

        supprimerQuestionsExamen(db, id);
        ajouterQuestions(db, id, verification.questions);

        return { message: "Examen modifié avec succès." };
    });

    route("DELETE", "/admin/examens/:id", "admin", ({ db, params }) => {
        const id = Number(params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErreurHTTP(400, "Identifiant de l'examen invalide.");
        }

        if (!db.examens.some(e => e.id === id)) {
            throw new ErreurHTTP(404, "Examen introuvable.");
        }

        if (db.resultats.some(r => r.examen_id === id)) {
            throw new ErreurHTTP(409, "Cet examen possède déjà des résultats et ne peut pas être supprimé.");
        }

        if (db.tentatives.some(t => t.examen_id === id)) {
            throw new ErreurHTTP(409, "Des étudiants ont déjà commencé cet examen : il ne peut pas être supprimé.");
        }

        supprimerQuestionsExamen(db, id);
        db.autorisations_tentatives = db.autorisations_tentatives.filter(a => a.examen_id !== id);
        db.examens = db.examens.filter(e => e.id !== id);
        aModifie = true;

        return { message: "Examen supprimé avec succès." };
    });

    route("PATCH", "/admin/examens/:id/planning", "admin", ({ db, params, corps }) => {
        const id = Number(params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErreurHTTP(400, "Identifiant de l'examen invalide.");
        }

        const planning = lirePlanning(corps);

        if (planning.erreur) throw new ErreurHTTP(400, planning.erreur);

        const examen = db.examens.find(e => e.id === id);

        if (!examen) {
            throw new ErreurHTTP(404, "Examen introuvable.");
        }

        examen.statut = planning.statut;
        examen.date_ouverture = planning.date_ouverture;
        examen.date_fermeture = planning.date_fermeture;
        examen.note_reussite = planning.note_reussite;
        examen.nb_tentatives_max = planning.nb_tentatives_max;
        aModifie = true;

        return { message: "Planning enregistré." };
    });

    route("POST", "/admin/examens/:id/autoriser-tentative", "admin", ({ db, params, corps }) => {
        const examenId = Number(params.id);
        const utilisateurId = Number(corps.utilisateur_id);

        if (
            !Number.isInteger(examenId) || examenId <= 0 ||
            !Number.isInteger(utilisateurId) || utilisateurId <= 0
        ) {
            throw new ErreurHTTP(400, "Examen ou étudiant invalide.");
        }

        const examen = db.examens.find(e => e.id === examenId);

        if (!examen) {
            throw new ErreurHTTP(404, "Examen introuvable.");
        }

        const etudiant = db.utilisateurs.find(u => u.id === utilisateurId && u.role === "etudiant");

        if (!etudiant) {
            throw new ErreurHTTP(404, "Étudiant introuvable.");
        }

        if (lireTentativeEnCours(db, utilisateurId, examenId)) {
            throw new ErreurHTTP(409, "Cet étudiant a une tentative en cours.");
        }

        const restantes =
            examen.nb_tentatives_max +
            compterSupplementaires(db, utilisateurId, examenId) -
            compterTentatives(db, utilisateurId, examenId);

        if (restantes > 0) {
            throw new ErreurHTTP(409, `Cet étudiant peut encore passer l'examen (${restantes} tentative(s) restante(s)).`);
        }

        const autorisation = db.autorisations_tentatives.find(a =>
            a.utilisateur_id === utilisateurId && a.examen_id === examenId);

        if (autorisation) {
            autorisation.supplementaires += 1;
        } else {
            db.autorisations_tentatives.push({
                id: nouvelId(db, "autorisations_tentatives"),
                utilisateur_id: utilisateurId,
                examen_id: examenId,
                supplementaires: 1
            });
        }

        aModifie = true;

        const fermeture = examen.date_fermeture ? Date.parse(examen.date_fermeture) : NaN;

        return {
            message: "Nouvelle tentative autorisée.",
            avertissement: !Number.isNaN(fermeture) && Date.now() > fermeture
                ? "L'examen est fermé : repoussez sa date de fermeture pour que l'étudiant puisse le passer."
                : null
        };
    });

    /* ---------- ADMIN : RÉSULTATS, STATISTIQUES, UTILISATEURS ---------- */

    // Un résultat enrichi du nom de l'étudiant, du titre de l'examen, etc.
    function enrichirResultat(db, r) {
        const utilisateur = db.utilisateurs.find(u => u.id === r.utilisateur_id);
        const examen = db.examens.find(e => e.id === r.examen_id);
        const tentative = db.tentatives.find(t => t.id === r.tentative_id);

        return {
            ...r,
            etudiant_nom: utilisateur ? utilisateur.nom : null,
            etudiant_email: utilisateur ? utilisateur.email : null,
            examen_titre: examen ? examen.titre : null,
            note_reussite: examen ? examen.note_reussite : null,
            tentative_numero: tentative ? tentative.numero : null
        };
    }

    route("GET", "/admin/resultats", "admin", ({ db }) => {
        return db.resultats
            .map(r => avecTotalPoints(enrichirResultat(db, r)))
            .sort((a, b) => b.id - a.id);
    });

    route("GET", "/admin/resultats/:id/copie", "admin", ({ db, params }) => {
        const id = Number(params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErreurHTTP(400, "Identifiant du résultat invalide.");
        }

        const brut = db.resultats.find(r => r.id === id);

        if (!brut) {
            throw new ErreurHTTP(404, "Résultat introuvable.");
        }

        const resultat = enrichirResultat(db, brut);

        const reponses = resultat.tentative_id
            ? db.reponses_etudiants.filter(r => r.tentative_id === resultat.tentative_id)
            : [];

        const detail = corriger(
            lireQuestionsCompletes(db, resultat.examen_id),
            new Set(reponses.map(reponse => reponse.choix_id))
        );

        const { tentative_id, examen_id, utilisateur_id, ...infos } = resultat;

        return {
            ...avecTotalPoints(infos),
            copie_enregistree: reponses.length > 0,
            questions: detail
        };
    });

    route("GET", "/admin/statistiques", "admin", ({ db }) => {
        return {
            etudiants: db.utilisateurs.filter(u => u.role === "etudiant").length,
            cours: db.cours.length,
            examens: db.examens.length,
            resultats: db.resultats.length
        };
    });

    function listeUtilisateurs(db) {
        return db.utilisateurs
            .map(u => ({ id: u.id, nom: u.nom, email: u.email, role: u.role }))
            .sort((a, b) => b.id - a.id);
    }

    route("GET", "/admin/utilisateurs/recents", "admin", ({ db }) => {
        return listeUtilisateurs(db).slice(0, 5);
    });

    route("GET", "/admin/utilisateurs", "admin", ({ db }) => {
        return listeUtilisateurs(db);
    });

    /* ---------- ÉTUDIANT : EXAMENS ---------- */

    route("GET", "/examens", "utilisateur", ({ db, utilisateur }) => {
        const maintenant = Date.now();

        return db.examens
            .filter(e => e.statut === "publie")
            .sort((a, b) => b.id - a.id)
            .map(examen => {
                const cours = db.cours.find(c => c.id === examen.cours_id);
                const utilisees = compterTentatives(db, utilisateur.id, examen.id);
                const maximum = examen.nb_tentatives_max + compterSupplementaires(db, utilisateur.id, examen.id);
                const enCours = Boolean(lireTentativeEnCours(db, utilisateur.id, examen.id));
                const planning = etatPlanning(examen, maintenant);

                const resultats = db.resultats
                    .filter(r => r.examen_id === examen.id && r.utilisateur_id === utilisateur.id)
                    .sort((a, b) => b.id - a.id);

                const dernier = resultats[0];

                return {
                    id: examen.id,
                    titre: examen.titre,
                    cours: cours ? cours.titre : null,
                    duree_minutes: examen.duree_minutes,
                    date_ouverture: examen.date_ouverture,
                    date_fermeture: examen.date_fermeture,
                    planning,
                    tentatives_utilisees: utilisees,
                    tentatives_max: maximum,
                    en_cours: enCours,
                    deja_passe: resultats.length > 0,
                    score_precedent: dernier ? dernier.score : null,
                    total_precedent: dernier ? (dernier.total_points ?? dernier.total_questions) : null,
                    peut_passer: enCours || (planning === "ouvert" && utilisees < maximum)
                };
            });
    });

    route("GET", "/examens/resultats/mes-resultats", "utilisateur", ({ db, utilisateur }) => {
        return db.resultats
            .filter(r => r.utilisateur_id === utilisateur.id)
            .map(r => {
                const examen = db.examens.find(e => e.id === r.examen_id);
                const tentative = db.tentatives.find(t => t.id === r.tentative_id);

                return avecTotalPoints({
                    id: r.id,
                    examen: examen ? examen.titre : null,
                    score: r.score,
                    total_questions: r.total_questions,
                    total_points: r.total_points,
                    examen_id: r.examen_id,
                    date_passage: r.date_passage,
                    tentative: tentative ? tentative.numero : null
                });
            })
            .sort((a, b) => {
                if (a.date_passage !== b.date_passage) {
                    return a.date_passage < b.date_passage ? 1 : -1;
                }
                return b.id - a.id;
            });
    });

    route("GET", "/examens/resultats/:id/correction", "utilisateur", ({ db, params, utilisateur }) => {
        const id = lireIdentifiant(params.id);

        if (id === null) {
            throw new ErreurHTTP(400, "Identifiant invalide.");
        }

        const brut = db.resultats.find(r => r.id === id && r.utilisateur_id === utilisateur.id);

        if (!brut) {
            throw new ErreurHTTP(404, "Résultat introuvable.");
        }

        if (!correctionAutorisee(db, utilisateur.id, brut.examen_id)) {
            throw new ErreurHTTP(403, "La correction sera disponible quand vous aurez utilisé toutes vos tentatives.");
        }

        const examen = db.examens.find(e => e.id === brut.examen_id);

        const reponses = brut.tentative_id
            ? db.reponses_etudiants.filter(r => r.tentative_id === brut.tentative_id)
            : [];

        const detail = corriger(
            lireQuestionsCompletes(db, brut.examen_id),
            new Set(reponses.map(reponse => reponse.choix_id))
        );

        return {
            ...avecTotalPoints({
                id: brut.id,
                score: brut.score,
                total_questions: brut.total_questions,
                total_points: brut.total_points,
                date_passage: brut.date_passage,
                examen: examen ? examen.titre : null,
                note_reussite: examen ? examen.note_reussite : null
            }),
            copie_enregistree: reponses.length > 0,
            questions: detail
        };
    });

    // Informations sur un examen (le chronomètre ne démarre pas ici)
    route("GET", "/examens/:id", "utilisateur", ({ db, params, utilisateur }) => {
        const examenId = lireIdentifiant(params.id);

        if (examenId === null) {
            throw new ErreurHTTP(400, "Identifiant invalide.");
        }

        const examen = lireExamenPublie(db, examenId);

        if (!examen) {
            throw new ErreurHTTP(404, "Examen introuvable.");
        }

        return {
            id: examen.id,
            titre: examen.titre,
            cours: examen.cours,
            duree_minutes: examen.duree_minutes,
            date_ouverture: examen.date_ouverture,
            date_fermeture: examen.date_fermeture,
            note_reussite: examen.note_reussite,
            nombre_questions: db.questions.filter(q => q.examen_id === examenId).length,
            ...lireSituation(db, utilisateur.id, examen)
        };
    });

    // Démarrer (ou reprendre) une tentative
    route("POST", "/examens/:id/demarrer", "utilisateur", ({ db, params, utilisateur }) => {
        const examenId = lireIdentifiant(params.id);

        if (examenId === null) {
            throw new ErreurHTTP(400, "Identifiant invalide.");
        }

        const examen = lireExamenPublie(db, examenId);

        if (!examen) {
            throw new ErreurHTTP(404, "Examen introuvable.");
        }

        let tentative = lireTentativeEnCours(db, utilisateur.id, examenId);

        if (tentative) {
            // Temps écoulé : on ne rouvre jamais l'examen, on le clôture
            if (tempsEcoule(tentative, examen)) {
                cloturerTentative(db, tentative.id);

                throw new ErreurHTTP(409, "Le temps imparti est écoulé : l'examen a été clôturé avec la note 0.");
            }
        } else {
            const situation = lireSituation(db, utilisateur.id, examen);

            if (!situation.peut_passer) {
                throw new ErreurHTTP(situation.planning === "ouvert" ? 409 : 403, situation.message_blocage);
            }

            if (!db.questions.some(q => q.examen_id === examenId)) {
                throw new ErreurHTTP(400, "Cet examen ne contient aucune question.");
            }

            const numeros = db.tentatives
                .filter(t => t.utilisateur_id === utilisateur.id && t.examen_id === examenId)
                .map(t => t.numero);

            tentative = {
                id: nouvelId(db, "tentatives"),
                utilisateur_id: utilisateur.id,
                examen_id: examenId,
                numero: (numeros.length ? Math.max(...numeros) : 0) + 1,
                date_debut: new Date().toISOString(),
                date_fin: null,
                statut: "en_cours"
            };

            db.tentatives.push(tentative);
            aModifie = true;
        }

        const questions = db.questions
            .filter(q => q.examen_id === examenId)
            .sort((a, b) => a.id - b.id);

        return {
            id: examen.id,
            titre: examen.titre,
            cours: examen.cours,
            duree_minutes: examen.duree_minutes,
            numero: tentative.numero,
            date_debut: tentative.date_debut,
            maintenant: new Date().toISOString(),
            questions: questions.map(question => ({
                id: question.id,
                texte: question.texte,
                type: question.type,
                points: question.points,
                // Les bonnes réponses ne sont jamais envoyées à la page
                choix: db.choix_reponses
                    .filter(c => c.question_id === question.id)
                    .sort((a, b) => a.id - b.id)
                    .map(c => ({ id: c.id, texte: c.texte }))
            }))
        };
    });

    // Soumettre les réponses et calculer la note
    route("POST", "/examens/:id/soumettre", "utilisateur", ({ db, params, corps, utilisateur }) => {
        const examenId = lireIdentifiant(params.id);
        const { reponses } = corps;

        if (examenId === null || !Array.isArray(reponses)) {
            throw new ErreurHTTP(400, "Données invalides.");
        }

        const examen = db.examens.find(e => e.id === examenId);

        if (!examen) {
            throw new ErreurHTTP(404, "Examen introuvable.");
        }

        const tentative = lireTentativeEnCours(db, utilisateur.id, examenId);

        if (!tentative) {
            throw new ErreurHTTP(409, "Aucune tentative active pour cet examen.");
        }

        // Au-delà de la limite + marge, les réponses sont refusées et l'examen est clôturé
        if (tempsEcoule(tentative, examen, TOLERANCE_MS)) {
            cloturerTentative(db, tentative.id);

            throw new ErreurHTTP(403, "Le temps est écoulé : les réponses tardives sont refusées et l'examen a été clôturé avec la note 0.");
        }

        const questions = lireQuestionsCompletes(db, examenId);

        if (questions.length === 0) {
            throw new ErreurHTTP(400, "Cet examen ne contient aucune question.");
        }

        const questionsParId = new Map(questions.map(question => [question.id, question]));

        // Chaque réponse : { question_id, choix_ids: [...] } (l'ancien format { question_id, choix_id } reste accepté).
        // Les questions sans réponse comptent comme incorrectes.
        const choixParQuestion = new Map();
        const invalide = () => new ErreurHTTP(400, "Les réponses sont invalides ou répétées.");

        for (const reponse of reponses) {
            if (!reponse || !Number.isInteger(reponse.question_id)) throw invalide();

            const question = questionsParId.get(reponse.question_id);

            if (!question) {
                throw new ErreurHTTP(400, "Une question ne correspond pas à cet examen.");
            }

            if (choixParQuestion.has(question.id)) throw invalide();

            let identifiants;

            if (Array.isArray(reponse.choix_ids)) {
                identifiants = reponse.choix_ids;
            } else if (Number.isInteger(reponse.choix_id)) {
                identifiants = [reponse.choix_id];
            } else {
                throw invalide();
            }

            if (
                identifiants.some(id => !Number.isInteger(id)) ||
                new Set(identifiants).size !== identifiants.length
            ) {
                throw invalide();
            }

            const autorises = new Set(question.choix.map(choix => choix.id));

            if (identifiants.some(id => !autorises.has(id))) {
                throw new ErreurHTTP(400, "Un choix de réponse est invalide.");
            }

            if (question.type !== "choix_multiple" && identifiants.length > 1) {
                throw new ErreurHTTP(400, "Une question n'accepte qu'une seule réponse.");
            }

            if (identifiants.length > 0) {
                choixParQuestion.set(question.id, identifiants);
            }
        }

        const choisis = new Set([...choixParQuestion.values()].flat());
        const detail = corriger(questions, choisis);
        const { score, total_points: totalPoints } = totaux(detail);

        // Résultat, copie détaillée et fin de tentative : tout ensemble
        const resultat = {
            id: nouvelId(db, "resultats"),
            utilisateur_id: utilisateur.id,
            examen_id: examenId,
            score,
            total_questions: questions.length,
            date_passage: maintenantSql(),
            tentative_id: tentative.id,
            total_points: totalPoints
        };

        db.resultats.push(resultat);

        for (const [questionId, identifiants] of choixParQuestion) {
            for (const choixId of identifiants) {
                db.reponses_etudiants.push({
                    id: nouvelId(db, "reponses_etudiants"),
                    tentative_id: tentative.id,
                    question_id: questionId,
                    choix_id: choixId
                });
            }
        }

        tentative.statut = "termine";
        tentative.date_fin = new Date().toISOString();
        aModifie = true;

        const pourcentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

        // La correction n'est donnée que si l'étudiant ne peut plus repasser l'examen
        const correctionVisible = correctionAutorisee(db, utilisateur.id, examenId);

        return {
            message: "Examen soumis avec succès.",
            resultat_id: resultat.id,
            score,
            total_questions: totalPoints,
            nombre_questions: questions.length,
            pourcentage,
            note_reussite: examen.note_reussite,
            reussi: pourcentage >= examen.note_reussite,
            correction_visible: correctionVisible,
            correction: correctionVisible ? detail : null
        };
    });

    /* ==================================================
       POINT D'ENTRÉE (appelé par api.js à la place de fetch)
       ================================================== */

    async function executerLocal(chemin, options = {}) {
        await pret;

        const methode = String(options.method || "GET").toUpperCase();
        const cheminPropre = String(chemin).split("?")[0];

        let corps = {};

        if (options.body) {
            try {
                corps = JSON.parse(options.body);
            } catch (erreur) {
                corps = {};
            }
        }

        const db = charger();
        aModifie = false;

        // Ces deux routes vérifient elles-mêmes le temps écoulé (et renvoient un message précis) :
        // on ne clôture donc les tentatives expirées qu'après elles, pas avant.
        const verifieLeTemps = /^\/examens\/[^/]+\/(soumettre|demarrer)$/.test(cheminPropre);

        try {
            if (!verifieLeTemps) cloturerTentativesExpirees(db);

            for (const candidate of ROUTES) {
                if (candidate.methode !== methode) continue;

                const trouve = candidate.motif.exec(cheminPropre);
                if (!trouve) continue;

                const params = {};
                candidate.noms.forEach((nom, i) => { params[nom] = decodeURIComponent(trouve[i + 1]); });

                let utilisateur = null;

                if (candidate.acces !== "public") {
                    utilisateur = verifierUtilisateur(db);

                    if (candidate.acces === "admin" && utilisateur.role !== "admin") {
                        throw new ErreurHTTP(403, "Accès réservé à l'administrateur.");
                    }
                }

                return await candidate.gestionnaire({ db, params, corps, utilisateur });
            }

            throw new ErreurHTTP(404, `Route introuvable : ${methode} ${cheminPropre}`);
        } finally {
            if (verifieLeTemps) cloturerTentativesExpirees(db);

            // Même quand une erreur est renvoyée (ex. clôture pour temps écoulé), on garde les changements
            if (aModifie) sauvegarder(db);
        }
    }

    /* ==================================================
       OUTILS POUR L'ENSEIGNANT (console du navigateur)
       ================================================== */

    window.ExamProBase = {
        // Télécharge toute la base dans un fichier (sauvegarde ou transfert vers un autre appareil)
        exporter() {
            const texte = stockage.lire() || JSON.stringify(baseVide());
            const lien = document.createElement("a");

            lien.href = URL.createObjectURL(new Blob([texte], { type: "application/json" }));
            lien.download = "exampro_sauvegarde.json";
            lien.click();
            URL.revokeObjectURL(lien.href);
        },

        // Remplace toute la base par le contenu d'une sauvegarde (texte JSON)
        importer(texteJson) {
            const db = JSON.parse(texteJson);

            if (!db || !Array.isArray(db.utilisateurs) || !Array.isArray(db.examens) || !db.seq) {
                throw new Error("Fichier de sauvegarde invalide.");
            }

            stockage.ecrire(JSON.stringify(db));
        },

        // Efface TOUTES les données ; la base de départ sera recréée au prochain chargement
        reinitialiser() {
            stockage.effacer();
            sessionStorage.clear();
            location.reload();
        }
    };

    window.executerLocal = executerLocal;
})();
