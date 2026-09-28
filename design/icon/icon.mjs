// Emoji-style Keep icons: a glossy 3D-ish flame plus food/fitness props, drawn as original SVG.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const S = 1024;

const BLUE_BG = `radial-gradient(90% 70% at 25% 8%, rgba(255,255,255,0.30), transparent 60%), linear-gradient(160deg, #5B93FF 0%, #2F66F5 48%, #1535B0 100%)`;
const DARK_BG = `radial-gradient(75% 75% at 50% 45%, #1A2742 0%, #0B1120 58%, #04070D 100%)`;

const defs = `
  <radialGradient id="flameOut" gradientUnits="userSpaceOnUse" cx="300" cy="700" r="720">
    <stop offset="0" stop-color="#FFB43A"/><stop offset="0.5" stop-color="#FF7A1A"/><stop offset="1" stop-color="#EE3F1D"/></radialGradient>
  <radialGradient id="flameIn" gradientUnits="userSpaceOnUse" cx="300" cy="700" r="430">
    <stop offset="0" stop-color="#FFF8D6"/><stop offset="0.45" stop-color="#FFE066"/><stop offset="1" stop-color="#FFAE2A"/></radialGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F4F6FA"/><stop offset="0.5" stop-color="#B9C1CE"/><stop offset="1" stop-color="#737D90"/></linearGradient>
  <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#46526B"/><stop offset="0.55" stop-color="#252D3F"/><stop offset="1" stop-color="#131825"/></linearGradient>
  <radialGradient id="meat" gradientUnits="userSpaceOnUse" cx="-110" cy="-120" r="360">
    <stop offset="0" stop-color="#F7B866"/><stop offset="0.5" stop-color="#D8772B"/><stop offset="1" stop-color="#983F14"/></radialGradient>
  <linearGradient id="bone" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFF9EE"/><stop offset="1" stop-color="#E4D0B1"/></linearGradient>
  <filter id="drop" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#061446" flood-opacity="0.45"/></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter>`;

// Flame authored in a 600×760 box, base centred at (300, 748).
const flame = `
  <path d="M300 748 C148 748 52 640 52 500 C52 402 98 330 150 268 C162 332 196 372 238 390 C214 282 256 150 352 40 C368 150 420 214 462 262 C470 228 474 196 470 162 C530 238 552 368 552 500 C552 642 452 748 300 748 Z" fill="url(#flameOut)"/>
  <path d="M300 740 C206 740 148 676 148 590 C148 520 188 468 232 424 C240 470 262 498 292 510 C284 446 306 380 352 322 C372 392 424 440 446 512 C460 560 456 610 440 650 C416 708 364 740 300 740 Z" fill="url(#flameIn)"/>
  <ellipse cx="116" cy="548" rx="22" ry="66" transform="rotate(-10 116 548)" fill="#FFFFFF" opacity="0.30"/>
  <ellipse cx="330" cy="150" rx="12" ry="42" transform="rotate(22 330 150)" fill="#FFFFFF" opacity="0.32"/>`;
const flameAt = (x, y, s) => `<g filter="url(#drop)"><g transform="translate(${x} ${y}) scale(${s}) translate(-300 -748)">${flame}</g></g>`;
const flameGlow = (x, y, s) => `<g opacity="0.3" filter="url(#glow)"><ellipse cx="${x}" cy="${y - 300 * s}" rx="${260 * s}" ry="${330 * s}" fill="#FF8A2A"/></g>`;

// Dumbbell centred on (0,0), horizontal, ~600 wide.
const dumbbell = `
  <rect x="-150" y="-22" width="300" height="44" rx="22" fill="url(#metal)"/>
  <rect x="-140" y="-15" width="280" height="8" rx="4" fill="#FFFFFF" opacity="0.7"/>
  ${[-1, 1].map((d) => `
    <rect x="${d > 0 ? 150 : -175}" y="-42" width="25" height="84" rx="10" fill="url(#metal)"/>
    <rect x="${d > 0 ? 175 : -245}" y="-120" width="70" height="256" rx="32" fill="#0B0F19"/>
    <rect x="${d > 0 ? 175 : -245}" y="-128" width="70" height="256" rx="32" fill="url(#plate)"/>
    <rect x="${d > 0 ? 184 : -236}" y="-118" width="52" height="64" rx="24" fill="#FFFFFF" opacity="0.16"/>
    <rect x="${d > 0 ? 249 : -289}" y="-82" width="40" height="180" rx="20" fill="#0B0F19"/>
    <rect x="${d > 0 ? 249 : -289}" y="-90" width="40" height="180" rx="20" fill="url(#plate)"/>
    <rect x="${d > 0 ? 255 : -283}" y="-82" width="28" height="44" rx="14" fill="#FFFFFF" opacity="0.14"/>`).join('')}`;
const dumbbellAt = (x, y, s, rot) => `<g filter="url(#drop)"><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${dumbbell}</g></g>`;

// Drumstick: meaty head up-left, bone down-right, centred near (0,0).
const drumstick = `
  <line x1="70" y1="70" x2="215" y2="215" stroke="url(#bone)" stroke-width="58" stroke-linecap="round"/>
  <circle cx="238" cy="196" r="38" fill="url(#bone)"/><circle cx="196" cy="238" r="38" fill="url(#bone)"/>
  <circle cx="226" cy="184" r="14" fill="#FFFFFF" opacity="0.7"/>
  <g fill="url(#meat)">
    <ellipse cx="-45" cy="-45" rx="205" ry="160" transform="rotate(45 -45 -45)"/>
    <path d="M40 -10 C90 30 110 60 118 96 C84 104 52 104 20 84 Z"/>
  </g>
  <ellipse cx="-120" cy="-118" rx="46" ry="92" transform="rotate(45 -120 -118)" fill="#FFFFFF" opacity="0.26"/>
  <ellipse cx="-12" cy="-150" rx="16" ry="40" transform="rotate(60 -12 -150)" fill="#FFFFFF" opacity="0.22"/>`;
const drumstickAt = (x, y, s, rot = 0) => `<g filter="url(#drop)"><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${drumstick}</g></g>`;

const options = {
  // A: flame + dumbbell (fitness).
  A: { bg: BLUE_BG, svg: flameGlow(512, 712, 0.9) + flameAt(512, 712, 0.9) + dumbbellAt(512, 760, 0.98, -14) },
  // B: flame + drumstick (protein).
  B: { bg: BLUE_BG, svg: flameGlow(470, 720, 0.88) + flameAt(470, 720, 0.88) + drumstickAt(640, 650, 0.92, 0) },
  // C: flame with both props.
  C: { bg: BLUE_BG, svg: flameGlow(512, 640, 0.8) + flameAt(512, 640, 0.8) + drumstickAt(322, 700, 0.62, 0) + dumbbellAt(700, 760, 0.62, -30) },
  // Android adaptive layers for A.
  A_fg: { bg: 'transparent', svg: `<g transform="translate(512 512) scale(0.7) translate(-512 -512)">${flameAt(512, 712, 0.9) + dumbbellAt(512, 760, 0.98, -14)}</g>` },
  A_bg: { bg: BLUE_BG, svg: '' },
  // A on dark, for comparison with the current icon's mood.
  A_dark: { bg: DARK_BG, svg: flameGlow(512, 712, 0.9) + flameAt(512, 712, 0.9) + dumbbellAt(512, 760, 0.98, -14) },
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
