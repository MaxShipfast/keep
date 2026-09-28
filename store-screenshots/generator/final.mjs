// Keep — App Store screenshots (6.9", 1320×2868). Run: node final.mjs [only-slide-id]
import { renderSlide, device, popout, caption, W } from './compose.mjs';
import {
  C, icon, proteinRing, homeScreen, scanScreen, guardScreen, streaksScreen, revealScreen, projectionScreen,
} from './screens.mjs';

const photo = new URL('./poke.jpg', import.meta.url).href;
const only = process.argv[2];

// Phone geometry shared by every slide: 440×956pt screen at scale K, bezel B.
const K = 2.4;
const B = Math.round(8 * K);
const PHONE_W = 440 * K + B * 2;
const PX = Math.round((W - PHONE_W) / 2);
const PY = 740;
const sx = (pt) => PX + B + pt * K; // screen point → slide px
const sy = (pt) => PY + B + pt * K;

/* ---------- pop-outs: enlarged copies of real UI elements, authored in points ---------- */
const edge = `border:1px solid ${C.lineStrong}`;

const ringDisc = `<div style="width:262px;height:262px;border-radius:131px;background:${C.ground};${edge};display:flex;align-items:center;justify-content:center">${proteinRing(96, 128, 225)}</div>`;

const guardRow = `<div class="card row" style="gap:14px;width:392px;box-sizing:border-box;${edge}">
  <div style="display:flex;flex-direction:column;align-items:center;gap:2px">${icon('shield-checkmark', 16, C.green)}<div style="color:${C.green};font-size:26px;font-weight:800;letter-spacing:-1px;line-height:1">83</div></div>
  <div style="flex:1"><div style="font-size:13.5px;font-weight:700">Muscle Guard score</div><div style="color:${C.text2};font-size:12px;margin-top:1px">Floor hit 6 of 7 days · 2 lifts this week</div></div>
  ${icon('chevron-forward', 17, C.text3)}
</div>`;

const macroRow = `<div style="width:396px;box-sizing:border-box;padding:12px;border-radius:18px;background:${C.surface};${edge}">
  <div class="row" style="gap:10px">
  ${[['32g', 'Protein', true], ['540', 'Calories'], ['58g', 'Carbs']]
    .map(([v, k, hi]) => `<div style="flex:1;padding:13px;border-radius:12px;background:${C.surface2};text-align:center">
      <div style="color:${hi ? C.blue : C.text};font-size:21px;font-weight:800">${v}</div><div style="color:${C.text2};font-size:11.5px;font-weight:600;margin-top:3px">${k}</div></div>`)
    .join('')}
  </div>
</div>`;

const guardHeader = `<div class="card" style="width:236px;box-sizing:border-box;padding:16px 20px;${edge}">
  <div class="eyebrow">Muscle Guard score</div>
  <div class="row" style="align-items:baseline;gap:12px;margin-top:8px"><span style="color:${C.green};font-size:46px;font-weight:800;letter-spacing:-1.5px;line-height:1">83</span><span style="color:${C.text2};font-size:13px">this week</span></div>
</div>`;

const streakHeader = `<div class="card row" style="gap:16px;padding:18px 16px;width:392px;box-sizing:border-box;${edge}">
  <div style="width:64px;height:64px;border-radius:32px;background:${C.flameSoft};display:flex;align-items:center;justify-content:center;flex:none">${icon('flame', 38, C.flame)}</div>
  <div><div style="font-size:44px;font-weight:800;letter-spacing:-1px;line-height:48px">12 <span style="font-size:15px;color:${C.text2};font-weight:700">days</span></div>
  <div style="color:${C.text2};font-size:12px;margin-top:4px">Current floor streak · best 12 · floor hit 83% of days</div></div>
</div>`;

const floorCard = `<div class="card" style="width:392px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;padding:30px 16px;${edge}">
  <div style="color:${C.blue};font-size:76px;font-weight:800;letter-spacing:-2px;line-height:80px">128<span style="font-size:26px">g</span></div>
  <div style="color:${C.text2};font-size:13px;font-weight:600;margin-top:8px">Protein · every day</div>
</div>`;

/** Centres a pop-out of point-width `w` (scaled by k) on slide coordinates (cx, cy) for an element `hPt` tall. */
function lift(html, w, hPt, k, cx, cy) {
  return popout({ html, w, k, x: Math.round(cx - (w * k) / 2), y: Math.round(cy - (hPt * k) / 2) });
}

const pill = (ic, text, color = '#fff') => `${icon(ic, 40, color)}<span>${text}</span>`;

/* ---------- slides ---------- */
const slides = {
  // 1 — promise + proof. Search shows frames 1–3, so the whole loop lives here.
  '01': () => ({
    theme: 'blue',
    body:
      caption({ theme: 'blue', pill: pill('shield-checkmark', 'Made for GLP-1 users'), headline: 'Lose fat,', em: 'not muscle.' }) +
      device({ screen: homeScreen(), k: K, x: PX, y: PY, dim: 0.42 }) +
      lift(ringDisc, 262, 262, K * 1.6, sx(220.5), sy(318.5)),
  }),

  // 2 — snap → result in one frame: the photo is on screen, the number pops out.
  '02': () => ({
    theme: 'blue',
    body:
      caption({ theme: 'blue', headline: 'Snap your meal,', em: 'see the protein.' }) +
      device({ screen: scanScreen({ photo }), k: K, x: PX, y: PY, dim: 0.22 }) +
      lift(macroRow, 396, 86, K * 1.33, W / 2, sy(724)),
  }),

  // 3 — the differentiator: one weekly number for muscle protection.
  '03': () => ({
    theme: 'blue',
    body:
      caption({ theme: 'blue', headline: "Know it's", em: 'working.', sub: 'One weekly score for protein, lifting and pace' }) +
      device({ screen: guardScreen(), k: K, x: PX, y: PY, dim: 0.28 }) +
      lift(guardHeader, 236, 96, K * 1.5, 470, sy(170)),
  }),

  // 4 — fire streaks with shot-day grace (the GLP-1-specific twist).
  '04': () => ({
    theme: 'blue',
    body:
      caption({ theme: 'blue', headline: 'Shot day?', em: "Streak's safe.", sub: 'Your streak never breaks on injection day' }) +
      device({ screen: streaksScreen(), k: K, x: PX, y: PY, dim: 0.28 }) +
      lift(streakHeader, 392, 131, K * 1.28, W / 2, sy(154 + 65)),
  }),

  // 5 — the personal number (method as trust).
  '05': () => ({
    theme: 'blue',
    body:
      caption({ theme: 'blue', headline: 'Get your', em: 'protein number.', sub: 'Set from your weight, sized for a smaller appetite' }) +
      device({ screen: revealScreen(), k: K, x: PX, y: PY, dim: 0.28 }) +
      lift(floorCard, 392, 184, K * 1.28, W / 2, sy(192 + 92)),
  }),

  // 6 — the why, with the in-app disclaimer visible.
  '06': () => ({
    theme: 'blue',
    body:
      caption({ theme: 'blue', headline: 'Same loss.', em: 'Different body.', sub: 'See what protein protects over 12 weeks' }) +
      device({ screen: projectionScreen(), k: K, x: PX, y: PY }),
  }),
};

for (const [id, make] of Object.entries(slides)) {
  if (only && only !== id) continue;
  renderSlide(id, make());
}
