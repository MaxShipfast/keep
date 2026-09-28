// Emoji-style flame + dumbbell in the ORIGINAL icon's palette: blue flame on dark navy with a blue glow.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const S = 1024;

// Sampled from the original icon: navy #0E1728 → #0B101B → #080B12.
const NAVY_BG = `radial-gradient(72% 72% at 50% 46%, #142444 0%, #0E1728 38%, #0B101B 70%, #080B12 100%)`;

const defs = `
  <!-- Original flame ramp: #94B8FF tips → #407DFF → #2F58DA base. -->
  <linearGradient id="flameOut" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="748">
    <stop offset="0" stop-color="#94B8FF"/><stop offset="0.3" stop-color="#74A2FF"/><stop offset="0.62" stop-color="#407DFF"/><stop offset="1" stop-color="#2F58DA"/></linearGradient>
  <radialGradient id="flameIn" gradientUnits="userSpaceOnUse" cx="300" cy="700" r="430">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#DCE8FF"/><stop offset="1" stop-color="#9DBDFF"/></radialGradient>
  <radialGradient id="flameHole" gradientUnits="userSpaceOnUse" cx="300" cy="650" r="260">
    <stop offset="0" stop-color="#23427E"/><stop offset="1" stop-color="#192F5B"/></radialGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F4F6FA"/><stop offset="0.5" stop-color="#B9C1CE"/><stop offset="1" stop-color="#737D90"/></linearGradient>
  <linearGradient id="gunmetal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7C8AA6"/><stop offset="0.5" stop-color="#46526B"/><stop offset="1" stop-color="#232A3A"/></linearGradient>
  <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F2F5FA"/><stop offset="0.5" stop-color="#AEB9CB"/><stop offset="1" stop-color="#6A768C"/></linearGradient>
  <filter id="drop" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.55"/></filter>
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="60"/></filter>`;

const flame = (core) => `
  <path d="M300 748 C148 748 52 640 52 500 C52 402 98 330 150 268 C162 332 196 372 238 390 C214 282 256 150 352 40 C368 150 420 214 462 262 C470 228 474 196 470 162 C530 238 552 368 552 500 C552 642 452 748 300 748 Z" fill="url(#flameOut)"/>
  <path d="M300 740 C206 740 148 676 148 590 C148 520 188 468 232 424 C240 470 262 498 292 510 C284 446 306 380 352 322 C372 392 424 440 446 512 C460 560 456 610 440 650 C416 708 364 740 300 740 Z" fill="url(#${core})"/>
  <ellipse cx="116" cy="548" rx="22" ry="66" transform="rotate(-10 116 548)" fill="#FFFFFF" opacity="0.30"/>
  <ellipse cx="330" cy="150" rx="12" ry="42" transform="rotate(22 330 150)" fill="#FFFFFF" opacity="0.36"/>`;
const flameAt = (x, y, s, core) => `<g filter="url(#drop)"><g transform="translate(${x} ${y}) scale(${s}) translate(-300 -748)">${flame(core)}</g></g>`;
const glow = (x, y, s) => `<g opacity="0.6" filter="url(#glow)"><ellipse cx="${x}" cy="${y - 330 * s}" rx="${270 * s}" ry="${350 * s}" fill="#3D7BFF"/></g>`;

// Dumbbell with plates in `plate` fill and a faint blue rim so it separates from the navy.
const dumbbell = (plate, back) => `
  <rect x="-150" y="-22" width="300" height="44" rx="22" fill="url(#metal)"/>
  <rect x="-140" y="-15" width="280" height="8" rx="4" fill="#FFFFFF" opacity="0.7"/>
  ${[-1, 1].map((d) => `
    <rect x="${d > 0 ? 150 : -175}" y="-42" width="25" height="84" rx="10" fill="url(#metal)"/>
    <rect x="${d > 0 ? 175 : -245}" y="-120" width="70" height="256" rx="32" fill="${back}"/>
    <rect x="${d > 0 ? 175 : -245}" y="-128" width="70" height="256" rx="32" fill="url(#${plate})" stroke="#94B8FF" stroke-opacity="0.45" stroke-width="4"/>
    <rect x="${d > 0 ? 184 : -236}" y="-118" width="52" height="64" rx="24" fill="#FFFFFF" opacity="0.2"/>
    <rect x="${d > 0 ? 249 : -289}" y="-82" width="40" height="180" rx="20" fill="${back}"/>
    <rect x="${d > 0 ? 249 : -289}" y="-90" width="40" height="180" rx="20" fill="url(#${plate})" stroke="#94B8FF" stroke-opacity="0.45" stroke-width="4"/>
    <rect x="${d > 0 ? 255 : -283}" y="-82" width="28" height="44" rx="14" fill="#FFFFFF" opacity="0.18"/>`).join('')}`;
const dumbbellAt = (x, y, s, rot, plate, back) => `<g filter="url(#drop)"><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${dumbbell(plate, back)}</g></g>`;

const art = (core, plate, back) => glow(512, 712, 0.9) + flameAt(512, 712, 0.9, core) + dumbbellAt(512, 760, 0.98, -14, plate, back);
const options = {
  // H: original palette, bright white-blue core, gunmetal plates.
  H: { bg: NAVY_BG, svg: art('flameIn', 'gunmetal', '#151B28') },
  // I: original palette, bright core, silver plates.
  I: { bg: NAVY_BG, svg: art('flameIn', 'silver', '#4A556A') },
  // J: closest to the original: dark inner "hole" like the old flame, silver plates.
  J: { bg: NAVY_BG, svg: art('flameHole', 'silver', '#4A556A') },
  // Android layers for H (swap the id if another option wins).
  H_fg: { bg: 'transparent', svg: `<g transform="translate(512 512) scale(0.7) translate(-512 -512)">${flameAt(512, 712, 0.9, 'flameIn') + dumbbellAt(512, 760, 0.98, -14, 'gunmetal', '#151B28')}</g>` },
  I_fg: { bg: 'transparent', svg: `<g transform="translate(512 512) scale(0.7) translate(-512 -512)">${flameAt(512, 712, 0.9, 'flameIn') + dumbbellAt(512, 760, 0.98, -14, 'silver', '#4A556A')}</g>` },
  NAVY_bg: { bg: NAVY_BG, svg: '' },
  // FLAME: the flame alone, larger and optically centred (flames carry their weight low).
  FLAME: { bg: NAVY_BG, svg: glow(512, 850, 0.92) + flameAt(512, 850, 0.92, 'flameIn') },
  FLAME_fg: { bg: 'transparent', svg: `<g transform="translate(512 512) scale(0.7) translate(-512 -512)">${flameAt(512, 850, 0.92, 'flameIn')}</g>` },
};

const only = process.argv[2]?.split(',');
for (const [id, o] of Object.entries(options)) {
  if (only && !only.includes(id)) continue;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${S}px;height:${S}px;overflow:hidden;background:transparent}
  .bg{position:absolute;inset:0;background:${o.bg}}svg{position:absolute;inset:0}</style></head>
  <body><div class="bg"></div><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${defs}</defs>${o.svg}</svg></body></html>`;
  writeFileSync(`${OUT}${id}.html`, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', '--force-device-scale-factor=1', `--window-size=${S},${S}`, `--screenshot=${OUT}${id}.png`, `file://${OUT}${id}.html`], { stdio: 'ignore' });
  console.log('rendered', id);
}
