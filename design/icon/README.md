# App icon

An emoji-style flame with a dumbbell, on the brand-blue gradient (option `A` in `icon.mjs`).
All artwork is original SVG drawn in `icon.mjs`, so there are no third-party emoji licences.
`B` (flame + drumstick), `C` (flame, drumstick and dumbbell) and `A_dark` were the alternatives.

```
cd design/icon
npm i --no-save sharp
node icon.mjs       # renders out/*.png (needs Google Chrome)
node install.mjs    # writes icon.png, splash-icon.png, the Android layers and favicon into ../../assets
```

Apple rejects an App Store icon with an alpha channel; `install.mjs` flattens `icon.png`.
