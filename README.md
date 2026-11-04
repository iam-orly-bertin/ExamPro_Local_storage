# ExamPro — version sans backend (localStorage)

HTML / CSS / JavaScript pur. **Aucun serveur, aucune installation** : toutes les données
sont enregistrées dans le `localStorage` du navigateur.

## Lancer
- Hébergement : GitHub Pages (comme avant) ou n'importe quel hébergeur de fichiers statiques.
- En local : ouvrez `index.html` (ou utilisez un petit serveur statique).
- Plus besoin de Render, de `npm install`, de `.env` ni de `config.js`.

## Comptes créés automatiquement à la première ouverture
| Rôle | Email | Mot de passe |
|---|---|---|
| Enseignant (admin) | admin@exampro.com | admin12345 |
| Étudiant de démonstration | etudiant.demo@exampro.com | demo12345 |

Pour les changer : éditez `ADMIN_PAR_DEFAUT` et `ETUDIANT_DEMO` en haut de `base_locale.js`,
puis réinitialisez la base (voir plus bas). Les cours et examens de départ viennent de
`donnees_cours_examens.js` (ancien `cours_examens.json`).

## Comment ça marche
`base_locale.js` remplace tout le backend : il reçoit les mêmes requêtes qu'avant
(`/auth/connexion`, `/examens/3/soumettre`, `/admin/resultats`…) et applique les mêmes règles
(tentatives, planning, correction, clôture à la fin du temps). Les pages appellent toujours
`appeler(...)`, rien d'autre n'a changé côté interface.

Réglages (en haut de `base_locale.js`) : `TOLERANCE_MS`, `CORRECTION_TOUJOURS`.

## À savoir
- **Les données restent dans le navigateur de l'appareil.** Un étudiant inscrit sur son téléphone
  n'apparaît pas chez l'enseignant sur son ordinateur. Effacer les données du site efface la base.
- Tout le code est visible dans le navigateur : les mots de passe protègent l'accès à l'interface,
  pas contre quelqu'un qui ouvre les outils de développement. Convient à un projet scolaire / démo.
- Le chronomètre utilise l'horloge de l'appareil.

## Outils (console du navigateur, touche F12)
```js
ExamProBase.exporter()        // télécharge une sauvegarde exampro_sauvegarde.json
ExamProBase.importer(texte)   // restaure une sauvegarde (texte JSON)
ExamProBase.reinitialiser()   // efface tout et recrée la base de départ
```
