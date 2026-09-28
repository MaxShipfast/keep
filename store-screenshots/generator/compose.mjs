// Conversion-led App Store slides for Keep (6.9", 1320×2868).
// System (from competitor research): blue billboard pair (1+2, one continuous panorama) → light
// neutral slides with dark phones (3+), 2–5 word captions, one oversized "pop-out" UI card per slide.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { C, FONT_CSS, SCREEN_CSS } from './screens.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const OUT = new URL('./final/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

export const W = 1320;
export const H = 2868;
export const INK = '#0A0E15';

export const THEMES = {
  blue: {
    bg: `radial-gradient(60% 30% at 70% 38%, rgba(255,255,255,0.16), transparent 70%), linear-gradient(165deg, #4F88FF 0%, #2F66F5 45%, #1B3FC4 100%)`,
    ink: '#FFFFFF',
    em: INK,
    sub: 'rgba(255,255,255,0.86)',
    pill: 'background:rgba(255,255,255,0.18);border:2px solid rgba(255,255,255,0.45);color:#fff',
  },
  light: {
    bg: `radial-gradient(70% 34% at 50% 30%, rgba(61,123,255,0.10), transparent 70%), #F2F5FB`,
    ink: INK,
    em: C.blue,
    sub: '#4A5568',
    pill: `background:rgba(61,123,255,0.10);border:2px solid rgba(61,123,255,0.30);color:${C.blue}`,
  },
};

/** Phone frame around a 440×956 screen scaled by k. */
export function device({ screen, k, x, y, dim = 0 }) {
  const sw = 440 * k;
  const sh = 956 * k;
  const bezel = Math.round(8 * k);
  const r = 62 * k;
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${sw + bezel * 2}px;height:${sh + bezel * 2}px;border-radius:${r + bezel}px;background:#05070B;box-shadow:0 0 0 ${Math.round(1.5 * k)}px #3A4458, 0 ${30 * k}px ${70 * k}px rgba(8,20,60,0.45);">
    <div style="position:absolute;left:${bezel}px;top:${bezel}px;width:${sw}px;height:${sh}px;border-radius:${r}px;overflow:hidden;">
      <div style="transform:scale(${k});transform-origin:0 0;width:440px;height:956px;">${screen}</div>
      ${dim ? `<div style="position:absolute;inset:0;background:rgba(5,7,11,${dim})"></div>` : ''}
    </div>
  </div>`;
}

/** Oversized copy of a real UI element, authored in points at width `w`, scaled by k. */
export function popout({ html, w, k, x, y, rotate = 0 }) {
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;transform:scale(${k}) rotate(${rotate}deg);transform-origin:0 0;z-index:30;color:${C.text};font-family:Inter;filter:drop-shadow(0 10px 22px rgba(4,10,30,0.5));">${html}</div>`;
}

function page({ width, bg, body, theme }) {
  const t = THEMES[theme];
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_CSS}
  html,body{margin:0;width:${width}px;height:${H}px;overflow:hidden}
  ${SCREEN_CSS}
  .canvas{position:relative;width:${width}px;height:${H}px;overflow:hidden;font-family:Inter;background:${bg ?? t.bg};}
  .cap{position:absolute;top:170px;width:${W}px;padding:0 96px;box-sizing:border-box;text-align:center;z-index:40}
  .pill{display:inline-flex;align-items:center;gap:14px;padding:16px 32px;border-radius:100px;font-size:38px;font-weight:700;margin-bottom:40px}
  .hl{font-size:148px;font-weight:800;letter-spacing:-5px;line-height:1.0;text-wrap:balance}
  .sb{font-size:50px;font-weight:600;margin-top:36px;line-height:1.3;text-wrap:balance}
  </style></head><body><div class="canvas">${body}</div></body></html>`;
}

/** Caption block positioned on a slide whose left edge is at `offset` px of the canvas. */
export function caption({ theme, offset = 0, pill, headline, em, sub }) {
  const t = THEMES[theme];
  return `<div class="cap" style="left:${offset}px">
    ${pill ? `<div class="pill" style="${t.pill}">${pill}</div>` : ''}
    <div class="hl" style="color:${t.ink}">${headline}${em ? `<br><span style="color:${t.em}">${em}</span>` : ''}</div>
    ${sub ? `<div class="sb" style="color:${t.sub}">${sub}</div>` : ''}
  </div>`;
}

function renderHtml(html, file, width) {
  writeFileSync(file.replace(/\.png$/, '.html'), html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', `--window-size=${width},${H}`,
    `--screenshot=${file}`, `file://${file.replace(/\.png$/, '.html')}`,
  ], { stdio: 'ignore' });
}

/** Renders a single slide. */
export function renderSlide(name, { theme, bg, body }) {
  renderHtml(page({ width: W, bg, body, theme }), `${OUT}${name}.png`, W);
  console.log('rendered', name);
}

/** Renders a continuous panorama of `count` slides and slices it into separate PNGs. */
export async function renderPanorama(names, { theme, bg, body }) {
  const width = W * names.length;
  const file = `${OUT}_pano_${names.join('_')}.png`;
  renderHtml(page({ width, bg, body, theme }), file, width);
  for (let i = 0; i < names.length; i++) {
    await sharp(file).extract({ left: i * W, top: 0, width: W, height: H }).png().toFile(`${OUT}${names[i]}.png`);
    console.log('rendered', names[i], '(panorama slice)');
  }
}
