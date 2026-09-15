# Carte mentale interactive — version définitive

Cette version consolide la **v46** en une base propre et stable. Elle est destinée à être la base unique pour les futures évolutions.

## Structure

- `index.html` — structure de l’interface.
- `css/styles.css` — apparence, responsive iPhone/iPad/ordinateur, menus et aperçu PDF.
- `js/app.js` — logique de la carte : branches, idées, sous-idées, icônes, édition, sauvegarde et export PDF.

## Fonctionnalités conservées

- sujet central « MON PROJET » éditable ;
- ajout de branches, idées et sous-idées ;
- menu contextuel des branches avec couleurs, texte, taille, icônes et suppression ;
- bouton `+ Ajouter une branche` dans la bulle centrale ;
- bouton rapide `+ Icône` fixé en bas à droite ;
- meilleure zone de sélection des branches à la souris et au tactile ;
- responsive iPhone, iPad et ordinateur ;
- sauvegarde locale du projet ;
- export PDF cadré sur la carte ;
- sur iPhone/iPad : partage vers **Fichiers** ;
- sur Mac/PC : enregistrement direct du PDF sur l’ordinateur.

## Nettoyage effectué

- suppression du bloc CSS v41 devenu redondant ;
- suppression des intitulés de correctifs de version dans la feuille de style ;
- conservation d’un seul système actif d’édition des textes de branches ;
- conservation des anciennes clés de stockage uniquement pour rester compatible avec les projets déjà enregistrés ;
- regroupement des styles finaux par fonctionnalité ;
- vérification de la syntaxe JavaScript et CSS.

## Base de travail

Pour les prochaines modifications, repartez uniquement de ce dossier **carte-mentale-definitive** afin d’éviter de réintroduire d’anciens correctifs.
