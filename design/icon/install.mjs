// Writes the chosen icon option into every asset slot the app uses.
// ICON / ICON_FG / ICON_BG pick the rendered option (default: FLAME, the emoji-style blue flame).
import sharp from 'sharp';
const OUT = new URL('./out/', import.meta.url).pathname;
const A = process.env.ASSETS ?? new URL('../../assets/', import.meta.url).pathname;
const ID = process.env.ICON ?? 'FLAME', FG = process.env.ICON_FG ?? 'FLAME_fg', BG = process.env.ICON_BG ?? 'NAVY_bg', BASE = '#0B101B';
const squircle = (s) => Buffer.from(`<svg width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${s * 0.2237}" ry="${s * 0.2237}" fill="#fff"/></svg>`);
// iOS / App Store icon: 1024 and fully opaque (Apple rejects alpha channels).
await sharp(`${OUT}${ID}.png`).flatten({ background: BASE }).removeAlpha().png().toFile(`${A}icon.png`);
// Launch screen: the icon itself, rounded, centred on the dark splash background.
const r = await sharp(`${OUT}${ID}.png`).resize(512, 512).png().toBuffer();
await sharp(r).ensureAlpha().composite([{ input: squircle(512), blend: 'dest-in' }]).png().toFile(`${A}splash-icon.png`);
// Android adaptive layers, and a white silhouette for themed (monochrome) icons.
await sharp(`${OUT}${FG}.png`).resize(512, 512).png().toFile(`${A}android-icon-foreground.png`);
await sharp(`${OUT}${BG}.png`).resize(512, 512).flatten({ background: BASE }).removeAlpha().png().toFile(`${A}android-icon-background.png`);
const alpha = await sharp(await sharp(`${OUT}${FG}.png`).resize(432, 432).extractChannel('alpha').toBuffer()).threshold(150).toBuffer();
await sharp({ create: { width: 432, height: 432, channels: 3, background: '#FFFFFF' } }).joinChannel(alpha).png().toFile(`${A}android-icon-monochrome.png`);
await sharp(`${OUT}${ID}.png`).resize(48, 48).flatten({ background: BASE }).png().toFile(`${A}favicon.png`);
for (const f of ['icon', 'splash-icon', 'android-icon-foreground', 'android-icon-background', 'android-icon-monochrome', 'favicon']) {
  const m = await sharp(`${A}${f}.png`).metadata();
  console.log(f.padEnd(26), `${m.width}x${m.height}`, 'alpha:', m.hasAlpha);
}
