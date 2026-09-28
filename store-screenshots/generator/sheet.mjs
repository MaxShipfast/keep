// Contact sheet of the rendered slides (as they'd sit side by side on the store).
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const dir = new URL('./final/', import.meta.url).pathname;
const files = (process.argv[2] ? process.argv[2].split(',') : readdirSync(dir).filter(f => /^\d\d\.png$/.test(f)).sort().map(f => f.replace('.png','')));
const w = 330, h = 717, gap = 16;
const comps = [];
for (let i = 0; i < files.length; i++) comps.push({ input: await sharp(`${dir}${files[i]}.png`).resize(w, h).png().toBuffer(), left: i * (w + gap), top: 0 });
await sharp({ create: { width: files.length * (w + gap) - gap, height: h, channels: 3, background: '#FFFFFF' } }).composite(comps).png().toFile(`${dir}_sheet.png`);
console.log('sheet', files.join(','));
