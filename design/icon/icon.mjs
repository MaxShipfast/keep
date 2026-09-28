// Final Keep icon: a sharp italic K. Renders the options plus every asset Expo needs for the chosen one.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const S = 1024, TOP = 232, BASE = 792;

// Stem plus two 140px slabs cut flat at cap height and baseline; the arm meets the stem high enough
// to leave a clean open notch above the baseline. Slanted 10° for motion.
function K(fill, scale = 1) {
  const shape = `
    <clipPath id="cap${scale}"><rect x="0" y="${TOP}" width="${S}" height="${BASE - TOP}"/></clipPath>
    <g clip-path="url(#cap${scale})" fill="none" stroke="${fill}" stroke-width="140" stroke-linecap="butt">
      <line x1="400" y1="600" x2="830" y2="100"/>
      <line x1="560" y1="470" x2="830" y2="900"/>
    </g>
    <rect x="316" y="${TOP}" width="156" height="${BASE - TOP}" fill="${fill}"/>`;
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512) translate(-58 0) translate(512 512) skewX(-10) translate(-512 -512)">${shape}</g>`;
}

const BLUE_BG = `radial-gradient(90% 70% at 25% 8%, rgba(255,255,255,0.32), transparent 60%), linear-gradient(160deg, #5B93FF 0%, #2F66F5 48%, #1535B0 100%)`;
const DARK_BG = `radial-gradient(75% 75% at 50% 40%, #172442 0%, #0B1120 55%, #04070D 100%)`;
const whiteGrad = `<linearGradient id="w" gradientUnits="userSpaceOnUse" x1="0" y1="${TOP}" x2="0" y2="${BASE}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D5E1FF"/></linearGradient>`;
const shadow = (o) => `<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="6" dy="26" stdDeviation="28" flood-color="#06164F" flood-opacity="${o}"/></filter>`;

const jobs = {
  // Options shown to the user.
  E: { bg: BLUE_BG, svg: `<defs>${whiteGrad}${shadow(0.5)}</defs><g filter="url(#sh)">${K('url(#w)')}</g>` },
  G: { bg: BLUE_BG, svg: `<defs>${shadow(0.35)}</defs><g filter="url(#sh)">${K('#0A0E15')}</g>` },
  F: {
    bg: DARK_BG,
    svg: `<defs><linearGradient id="k" gradientUnits="userSpaceOnUse" x1="300" y1="${TOP}" x2="760" y2="${BASE}"><stop offset="0" stop-color="#D2E2FF"/><stop offset="0.45" stop-color="#5A90FF"/><stop offset="1" stop-color="#2346D6"/></linearGradient>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="44"/></filter></defs>
      <g opacity="0.7" filter="url(#glow)">${K('#3D7BFF')}</g>${K('url(#k)')}`,
  },
  // Android adaptive-icon layers for option E (the K sits inside the 66% safe zone).
  E_fg: { bg: 'transparent', svg: `<defs>${whiteGrad}${shadow(0.45)}</defs><g filter="url(#sh)">${K('url(#w)', 0.72)}</g>` },
  E_bg: { bg: BLUE_BG, svg: '' },
  E_mono: { bg: 'transparent', svg: K('#FFFFFF', 0.72) },
};

const only = process.argv[2]?.split(',');
for (const [id, o] of Object.entries(jobs)) {
  if (only && !only.includes(id)) continue;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${S}px;height:${S}px;overflow:hidden;background:transparent}
  .bg{position:absolute;inset:0;background:${o.bg}}svg{position:absolute;inset:0}</style></head>
  <body><div class="bg"></div><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${o.svg}</svg></body></html>`;
  writeFileSync(`${OUT}${id}.html`, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', '--force-device-scale-factor=1', `--window-size=${S},${S}`, `--screenshot=${OUT}${id}.png`, `file://${OUT}${id}.html`], { stdio: 'ignore' });
  console.log('rendered', id);
}
