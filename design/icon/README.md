# App icon

An emoji-style blue flame with a chrome dumbbell, in the original icon's palette: dark navy
background, a flame ramping from #94B8FF at the tips to #2F58DA at the base, and a soft blue glow
(option `I` in `icon.mjs`). All artwork is original SVG, so there are no third-party emoji licences.
`H` (gunmetal plates) and `J` (dark core like the first flame icon) were the close alternatives.

```
cd design/icon
npm i --no-save sharp
node icon.mjs       # renders out/*.png (needs Google Chrome)
node install.mjs    # writes icon.png, splash-icon.png, the Android layers and favicon into ../../assets
```

Apple rejects an App Store icon with an alpha channel; `install.mjs` flattens `icon.png`.
