# Carte mentale — base propre v40

Cette version est la nouvelle base de travail. Elle reprend la v39, nettoyée et consolidée.

## Fichiers

- `index.html` : structure de la page.
- `css/styles.css` : apparence et responsive iPhone/iPad.
- `js/app.js` : logique de la carte, branches, idées, sous-idées, icônes, menus et sauvegarde.

## Principes de cette base

- Un seul système actif pour l’édition des textes de branches.
- Une seule définition active du bouton contextuel `+ Ajouter une branche` dans la bulle centrale.
- Pas de largeur minimale artificielle : la carte s’adapte à la largeur réelle de l’iPhone, de l’iPad et du PC.
- Les anciennes couches de correctifs v37/v38/v39 ne sont pas conservées séparément : leur comportement utile est intégré directement au code principal.

## Pour continuer

Toutes les prochaines modifications doivent partir de cette version afin d’éviter de réintroduire d’anciens correctifs ou doublons.


## Export PDF

Le bouton **Enregistrer sous** crée maintenant un vrai fichier PDF, sans ouvrir la boîte de dialogue d’impression. L’export recadre automatiquement la page sur le contenu visible de la carte. Sur iPhone/iPad, la feuille de partage permet d’utiliser **Enregistrer dans Fichiers**.
