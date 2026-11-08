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
- Le **klaxon joue la mélodie** : chaque déplacement dans le temps joue la note suivante du thème.
- **La musique se construit avec ton combo** : batterie seule, puis basse (2), nappe (6),
  mélodie (12) et groupe complet (24). Un crash te ramène à la batterie.
- Les obstacles arrivent en **patterns** calés sur la musique (escaliers, zigzags, murs,
  trilles en croches…) :
  - caisses, vaches, **barrières** de passage à niveau qui se ferment à l'approche ;
  - **trains express** en sens inverse, annoncés par un klaxon et un « ! » 3 temps avant ;
  - **aiguillages** (< >) qui déplacent ton train de force.
- Les **notes** dorées rapportent des points × le multiplicateur de combo.
- **CLOSE CALL!** : quitter la voie d'un obstacle juste après son temps rapporte un bonus.
- La jauge de **vapeur** se remplit en jouant bien. Pleine, elle déclenche le
  **SUPER EXPRESS** : 8 mesures d'invincibilité, score ×2, et tu défonces les obstacles.
- Toucher un obstacle coûte un wagon. Plus de wagons = terminus.
- Tous les 32 de combo, et à chaque nouvelle **station** (toutes les 8 mesures), tu gagnes un wagon.
  Le tempo accélère à chaque station (120 → 180 BPM), et le défilement accélère avec le combo.

## Technique

- TypeScript + Vite + Canvas 2D (résolution 180×320 upscalée en pixels nets)
- Musique **100 % générée** avec la Web Audio API (`src/audio/`) : séquenceur look-ahead,
  batterie, basse, pad et mélodie procédurale, synchronisés sur l'horloge audio
- Beatmap faite de patterns écrits à la main (`src/game/Patterns.ts`), enchaînés selon
  l'intensité de la musique ; les tests vérifient qu'il existe toujours un chemin jouable

```bash
npm install
npm run dev     # serveur de dev
npm test        # tests unitaires (Vitest)
npm run build   # build de production dans dist/
```

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml`, qui teste, build
et publie le jeu sur GitHub Pages.
