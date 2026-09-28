// Faithful HTML re-creations of Keep's app screens, authored in iOS points (440 × 956, iPhone Pro Max).
// Every size/colour mirrors src/theme.ts and the screen components in the app repo.
import { readFileSync } from 'node:fs';

const ICON_DIR = new URL('./icons/', import.meta.url);
export function icon(name, size, color, extra = '') {
  const raw = readFileSync(new URL(`${name}.svg`, ICON_DIR), 'utf8');
  return raw.replace(
    '<svg ',
    `<svg width="${size}" height="${size}" fill="currentColor" style="color:${color};flex:none;display:block;${extra}" `
  );
}

export const C = {
  ground: '#0A0E15',
  surface: '#131A26',
  surface2: '#1A2333',
  line: 'rgba(255,255,255,0.07)',
  lineStrong: 'rgba(255,255,255,0.14)',
  text: '#F2F5FA',
  text2: '#95A0B4',
  text3: '#5C6778',
  blue: '#3D7BFF',
  blueLight: '#8AB2FF',
  blueSoft: 'rgba(61,123,255,0.14)',
  green: '#3DDC97',
  amber: '#FFB454',
  flame: '#FF9F43',
  flameSoft: 'rgba(255,140,60,0.14)',
  bronze: '#E8A268',
  silver: '#C7D2E3',
  gold: '#FFD43B',
};

export const FONT_CSS = [
  [400, '400Regular/Inter_400Regular'],
  [600, '600SemiBold/Inter_600SemiBold'],
  [700, '700Bold/Inter_700Bold'],
  [800, '800ExtraBold/Inter_800ExtraBold'],
]
  .map(
    ([w, p]) =>
      `@font-face{font-family:Inter;font-weight:${w};src:url('${new URL(`../../node_modules/@expo-google-fonts/inter/${p}.ttf`, import.meta.url).href}')}`
  )
  .join('\n');

// Shared app-screen CSS (points). `.scr` is the 440×956 screen.
export const SCREEN_CSS = `
.scr{position:relative;width:440px;height:956px;background:${C.ground};overflow:hidden;font-family:Inter,system-ui;color:${C.text};}
.card{background:${C.surface};border:1px solid ${C.line};border-radius:16px;padding:16px;}
.row{display:flex;flex-direction:row;align-items:center;}
.eyebrow{color:${C.blue};font-size:13px;font-weight:700;}
.h1{color:${C.text};font-size:30px;font-weight:800;letter-spacing:-0.5px;line-height:36px;margin-top:10px;}
.sechead{color:${C.text};font-size:13.5px;font-weight:700;margin:14px 0 7px;}
.back{width:44px;height:44px;border-radius:22px;background:${C.surface};border:1px solid ${C.line};display:flex;align-items:center;justify-content:center;}
.insight{background:${C.blueSoft};border:1px solid rgba(61,123,255,0.3);border-radius:12px;padding:13px;color:${C.text2};font-size:12.5px;line-height:19px;}
.insight b{color:${C.text};font-weight:700;}
.gbtn{border-radius:16px;padding:17px;text-align:center;background:linear-gradient(180deg,#5F8FFF 0%,#3D6EF7 100%);color:#fff;font-size:16px;font-weight:700;}
.statusbar{position:absolute;top:0;left:0;right:0;height:54px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 34px 12px 46px;font-size:17px;font-weight:600;color:#fff;z-index:50;}
`;

// Real iOS status bar (time, signal, wifi, battery) — Apple composites this on device screenshots.
function statusBar(time = '9:41') {
  const bars = `<svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#fff"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#fff"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#fff"/></svg>`;
  const wifi = `<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.6c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8.5 1 10.2 10.2 0 0 0 1.4 3.8L2.5 5a8.6 8.6 0 0 1 6-2.4Z" fill="#fff"/><path d="M8.5 5.9c1.4 0 2.6.5 3.6 1.4l1.1-1.2a6.8 6.8 0 0 0-9.4 0l1.1 1.2c1-.9 2.2-1.4 3.6-1.4Z" fill="#fff"/><path d="M8.5 9.2c.5 0 1 .2 1.3.5L8.5 11 7.2 9.7c.3-.3.8-.5 1.3-.5Z" fill="#fff"/></svg>`;
  const batt = `<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="#fff" stroke-opacity="0.4" fill="none"/><rect x="2" y="2" width="19" height="9" rx="2" fill="#fff"/><path d="M24 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="#fff" fill-opacity="0.45"/></svg>`;
  return `<div class="statusbar"><span>${time}</span><span style="display:flex;gap:6px;align-items:center">${bars}${wifi}${batt}</span></div>`;
}
const island = `<div style="position:absolute;top:11px;left:50%;transform:translateX(-50%);width:126px;height:37px;border-radius:19px;background:#000;z-index:60"></div>`;

/* ---------------- Home ---------------- */
export function proteinRing(current, floor, size = 225) {
  const stroke = 15;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, current / floor);
  const done = frac >= 1;
  return `
  <div style="position:relative;width:${size}px;height:${size}px;margin:16px auto;">
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.blueLight}"/><stop offset="1" stop-color="${C.blue}"/></linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(255,255,255,0.06)" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${done ? C.green : 'url(#rg)'}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - frac)}"/>
    </svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="font-size:46px;font-weight:800;letter-spacing:-1.5px;line-height:1">${current}<span style="font-size:19px;color:${C.text2};font-weight:700">/${floor}g</span></div>
      <div style="color:${C.text2};font-size:12.5px;font-weight:600;margin-top:6px">Protein floor</div>
      <div style="color:${done ? C.green : C.blue};font-size:12.5px;font-weight:700;margin-top:4px">${done ? 'Floor hit — protected' : `${floor - current}g to go`}</div>
    </div>
  </div>`;
}

export function homeScreen({
  date = 'Thursday, Sep 24',
  shotDay = true,
  current = 96,
  floor = 128,
  score = 83,
  hitDays = 6,
  lifts = 2,
  streak = 12,
  meals = [
    ['Greek yogurt + whey', '8:12 AM · Scanned', 34],
    ['Salmon poke bowl', '12:40 PM · Scanned', 32],
    ['Protein coffee', '3:05 PM · Added manually', 30],
  ],
} = {}) {
  const toBronze = Math.max(0, 7 - streak);
  return `<div class="scr">${island}${statusBar()}
  <div style="padding:66px 24px 120px;">
    <div class="row" style="justify-content:space-between">
      <div>
        <div style="color:${C.text2};font-size:13px;font-weight:600">Today</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.4px;margin-top:2px">${date}</div>
      </div>
      <div style="width:36px;height:36px;border-radius:18px;background:${C.surface2};border:1px solid ${C.line};display:flex;align-items:center;justify-content:center">${icon('settings-outline', 17, C.text2)}</div>
    </div>
    ${
      shotDay
        ? `<div class="row" style="gap:10px;margin-top:16px;padding:12px;border-radius:12px;background:${C.blueSoft};border:1px solid rgba(61,123,255,0.3)">
      <div style="width:8px;height:8px;border-radius:4px;background:${C.blue};flex:none"></div>
      <div style="color:${C.text2};font-size:12.5px;line-height:19px"><b style="color:${C.text};font-weight:700">Shot day. </b>Appetite will dip for ~48h — small, protein-dense portions beat big meals. Your streak is safe today.</div>
    </div>`
        : ''
    }
    ${proteinRing(current, floor)}
    <div class="card row" style="gap:14px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px">${icon('shield-checkmark', 16, C.green)}<div style="color:${C.green};font-size:26px;font-weight:800;letter-spacing:-1px;line-height:1">${score}</div></div>
      <div style="flex:1"><div style="font-size:13.5px;font-weight:700">Muscle Guard score</div><div style="color:${C.text2};font-size:12px;margin-top:1px">Floor hit ${hitDays} of 7 days · ${lifts} lifts this week</div></div>
      ${icon('chevron-forward', 17, C.text3)}
    </div>
    <div class="card row" style="gap:14px;margin-top:10px">
      <div style="width:46px;height:46px;border-radius:23px;background:${C.flameSoft};display:flex;align-items:center;justify-content:center;flex:none">${icon('flame', 26, C.flame)}</div>
      <div style="flex:1">
        <div style="font-size:13.5px;font-weight:700">${streak}-day streak</div>
        <div style="color:${C.text2};font-size:11.5px;margin-top:2px">${toBronze > 0 ? `${toBronze} more days to your Bronze Shield` : 'Bronze Shield earned'} · shot-day grace is on</div>
        <div style="margin-top:8px;height:5px;border-radius:3px;background:${C.surface2};overflow:hidden"><div style="height:100%;border-radius:3px;background:${C.flame};width:${Math.min(100, (streak / 7) * 100)}%"></div></div>
      </div>
      ${icon('chevron-forward', 17, C.text3)}
    </div>
    <div style="margin-top:18px">
      <div class="row" style="justify-content:space-between;margin-bottom:10px"><div style="font-size:14px;font-weight:700">Today's meals</div><div style="color:${C.text2};font-size:12px">${meals.length} logged</div></div>
      ${meals
        .map(
          ([n, sub, g]) => `<div class="card row" style="padding:13px;margin-bottom:8px">
        <div style="flex:1"><div style="font-size:14px;font-weight:600">${n}</div><div style="color:${C.text2};font-size:12px;margin-top:1px">${sub}</div></div>
        <div style="color:${C.blue};font-size:15px;font-weight:800">+${g}g</div></div>`
        )
        .join('')}
    </div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:96px;background:linear-gradient(180deg,rgba(10,14,21,0),rgba(10,14,21,0.92))"></div>
  <div style="position:absolute;bottom:34px;left:50%;transform:translateX(-50%);display:flex;gap:9px;align-items:center;padding:16px 30px;border-radius:100px;background:linear-gradient(180deg,#5F8FFF,#3D6EF7);box-shadow:0 8px 30px rgba(61,123,255,0.4);white-space:nowrap">${icon('scan', 17, '#fff')}<span style="font-size:15px;font-weight:800">Scan a meal</span></div>
  <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:140px;height:5px;border-radius:3px;background:#fff;opacity:0.9"></div>
</div>`;
}

/* ---------------- Scan result ---------------- */
export function scanScreen({
  photo,
  food = 'Salmon poke bowl',
  portion = '1 small bowl',
  protein = 32,
  calories = 540,
  carbs = 58,
  before = 34,
  floor = 128,
} = {}) {
  const after = before + protein;
  const hit = after >= floor;
  return `<div class="scr" style="background:#05070B">${island}${statusBar()}
  <div style="position:absolute;left:0;right:0;top:0;height:560px;background:#0B0F16 url('${photo}') -216px -96px/900px auto no-repeat"></div>
  <div style="position:absolute;top:74px;right:20px;width:36px;height:36px;border-radius:18px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;z-index:30">${icon('close', 18, C.text2)}</div>
  <div style="position:absolute;left:0;right:0;bottom:0;background:${C.surface};border-top-left-radius:26px;border-top-right-radius:26px;border-top:1px solid ${C.lineStrong};padding:22px 22px 54px;">
    <div style="width:38px;height:4px;border-radius:2px;background:${C.lineStrong};margin:0 auto 18px"></div>
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div style="flex:1"><div style="font-size:19px;font-weight:800">${food}</div><div style="color:${C.text2};font-size:12.5px;margin-top:3px">Est. portion: ${portion} · log what you actually finished</div></div>
      <div style="border:1px solid rgba(61,220,151,0.35);border-radius:7px;padding:4px 8px;margin-left:10px;color:${C.green};font-size:11px;font-weight:700;white-space:nowrap">High confidence</div>
    </div>
    <div class="row" style="gap:10px;margin-top:18px">
      ${[
        [`${protein}g`, 'Protein', true],
        [`${calories}`, 'Calories'],
        [`${carbs}g`, 'Carbs'],
      ]
        .map(
          ([v, k, hi]) => `<div style="flex:1;padding:13px;border-radius:12px;background:${C.surface2};text-align:center">
        <div style="color:${hi ? C.blue : C.text};font-size:21px;font-weight:800">${v}</div><div style="color:${C.text2};font-size:11.5px;font-weight:600;margin-top:3px">${k}</div></div>`
        )
        .join('')}
    </div>
    <div style="margin-top:14px;padding:13px;border-radius:12px;background:${C.blueSoft};border:1px solid rgba(61,123,255,0.3);color:${C.text2};font-size:13.5px;line-height:20px">
      <b style="color:${C.text};font-weight:700">${hit ? 'Floor hit. ' : 'Good pick. '}</b>This takes you to ${after}/${floor}g${hit ? " — today's muscle is protected." : ' — one protein-dense snack later keeps the floor safe.'}
    </div>
    <div class="row" style="gap:10px;margin-top:16px">
      <div style="flex:1;text-align:center;color:${C.text2};font-size:14px;font-weight:600;padding:12px">Retake</div>
      <div class="gbtn" style="flex:2">Log ${protein}g protein</div>
    </div>
  </div>
  <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:140px;height:5px;border-radius:3px;background:#fff;opacity:0.9"></div>
</div>`;
}

/* ---------------- Scan capture (camera + shutter, before the result) ---------------- */
export function captureScreen({ photo, busy = true } = {}) {
  return `<div class="scr" style="background:#05070B">${island}${statusBar()}
  <div style="position:absolute;inset:0;background:#0B0F16 url('${photo}') -300px 40px/1060px auto no-repeat"></div>
  <div style="position:absolute;top:74px;right:20px;width:36px;height:36px;border-radius:18px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;z-index:30">${icon('close', 18, C.text2)}</div>
  <div style="position:absolute;left:0;right:0;bottom:0;padding:0 24px 50px;display:flex;flex-direction:column;align-items:center;gap:6px">
    ${busy ? `<div style="color:${C.text2};font-size:11px;opacity:0.8">Counting protein…</div>` : ''}
    <div style="width:74px;height:74px;border-radius:37px;border:4px solid #fff;display:flex;align-items:center;justify-content:center">
      ${busy ? `<div style="width:26px;height:26px;border-radius:13px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff"></div>` : `<div style="width:56px;height:56px;border-radius:28px;background:#fff"></div>`}
    </div>
    <div style="padding:12px;color:${C.text2};font-size:14px;font-weight:600">Type it instead</div>
  </div>
  <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:140px;height:5px;border-radius:3px;background:#fff;opacity:0.9"></div>
</div>`;
}

/* ---------------- Muscle Guard detail ---------------- */
function breakdownRow(iconName, title, pts, frac, note, action) {
  return `<div class="card" style="padding:12px">
    <div class="row" style="justify-content:space-between">
      <div class="row" style="gap:7px">${icon(iconName, 14, C.blueLight)}<span style="font-size:13px;font-weight:700">${title}</span></div>
      <span style="color:${C.text2};font-size:13px;font-weight:700">${pts}</span>
    </div>
    <div style="margin-top:8px;height:6px;border-radius:3px;background:${C.surface2};overflow:hidden"><div style="height:100%;border-radius:3px;background:${C.blue};width:${Math.round(frac * 100)}%"></div></div>
    <div class="row" style="justify-content:space-between;margin-top:6px">
      <span style="color:${C.text2};font-size:11px">${note}</span>
      ${action ? `<span style="padding:6px 11px;border-radius:8px;background:${C.blueSoft};border:1px solid rgba(61,123,255,0.35);color:${C.blue};font-size:11.5px;font-weight:700">${action}</span>` : ''}
    </div>
  </div>`;
}

export function guardScreen() {
  // Sunday: Mon–Fri hit, Saturday missed, today (Sunday) hit. 6/7 → 51, 2 lifts → 17, pace 15 → 83.
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hits = [1, 1, 1, 1, 1, 0, 1];
  return `<div class="scr">${island}${statusBar()}
  <div style="padding:66px 24px 40px">
    <div class="back" style="margin-bottom:14px">${icon('chevron-back', 20, C.text2)}</div>
    <div class="eyebrow">Muscle Guard score</div>
    <div class="row" style="align-items:baseline;gap:12px;margin-top:8px"><span style="color:${C.green};font-size:46px;font-weight:800;letter-spacing:-1.5px;line-height:1">83</span><span style="color:${C.text2};font-size:13px">this week</span></div>
    <div class="sechead">How it's built</div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${breakdownRow('nutrition', 'Protein floor · 60% of score', '51/60', 51 / 60, 'Hit 6 of 7 days this week')}
      ${breakdownRow('barbell', 'Strength training · 25%', '17/25', 17 / 25, '2 of 3 target sessions this week', '+ Log lift')}
      ${breakdownRow('speedometer', 'Loss pace · 15%', '15/15', 1, '−0.9%/week · steady pace', '+ Weigh-in')}
    </div>
    <div class="sechead">This week's pattern</div>
    <div class="row" style="gap:6px">
      ${days
        .map(
          (d, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center">
        <div style="width:22px;height:22px;border-radius:11px;background:${hits[i] ? 'rgba(61,220,151,0.16)' : C.surface2};border:1px solid ${hits[i] ? 'rgba(61,220,151,0.55)' : C.line}"></div>
        <div style="color:${C.text2};font-size:10px;font-weight:600;margin-top:5px">${d}</div></div>`
        )
        .join('')}
    </div>
    <div class="insight" style="margin-top:10px"><b>Your pattern: </b>your misses land on weekends. A Saturday-morning protein shake is the easiest way to lift next week's score.</div>
  </div>
</div>`;
}

/* ---------------- Streaks ---------------- */
export function streaksScreen() {
  // September 2026 starts on a Tuesday. Shot day = Thursday (3, 10, 17, 24 are grace days).
  const hits = new Set([2, 3, 5, 6, 8, 9, 11, 15, 16, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28]);
  const grace = new Set([10, 17, 24]);
  const today = 28;
  const cells = [];
  for (let i = 0; i < 1; i++) cells.push('<div></div>');
  for (let d = 1; d <= 30; d++) {
    const hit = hits.has(d);
    const g = grace.has(d) && !hit;
    const style = [
      'aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:11px',
      hit ? `background:rgba(61,123,255,0.16);color:${C.text};font-weight:700` : `color:${d > today ? C.text3 : C.text2}`,
      g ? 'border:1.5px dashed rgba(61,123,255,0.6);color:#F2F5FA;font-weight:700' : '',
      d === today ? `box-shadow:inset 0 0 0 1.5px ${C.blue};color:${C.text};font-weight:700` : '',
    ].join(';');
    cells.push(`<div style="${style}">${d}</div>`);
  }
  const shield = (label, days, state, tint, frac) => `<div class="card" style="flex:1;display:flex;flex-direction:column;align-items:center;padding:12px 8px;${state === 'locked' ? 'opacity:0.45' : ''}">
      ${icon(state === 'earned' ? 'shield-checkmark' : 'shield-outline', 26, state === 'locked' ? C.text3 : tint)}
      <div style="font-size:12px;font-weight:700;margin-top:6px">${label}</div>
      <div style="color:${C.text2};font-size:10px;margin-top:2px">${days}-day streak</div>
      ${frac !== undefined ? `<div style="align-self:stretch;margin-top:7px;height:4px;border-radius:2px;background:${C.surface2};overflow:hidden"><div style="height:100%;background:${C.flame};width:${Math.round(frac * 100)}%"></div></div>` : ''}
    </div>`;
  return `<div class="scr">${island}${statusBar()}
  <div style="padding:66px 24px 40px">
    <div class="back" style="margin-bottom:14px">${icon('chevron-back', 20, C.text2)}</div>
    <div class="eyebrow">Streaks &amp; shields</div>
    <div class="card row" style="gap:16px;margin-top:12px;padding:18px 16px">
      <div style="width:64px;height:64px;border-radius:32px;background:${C.flameSoft};display:flex;align-items:center;justify-content:center;flex:none">${icon('flame', 38, C.flame)}</div>
      <div><div style="font-size:44px;font-weight:800;letter-spacing:-1px;line-height:48px">12 <span style="font-size:15px;color:${C.text2};font-weight:700">days</span></div>
      <div style="color:${C.text2};font-size:12px;margin-top:4px">Current floor streak · best 12 · floor hit 83% of days</div></div>
    </div>
    <div class="sechead">Shields</div>
    <div class="row" style="gap:9px;align-items:stretch">
      ${shield('Bronze', 7, 'earned', C.bronze)}
      ${shield('Silver', 30, 'next', C.silver, 12 / 30)}
      ${shield('Gold', 90, 'locked', C.gold)}
    </div>
    <div class="sechead">September</div>
    <div class="card">
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
        ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<div style="text-align:center;color:${C.text2};font-size:9.5px;font-weight:700;padding-bottom:4px">${d}</div>`).join('')}
        ${cells.join('')}
      </div>
      <div class="row" style="gap:14px;margin-top:10px">
        <div class="row" style="gap:5px"><div style="width:10px;height:10px;border-radius:3px;background:rgba(61,123,255,0.35)"></div><span style="color:${C.text2};font-size:10.5px">Floor hit</span></div>
        <div class="row" style="gap:5px"><div style="width:10px;height:10px;border-radius:3px;border:1.5px dashed rgba(61,123,255,0.7)"></div><span style="color:${C.text2};font-size:10.5px">Shot-day grace</span></div>
      </div>
    </div>
    <div class="insight" style="margin-top:12px"><b>Shot-day grace: </b>on your injection day, appetite craters — so your streak never breaks on a shot day. Protection shouldn't punish you for taking your medication.</div>
  </div>
</div>`;
}

/* ---------------- Projection ---------------- */
export function projectionScreen({ weightLb = 200 } = {}) {
  const loss = Math.round(weightLb * 0.08);
  const risk = Math.max(4, Math.round(loss * 0.38));
  const safe = Math.max(1, Math.round(loss * 0.1));
  const x0 = 34, x1 = 310, yTop = 32, yBottom = 128, yWith = yTop + (yBottom - yTop) / 3, mx = (x0 + x1) / 2;
  const path = (yEnd) => `M${x0} ${yTop} Q${mx} ${yTop + (yEnd - yTop) * 0.35} ${x1} ${yEnd}`;
  const chip = (v, k, color = C.text) => `<div class="card" style="flex:1;padding:12px;display:flex;flex-direction:column;align-items:center">
    <div style="color:${color};font-size:20px;font-weight:800;letter-spacing:-0.4px">${v}</div>
    <div style="color:${C.text2};font-size:10.5px;margin-top:3px;text-align:center;line-height:14px">${k}</div></div>`;
  return `<div class="scr">${island}${statusBar()}
  <div style="padding:66px 24px 40px">
    <div class="back">${icon('chevron-back', 20, C.text2)}</div>
    <div class="eyebrow" style="margin-top:14px">Your next 12 weeks</div>
    <div class="h1">Same ${loss} lb loss. Very different bodies.</div>
    <div class="card" style="margin-top:24px;padding:16px 14px 10px">
      <svg width="100%" height="175" viewBox="0 0 330 175" style="display:block">
        <line x1="${x0}" y1="18" x2="${x0}" y2="140" stroke="rgba(255,255,255,0.08)"/>
        <line x1="${x0}" y1="140" x2="318" y2="140" stroke="rgba(255,255,255,0.08)"/>
        <line x1="${x0}" y1="79" x2="318" y2="79" stroke="rgba(255,255,255,0.045)"/>
        <text x="38" y="153" fill="${C.text3}" font-size="9.5" font-family="Inter">Now</text>
        <text x="176" y="153" fill="${C.text3}" font-size="9.5" font-family="Inter" text-anchor="middle">Week 6</text>
        <text x="316" y="153" fill="${C.text3}" font-size="9.5" font-family="Inter" text-anchor="end">Week 12</text>
        <text x="40" y="26" fill="${C.text3}" font-size="9.5" font-family="Inter">Muscle kept</text>
        <path d="${path(yBottom)}" stroke="${C.amber}" stroke-width="2.5" stroke-dasharray="6 6" fill="none" stroke-linecap="round"/>
        <path d="${path(yWith)}" stroke="${C.blue}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="${x1}" cy="${yWith}" r="4.5" fill="${C.blue}"/>
        <circle cx="${x1}" cy="${yBottom}" r="4" fill="${C.amber}"/>
        <text x="${x1 - 10}" y="${yWith - 9}" fill="${C.blue}" font-size="10.5" font-weight="700" font-family="Inter" text-anchor="end">−${safe} lb muscle</text>
        <text x="${x1 - 10}" y="${yBottom - 9}" fill="${C.amber}" font-size="10.5" font-weight="700" font-family="Inter" text-anchor="end">−${risk} lb muscle</text>
      </svg>
      <div class="row" style="gap:16px;padding:0 4px 4px">
        <div class="row" style="gap:6px"><div style="width:14px;height:3px;border-radius:2px;background:${C.blue}"></div><span style="color:${C.text2};font-size:11.5px">Hitting your protein floor</span></div>
        <div class="row" style="gap:6px"><div style="width:14px;border-top:2.5px dashed ${C.amber}"></div><span style="color:${C.text2};font-size:11.5px">Without protection</span></div>
      </div>
    </div>
    <div class="row" style="gap:10px;margin-top:14px;align-items:stretch">
      ${chip(`−${loss} lb`, 'typical 12-week loss on a GLP-1')}
      ${chip(`${risk} lb`, 'muscle at risk without protection', C.amber)}
      ${chip(`&lt;${safe} lb`, 'at your protein floor', C.blue)}
    </div>
    <div style="color:${C.text3};font-size:11px;line-height:16px;margin-top:14px;text-align:center">Illustrative estimate based on average results reported in GLP-1 clinical trials — not a medical prediction. Your results will vary; talk to your prescriber about your goals.</div>
    <div class="gbtn" style="margin-top:18px">Protect my 12 weeks</div>
  </div>
</div>`;
}

/* ---------------- Plan reveal ---------------- */
export function revealScreen({ floor = 128, med = 'Zepbound' } = {}) {
  return `<div class="scr">${island}${statusBar()}
  <div style="padding:66px 24px 40px">
    <div class="eyebrow">Your plan</div>
    <div class="h1">Your muscle-protection number</div>
    <div class="card" style="display:flex;flex-direction:column;align-items:center;padding:30px 16px;margin-top:28px">
      <div style="color:${C.blue};font-size:76px;font-weight:800;letter-spacing:-2px;line-height:80px">${floor}<span style="font-size:26px">g</span></div>
      <div style="color:${C.text2};font-size:13px;font-weight:600;margin-top:8px">Protein · every day</div>
    </div>
    <div class="row" style="gap:10px;margin-top:14px;align-items:stretch">
      <div class="card" style="flex:1;padding:14px"><div style="font-size:20px;font-weight:800;letter-spacing:-0.4px">${Math.round(floor / 3)}g</div><div style="color:${C.text2};font-size:11px;margin-top:3px;line-height:15px">per meal, 3 meals — realistic on a suppressed appetite</div></div>
      <div class="card" style="flex:1;padding:14px"><div style="font-size:20px;font-weight:800;letter-spacing:-0.4px">${med}</div><div style="color:${C.text2};font-size:11px;margin-top:3px;line-height:15px">targets tuned to your medication &amp; shot day</div></div>
    </div>
    <div style="margin-top:14px;padding:14px;border-radius:16px;background:rgba(255,180,84,0.08);border:1px solid rgba(255,180,84,0.25);color:${C.text2};font-size:13px;line-height:20px">
      <b style="color:${C.amber};font-weight:700">Why it matters: </b>clinical studies show up to 40% of weight lost on GLP-1s can be lean mass. Hitting your protein floor, alongside strength training, is one of the best-supported ways to hold on to muscle.
    </div>
    <div class="gbtn" style="margin-top:24px">See my 12-week projection</div>
  </div>
</div>`;
}
