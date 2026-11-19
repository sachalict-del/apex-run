# APEX RUN 3.0 — Mobile Racing

6 circuits originaux : Alpine Rush, Neon Coast, Canyon X, Sky Park, Volcano Rush et Wild Forest.

## Mobile

- **GAZ** : maintenir avec le pouce droit (aucune accélération automatique).
- **◀ / ▶** : diriger avec le pouce gauche.
- **FREIN** et **DRIFT** : boutons empilés près du gaz.
- Mode paysage recommandé.
- Le multijoueur fonctionne par circuits et par salons sur le même serveur Node.js.

## Mettre à jour le site déjà sur Render

Sur GitHub, remplace les fichiers modifiés, **en conservant les dossiers et chemins**. Si les fichiers sont à la racine du dépôt, laisse Root Directory vide sur Render. Après Commit changes, Render doit redéployer automatiquement, sinon Manual Deploy → Deploy latest commit.

Si l'ancienne version s'affiche sur le téléphone, ferme totalement la PWA et rouvre-la. Actualise la page web ou supprime les données du site si le cache persiste.

## Test sur ordinateur

`npm start` puis `http://localhost:3001` (Node.js 18+).

`npm test` vérifie les routes et le serveur WebSocket. Le rendu et les commandes restent à tester sur ton appareil réel.
