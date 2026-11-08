# Densha Pouet Pouet 🚃🎺

Jeu (en anglais) de train arcade **rythmique** à défilement vertical, en pixel art.
Ton train file sur **4 voies** : change de voie **sur le tempo** de la musique
pour enchaîner les combos, évite les obstacles et attrape les notes.

## Jouer

- **← / →** (ou **A/Q / D**) : changer de voie
- **Mobile** : tap à gauche / à droite de l'écran
- **Espace** : pause — **Échap** : menu
- **- / +** sur l'écran titre : calibrer la latence audio (si tes inputs semblent toujours en avance ou en retard)

## Règles

- Chaque changement de voie est jugé par rapport au temps le plus proche :
  **PERFECT** (±60 ms), **GOOD** (±120 ms) ou hors tempo (combo perdu, et le klaxon sonne faux 🎺).
- Les **notes** dorées rapportent des points × le multiplicateur de combo.
- Toucher un **obstacle** (caisse, barrière, vache) coûte un wagon. Plus de wagons = terminus.
- Tous les 32 de combo, et à chaque nouvelle **station** (toutes les 16 mesures), tu gagnes un wagon.
  Le tempo accélère à chaque station (112 → 176 BPM).

## Technique

- TypeScript + Vite + Canvas 2D (résolution 180×320 upscalée en pixels nets)
- Musique **100 % générée** avec la Web Audio API (`src/audio/`) : séquenceur look-ahead,
  batterie, basse, pad et mélodie procédurale, synchronisés sur l'horloge audio
- Beatmap procédurale (`src/game/Chart.ts`) qui garantit toujours une voie libre

```bash
npm install
npm run dev     # serveur de dev
npm test        # tests unitaires (Vitest)
npm run build   # build de production dans dist/
```

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml`, qui teste, build
et publie le jeu sur GitHub Pages.
