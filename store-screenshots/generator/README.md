# Screenshot generator

Renders the App Store screenshots in `../01.png` … `../06.png` (6.9", 1320×2868) from HTML
re-creations of the app's screens. Needs Google Chrome and Node 22.

```
cd store-screenshots/generator
npm i --no-save sharp
node final.mjs      # renders final/01…06.png (pass an id, e.g. `node final.mjs 03`, for one slide)
node sheet.mjs      # final/_sheet.png, all slides side by side
node export.mjs     # flattens to opaque RGB and copies into store-screenshots/
```

- `screens.mjs` mirrors the real screens in iOS points (440×956). If the app UI changes, update it
  here too; Apple requires screenshots to show the app as it is.
- `final.mjs` holds the captions, the phone placement, and the enlarged pop-out cards.
- `poke.jpg` is "Salmon Poke Bowl (S) with Spicy mayo sauce - Kitokito.jpg" from Wikimedia
  Commons, released under CC0 (public domain).
- Icons are Ionicons 7.4.0 (MIT).
