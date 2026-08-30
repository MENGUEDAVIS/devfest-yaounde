# DevFest Yaoundé — site statique

Site événementiel de **GDG Yaoundé**, calqué sur la direction artistique de
`2025.devfestlagos.com` (dont l'export HTMLify se trouve dans le dossier parent) et
rempli avec les données réelles de la communauté de Yaoundé.

Aucun build : HTML + CSS + JavaScript vanilla. Les seules dépendances (`jsdom`)
servent aux tests.

## Lancer

```bash
npm run serve       # http://localhost:8421
```

Ouvrir `index.html` directement fonctionne aussi : les scripts sont classiques,
pas des modules ES.

## Vérifier

```bash
npm test
```

Deux étapes :

1. `tools/verify.mjs` — syntaxe JS, cohérence des données (chaque speaker cité au
   programme existe, thématiques couvertes, champs obligatoires), résolution de
   tous les liens/ressources locaux, équilibre des balises HTML, présence des
   points de montage attendus par `main.js`.
2. `tools/render-test.mjs` — rend chaque page dans jsdom, exécute réellement
   `main.js` et vérifie le DOM produit ainsi que les interactions (onglets du
   programme, accordéon FAQ, menu mobile, filtres speakers).

## Structure

```
index.html            accueil
speakers/             plateau complet + filtres par thématique
schedule/             programme des deux journées
faqs/                 questions fréquentes
team/                 équipe organisatrice
assets/css/styles.css design system (couleurs Google, blocs sombres arrondis)
assets/js/data.js     ← TOUT le contenu du site
assets/js/main.js     rendu + interactions
tools/                serveur statique et tests
```

## Mettre à jour le contenu

Tout passe par **`assets/js/data.js`** : dates, lieux, speakers, programme,
équipe, partenaires, FAQ, thématiques. Les pages HTML ne contiennent que la
structure et les textes éditoriaux. Pour publier l'édition suivante, éditer ce
fichier et relancer `npm test`.

## Provenance des données

Toutes les informations viennent des pages publiques de GDG Yaoundé :

- <https://gdg.community.dev/gdg-yaounde/> — description, membres, équipe
- <https://gdg.community.dev/events/details/google-gdg-yaounde-presents-devfest-yaounde-2025/> —
  dates, lieux, agenda, speakers, partenaire, RSVP
- <https://sessionize.com/devfest-yaounde-2025/> — appel à conférenciers
- <https://x.com/GDGYaounde> — partenaires des éditions précédentes

Deux points à connaître :

- **Horaires par session** : ils n'ont jamais été publiés. Le site affiche donc
  l'ordre de passage et la plage horaire de la journée (07:30 – 15:30) plutôt que
  des créneaux inventés. Ajouter un champ `time` aux sessions dans `data.js`
  suffira quand ils seront connus.
- **Photos** : aucune photo de la communauté n'est embarquée. Le hero utilise un
  motif SVG généré aux couleurs Google. Pour y mettre une vraie photo, remplacer
  le fond de `.hero__stage` dans `styles.css` par l'image de votre choix.

## Repris de l'export DevFest Lagos

Depuis `../_next/static/media/` : la fonte d'affichage `Akira.otf`, le logo
DevFest (nœud papillon quadricolore) et quelques icônes (menu, flèches, fermeture).
Aucun visuel ni contenu propre à Lagos n'a été réutilisé.
