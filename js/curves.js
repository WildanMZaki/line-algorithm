// ============================================================
// curves.js — Midpoint Circle & Ellipse Step Generators
// ============================================================
// Implements the Midpoint algorithms for drawing
// circles and ellipses on an integer grid.
// Circle: 8-octant symmetry, focuses on Octant 1 (Kuadran 1 bawah,
//   0°–45°), mirrored counter-clockwise to all other 7 octants.
// Ellipse: 4-quadrant symmetry, Region 1 & Region 2, mirrored to 4 quadrants.
// ============================================================

// ----- HELPER -----

function fmt(n, decimals = 2) {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(decimals)).toString();
}

// ----- PALETTES FOR OCTANTS & QUADRANTS -----
// Memberikan warna khas untuk setiap oktan / kuadran
// Oktan 1 (primer/dihitung langsung) berwarna Cyan neon
export const OCTANT_COLORS = [
  '#00ffcc', // Oct 1: Cyan Neon (Primer / Dihitung)
  '#38bdf8', // Oct 2: Sky Blue
  '#818cf8', // Oct 3: Indigo
  '#c084fc', // Oct 4: Purple
  '#f472b6', // Oct 5: Pink
  '#fb7185', // Oct 6: Rose
  '#fb923c', // Oct 7: Orange
  '#facc15', // Oct 8: Gold/Amber
];

export const QUADRANT_COLORS = [
  '#00ffcc', // Q1: Cyan Neon (Primer / Dihitung)
  '#818cf8', // Q2: Indigo
  '#f472b6', // Q3: Pink
  '#fb923c', // Q4: Orange
];

// ----- 8-WAY CIRCLE SYMMETRY -----
// Titik utama (x, y) berada pada Oktan 1 (Kuadran 1 bawah: 0°–45°),
// di mana x >= y >= 0.
// Replikasi 8 oktan berputar MELAWAN ARAH JARUM JAM (Counter-Clockwise):
//   Oktan 1: (+x, +y) — Kuadran 1 bawah (0°–45°)  [PRIMER]
//   Oktan 2: (+y, +x) — Kuadran 1 atas  (45°–90°)
//   Oktan 3: (-y, +x) — Kuadran 2 atas  (90°–135°)
//   Oktan 4: (-x, +y) — Kuadran 2 bawah (135°–180°)
//   Oktan 5: (-x, -y) — Kuadran 3 bawah (180°–225°)
//   Oktan 6: (-y, -x) — Kuadran 3 atas  (225°–270°)
//   Oktan 7: (+y, -x) — Kuadran 4 atas  (270°–315°)
//   Oktan 8: (+x, -y) — Kuadran 4 bawah (315°–360°)

export function getCircle8Points(cx, cy, x, y) {
  const set = new Set();
  const points = [];
  const raw = [
    { x: cx + x, y: cy + y, octant: 1, label: 'Oct 1 (0°–45°)',   color: OCTANT_COLORS[0] },
    { x: cx + y, y: cy + x, octant: 2, label: 'Oct 2 (45°–90°)',  color: OCTANT_COLORS[1] },
    { x: cx - y, y: cy + x, octant: 3, label: 'Oct 3 (90°–135°)', color: OCTANT_COLORS[2] },
    { x: cx - x, y: cy + y, octant: 4, label: 'Oct 4 (135°–180°)',color: OCTANT_COLORS[3] },
    { x: cx - x, y: cy - y, octant: 5, label: 'Oct 5 (180°–225°)',color: OCTANT_COLORS[4] },
    { x: cx - y, y: cy - x, octant: 6, label: 'Oct 6 (225°–270°)',color: OCTANT_COLORS[5] },
    { x: cx + y, y: cy - x, octant: 7, label: 'Oct 7 (270°–315°)',color: OCTANT_COLORS[6] },
    { x: cx + x, y: cy - y, octant: 8, label: 'Oct 8 (315°–360°)',color: OCTANT_COLORS[7] },
  ];

  for (const pt of raw) {
    const key = `${pt.x},${pt.y}`;
    if (!set.has(key)) {
      set.add(key);
      points.push(pt);
    }
  }
  return points;
}

// ----- 4-WAY ELLIPSE SYMMETRY -----
// Replikasi 4 kuadran berputar melawan arah jarum jam dari Kuadran 1
export function getEllipse4Points(cx, cy, x, y) {
  const set = new Set();
  const points = [];
  const raw = [
    { x: cx + x, y: cy + y, quadrant: 1, label: 'Q1 (+x,+y)', color: QUADRANT_COLORS[0] },
    { x: cx - x, y: cy + y, quadrant: 2, label: 'Q2 (-x,+y)', color: QUADRANT_COLORS[1] },
    { x: cx - x, y: cy - y, quadrant: 3, label: 'Q3 (-x,-y)', color: QUADRANT_COLORS[2] },
    { x: cx + x, y: cy - y, quadrant: 4, label: 'Q4 (+x,-y)', color: QUADRANT_COLORS[3] },
  ];

  for (const pt of raw) {
    const key = `${pt.x},${pt.y}`;
    if (!set.has(key)) {
      set.add(key);
      points.push(pt);
    }
  }
  return points;
}

// ============================================================
//  C#-LIKE SOURCE CODE
// ============================================================

export const CIRCLE_MIDPOINT_CODE = [
  'void DrawCircleMidpoint(int cx, int cy, int r)',  // 0
  '{',                                                // 1
  '    int x = r;',                                   // 2  <- Titik awal Oktan 1 (r, 0)
  '    int y = 0;',                                   // 3
  '    int p = 1 - r;',                               // 4  <- Parameter keputusan awal
  '',                                                  // 5
  '    Plot8Points(cx, cy, x, y);',                   // 6  <- Plot titik awal di 8 oktan
  '',                                                  // 7
  '    while (y < x)',                                 // 8  <- Loop sepanjang Oktan 1 (0° -> 45°)
  '    {',                                             // 9
  '        y++;',                                      // 10 <- Y melangkah maju
  '        if (p < 0)',                                // 11
  '        {',                                         // 12
  '            p += 2 * y + 1;',                      // 13 <- X tetap
  '        }',                                         // 14
  '        else',                                      // 15
  '        {',                                         // 16
  '            x--;',                                  // 17 <- X bergeser ke dalam
  '            p += 2 * (y - x) + 1;',               // 18
  '        }',                                         // 19
  '        Plot8Points(cx, cy, x, y);',               // 20 <- Replikasi CCW ke 8 oktan
  '    }',                                             // 21
  '}',                                                 // 22
];

export const ELLIPSE_MIDPOINT_CODE = [
  'void DrawEllipseMidpoint(int cx, int cy, int rx, int ry)', // 0
  '{',                                                         // 1
  '    int x = 0;',                                            // 2
  '    int y = ry;',                                           // 3
  '    int rx2 = rx * rx;',                                    // 4
  '    int ry2 = ry * ry;',                                    // 5
  '    float p1 = ry2 - rx2 * ry + 0.25f * rx2;',             // 6
  '',                                                          // 7
  '    // Region 1: |slope| < 1 (step di x)',                  // 8
  '    while (2 * ry2 * x <= 2 * rx2 * y)',                    // 9
  '    {',                                                     // 10
  '        Plot4Points(cx, cy, x, y);',                        // 11
  '        x++;',                                              // 12
  '        if (p1 < 0)',                                       // 13
  '            p1 += 2 * ry2 * x + ry2;',                     // 14
  '        else',                                              // 15
  '        {',                                                 // 16
  '            y--;',                                          // 17
  '            p1 += 2 * ry2 * x - 2 * rx2 * y + ry2;',      // 18
  '        }',                                                 // 19
  '    }',                                                     // 20
  '',                                                          // 21
  '    // Region 2: |slope| >= 1 (step di y)',                 // 22
  '    float p2 = ry2 * (x + 0.5f) * (x + 0.5f)',             // 23
  '            + rx2 * (y - 1) * (y - 1) - rx2 * ry2;',       // 24
  '',                                                          // 25
  '    while (y >= 0)',                                        // 26
  '    {',                                                     // 27
  '        Plot4Points(cx, cy, x, y);',                        // 28
  '        y--;',                                              // 29
  '        if (p2 > 0)',                                       // 30
  '            p2 += rx2 - 2 * rx2 * y;',                     // 31
  '        else',                                              // 32
  '        {',                                                 // 33
  '            x++;',                                          // 34
  '            p2 += 2 * ry2 * x - 2 * rx2 * y + rx2;',      // 35
  '        }',                                                 // 36
  '    }',                                                     // 37
  '}',                                                         // 38
];

// ============================================================
//  TRACING TABLE COLUMNS
// ============================================================

export const CIRCLE_COLUMNS = [
  { key: 'i',         label: 'Step' },
  { key: 'x',         label: 'x (Oktan 1)' },
  { key: 'y',         label: 'y (Oktan 1)' },
  { key: 'p',         label: 'pk' },
  { key: 'condition', label: 'Evaluasi Midpoint' },
  { key: 'p_next',    label: 'pk+1' },
  { key: 'points',    label: '8 Oktan (CCW)' },
];

export const ELLIPSE_COLUMNS = [
  { key: 'i',         label: 'Step' },
  { key: 'region',    label: 'Region' },
  { key: 'x',         label: 'x (Q1)' },
  { key: 'y',         label: 'y (Q1)' },
  { key: 'p',         label: 'pk' },
  { key: 'condition', label: 'Evaluasi Midpoint' },
  { key: 'p_next',    label: 'pk+1' },
  { key: 'points',    label: '4 Kuadran' },
];

// ============================================================
//  MIDPOINT CIRCLE GENERATOR (Fokus Oktan 1: Kuadran 1 bawah)
// ============================================================
// Dimulai dari (r, 0) pada sumbu X.
// y melangkah dari 0 naik sampai y == x (sudut 0° sampai 45°).
// Pada setiap langkah, titik (x, y) di Oktan 1 direplikasi
// ke 8 oktan melawan arah jarum jam melalui Plot8Points.
// ============================================================

export function* circleMidpoint(cx, cy, r) {
  let x = r;
  let y = 0;
  let p = 1 - r;

  // --- Init: variable assignments ---
  yield {
    highlightLines: [2, 3, 4],
    annotations: { 2: `→ x = ${r}`, 3: `→ y = 0`, 4: `→ p = 1 − r = ${p}` },
    pixel: null,
    tableRow: null,
    description: `Inisialisasi Oktan 1 (Kuadran 1 bawah): x = r = ${r}, y = 0, p = 1 − r = ${p}`,
  };

  // --- Initial Plot8Points ---
  const initPixels = getCircle8Points(cx, cy, x, y);
  yield {
    highlightLines: [6],
    annotations: { 6: `→ (${x}, ${y}) → 8 titik simetri` },
    pixels: initPixels,
    tableRow: {
      i: 0, x, y, p: '—',
      condition: 'Titik awal (r, 0)',
      p_next: p,
      points: `${initPixels.length} titik`,
    },
    description: `Plot titik awal (${x}, ${y}) di Oktan 1 → direplikasi ke ${initPixels.length} titik pada 8 oktan secara CCW`,
  };

  // --- While loop: y steps upward from 0 to y >= x ---
  let step = 1;
  while (y < x) {
    const pOld = p;
    y++;

    if (pOld < 0) {
      p = pOld + 2 * y + 1;
      const pixels = getCircle8Points(cx, cy, x, y);
      yield {
        highlightLines: [8, 10, 11, 13, 20],
        annotations: {
          10: `→ y = ${y}`,
          11: `→ p(${pOld}) < 0`,
          13: `→ p = ${p}`,
          20: `→ Plot8Points(${x}, ${y})`,
        },
        pixels,
        tableRow: {
          i: step, x, y, p: pOld,
          condition: `p < 0 (Midpoint di dlm) → X tetap`,
          p_next: p,
          points: `${pixels.length} titik`,
        },
        description: `Step ${step} (Oktan 1): y++=${y}, p=${pOld} < 0 → Midpoint di dalam lingkaran → X tetap (${x}), p_baru=${p}`,
      };
    } else {
      x--;
      p = pOld + 2 * (y - x) + 1;
      const pixels = getCircle8Points(cx, cy, x, y);
      yield {
        highlightLines: [8, 10, 15, 17, 18, 20],
        annotations: {
          10: `→ y = ${y}`,
          11: `→ p(${pOld}) ≥ 0`,
          17: `→ x = ${x}`,
          18: `→ p = ${p}`,
          20: `→ Plot8Points(${x}, ${y})`,
        },
        pixels,
        tableRow: {
          i: step, x, y, p: pOld,
          condition: `p ≥ 0 (Midpoint di luar) → X--`,
          p_next: p,
          points: `${pixels.length} titik`,
        },
        description: `Step ${step} (Oktan 1): y++=${y}, p=${pOld} ≥ 0 → Midpoint di luar lingkaran → x--=${x}, p_baru=${p}`,
      };
    }
    step++;
  }
}

// ============================================================
//  MIDPOINT ELLIPSE GENERATOR
// ============================================================
// Region 1: |slope| < 1 — langkah di X, evaluasi midpoint Y
// Region 2: |slope| ≥ 1 — langkah di Y, evaluasi midpoint X
// Direplikasi ke 4 kuadran melalui Plot4Points.
// ============================================================

export function* ellipseMidpoint(cx, cy, rx, ry) {
  let x = 0;
  let y = ry;
  const rx2 = rx * rx;
  const ry2 = ry * ry;

  // --- Init: variables ---
  yield {
    highlightLines: [2, 3, 4, 5],
    annotations: {
      2: `→ x = 0`, 3: `→ y = ${ry}`,
      4: `→ rx² = ${rx2}`, 5: `→ ry² = ${ry2}`,
    },
    pixel: null,
    tableRow: null,
    description: `Inisialisasi Ellipse Q1: x=0, y=${ry}, rx²=${rx2}, ry²=${ry2}`,
  };

  // --- Init p1 ---
  let p1 = ry2 - rx2 * ry + 0.25 * rx2;
  yield {
    highlightLines: [6],
    annotations: { 6: `→ p1 = ${fmt(p1)}` },
    pixel: null,
    tableRow: null,
    description: `Parameter awal Region 1: p1 = ry² − rx²×ry + 0.25×rx² = ${fmt(p1)}`,
  };

  // ---- REGION 1 ----
  let step = 1;
  while (2 * ry2 * x <= 2 * rx2 * y) {
    const plotX = x;
    const plotY = y;
    const pixels = getEllipse4Points(cx, cy, plotX, plotY);
    const pOld = p1;

    x++;
    if (pOld < 0) {
      p1 = pOld + 2 * ry2 * x + ry2;
      yield {
        highlightLines: [9, 11, 12, 13, 14],
        annotations: {
          11: `→ Plot(${plotX}, ${plotY})`,
          12: `→ x = ${x}`,
          13: `→ p1(${fmt(pOld)}) < 0`,
          14: `→ p1 = ${fmt(p1)}`,
        },
        pixels,
        tableRow: {
          i: step, region: 'R1', x: plotX, y: plotY,
          p: fmt(pOld), condition: 'p1 < 0 → Y tetap', p_next: fmt(p1),
          points: `${pixels.length} kuadran`,
        },
        description: `R1 Step ${step}: plot(${plotX},${plotY}), x++=${x}, p1=${fmt(pOld)} < 0 → Y tetap (${plotY}), p1_next=${fmt(p1)}`,
      };
    } else {
      y--;
      p1 = pOld + 2 * ry2 * x - 2 * rx2 * y + ry2;
      yield {
        highlightLines: [9, 11, 12, 15, 17, 18],
        annotations: {
          11: `→ Plot(${plotX}, ${plotY})`,
          12: `→ x = ${x}`,
          17: `→ y = ${y}`,
          18: `→ p1 = ${fmt(p1)}`,
        },
        pixels,
        tableRow: {
          i: step, region: 'R1', x: plotX, y: plotY,
          p: fmt(pOld), condition: 'p1 ≥ 0 → Y--', p_next: fmt(p1),
          points: `${pixels.length} kuadran`,
        },
        description: `R1 Step ${step}: plot(${plotX},${plotY}), x++=${x}, y--=${y}, p1=${fmt(p1)}`,
      };
    }
    step++;
  }

  // --- Transition: compute p2 ---
  let p2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
  yield {
    highlightLines: [22, 23, 24],
    annotations: { 23: `→ p2 = ${fmt(p2)}` },
    pixel: null,
    tableRow: null,
    description: `Transisi ke Region 2: p2 = ry²(x+0.5)² + rx²(y−1)² − rx²ry² = ${fmt(p2)}`,
  };

  // ---- REGION 2 ----
  while (y >= 0) {
    const plotX = x;
    const plotY = y;
    const pixels = getEllipse4Points(cx, cy, plotX, plotY);
    const pOld = p2;

    y--;
    if (pOld > 0) {
      p2 = pOld + rx2 - 2 * rx2 * y;
      yield {
        highlightLines: [26, 28, 29, 30, 31],
        annotations: {
          28: `→ Plot(${plotX}, ${plotY})`,
          29: `→ y = ${y}`,
          30: `→ p2(${fmt(pOld)}) > 0`,
          31: `→ p2 = ${fmt(p2)}`,
        },
        pixels,
        tableRow: {
          i: step, region: 'R2', x: plotX, y: plotY,
          p: fmt(pOld), condition: 'p2 > 0 → X tetap', p_next: fmt(p2),
          points: `${pixels.length} kuadran`,
        },
        description: `R2 Step ${step}: plot(${plotX},${plotY}), y--=${y}, p2=${fmt(pOld)} > 0 → X tetap (${plotX}), p2_next=${fmt(p2)}`,
      };
    } else {
      x++;
      p2 = pOld + 2 * ry2 * x - 2 * rx2 * y + rx2;
      yield {
        highlightLines: [26, 28, 29, 32, 34, 35],
        annotations: {
          28: `→ Plot(${plotX}, ${plotY})`,
          29: `→ y = ${y}`,
          34: `→ x = ${x}`,
          35: `→ p2 = ${fmt(p2)}`,
        },
        pixels,
        tableRow: {
          i: step, region: 'R2', x: plotX, y: plotY,
          p: fmt(pOld), condition: 'p2 ≤ 0 → X++', p_next: fmt(p2),
          points: `${pixels.length} kuadran`,
        },
        description: `R2 Step ${step}: plot(${plotX},${plotY}), y--=${y}, x++=${x}, p2=${fmt(p2)}`,
      };
    }
    step++;
  }
}

// ============================================================
//  CURVE DEFINITIONS (for UI)
// ============================================================

export const CURVES = {
  circle: {
    name: 'Lingkaran (8 Oktan)',
    icon: '○',
    params: [
      { key: 'cx', label: 'Center X', default: 0 },
      { key: 'cy', label: 'Center Y', default: 0 },
      { key: 'r', label: 'Radius (r)', default: 12, min: 1 },
    ],
    code: CIRCLE_MIDPOINT_CODE,
    columns: CIRCLE_COLUMNS,
    createGenerator(params) {
      return circleMidpoint(params.cx, params.cy, params.r);
    },
    getInfoHtml(params) {
      return `
        <span class="info-item"><strong>Kurva:</strong> ○ Lingkaran (Midpoint)</span>
        <span class="info-sep">|</span>
        <span class="info-item"><strong>Pusat:</strong> (${params.cx}, ${params.cy})</span>
        <span class="info-sep">|</span>
        <span class="info-item"><strong>Radius (r):</strong> ${params.r}</span>
        <span class="info-sep">|</span>
        <span class="info-item"><strong>Simetri:</strong> 8 Oktan (Fokus Oktan 1, CCW)</span>
      `;
    },
  },
  ellipse: {
    name: 'Ellipse (4 Kuadran)',
    icon: '⬭',
    params: [
      { key: 'cx', label: 'Center X', default: 0 },
      { key: 'cy', label: 'Center Y', default: 0 },
      { key: 'rx', label: 'Radius X (rx)', default: 14, min: 1 },
      { key: 'ry', label: 'Radius Y (ry)', default: 8, min: 1 },
    ],
    code: ELLIPSE_MIDPOINT_CODE,
    columns: ELLIPSE_COLUMNS,
    createGenerator(params) {
      return ellipseMidpoint(params.cx, params.cy, params.rx, params.ry);
    },
    getInfoHtml(params) {
      return `
        <span class="info-item"><strong>Kurva:</strong> ⬭ Ellipse (Midpoint)</span>
        <span class="info-sep">|</span>
        <span class="info-item"><strong>Pusat:</strong> (${params.cx}, ${params.cy})</span>
        <span class="info-sep">|</span>
        <span class="info-item"><strong>rx:</strong> ${params.rx}  <strong>ry:</strong> ${params.ry}</span>
        <span class="info-sep">|</span>
        <span class="info-item"><strong>Simetri:</strong> 4 Kuadran (Region 1 & 2)</span>
      `;
    },
  },
};

export const CURVE_LIST = Object.keys(CURVES).map(key => ({
  key,
  name: CURVES[key].name,
  icon: CURVES[key].icon,
  params: CURVES[key].params,
}));
