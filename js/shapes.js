// ============================================================
// shapes.js — Shape Definitions & Step Generators
// ============================================================
// Defines 2D shapes built from DrawLine primitives.
// Each shape has: parameter schema, C#-like pseudocode,
// and a method to resolve parameters into concrete line segments.
// The shapeGenerator function yields one step per DrawLine call,
// drawing all pixels of that line segment in a single step.
// ============================================================

// ----- LINE PIXEL COMPUTATION (non-generator, batch) -----

export function computePixelsDDA(x1, y1, x2, y2) {
  const pixels = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    pixels.push({ x: x1, y: y1 });
    return pixels;
  }
  const xInc = dx / steps;
  const yInc = dy / steps;
  let x = x1, y = y1;
  for (let i = 0; i <= steps; i++) {
    pixels.push({ x: Math.round(x), y: Math.round(y) });
    x += xInc;
    y += yInc;
  }
  return pixels;
}

export function computePixelsBresenham(x1, y1, x2, y2) {
  const pixels = [];
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let x = x1, y = y1;
  pixels.push({ x, y });
  if (dx === 0 && dy === 0) return pixels;

  if (dx >= dy) {
    let p = 2 * dy - dx;
    for (let i = 0; i < dx; i++) {
      x += sx;
      if (p >= 0) { y += sy; p += 2 * dy - 2 * dx; }
      else { p += 2 * dy; }
      pixels.push({ x, y });
    }
  } else {
    let p = 2 * dx - dy;
    for (let i = 0; i < dy; i++) {
      y += sy;
      if (p >= 0) { x += sx; p += 2 * dx - 2 * dy; }
      else { p += 2 * dx; }
      pixels.push({ x, y });
    }
  }
  return pixels;
}

// ----- SHAPE TRACE TABLE COLUMNS -----

export const SHAPE_TRACE_COLUMNS = [
  { key: 'line',       label: '#' },
  { key: 'label',      label: 'Sisi' },
  { key: 'from',       label: 'Dari' },
  { key: 'to',         label: 'Ke' },
  { key: 'algo',       label: 'Algoritma' },
  { key: 'pixelCount', label: 'Pixel' },
];

// ============================================================
//  SHAPE DEFINITIONS
// ============================================================

export const SHAPES = {

  // ---- PERSEGI (Square) ----
  persegi: {
    name: 'Persegi',
    icon: '⬜',
    params: [
      { key: 'x', label: 'Start X', default: 0 },
      { key: 'y', label: 'Start Y', default: 0 },
      { key: 'sisi', label: 'Sisi', default: 8, min: 1 },
    ],
    code: [
      'void DrawPersegi(Vector2 start, int sisi)',     // 0
      '{',                                              // 1
      '    int x = start.X;',                           // 2
      '    int y = start.Y;',                           // 3
      '    int s = sisi;',                              // 4
      '',                                               // 5
      '    DrawLine(x, y, x + s, y);           // Bawah',  // 6
      '    DrawLine(x + s, y, x + s, y + s);   // Kanan',  // 7
      '    DrawLine(x + s, y + s, x, y + s);   // Atas',   // 8
      '    DrawLine(x, y + s, x, y);           // Kiri',   // 9
      '}',                                              // 10
    ],
    initLines: [2, 3, 4],
    getInitAnnotations(p) {
      return { 2: `→ x = ${p.x}`, 3: `→ y = ${p.y}`, 4: `→ s = ${p.sisi}` };
    },
    getInitDescription(p) {
      return `Inisialisasi: start = (${p.x}, ${p.y}), sisi = ${p.sisi}`;
    },
    getLines(p) {
      const { x, y, sisi: s } = p;
      return [
        { x1: x,   y1: y,   x2: x+s, y2: y,   label: 'Bawah', codeLine: 6 },
        { x1: x+s, y1: y,   x2: x+s, y2: y+s, label: 'Kanan', codeLine: 7 },
        { x1: x+s, y1: y+s, x2: x,   y2: y+s, label: 'Atas',  codeLine: 8 },
        { x1: x,   y1: y+s, x2: x,   y2: y,   label: 'Kiri',  codeLine: 9 },
      ];
    },
  },

  // ---- PERSEGI PANJANG (Rectangle) ----
  persegiPanjang: {
    name: 'Persegi Panjang',
    icon: '▬',
    params: [
      { key: 'x', label: 'Start X', default: 0 },
      { key: 'y', label: 'Start Y', default: 0 },
      { key: 'lebar', label: 'Lebar', default: 12, min: 1 },
      { key: 'tinggi', label: 'Tinggi', default: 6, min: 1 },
    ],
    code: [
      'void DrawPersegiPanjang(Vector2 start, int lebar, int tinggi)', // 0
      '{',                                                             // 1
      '    int x = start.X;',                                          // 2
      '    int y = start.Y;',                                          // 3
      '    int w = lebar;',                                            // 4
      '    int h = tinggi;',                                           // 5
      '',                                                              // 6
      '    DrawLine(x, y, x + w, y);           // Bawah',             // 7
      '    DrawLine(x + w, y, x + w, y + h);   // Kanan',             // 8
      '    DrawLine(x + w, y + h, x, y + h);   // Atas',              // 9
      '    DrawLine(x, y + h, x, y);           // Kiri',              // 10
      '}',                                                             // 11
    ],
    initLines: [2, 3, 4, 5],
    getInitAnnotations(p) {
      return { 2: `→ x = ${p.x}`, 3: `→ y = ${p.y}`, 4: `→ w = ${p.lebar}`, 5: `→ h = ${p.tinggi}` };
    },
    getInitDescription(p) {
      return `Inisialisasi: start = (${p.x}, ${p.y}), lebar = ${p.lebar}, tinggi = ${p.tinggi}`;
    },
    getLines(p) {
      const { x, y, lebar: w, tinggi: h } = p;
      return [
        { x1: x,   y1: y,   x2: x+w, y2: y,   label: 'Bawah', codeLine: 7 },
        { x1: x+w, y1: y,   x2: x+w, y2: y+h, label: 'Kanan', codeLine: 8 },
        { x1: x+w, y1: y+h, x2: x,   y2: y+h, label: 'Atas',  codeLine: 9 },
        { x1: x,   y1: y+h, x2: x,   y2: y,   label: 'Kiri',  codeLine: 10 },
      ];
    },
  },

  // ---- SEGITIGA SIKU-SIKU (Right Triangle) ----
  segitigaSikuSiku: {
    name: 'Segitiga Siku-Siku',
    icon: '◺',
    params: [
      { key: 'x', label: 'Start X', default: 0 },
      { key: 'y', label: 'Start Y', default: 0 },
      { key: 'alas', label: 'Alas', default: 10, min: 1 },
      { key: 'tinggi', label: 'Tinggi', default: 8, min: 1 },
    ],
    code: [
      'void DrawSegitigaSikuSiku(Vector2 start, int alas, int tinggi)', // 0
      '{',                                                              // 1
      '    int x = start.X;',                                           // 2
      '    int y = start.Y;',                                           // 3
      '    int a = alas;',                                              // 4
      '    int t = tinggi;',                                            // 5
      '',                                                               // 6
      '    DrawLine(x, y, x + a, y);           // Alas',               // 7
      '    DrawLine(x, y, x, y + t);           // Tinggi',             // 8
      '    DrawLine(x, y + t, x + a, y);       // Hipotenusa',        // 9
      '}',                                                              // 10
    ],
    initLines: [2, 3, 4, 5],
    getInitAnnotations(p) {
      return { 2: `→ x = ${p.x}`, 3: `→ y = ${p.y}`, 4: `→ a = ${p.alas}`, 5: `→ t = ${p.tinggi}` };
    },
    getInitDescription(p) {
      return `Inisialisasi: start = (${p.x}, ${p.y}), alas = ${p.alas}, tinggi = ${p.tinggi}`;
    },
    getLines(p) {
      const { x, y, alas: a, tinggi: t } = p;
      return [
        { x1: x, y1: y,   x2: x+a, y2: y, label: 'Alas',       codeLine: 7 },
        { x1: x, y1: y,   x2: x,   y2: y+t, label: 'Tinggi',   codeLine: 8 },
        { x1: x, y1: y+t, x2: x+a, y2: y, label: 'Hipotenusa', codeLine: 9 },
      ];
    },
  },

  // ---- SEGITIGA SAMA SISI (Equilateral Triangle — integer approx) ----
  segitigaSamaSisi: {
    name: 'Segitiga Sama Sisi',
    icon: '△',
    params: [
      { key: 'x', label: 'Start X', default: 0 },
      { key: 'y', label: 'Start Y', default: 0 },
      { key: 'sisi', label: 'Sisi', default: 10, min: 2 },
    ],
    code: [
      'void DrawSegitigaSamaSisi(Vector2 start, int sisi)',              // 0
      '{',                                                               // 1
      '    int x = start.X;',                                            // 2
      '    int y = start.Y;',                                            // 3
      '    int s = sisi;',                                               // 4
      '    int h = (int)Math.Round(s * Math.Sqrt(3) / 2);',             // 5
      '    int mx = x + s / 2;',                                        // 6
      '',                                                                // 7
      '    DrawLine(x, y, x + s, y);       // Alas',                    // 8
      '    DrawLine(x, y, mx, y + h);      // Kiri',                    // 9
      '    DrawLine(mx, y + h, x + s, y);  // Kanan',                   // 10
      '}',                                                               // 11
    ],
    initLines: [2, 3, 4, 5, 6],
    getInitAnnotations(p) {
      const h = Math.round(p.sisi * Math.sqrt(3) / 2);
      const mx = p.x + Math.floor(p.sisi / 2);
      return {
        2: `→ x = ${p.x}`, 3: `→ y = ${p.y}`, 4: `→ s = ${p.sisi}`,
        5: `→ h ≈ ${h}`, 6: `→ mx = ${mx}`,
      };
    },
    getInitDescription(p) {
      const h = Math.round(p.sisi * Math.sqrt(3) / 2);
      return `Inisialisasi: start = (${p.x}, ${p.y}), sisi = ${p.sisi}, tinggi ≈ ${h} (aproksimasi integer)`;
    },
    getLines(p) {
      const { x, y, sisi: s } = p;
      const h = Math.round(s * Math.sqrt(3) / 2);
      const mx = x + Math.floor(s / 2);
      return [
        { x1: x,  y1: y, x2: x+s, y2: y,   label: 'Alas',  codeLine: 8 },
        { x1: x,  y1: y, x2: mx,  y2: y+h, label: 'Kiri',  codeLine: 9 },
        { x1: mx, y1: y+h, x2: x+s, y2: y, label: 'Kanan', codeLine: 10 },
      ];
    },
  },

  // ---- TRAPESIUM (Trapezoid) ----
  trapesium: {
    name: 'Trapesium',
    icon: '⏢',
    params: [
      { key: 'x', label: 'Start X', default: 0 },
      { key: 'y', label: 'Start Y', default: 0 },
      { key: 'sisiAtas', label: 'Sisi Atas', default: 6, min: 1 },
      { key: 'sisiBawah', label: 'Sisi Bawah', default: 12, min: 1 },
      { key: 'tinggi', label: 'Tinggi', default: 6, min: 1 },
    ],
    code: [
      'void DrawTrapesium(Vector2 start, int atas, int bawah, int tinggi)', // 0
      '{',                                                                   // 1
      '    int x = start.X;',                                                // 2
      '    int y = start.Y;',                                                // 3
      '    int a = atas;',                                                   // 4
      '    int b = bawah;',                                                  // 5
      '    int t = tinggi;',                                                 // 6
      '    int offset = (b - a) / 2;',                                      // 7
      '',                                                                    // 8
      '    DrawLine(x, y, x + b, y);                       // Bawah',       // 9
      '    DrawLine(x + b, y, x + offset + a, y + t);      // Kanan',       // 10
      '    DrawLine(x + offset + a, y + t, x + offset, y + t); // Atas',    // 11
      '    DrawLine(x + offset, y + t, x, y);              // Kiri',        // 12
      '}',                                                                   // 13
    ],
    initLines: [2, 3, 4, 5, 6, 7],
    getInitAnnotations(p) {
      const offset = Math.floor((p.sisiBawah - p.sisiAtas) / 2);
      return {
        2: `→ x = ${p.x}`, 3: `→ y = ${p.y}`,
        4: `→ a = ${p.sisiAtas}`, 5: `→ b = ${p.sisiBawah}`,
        6: `→ t = ${p.tinggi}`, 7: `→ offset = ${offset}`,
      };
    },
    getInitDescription(p) {
      const offset = Math.floor((p.sisiBawah - p.sisiAtas) / 2);
      return `Inisialisasi: start = (${p.x}, ${p.y}), atas = ${p.sisiAtas}, bawah = ${p.sisiBawah}, tinggi = ${p.tinggi}, offset = ${offset}`;
    },
    getLines(p) {
      const { x, y, sisiAtas: a, sisiBawah: b, tinggi: t } = p;
      const offset = Math.floor((b - a) / 2);
      return [
        { x1: x,            y1: y,   x2: x+b,          y2: y,   label: 'Bawah', codeLine: 9 },
        { x1: x+b,          y1: y,   x2: x+offset+a,   y2: y+t, label: 'Kanan', codeLine: 10 },
        { x1: x+offset+a,   y1: y+t, x2: x+offset,     y2: y+t, label: 'Atas',  codeLine: 11 },
        { x1: x+offset,     y1: y+t, x2: x,            y2: y,   label: 'Kiri',  codeLine: 12 },
      ];
    },
  },
};

// ============================================================
//  SHAPE GENERATOR
// ============================================================
// Yields one step per DrawLine call. Each step contains all
// pixels for that line segment, drawn in a single batch.
// ============================================================

export function* shapeGenerator(shapeKey, params, algo = 'dda') {
  const shape = SHAPES[shapeKey];
  if (!shape) return;

  const computePixels = algo === 'bresenham' ? computePixelsBresenham : computePixelsDDA;
  const algoName = algo === 'bresenham' ? 'Bresenham' : 'DDA';
  const lines = shape.getLines(params);

  // Step 1: Initialization — show parameter assignments
  yield {
    highlightLines: shape.initLines,
    annotations: shape.getInitAnnotations(params),
    pixel: null,
    tableRow: null,
    description: shape.getInitDescription(params),
  };

  // Step 2..N: Each DrawLine call
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pixels = computePixels(line.x1, line.y1, line.x2, line.y2);

    yield {
      highlightLines: [line.codeLine],
      annotations: {
        [line.codeLine]: `→ (${line.x1},${line.y1})→(${line.x2},${line.y2}) [${pixels.length}px]`,
      },
      pixel: null,
      pixels: pixels,
      tableRow: {
        line: i + 1,
        label: line.label,
        from: `(${line.x1}, ${line.y1})`,
        to: `(${line.x2}, ${line.y2})`,
        algo: algoName,
        pixelCount: pixels.length,
      },
      description: `${line.label}: DrawLine(${line.x1}, ${line.y1}, ${line.x2}, ${line.y2}) — ${pixels.length} pixel via ${algoName}`,
    };
  }
}

// ----- SHAPE LIST (for UI iteration) -----

export const SHAPE_LIST = Object.keys(SHAPES).map(key => ({
  key,
  name: SHAPES[key].name,
  icon: SHAPES[key].icon,
  params: SHAPES[key].params,
}));
