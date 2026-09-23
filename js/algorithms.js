// ============================================================
// algorithms.js — DDA & Bresenham Line Algorithm Step Generators
// ============================================================
// Uses JS generator functions (function*) so each computational
// step can be yielded one-by-one for step-by-step animation.
// Also exports the C#-like source code arrays for code view display.
// ============================================================

// ----- C#-LIKE SOURCE CODE (for CodeView display) -----

export const DDA_CODE = [
  'public void DrawLineDDA(float x1, float y1, float x2, float y2)',
  '{',
  '    float dx = x2 - x1;',
  '    float dy = y2 - y1;',
  '',
  '    float steps = Math.Max(Math.Abs(dx), Math.Abs(dy));',
  '',
  '    float xInc = dx / steps;',
  '    float yInc = dy / steps;',
  '',
  '    float x = x1;',
  '    float y = y1;',
  '',
  '    for (int i = 0; i <= steps; i++)',
  '    {',
  '        PutPixel((int)Math.Round(x), (int)Math.Round(y));',
  '        x += xInc;',
  '        y += yInc;',
  '    }',
  '}',
];

export const BRESENHAM_CODE = [
  'public void DrawLineBresenham(int x1, int y1, int x2, int y2)',
  '{',
  '    int dx = Math.Abs(x2 - x1);',
  '    int dy = Math.Abs(y2 - y1);',
  '',
  '    int stepX = (x1 < x2) ? 1 : -1;',
  '    int stepY = (y1 < y2) ? 1 : -1;',
  '',
  '    int x = x1;',
  '    int y = y1;',
  '',
  '    PutPixel(x, y);',
  '',
  '    if (dx >= dy)',
  '    {',
  '        int p = 2 * dy - dx;',
  '',
  '        for (int i = 0; i < dx; i++)',
  '        {',
  '            x += stepX;',
  '',
  '            if (p >= 0)',
  '            {',
  '                y += stepY;',
  '                p += 2 * dy - 2 * dx;',
  '            }',
  '            else',
  '            {',
  '                p += 2 * dy;',
  '            }',
  '            PutPixel(x, y);',
  '        }',
  '    }',
  '    else',
  '    {',
  '        int p = 2 * dx - dy;',
  '',
  '        for (int i = 0; i < dy; i++)',
  '        {',
  '            y += stepY;',
  '',
  '            if (p >= 0)',
  '            {',
  '                x += stepX;',
  '                p += 2 * dx - 2 * dy;',
  '            }',
  '            else',
  '            {',
  '                p += 2 * dx;',
  '            }',
  '            PutPixel(x, y);',
  '        }',
  '    }',
  '}',
];

// ----- TRACING TABLE COLUMN DEFINITIONS -----

export const DDA_COLUMNS = [
  { key: 'i',       label: 'Step (i)' },
  { key: 'x_float', label: 'x (float)' },
  { key: 'y_float', label: 'y (float)' },
  { key: 'x_round', label: 'round(x)' },
  { key: 'y_round', label: 'round(y)' },
];

export const BRESENHAM_COLUMNS = [
  { key: 'i',         label: 'Step' },
  { key: 'p',         label: 'pk' },
  { key: 'condition', label: 'Kondisi' },
  { key: 'x',         label: 'x' },
  { key: 'y',         label: 'y' },
  { key: 'p_next',    label: 'pk+1' },
];

// ----- PRESET COORDINATES -----

export const PRESETS = [
  { label: 'Landai (m<1)',    x1: 0,   y1: 0,   x2: 20,  y2: 8   },
  { label: 'Curam (m>1)',     x1: 0,   y1: 0,   x2: 6,   y2: 22  },
  { label: 'Negatif',         x1: 10,  y1: 15,  x2: -12, y2: -5  },
  { label: 'Diagonal 45°',   x1: -15, y1: -15, x2: 15,  y2: 15  },
];

// ----- HELPER: format number for display -----

function fmt(n, decimals = 4) {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(decimals)).toString();
}

// ============================================================
//  DDA GENERATOR
// ============================================================

export function* lineDDA(x1, y1, x2, y2) {
  // --- Init: compute dx, dy ---
  const dx = x2 - x1;
  const dy = y2 - y1;
  yield {
    highlightLines: [2, 3],
    annotations: { 2: `→ dx = ${dx}`, 3: `→ dy = ${dy}` },
    pixel: null,
    tableRow: null,
    info: { dx, dy },
    description: `Hitung Δx = x2 − x1 = ${x2} − ${x1} = ${dx},  Δy = y2 − y1 = ${y2} − ${y1} = ${dy}`,
  };

  // --- Init: compute steps ---
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  yield {
    highlightLines: [5],
    annotations: { 5: `→ steps = ${steps}` },
    pixel: null,
    tableRow: null,
    info: { dx, dy, steps },
    description: `steps = Max(|${dx}|, |${dy}|) = Max(${Math.abs(dx)}, ${Math.abs(dy)}) = ${steps}`,
  };

  // Handle edge case: same start and end point
  if (steps === 0) {
    yield {
      highlightLines: [10, 11, 15],
      annotations: { 15: `→ PutPixel(${x1}, ${y1})` },
      pixel: { x: x1, y: y1 },
      tableRow: { i: 0, x_float: x1, y_float: y1, x_round: x1, y_round: y1 },
      info: { dx, dy, steps, xInc: 0, yInc: 0, x: x1, y: y1 },
      description: `Titik awal = titik akhir → Hanya 1 pixel: (${x1}, ${y1})`,
    };
    return;
  }

  // --- Init: compute increments ---
  const xInc = dx / steps;
  const yInc = dy / steps;
  yield {
    highlightLines: [7, 8],
    annotations: { 7: `→ xInc = ${fmt(xInc)}`, 8: `→ yInc = ${fmt(yInc)}` },
    pixel: null,
    tableRow: null,
    info: { dx, dy, steps, xInc, yInc },
    description: `xInc = ${dx}/${steps} = ${fmt(xInc)},  yInc = ${dy}/${steps} = ${fmt(yInc)}`,
  };

  // --- Init: set starting x, y ---
  let x = x1;
  let y = y1;
  yield {
    highlightLines: [10, 11],
    annotations: { 10: `→ x = ${fmt(x)}`, 11: `→ y = ${fmt(y)}` },
    pixel: null,
    tableRow: null,
    info: { dx, dy, steps, xInc, yInc, x, y },
    description: `Inisialisasi x = ${x1}, y = ${y1}`,
  };

  // --- Loop: iterate and put pixels ---
  for (let i = 0; i <= steps; i++) {
    const rx = Math.round(x);
    const ry = Math.round(y);

    yield {
      highlightLines: [13, 15, 16, 17],
      annotations: {
        13: i <= steps ? `→ i = ${i}` : '',
        15: `→ PutPixel(${rx}, ${ry})`,
        16: `→ x = ${fmt(x + xInc)}`,
        17: `→ y = ${fmt(y + yInc)}`,
      },
      pixel: { x: rx, y: ry },
      tableRow: {
        i,
        x_float: fmt(x),
        y_float: fmt(y),
        x_round: rx,
        y_round: ry,
      },
      info: { dx, dy, steps, xInc, yInc, x, y, i, rx, ry },
      description: `Step ${i}: x = ${fmt(x)}, y = ${fmt(y)} → Round(${rx}, ${ry}) → PutPixel`,
    };

    x += xInc;
    y += yInc;
  }
}

// ============================================================
//  BRESENHAM GENERATOR
// ============================================================

export function* lineBresenham(x1, y1, x2, y2) {
  // --- Init: compute dx, dy (absolute) ---
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  yield {
    highlightLines: [2, 3],
    annotations: { 2: `→ dx = ${dx}`, 3: `→ dy = ${dy}` },
    pixel: null,
    tableRow: null,
    info: { dx, dy },
    description: `dx = |x2−x1| = |${x2}−${x1}| = ${dx},  dy = |y2−y1| = |${y2}−${y1}| = ${dy}`,
  };

  // --- Init: determine step directions ---
  const sx = (x1 < x2) ? 1 : -1;
  const sy = (y1 < y2) ? 1 : -1;
  yield {
    highlightLines: [5, 6],
    annotations: { 5: `→ stepX = ${sx}`, 6: `→ stepY = ${sy}` },
    pixel: null,
    tableRow: null,
    info: { dx, dy, stepX: sx, stepY: sy },
    description: `stepX = ${sx === 1 ? '+1 (kanan)' : '-1 (kiri)'},  stepY = ${sy === 1 ? '+1 (naik)' : '-1 (turun)'}`,
  };

  // --- Init: starting position ---
  let x = x1;
  let y = y1;
  yield {
    highlightLines: [8, 9],
    annotations: { 8: `→ x = ${x}`, 9: `→ y = ${y}` },
    pixel: null,
    tableRow: null,
    info: { dx, dy, stepX: sx, stepY: sy, x, y },
    description: `Inisialisasi x = ${x1}, y = ${y1}`,
  };

  // --- PutPixel titik awal ---
  yield {
    highlightLines: [11],
    annotations: { 11: `→ PutPixel(${x}, ${y})` },
    pixel: { x, y },
    tableRow: { i: 0, p: '—', condition: 'Titik awal', x, y, p_next: '—' },
    info: { dx, dy, stepX: sx, stepY: sy, x, y },
    description: `Gambar titik awal (${x}, ${y})`,
  };

  // Handle edge case: same point
  if (dx === 0 && dy === 0) return;

  // ---- BRANCH: Landai (dx >= dy) vs Curam (dy > dx) ----

  if (dx >= dy) {
    // === KASUS LANDAI ===
    let p = 2 * dy - dx;
    yield {
      highlightLines: [13, 15],
      annotations: {
        13: `→ true (Landai)`,
        15: `→ p₀ = ${p}`,
      },
      pixel: null,
      tableRow: null,
      info: { dx, dy, stepX: sx, stepY: sy, x, y, p, kasus: 'Landai' },
      description: `dx(${dx}) >= dy(${dy}) → Kasus Landai.  p₀ = 2·${dy} − ${dx} = ${p}`,
    };

    for (let i = 0; i < dx; i++) {
      const pOld = p;
      x += sx;

      if (p >= 0) {
        y += sy;
        p += 2 * dy - 2 * dx;
        yield {
          highlightLines: [17, 19, 21, 23, 24, 30],
          annotations: {
            19: `→ x = ${x}`,
            21: `→ p(${pOld}) >= 0`,
            23: `→ y = ${y}`,
            24: `→ p = ${p}`,
            30: `→ PutPixel(${x}, ${y})`,
          },
          pixel: { x, y },
          tableRow: { i: i + 1, p: pOld, condition: `p(${pOld}) ≥ 0 → Y berubah`, x, y, p_next: p },
          info: { dx, dy, stepX: sx, stepY: sy, x, y, p, i: i + 1 },
          description: `Step ${i + 1}: p = ${pOld} ≥ 0 → x += stepX → ${x}, y += stepY → ${y}, p = ${p}`,
        };
      } else {
        p += 2 * dy;
        yield {
          highlightLines: [17, 19, 26, 28, 30],
          annotations: {
            19: `→ x = ${x}`,
            21: `→ p(${pOld}) < 0`,
            28: `→ p = ${p}`,
            30: `→ PutPixel(${x}, ${y})`,
          },
          pixel: { x, y },
          tableRow: { i: i + 1, p: pOld, condition: `p(${pOld}) < 0 → Y tetap`, x, y, p_next: p },
          info: { dx, dy, stepX: sx, stepY: sy, x, y, p, i: i + 1 },
          description: `Step ${i + 1}: p = ${pOld} < 0 → x += stepX → ${x}, y tetap ${y}, p = ${p}`,
        };
      }
    }
  } else {
    // === KASUS CURAM ===
    let p = 2 * dx - dy;
    yield {
      highlightLines: [33, 35],
      annotations: {
        33: `→ Kasus Curam`,
        35: `→ p₀ = ${p}`,
      },
      pixel: null,
      tableRow: null,
      info: { dx, dy, stepX: sx, stepY: sy, x, y, p, kasus: 'Curam' },
      description: `dx(${dx}) < dy(${dy}) → Kasus Curam.  p₀ = 2·${dx} − ${dy} = ${p}`,
    };

    for (let i = 0; i < dy; i++) {
      const pOld = p;
      y += sy;

      if (p >= 0) {
        x += sx;
        p += 2 * dx - 2 * dy;
        yield {
          highlightLines: [37, 39, 41, 43, 44, 50],
          annotations: {
            39: `→ y = ${y}`,
            41: `→ p(${pOld}) >= 0`,
            43: `→ x = ${x}`,
            44: `→ p = ${p}`,
            50: `→ PutPixel(${x}, ${y})`,
          },
          pixel: { x, y },
          tableRow: { i: i + 1, p: pOld, condition: `p(${pOld}) ≥ 0 → X berubah`, x, y, p_next: p },
          info: { dx, dy, stepX: sx, stepY: sy, x, y, p, i: i + 1 },
          description: `Step ${i + 1}: p = ${pOld} ≥ 0 → y += stepY → ${y}, x += stepX → ${x}, p = ${p}`,
        };
      } else {
        p += 2 * dx;
        yield {
          highlightLines: [37, 39, 46, 48, 50],
          annotations: {
            39: `→ y = ${y}`,
            41: `→ p(${pOld}) < 0`,
            48: `→ p = ${p}`,
            50: `→ PutPixel(${x}, ${y})`,
          },
          pixel: { x, y },
          tableRow: { i: i + 1, p: pOld, condition: `p(${pOld}) < 0 → X tetap`, x, y, p_next: p },
          info: { dx, dy, stepX: sx, stepY: sy, x, y, p, i: i + 1 },
          description: `Step ${i + 1}: p = ${pOld} < 0 → y += stepY → ${y}, x tetap ${x}, p = ${p}`,
        };
      }
    }
  }
}

// ============================================================
//  EQUATION INFO HELPER
// ============================================================

export function getLineInfo(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let equation, m, c;
  if (dx === 0 && dy === 0) {
    equation = `Titik: (${x1}, ${y1})`;
    m = '—';
    c = '—';
  } else if (dx === 0) {
    equation = `x = ${x1}`;
    m = '∞';
    c = '—';
  } else {
    m = dy / dx;
    c = y1 - m * x1;
    const mStr = fmt(m);
    const cStr = c === 0 ? '' : (c > 0 ? ` + ${fmt(c)}` : ` − ${fmt(Math.abs(c))}`);
    equation = `y = ${mStr}x${cStr}`;
  }

  const dominant = absDx >= absDy ? 'X' : 'Y';
  const steps = Math.max(absDx, absDy);

  return { equation, m: typeof m === 'number' ? fmt(m) : m, c: typeof c === 'number' ? fmt(c) : c, dx, dy, dominant, steps };
}
