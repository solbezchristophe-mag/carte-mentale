# Carte mentale interactive — base propre

Cette version est une base de travail nettoyée à partir de la **v36**.
L’objectif est de pouvoir continuer les modifications sans accumuler les anciens correctifs.

## Structure

```text
carte-mentale-clean/
├── index.html          Structure de la page
├── css/
│   └── styles.css      Tous les styles visuels et responsive
├── js/
│   └── app.js          Toute la logique de la carte mentale
└── README.md           Ce guide
```

## Où modifier quoi ?

### `index.html`
Contient uniquement la structure de la page : carte, menu, sujet central, calques, fenêtre d’icônes et **éditeur permanent des textes de branche** (`#branchTextEditor`).

### `css/styles.css`
Contient l’apparence de l’application. Le fichier est volontairement non minifié pour rester lisible.
Les grandes zones sont repérées par des commentaires :

1. Base et surface de la carte
2. Sujet central
3. Contrôles des branches et des idées
4. Sélecteur d’icônes
5. Icônes libres et calques
6. Menu principal
7. Éditeur unique des textes de branche / idée / sous-idée

### `js/app.js`
Contient la logique, organisée en sections numérotées :

1. Références DOM et configuration générale
2. Sauvegarde, limites et couleurs
3. Positionnement des branches principales
4. État, sauvegarde et normalisation
5. Création et gestion des branches
6. Icônes : catalogue, recherche et sélection
7. Icônes libres : dessin, détourage et interactions
8. Rendu des branches, idées et sous-idées
9. Rendu global et événements

## Nettoyage effectué

- suppression des anciens systèmes successifs d’édition de texte (`branch-editor`, `contenteditable`, miroir de sélection, double bulle, etc.) ;
- conservation d’un seul éditeur : `#branchTextEditor` ;
- l’éditeur est maintenant déclaré directement dans `index.html` au lieu d’être recréé dynamiquement ;
- suppression des styles devenus orphelins liés aux anciennes méthodes d’édition ;
- suppression des commentaires historiques de versions dans la feuille CSS ;
- chemins CSS/JS simplifiés et séparés dans leurs dossiers ;
- conservation des anciennes clés de sauvegarde uniquement lorsqu’elles servent encore à récupérer les projets enregistrés dans le navigateur.

## Important

Le code n’est **pas minifié**. C’est volontaire : cette version est destinée à être modifiée facilement.

Pour tester, ouvre simplement `index.html` dans le navigateur. Pour éviter certaines restrictions locales des navigateurs, tu peux aussi servir le dossier avec un petit serveur HTTP local.
