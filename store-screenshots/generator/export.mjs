// Flattens the rendered slides to opaque RGB PNGs (App Store Connect rejects alpha channels).
import sharp from 'sharp';
const src = new URL('./final/', import.meta.url).pathname;
const dst = new URL('../', import.meta.url).pathname;
for (const id of ['01', '02', '03', '04', '05', '06']) {
  const before = await sharp(`${src}${id}.png`).metadata();
  await sharp(`${src}${id}.png`).flatten({ background: '#0A0E15' }).removeAlpha().png({ compressionLevel: 9 }).toFile(`${dst}${id}.png`);
  const after = await sharp(`${dst}${id}.png`).metadata();
  console.log(id, `${after.width}x${after.height}`, 'channels', before.channels, '->', after.channels, 'alpha', after.hasAlpha);
}
await sharp(`${src}_sheet.png`).flatten({ background: '#fff' }).removeAlpha().png().toFile(`${dst}overview.png`);
