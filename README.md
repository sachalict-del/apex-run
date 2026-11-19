# APEX RUN 2 — Hyper Racing

Jeu de course **3D navigateur**, multijoueur jusqu'à 12 pilotes, compatible clavier et commandes tactiles (tablette, téléphone).

## Jouer en local

**Windows :** double-cliquer sur `LANCER LE JEU.bat` après extraction complète et installation de Node.js LTS. Le jeu s'ouvre sur http://localhost:3000.

**Autres systèmes :** `npm start`, puis ouvrir `http://localhost:3000`.

## Contenu de cette version

- **3 grands circuits en relief** : Alpine Rush (montagne), Neon Coast (océan), Canyon X (désert).
- **Sauts** sur rampes et franchissement de portions sans chaussée.
- **Virages relevés**, passerelles, décors 3D, glissières métalliques **avec collisions**.
- Conduite arcade avec inertie, **drift**, vibrations lors des chocs, boosts, sensation de vitesse (FOV et moteur synthétique).
- **6 voitures originales** inspirées de types de sportives réelles, avec différences de tenue de route, accélération et vitesse maxi (325 à 445 km/h).
- Garage, crédits à collecter, achat de voitures, records par circuit.
- Salons multijoueurs 12 joueurs maximum par circuit/code ; joueurs visibles, collisions approximatives, partage de liens.
- Sur tablette : commandes **gauche / droite / gaz / frein / drift**, orientation paysage conseillée.

## Installer sur ton site

Lire **[INSTALLATION-SITE.md](INSTALLATION-SITE.md)** pour les étapes de déploiement, d'iframe HTML et de test tablette sur Wi-Fi.

## Contrôles

| Action | Ordinateur | Tablette |
|---|---|---|
| Accélérer | Z, W, ↑ | GAZ |
| Freiner / reculer | S, ↓ | FREIN |
| Tourner | Q / A / D ou ← / → | ◀ ▶ |
| Déraper | Espace ou Maj | DRIFT |
| Recommencer | R | Bouton RECOMMENCER |

## Vérification

`npm test` exécute les tests HTTP et WebSocket. Le moteur graphique requiert WebGL et est chargé depuis un CDN Three.js, donc doit être essayé dans un navigateur avec connexion Internet.

## Limites actuelles

- Modèles 3D **stylisés plus détaillés**, mais non photoréalistes ou sous licence officielle.
- Classement réseau temporaire et **anti-triche basique** ; records et crédits locaux au navigateur, pas de comptes.
- En production il faudra renforcer le serveur (validation des courses, identité, stockage, modération) et tester sur les appareils ciblés.

Code et circuits originaux APEX RUN. Version de démonstration 2.0.
