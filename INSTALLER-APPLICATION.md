# APEX RUN — installation sur tous les appareils

Cette version ajoute une **application web installable (PWA)** au jeu existant. Elle conserve le serveur de course Node.js/WebSocket et les circuits 3D de la version 2.1.

## Pour essayer sur ton PC
1. Installer Node.js LTS (une seule fois, sur ton PC).
2. Dans le dossier décompressé, double-cliquer sur **LANCER LE JEU.bat**.
3. Ouvrir **http://localhost:3001** dans Chrome ou Edge.
4. Sur l’accueil du jeu, appuyer sur **INSTALLER L’APPLI** puis confirmer. L’icône APEX RUN s’ajoute au bureau/menu Démarrer.

## Pour installer sur téléphone et tablette, même loin de chez toi
Il faut **publier ce projet sur un hébergement Node.js public**, compatible WebSocket, avec **HTTPS**. Par exemple, créer un service web sur Render, Railway ou un VPS. Le fichier `render.yaml` ou le `Dockerfile` sont fournis. Le serveur lance `npm start` et utilise automatiquement `process.env.PORT`.

Une fois le projet mis en ligne, envoie une URL comme `https://jeu.ton-domaine.fr` à tes amis :

- **Android / tablette Android** : ouvrir dans Chrome puis « Installer l’application » (menu ⋮ si pas de proposition automatique).
- **iPhone / iPad** : ouvrir dans Safari, toucher Partager, puis « Sur l’écran d’accueil » > « Ajouter » ; choisir « Ouvrir comme app » si proposé.
- **PC Windows / Mac** : dans Chrome / Edge, menu « Installer l’application » ou bouton **INSTALLER L’APPLI** affiché dans le jeu.

Après installation, toucher l’icône **APEX RUN** lance directement le jeu comme une application, sans taper de lien à chaque fois. Le jeu a besoin d’Internet pour fonctionner normalement : le multijoueur n’est pas hors ligne.

## Héberger avec ton site existant

Idéal : utiliser un sous-domaine `jeu.ton-domaine.fr` pointant vers le serveur Node.js (HTTPS et WebSocket). Ton site principal affiche un lien « Jouer à APEX RUN » qui ouvre ce sous-domaine. Le même lien servira à installer l’appli. Le contenu doit être servi depuis la **racine du sous-domaine** (car les chemins HTML et le service worker commencent par `/`).

IMPORTANT : un simple hébergement de fichiers statiques ou l’ajout d’un `iframe` à une page ne remplace pas le serveur multijoueur. Ne pas essayer d’installer depuis une adresse réseau locale `http://192.168.*` : un navigateur mobile réclame normalement le HTTPS pour le mode application.

## Limites actuelles

- Ce ZIP n’est **pas encore une application publiée sur Google Play ou sur l’App Store**, et il ne crée pas de fichier APK/IPA.
- Les joueurs partagent un serveur WebSocket lorsqu’ils sont connectés à la même URL publique et choisissent le même circuit et salon.
- Les crédits / voitures débloquées restent enregistrés **sur chaque appareil** ; pour les conserver entre appareils, il faut créer des comptes et une base de données.
- Les modèles 3D ne sont pas photoréalistes. Cette version ajoute la fonction application installable, **pas** une refonte du moteur graphique.
- Three.js est actuellement chargé via CDN. Une connexion Internet est nécessaire au lancement du jeu.
