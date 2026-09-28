// Writes option E into the app's asset slots (sizes and alpha rules per Expo/Apple/Android).
import sharp from 'sharp';
const OUT = new URL('./out/', import.meta.url).pathname;
const A = new URL('../../assets/', import.meta.url).pathname;
const squircle = (s) => Buffer.from(`<svg width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${s * 0.2237}" ry="${s * 0.2237}" fill="#fff"/></svg>`);
// iOS/App Store icon: 1024, fully opaque (Apple rejects alpha channels).
await sharp(`${OUT}E.png`).flatten({ background: '#2F66F5' }).removeAlpha().png().toFile(`${A}icon.png`);
// Launch screen: the icon itself, rounded, on the dark splash background.
const r = await sharp(`${OUT}E.png`).resize(512, 512).png().toBuffer();
await sharp(r).ensureAlpha().composite([{ input: squircle(512), blend: 'dest-in' }]).png().toFile(`${A}splash-icon.png`);
// Android adaptive icon layers + monochrome (themed icons).
await sharp(`${OUT}E_fg.png`).resize(512, 512).png().toFile(`${A}android-icon-foreground.png`);
await sharp(`${OUT}E_bg.png`).resize(512, 512).flatten({ background: '#2F66F5' }).removeAlpha().png().toFile(`${A}android-icon-background.png`);
await sharp(`${OUT}E_mono.png`).resize(432, 432).png().toFile(`${A}android-icon-monochrome.png`);
await sharp(`${OUT}E.png`).resize(48, 48).png().toFile(`${A}favicon.png`);
for (const f of ['icon', 'splash-icon', 'android-icon-foreground', 'android-icon-background', 'android-icon-monochrome', 'favicon']) {
  const m = await sharp(`${A}${f}.png`).metadata();
  console.log(f.padEnd(26), `${m.width}x${m.height}`, 'alpha:', m.hasAlpha);
}
