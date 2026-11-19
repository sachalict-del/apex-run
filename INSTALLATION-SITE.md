# Installer APEX RUN 2 sur ton site Internet

Le jeu utilise **Three.js** dans le navigateur et un **serveur Node.js + WebSocket** pour les salons multijoueurs. Le jeu peut fonctionner sur PC, téléphone et tablette moderne. Il ne suffit **pas** de déposer les fichiers HTML sur un hébergement purement statique pour conserver le multijoueur.

## 1. Lancer localement sur Windows

1. Extraire entièrement le ZIP.
2. Installer [Node.js LTS](https://nodejs.org/fr) si ce n'est pas déjà fait.
3. Double-cliquer sur **LANCER LE JEU.bat** dans le dossier du jeu.
4. Naviguer vers **http://localhost:3001** ; conserver la console ouverte.

Autre méthode : dans le dossier, lancer `npm start` dans le terminal. Aucune dépendance `npm` externe n'est nécessaire sur le serveur.

## 2. Tester le multijoueur sur une tablette à la maison

1. Mettre l'ordinateur et la tablette sur le **même réseau Wi-Fi**.
2. Sur le PC Windows, dans `cmd`, saisir `ipconfig` et repérer l'**adresse IPv4**, par exemple `192.168.1.25`.
3. Sur la tablette, ouvrir **http://192.168.1.25:3001** dans Safari ou Chrome (remplacer l'IP par celle de ton PC).
4. Autoriser Node.js dans le pare-feu Windows pour les **réseaux privés** si demandé.
5. Les deux joueurs choisissent le **même circuit**, le **même code de salon**, puis cliquent sur **MULTI > GO** et **PRENDRE LE DÉPART**.

Le lien `localhost` fonctionne uniquement sur l'ordinateur qui exécute le serveur, **pas** sur la tablette. Pour inviter des personnes en dehors de chez toi, il faut héberger le jeu sur Internet.

## 3. Déployer sur Internet

Le plus simple est un hébergeur **Node.js** compatible **WebSocket**, par exemple Render, Railway, un VPS ou un serveur existant compatible.

- Déployer ce dossier avec `node server.js` comme commande de démarrage.
- Le port est `process.env.PORT` (fallback `3001`).
- Garder le serveur en ligne et configurer **HTTPS + WSS** via la plateforme ou un proxy inverse (Nginx/Caddy).
- Vérifier la page `/health` de l'URL publique (retour `{ "ok": true, ... }`).
- Le fichier `render.yaml` permet un point de départ pour Render ; `Dockerfile` pour les hébergements Docker.

Une plateforme gratuite peut arrêter temporairement les instances inactives : les joueurs seraient alors déconnectés. Choisir un hébergement adapté si tu veux un jeu accessible à toute heure.

### Ajouter le jeu sur une page de ton site

Pour une page **HTML / WordPress / bloc HTML**, remplace l'adresse ci-dessous par l'URL où tu as déployé le jeu :

```html
<div style="width:100%;height:85dvh;min-height:480px;overflow:hidden;border-radius:12px;">
  <iframe
    src="https://jeu.ton-domaine.fr/?track=alpine&room=PUBLIC"
    title="APEX RUN 2 — Jeu de course multijoueur"
    allow="fullscreen; autoplay"
    allowfullscreen
    style="display:block;width:100%;height:100%;border:0"
  ></iframe>
</div>
```

Sur téléphone/tablette, une page dédiée en **plein écran** offre le plus d'espace pour les commandes. Certains constructeurs de site limitent les iframes ou les connexions WebSocket ; dans ce cas, créer un lien `Jouer` vers `https://jeu.ton-domaine.fr` fonctionne aussi.

## 4. Salons et progression

- 12 joueurs maximum par salon et par circuit.
- **Chaque circuit a son propre classement.** Le même code avec deux circuits différents correspond à des salles différentes.
- Les voitures et les crédits sont actuellement stockés dans le navigateur (`localStorage`), **pas dans un compte en ligne**. Les gains ne suivent donc pas automatiquement le joueur entre PC et tablette.
- Les records de salon sont temporaires et disparaissent lorsqu'il n'y a plus personne dans la salle.
- Pour une version commerciale : comptes, base de données, sauvegardes, validation des temps / anti-triche serveur, modération, mesures anti-abus, protection des données.

## 5. Fichiers importants

- `server.js` : héberge les pages + synchronise les joueurs par WebSocket.
- `public/game.js` : conduite, collision, sauts, chrono, écran multijoueur, garage.
- `public/world.js` : modèles 3D et géométrie des pistes, barrières, décor.
- `public/track-data.js` : les trois circuits, voitures et caractéristiques.
- `public/style.css` et `public/index.html` : interface PC et tablette.

## 6. Remarques sur le réalisme

Les carrosseries **s'inspirent de catégories de voitures connues**, mais ne sont pas des modèles 3D officiels de Porsche, Nissan, Ford, Lamborghini ou Bugatti. Elles sont réalisées procéduralement et optimisées pour un navigateur. Pour atteindre le photoréalisme d'un jeu commercial, il faudra remplacer progressivement les modèles par des fichiers `glTF/GLB` détaillés et sous licence, puis ajouter des effets graphiques et des sons professionnels.

L'import Three.js utilise actuellement le CDN `cdn.jsdelivr.net`; une connexion Internet est donc nécessaire pour démarrer même en local. En production, héberger cette dépendance statique avec le jeu améliore la robustesse.
