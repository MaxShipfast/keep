# App icon

The Keep icon is an italic white K on the brand-blue gradient (option `E` in `icon.mjs`).
`G` (black K on blue) and `F` (glowing blue K on black) are the alternatives that were considered.

```
cd design/icon
npm i --no-save sharp
node icon.mjs       # renders out/E.png, the options, and the Android layers (needs Google Chrome)
node install.mjs    # writes icon.png, splash-icon.png, Android layers and favicon into ../../assets
```

Apple rejects an App Store icon with an alpha channel; `install.mjs` flattens `icon.png`.
