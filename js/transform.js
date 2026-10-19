// ============================================================
// transform.js — 2D Geometric Transformations & 3x3 Homogeneous Matrix Engine
// ============================================================
// Provides full 3x3 homogeneous matrix computations, manual calculation
// breakdowns, step-by-step simulations, and visual canvas overlays for:
// - Translation (Translasi)
// - Reflection (Refleksi)
// - Rotation (Rotasi)
// - Scaling / Dilatation (Dilatasi)
// - Shear / Geseran (Horizontal, Vertical)
// - Transformation Composition (Komposisi)
// ============================================================

import { computePixelsDDA } from './shapes.js';

// ---------- MATRIX 3x3 UTILITIES ----------

/** Create a 3x3 Identity Matrix */
export function identity3() {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

/** Multiply two 3x3 matrices: C = A * B */
export function multiply3(A, B) {
  const C = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += A[r][k] * B[k][c];
      }
      C[r][c] = cleanNumber(sum);
    }
  }
  return C;
}

/** Multiply 3x3 matrix M with homogeneous column vector [x, y, 1] */
export function transformPoint(M, x, y) {
  const rx = M[0][0] * x + M[0][1] * y + M[0][2] * 1;
  const ry = M[1][0] * x + M[1][1] * y + M[1][2] * 1;
  const rw = M[2][0] * x + M[2][1] * y + M[2][2] * 1;

  const w = Math.abs(rw) < 1e-9 ? 1 : rw;
  return {
    x: cleanNumber(rx / w),
    y: cleanNumber(ry / w),
    w: cleanNumber(w),
    rawX: cleanNumber(rx),
    rawY: cleanNumber(ry),
  };
}

/** Compute determinant of 3x3 matrix */
export function determinant3(M) {
  const d =
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  return cleanNumber(d);
}

/** Clean up floating-point noise e.g. 0.0000000000000001 -> 0 */
export function cleanNumber(n, decimals = 4) {
  if (Math.abs(n) < 1e-10) return 0;
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(n * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Format a number nicely for math formulas */
export function fmt(n, precision = 2) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  const c = cleanNumber(n, 4);
  if (Number.isInteger(c)) return String(c);
  return Number(c.toFixed(precision)).toString();
}

// ---------- TRANSFORMATION MATRIX BUILDERS ----------

export function createTranslationMatrix(tx, ty) {
  return [
    [1, 0, cleanNumber(tx)],
    [0, 1, cleanNumber(ty)],
    [0, 0, 1],
  ];
}

export function createRotationMatrix(deg, xp = 0, yp = 0) {
  const rad = (deg * Math.PI) / 180;
  let c = Math.cos(rad);
  let s = Math.sin(rad);

  if (Math.abs(c) < 1e-10) c = 0;
  if (Math.abs(s) < 1e-10) s = 0;
  if (Math.abs(c - 1) < 1e-10) c = 1;
  if (Math.abs(c + 1) < 1e-10) c = -1;
  if (Math.abs(s - 1) < 1e-10) s = 1;
  if (Math.abs(s + 1) < 1e-10) s = -1;

  if (xp === 0 && yp === 0) {
    return [
      [cleanNumber(c), cleanNumber(-s), 0],
      [cleanNumber(s), cleanNumber(c), 0],
      [0, 0, 1],
    ];
  }

  // Pivot (xp, yp): T(xp, yp) * R(deg) * T(-xp, -yp)
  const T1 = createTranslationMatrix(-xp, -yp);
  const R0 = [
    [cleanNumber(c), cleanNumber(-s), 0],
    [cleanNumber(s), cleanNumber(c), 0],
    [0, 0, 1],
  ];
  const T2 = createTranslationMatrix(xp, yp);

  return multiply3(T2, multiply3(R0, T1));
}

export function createScalingMatrix(sx, sy, xp = 0, yp = 0) {
  if (xp === 0 && yp === 0) {
    return [
      [cleanNumber(sx), 0, 0],
      [0, cleanNumber(sy), 0],
      [0, 0, 1],
    ];
  }

  // Pivot (xp, yp): T(xp, yp) * S(sx, sy) * T(-xp, -yp)
  const T1 = createTranslationMatrix(-xp, -yp);
  const S0 = [
    [cleanNumber(sx), 0, 0],
    [0, cleanNumber(sy), 0],
    [0, 0, 1],
  ];
  const T2 = createTranslationMatrix(xp, yp);

  return multiply3(T2, multiply3(S0, T1));
}

export function createReflectionMatrix(subType, k = 0) {
  switch (subType) {
    case 'x-axis': // Cermin terhadap sumbu X (y = 0)
      return [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, 1],
      ];
    case 'y-axis': // Cermin terhadap sumbu Y (x = 0)
      return [
        [-1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
    case 'origin': // Cermin terhadap titik asal (0, 0)
      return [
        [-1, 0, 0],
        [0, -1, 0],
        [0, 0, 1],
      ];
    case 'y=x': // Cermin terhadap garis y = x
      return [
        [0, 1, 0],
        [1, 0, 0],
        [0, 0, 1],
      ];
    case 'y=-x': // Cermin terhadap garis y = -x
      return [
        [0, -1, 0],
        [-1, 0, 0],
        [0, 0, 1],
      ];
    case 'x=k': // Cermin terhadap garis vertikal x = k -> T(k,0)*ReflY*T(-k,0)
      return [
        [-1, 0, cleanNumber(2 * k)],
        [0, 1, 0],
        [0, 0, 1],
      ];
    case 'y=k': // Cermin terhadap garis horizontal y = k -> T(0,k)*ReflX*T(0,-k)
      return [
        [1, 0, 0],
        [0, -1, cleanNumber(2 * k)],
        [0, 0, 1],
      ];
    default:
      return identity3();
  }
}

export function createShearMatrix(type, shx = 0, shy = 0, yref = 0, xref = 0) {
  if (type === 'horizontal') {
    // x' = x + shx * (y - yref), y' = y
    return [
      [1, cleanNumber(shx), cleanNumber(-shx * yref)],
      [0, 1, 0],
      [0, 0, 1],
    ];
  } else if (type === 'vertical') {
    // x' = x, y' = y + shy * (x - xref)
    return [
      [1, 0, 0],
      [cleanNumber(shy), 1, cleanNumber(-shy * xref)],
      [0, 0, 1],
    ];
  } else {
    // Simultan
    return [
      [1, cleanNumber(shx), cleanNumber(-shx * yref)],
      [cleanNumber(shy), 1, cleanNumber(-shy * xref)],
      [0, 0, 1],
    ];
  }
}

// ---------- OBJECT PRESETS ----------

export const TRANSFORM_OBJECTS = {
  triangle: {
    name: 'Segitiga ABC',
    icon: '🔺',
    vertices: [
      { label: 'A', x: 2, y: 2 },
      { label: 'B', x: 8, y: 2 },
      { label: 'C', x: 5, y: 7 },
    ],
  },
  square: {
    name: 'Persegi ABCD',
    icon: '⬜',
    vertices: [
      { label: 'A', x: 2, y: 2 },
      { label: 'B', x: 8, y: 2 },
      { label: 'C', x: 8, y: 8 },
      { label: 'D', x: 2, y: 8 },
    ],
  },
  quad: {
    name: 'Segiempat Sembarang',
    icon: '🔷',
    vertices: [
      { label: 'A', x: 1, y: 2 },
      { label: 'B', x: 7, y: 1 },
      { label: 'C', x: 9, y: 7 },
      { label: 'D', x: 3, y: 6 },
    ],
  },
  house: {
    name: 'Rumah Poligon',
    icon: '🏠',
    vertices: [
      { label: 'A', x: 2, y: 2 },
      { label: 'B', x: 8, y: 2 },
      { label: 'C', x: 8, y: 6 },
      { label: 'D', x: 5, y: 10 },
      { label: 'E', x: 2, y: 6 },
    ],
  },
  line: {
    name: 'Garis AB',
    icon: '📏',
    vertices: [
      { label: 'A', x: 2, y: 2 },
      { label: 'B', x: 8, y: 6 },
    ],
  },
  point: {
    name: 'Titik Tunggal P',
    icon: '📍',
    vertices: [
      { label: 'P', x: 4, y: 5 },
    ],
  },
};

// ---------- TRANSFORMATION PRESETS ----------

export const TRANSFORM_PRESETS = [
  {
    label: 'Translasi (+6, +4)',
    type: 'translate',
    params: { tx: 6, ty: 4 },
  },
  {
    label: 'Rotasi 45° (Origin)',
    type: 'rotate',
    params: { deg: 45, xp: 0, yp: 0 },
  },
  {
    label: 'Rotasi 90° @ Pivot (5,2)',
    type: 'rotate',
    params: { deg: 90, xp: 5, yp: 2 },
  },
  {
    label: 'Refleksi Sumbu X',
    type: 'reflect',
    params: { subType: 'x-axis', k: 0 },
  },
  {
    label: 'Refleksi Garis y = x',
    type: 'reflect',
    params: { subType: 'y=x', k: 0 },
  },
  {
    label: 'Refleksi Garis y = -x',
    type: 'reflect',
    params: { subType: 'y=-x', k: 0 },
  },
  {
    label: 'Dilatasi 2x (Origin)',
    type: 'scale',
    params: { sx: 2, sy: 2, xp: 0, yp: 0 },
  },
  {
    label: 'Dilatasi 1.5x @ Pivot (2,2)',
    type: 'scale',
    params: { sx: 1.5, sy: 1.5, xp: 2, yp: 2 },
  },
  {
    label: 'Shear Horiz (Shx = 1.5)',
    type: 'shear',
    params: { type: 'horizontal', shx: 1.5, shy: 0, yref: 0, xref: 0 },
  },
  {
    label: 'Shear Vert (Shy = 1.0)',
    type: 'shear',
    params: { type: 'vertical', shx: 0, shy: 1.0, yref: 0, xref: 0 },
  },
];

// ---------- MATRIX GENERATOR HELPER ----------

export function computeTransformationMatrix(type, params) {
  let M = identity3();
  let title = '';
  let formulaSymbolic = '';
  let decomposition = null;

  switch (type) {
    case 'translate': {
      const tx = params.tx || 0;
      const ty = params.ty || 0;
      M = createTranslationMatrix(tx, ty);
      title = `Translasi T(${fmt(tx)}, ${fmt(ty)})`;
      formulaSymbolic = `
        [ 1   0   tx ]   [ 1   0   ${fmt(tx)} ]
        [ 0   1   ty ] = [ 0   1   ${fmt(ty)} ]
        [ 0   0    1 ]   [ 0   0    1   ]
      `;
      break;
    }

    case 'rotate': {
      const deg = params.deg || 0;
      const xp = params.xp || 0;
      const yp = params.yp || 0;
      M = createRotationMatrix(deg, xp, yp);
      const rad = (deg * Math.PI) / 180;
      const c = cleanNumber(Math.cos(rad));
      const s = cleanNumber(Math.sin(rad));

      title = `Rotasi ${fmt(deg)}° ${xp !== 0 || yp !== 0 ? `terhadap Pivot (${fmt(xp)}, ${fmt(yp)})` : 'terhadap Origin (0,0)'}`;

      if (xp === 0 && yp === 0) {
        formulaSymbolic = `
          [ cos(θ)  -sin(θ)   0 ]   [ ${fmt(c)}  ${fmt(-s)}   0 ]
          [ sin(θ)   cos(θ)   0 ] = [ ${fmt(s)}   ${fmt(c)}   0 ]
          [   0        0      1 ]   [   0       0      1 ]
        `;
      } else {
        decomposition = {
          step1: { name: '1. Geser ke Asal T(-xp, -yp)', M: createTranslationMatrix(-xp, -yp) },
          step2: { name: '2. Rotasi R(θ) di Asal', M: createRotationMatrix(deg, 0, 0) },
          step3: { name: '3. Geser Balik T(xp, yp)', M: createTranslationMatrix(xp, yp) },
          note: `M = T(${fmt(xp)}, ${fmt(yp)}) × R(${fmt(deg)}°) × T(${fmt(-xp)}, ${fmt(-yp)})`,
        };
        formulaSymbolic = `
          [ cos(θ)  -sin(θ)   xp(1-cosθ) + yp·sinθ ]
          [ sin(θ)   cos(θ)   yp(1-cosθ) - xp·sinθ ]
          [   0        0              1            ]
        `;
      }
      break;
    }

    case 'scale': {
      const sx = params.sx !== undefined ? params.sx : 1;
      const sy = params.sy !== undefined ? params.sy : 1;
      const xp = params.xp || 0;
      const yp = params.yp || 0;
      M = createScalingMatrix(sx, sy, xp, yp);

      title = `Dilatasi / Skala (Sx=${fmt(sx)}, Sy=${fmt(sy)})${xp !== 0 || yp !== 0 ? ` @ Pivot (${fmt(xp)}, ${fmt(yp)})` : ' @ Origin'}`;

      if (xp === 0 && yp === 0) {
        formulaSymbolic = `
          [ Sx   0   0 ]   [ ${fmt(sx)}   0     0 ]
          [  0  Sy   0 ] = [  0    ${fmt(sy)}   0 ]
          [  0   0   1 ]   [  0     0    1 ]
        `;
      } else {
        decomposition = {
          step1: { name: '1. Geser ke Asal T(-xp, -yp)', M: createTranslationMatrix(-xp, -yp) },
          step2: { name: '2. Skala S(Sx, Sy) di Asal', M: createScalingMatrix(sx, sy, 0, 0) },
          step3: { name: '3. Geser Balik T(xp, yp)', M: createTranslationMatrix(xp, yp) },
          note: `M = T(${fmt(xp)}, ${fmt(yp)}) × S(${fmt(sx)}, ${fmt(sy)}) × T(${fmt(-xp)}, ${fmt(-yp)})`,
        };
        formulaSymbolic = `
          [ Sx   0   xp(1 - Sx) ]
          [  0  Sy   yp(1 - Sy) ]
          [  0   0       1      ]
        `;
      }
      break;
    }

    case 'reflect': {
      const subType = params.subType || 'x-axis';
      const k = params.k || 0;
      M = createReflectionMatrix(subType, k);

      const labels = {
        'x-axis': 'Refleksi terhadap Sumbu X (y = 0)',
        'y-axis': 'Refleksi terhadap Sumbu Y (x = 0)',
        'origin': 'Refleksi terhadap Titik Asal (0, 0)',
        'y=x': 'Refleksi terhadap Garis y = x',
        'y=-x': 'Refleksi terhadap Garis y = -x',
        'x=k': `Refleksi terhadap Garis Vertikal x = ${fmt(k)}`,
        'y=k': `Refleksi terhadap Garis Horizontal y = ${fmt(k)}`,
      };
      title = labels[subType] || 'Refleksi';

      if (subType === 'x=k' || subType === 'y=k') {
        const isX = subType === 'x=k';
        decomposition = {
          step1: { name: isX ? `1. Geser T(${-k}, 0)` : `1. Geser T(0, ${-k})`, M: isX ? createTranslationMatrix(-k, 0) : createTranslationMatrix(0, -k) },
          step2: { name: isX ? '2. Refleksi Sumbu Y' : '2. Refleksi Sumbu X', M: createReflectionMatrix(isX ? 'y-axis' : 'x-axis') },
          step3: { name: isX ? `3. Geser Balik T(${k}, 0)` : `3. Geser Balik T(0, ${k})`, M: isX ? createTranslationMatrix(k, 0) : createTranslationMatrix(0, k) },
          note: isX ? `M = T(${fmt(k)}, 0) × Refl_Y × T(${fmt(-k)}, 0)` : `M = T(0, ${fmt(k)}) × Refl_X × T(0, ${fmt(-k)})`,
        };
      }
      break;
    }

    case 'shear': {
      const shearType = params.type || 'horizontal';
      const shx = params.shx || 0;
      const shy = params.shy || 0;
      const yref = params.yref || 0;
      const xref = params.xref || 0;
      M = createShearMatrix(shearType, shx, shy, yref, xref);

      if (shearType === 'horizontal') {
        title = `Shear Horizontal (Shx = ${fmt(shx)}${yref !== 0 ? `, Garis Acuan y=${fmt(yref)}` : ''})`;
      } else if (shearType === 'vertical') {
        title = `Shear Vertikal (Shy = ${fmt(shy)}${xref !== 0 ? `, Garis Acuan x=${fmt(xref)}` : ''})`;
      } else {
        title = `Shear Simultan (Shx = ${fmt(shx)}, Shy = ${fmt(shy)})`;
      }
      break;
    }

    case 'composite': {
      // Komposisi 3 tahap fleksibel
      title = 'Komposisi Transformasi Beruntun';
      const t1 = params.step1 || { type: 'translate', tx: 3, ty: 2 };
      const t2 = params.step2 || { type: 'rotate', deg: 45, xp: 0, yp: 0 };
      const M1 = computeTransformationMatrix(t1.type, t1).matrix;
      const M2 = computeTransformationMatrix(t2.type, t2).matrix;
      M = multiply3(M2, M1);
      decomposition = {
        step1: { name: `Langkah 1: ${t1.type}`, M: M1 },
        step2: { name: `Langkah 2: ${t2.type}`, M: M2 },
        note: 'M_total = M2 × M1 (Transformasi pertama dikalikan di sebelah kanan)',
      };
      break;
    }
  }

  const det = determinant3(M);
  return {
    matrix: M,
    title,
    formulaSymbolic,
    decomposition,
    det,
    isAreaPreserved: Math.abs(Math.abs(det) - 1) < 1e-6,
    areaFactor: Math.abs(det),
    isOrientationReversed: det < -1e-6,
  };
}

// ---------- MANUAL CALCULATION BREAKDOWN ----------

/**
 * Generate manual step-by-step arithmetic for transforming each vertex
 */
export function generateManualCalculation(vertices, matrixInfo, type, params) {
  const M = matrixInfo.matrix;
  const results = [];

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    const pt = transformPoint(M, v.x, v.y);

    // Explicit multiplications
    // Row 0: x' = M00*x + M01*y + M02*1
    const xTerm0 = cleanNumber(M[0][0] * v.x);
    const xTerm1 = cleanNumber(M[0][1] * v.y);
    const xTerm2 = cleanNumber(M[0][2] * 1);
    const xSum = cleanNumber(xTerm0 + xTerm1 + xTerm2);

    // Row 1: y' = M10*x + M11*y + M12*1
    const yTerm0 = cleanNumber(M[1][0] * v.x);
    const yTerm1 = cleanNumber(M[1][1] * v.y);
    const yTerm2 = cleanNumber(M[1][2] * 1);
    const ySum = cleanNumber(yTerm0 + yTerm1 + yTerm2);

    // Row 2: w' = M20*x + M21*y + M22*1
    const wTerm0 = cleanNumber(M[2][0] * v.x);
    const wTerm1 = cleanNumber(M[2][1] * v.y);
    const wTerm2 = cleanNumber(M[2][2] * 1);
    const wSum = cleanNumber(wTerm0 + wTerm1 + wTerm2);

    // Alternative intuitive explanation (e.g. geometric rules)
    let intuitiveNote = '';
    if (type === 'translate') {
      intuitiveNote = `Aturan Translasi: x' = x + Tx = ${fmt(v.x)} + ${fmt(params.tx)} = ${fmt(pt.x)}, y' = y + Ty = ${fmt(v.y)} + ${fmt(params.ty)} = ${fmt(pt.y)}`;
    } else if (type === 'reflect') {
      const sub = params.subType;
      if (sub === 'x-axis') intuitiveNote = `Aturan Sumbu X: (x, y) → (x, -y) = (${fmt(v.x)}, ${fmt(-v.y)})`;
      else if (sub === 'y-axis') intuitiveNote = `Aturan Sumbu Y: (x, y) → (-x, y) = (${fmt(-v.x)}, ${fmt(v.y)})`;
      else if (sub === 'origin') intuitiveNote = `Aturan Titik Asal: (x, y) → (-x, -y) = (${fmt(-v.x)}, ${fmt(-v.y)})`;
      else if (sub === 'y=x') intuitiveNote = `Aturan Garis y=x: (x, y) → (y, x) = (${fmt(v.y)}, ${fmt(v.x)})`;
      else if (sub === 'y=-x') intuitiveNote = `Aturan Garis y=-x: (x, y) → (-y, -x) = (${fmt(-v.y)}, ${fmt(-v.x)})`;
      else if (sub === 'x=k') intuitiveNote = `Aturan Garis x=k: (x, y) → (2k - x, y) = (2(${fmt(params.k)}) - ${fmt(v.x)}, ${fmt(v.y)}) = (${fmt(2*params.k - v.x)}, ${fmt(v.y)})`;
      else if (sub === 'y=k') intuitiveNote = `Aturan Garis y=k: (x, y) → (x, 2k - y) = (${fmt(v.x)}, 2(${fmt(params.k)}) - ${fmt(v.y)}) = (${fmt(v.x)}, ${fmt(2*params.k - v.y)})`;
    } else if (type === 'rotate' && (params.xp !== 0 || params.yp !== 0)) {
      const xp = params.xp, yp = params.yp, deg = params.deg;
      const rad = (deg * Math.PI) / 180;
      const c = cleanNumber(Math.cos(rad));
      const s = cleanNumber(Math.sin(rad));
      const dx = v.x - xp;
      const dy = v.y - yp;
      const rx = cleanNumber(dx * c - dy * s);
      const ry = cleanNumber(dx * s + dy * c);
      intuitiveNote = `
        3 Langkah Pivot (${fmt(xp)}, ${fmt(yp)}):<br>
        1. Translasi ke Asal: Δx = ${fmt(v.x)} - ${fmt(xp)} = ${fmt(dx)}, Δy = ${fmt(v.y)} - ${fmt(yp)} = ${fmt(dy)}<br>
        2. Rotasi ${fmt(deg)}°: x'' = ${fmt(dx)}·(${fmt(c)}) - ${fmt(dy)}·(${fmt(s)}) = ${fmt(rx)}, y'' = ${fmt(dx)}·(${fmt(s)}) + ${fmt(dy)}·(${fmt(c)}) = ${fmt(ry)}<br>
        3. Translasi Balik: x' = ${fmt(rx)} + ${fmt(xp)} = ${fmt(pt.x)}, y' = ${fmt(ry)} + ${fmt(yp)} = ${fmt(pt.y)}
      `;
    } else if (type === 'scale' && (params.xp !== 0 || params.yp !== 0)) {
      const xp = params.xp, yp = params.yp, sx = params.sx, sy = params.sy;
      intuitiveNote = `
        3 Langkah Pivot (${fmt(xp)}, ${fmt(yp)}):<br>
        1. Translasi ke Asal: (${fmt(v.x)} - ${fmt(xp)}, ${fmt(v.y)} - ${fmt(yp)}) = (${fmt(v.x - xp)}, ${fmt(v.y - yp)})<br>
        2. Skala: (${fmt(v.x - xp)} · ${fmt(sx)}, ${fmt(v.y - yp)} · ${fmt(sy)}) = (${fmt((v.x - xp) * sx)}, ${fmt((v.y - yp) * sy)})<br>
        3. Translasi Balik: + (${fmt(xp)}, ${fmt(yp)}) = (${fmt(pt.x)}, ${fmt(pt.y)})
      `;
    }

    results.push({
      vertex: v,
      label: v.label || `P${i + 1}`,
      from: { x: v.x, y: v.y },
      to: { x: pt.x, y: pt.y, w: pt.w },
      delta: { dx: cleanNumber(pt.x - v.x), dy: cleanNumber(pt.y - v.y) },
      row0: {
        formula: `(${fmt(M[0][0])} × ${fmt(v.x)}) + (${fmt(M[0][1])} × ${fmt(v.y)}) + (${fmt(M[0][2])} × 1)`,
        terms: `${fmt(xTerm0)} + (${fmt(xTerm1)}) + (${fmt(xTerm2)})`,
        result: fmt(xSum),
      },
      row1: {
        formula: `(${fmt(M[1][0])} × ${fmt(v.x)}) + (${fmt(M[1][1])} × ${fmt(v.y)}) + (${fmt(M[1][2])} × 1)`,
        terms: `${fmt(yTerm0)} + (${fmt(yTerm1)}) + (${fmt(yTerm2)})`,
        result: fmt(ySum),
      },
      row2: {
        formula: `(${fmt(M[2][0])} × ${fmt(v.x)}) + (${fmt(M[2][1])} × ${fmt(v.y)}) + (${fmt(M[2][2])} × 1)`,
        terms: `${fmt(wTerm0)} + (${fmt(wTerm1)}) + (${fmt(wTerm2)})`,
        result: fmt(wSum),
      },
      intuitiveNote,
    });
  }

  return results;
}

// ---------- UI BUILDERS FOR COLUMN 2 & 3 ----------

/**
 * Render HTML for Column 2: Matrix & Geometric Theory
 */
export function buildMatrixPanelHtml(matrixInfo, type, params) {
  const M = matrixInfo.matrix;
  const det = matrixInfo.det;

  // Format matrix cells
  const mHtml = `
    <div class="matrix-3x3-container">
      <div class="matrix-bracket-left"></div>
      <div class="matrix-grid-3x3">
        <div class="m-cell ${M[0][0] !== 0 ? 'highlight-cell' : ''}">${fmt(M[0][0])}</div>
        <div class="m-cell ${M[0][1] !== 0 ? 'highlight-cell' : ''}">${fmt(M[0][1])}</div>
        <div class="m-cell ${M[0][2] !== 0 ? 'accent-cell' : ''}">${fmt(M[0][2])}</div>

        <div class="m-cell ${M[1][0] !== 0 ? 'highlight-cell' : ''}">${fmt(M[1][0])}</div>
        <div class="m-cell ${M[1][1] !== 0 ? 'highlight-cell' : ''}">${fmt(M[1][1])}</div>
        <div class="m-cell ${M[1][2] !== 0 ? 'accent-cell' : ''}">${fmt(M[1][2])}</div>

        <div class="m-cell dim-cell">${fmt(M[2][0])}</div>
        <div class="m-cell dim-cell">${fmt(M[2][1])}</div>
        <div class="m-cell dim-cell">${fmt(M[2][2])}</div>
      </div>
      <div class="matrix-bracket-right"></div>
    </div>
  `;

  // Pivot decomposition HTML if applicable
  let decompHtml = '';
  if (matrixInfo.decomposition) {
    const d = matrixInfo.decomposition;
    decompHtml = `
      <div class="matrix-decomp-box">
        <div class="decomp-title">🔗 Dekomposisi Matriks Komposit:</div>
        <div class="decomp-note">${d.note}</div>
        <div class="decomp-steps">
          <div class="decomp-step">
            <span class="step-badge">Step 1</span> ${d.step1.name}
          </div>
          <div class="decomp-step">
            <span class="step-badge">Step 2</span> ${d.step2.name}
          </div>
          ${d.step3 ? `
          <div class="decomp-step">
            <span class="step-badge">Step 3</span> ${d.step3.name}
          </div>` : ''}
        </div>
      </div>
    `;
  }

  // Geometric Analysis Card
  let orientText = 'Terjaga (Normal)';
  if (matrixInfo.isOrientationReversed) {
    orientText = '🔄 Terbalik (Kiralitas Berubah — Efek Cermin)';
  }

  let isometryText = 'Isometrik (Bentuk & Jarak Awet)';
  if (!matrixInfo.isAreaPreserved) {
    isometryText = `Non-Isometrik (Luas berubah ${fmt(matrixInfo.areaFactor)}×)`;
  }

  return `
    <div class="transform-theory-content">
      <!-- Title & Transformation Tag -->
      <div class="theory-hero">
        <h3 class="theory-title">${matrixInfo.title}</h3>
        <span class="theory-badge">Matriks Homogen 3×3</span>
      </div>

      <!-- Concrete Numerical Matrix 3x3 -->
      <div class="theory-section">
        <div class="section-label">Matriks Transformasi M:</div>
        ${mHtml}
      </div>

      <!-- Pivot / Composite Decomposition if present -->
      ${decompHtml}

      <!-- Why 3x3 Homogeneous Coordinates Card -->
      <div class="homogeneous-explainer">
        <div class="explainer-header">
          <span class="icon">💡</span> <strong>Mengapa Koordinat Homogen 3×3?</strong>
        </div>
        <div class="explainer-body">
          <p>
            Pada koordinat Kartesius 2D murni, translasi adalah <em>penjumlahan</em> vektor (x' = x + Tx), sedangkan rotasi/skala adalah <em>perkalian matriks</em>. Dua hal ini tidak dapat digabungkan secara langsung.
          </p>
          <p>
            Dengan menambahkan dimensi ke-3 skalar <strong>w = 1</strong> menjadi vektor <code>[x, y, 1]ᵀ</code>, <strong>semua transformasi afinitas</strong> (translasi, rotasi, skala, refleksi, shear) terpadu menjadi satu format baku <code>P' = M × P</code>. Komposisi transformasi beruntun dapat dihitung sekali di awal melalui <code>M_total = Mₙ × ... × M₂ × M₁</code>.
          </p>
        </div>
      </div>

      <!-- Geometric Invariants / Properties -->
      <div class="geometric-props">
        <div class="prop-item">
          <span class="prop-label">Determinan det(M):</span>
          <span class="prop-val ${det < 0 ? 'negative' : ''}">${fmt(det)}</span>
        </div>
        <div class="prop-item">
          <span class="prop-label">Orientasi / Winding:</span>
          <span class="prop-val">${orientText}</span>
        </div>
        <div class="prop-item">
          <span class="prop-label">Sifat Transformasi:</span>
          <span class="prop-val">${isometryText}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render HTML for Column 3: Step-by-Step Manual Calculation Breakdown
 */
export function buildCalculationPanelHtml(calculations, activeVertexIndex = null) {
  // 1. Coordinates Summary Table
  const tableRows = calculations
    .map((c, idx) => {
      const isActive = activeVertexIndex === idx;
      return `
        <tr class="calc-row ${isActive ? 'active-row' : ''}" data-vertex-idx="${idx}">
          <td><strong>${c.label}</strong></td>
          <td>(${fmt(c.from.x)}, ${fmt(c.from.y)})</td>
          <td>[${fmt(c.from.x)}, ${fmt(c.from.y)}, 1]ᵀ</td>
          <td class="res-coord">(${fmt(c.to.x)}, ${fmt(c.to.y)})</td>
          <td>Δ(${fmt(c.delta.dx, 1)}, ${fmt(c.delta.dy, 1)})</td>
        </tr>
      `;
    })
    .join('');

  const summaryTableHtml = `
    <div class="calc-summary-table-wrap">
      <div class="calc-section-title">📊 Rangkuman Koordinat:</div>
      <table class="calc-table">
        <thead>
          <tr>
            <th>Titik</th>
            <th>Asal (x, y)</th>
            <th>Homogen P</th>
            <th>Hasil (x', y')</th>
            <th>Δx, Δy</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  // 2. Vertex-by-Vertex Manual Calculation Cards
  const cardsHtml = calculations
    .map((c, idx) => {
      const isActive = activeVertexIndex === idx;
      return `
        <div class="calc-card ${isActive ? 'active-card' : ''}" id="calc-card-${idx}" data-vertex-idx="${idx}">
          <div class="calc-card-header">
            <span class="vertex-badge">Titik ${c.label}</span>
            <span class="coord-flow">
              (${fmt(c.from.x)}, ${fmt(c.from.y)}) &rarr; <strong class="glow-val">(${fmt(c.to.x)}, ${fmt(c.to.y)})</strong>
            </span>
          </div>

          <div class="calc-card-body">
            <!-- Matrix Homogeneous Vector Equation -->
            <div class="math-block">
              <span class="math-label">Bentuk Perkalian Matriks:</span>
              <div class="matrix-multi-visual">
                <span class="bracket-group">[ x' ]</span>
                <span class="math-op">=</span>
                <span class="bracket-group">[ M ]</span>
                <span class="math-op">×</span>
                <span class="bracket-group">[ ${fmt(c.from.x)}, ${fmt(c.from.y)}, 1 ]ᵀ</span>
              </div>
            </div>

            <!-- Row 1: x' calculation -->
            <div class="step-math-row">
              <div class="math-row-title">Langkah Baris 1 &rarr; x':</div>
              <div class="math-row-expr">x' = ${c.row0.formula}</div>
              <div class="math-row-sub">   = ${c.row0.terms}</div>
              <div class="math-row-res">   = <strong class="ans-num">${c.row0.result}</strong> (dibulatkan: ${Math.round(c.to.x)})</div>
            </div>

            <!-- Row 2: y' calculation -->
            <div class="step-math-row">
              <div class="math-row-title">Langkah Baris 2 &rarr; y':</div>
              <div class="math-row-expr">y' = ${c.row1.formula}</div>
              <div class="math-row-sub">   = ${c.row1.terms}</div>
              <div class="math-row-res">   = <strong class="ans-num">${c.row1.result}</strong> (dibulatkan: ${Math.round(c.to.y)})</div>
            </div>

            <!-- Row 3: w' calculation -->
            <div class="step-math-row dim">
              <div class="math-row-title">Langkah Baris 3 &rarr; w':</div>
              <div class="math-row-expr">w' = ${c.row2.formula} = ${c.row2.result}</div>
            </div>

            ${c.intuitiveNote ? `
              <div class="intuitive-note">
                <span class="note-icon">📝</span>
                <div class="note-text">${c.intuitiveNote}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="transform-calc-content">
      ${summaryTableHtml}
      <div class="calc-section-title" style="margin-top: 14px;">🧮 Runtutan Perhitungan Tiap Titik:</div>
      <div class="calc-cards-container">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// ---------- STEP-BY-STEP SIMULATOR GENERATOR ----------

/**
 * Generator that steps through the transformation:
 * Step 0: Original shape displayed
 * Step 1..N: Each vertex transformed, card highlighted, displacement vector drawn
 * Step N+1: Complete transformed polygon with connected edges & rasterized pixels
 */
export function* transformStepGenerator(vertices, matrixInfo, type, params) {
  const M = matrixInfo.matrix;
  const calcs = generateManualCalculation(vertices, matrixInfo, type, params);
  const n = vertices.length;

  // Step 0: Display initial state
  yield {
    stepIndex: 0,
    totalSteps: n + 1,
    activeVertexIndex: null,
    transformedVertices: [],
    description: `Objek awal ${vertices.map(v => v.label).join('-')} siap ditransformasi dengan ${matrixInfo.title}.`,
    isComplete: false,
    pixels: [],
  };

  // Step 1 to n: Transform each vertex
  const accumulated = [];
  for (let i = 0; i < n; i++) {
    const c = calcs[i];
    accumulated.push({
      label: c.label,
      x: c.to.x,
      y: c.to.y,
    });

    yield {
      stepIndex: i + 1,
      totalSteps: n + 1,
      activeVertexIndex: i,
      transformedVertices: [...accumulated],
      currentVertex: c,
      description: `Hitung Titik ${c.label} (${fmt(c.from.x)}, ${fmt(c.from.y)}) &rarr; (${fmt(c.to.x)}, ${fmt(c.to.y)}). Perkalian matriks selesai.`,
      isComplete: false,
      pixels: [{ x: Math.round(c.to.x), y: Math.round(c.to.y), color: '#ff3366' }],
    };
  }

  // Final Step: Connect edges and rasterize final shape pixels
  const allPixels = [];
  if (accumulated.length >= 2) {
    for (let i = 0; i < accumulated.length; i++) {
      const p1 = accumulated[i];
      const p2 = accumulated[(i + 1) % accumulated.length];
      if (accumulated.length === 2 && i === 1) break; // Don't close 2-point line

      const linePixels = computePixelsDDA(
        Math.round(p1.x),
        Math.round(p1.y),
        Math.round(p2.x),
        Math.round(p2.y)
      );
      for (const px of linePixels) {
        allPixels.push({ x: px.x, y: px.y, color: '#ff3366' });
      }
    }
  }

  yield {
    stepIndex: n + 1,
    totalSteps: n + 1,
    activeVertexIndex: null,
    transformedVertices: accumulated,
    description: `✅ Selesai! Semua ${n} titik telah ditransformasikan dan garis sisi telah dihubungkan.`,
    isComplete: true,
    pixels: allPixels,
  };
}

// ---------- CANVAS OVERLAY RENDERER ----------

/**
 * Custom overlay drawing function to render vector outlines,
 * labels, displacement vectors, reflection axis, and pivot points.
 */
export function drawTransformOverlay(ctx, cs, half, total, state) {
  if (!state || !state.originalVertices || state.originalVertices.length === 0) return;

  const orig = state.originalVertices;
  const trans = state.transformedVertices || [];
  const type = state.type;
  const params = state.params || {};
  const activeIdx = state.activeVertexIndex;
  const t = state.interpolationT !== undefined ? state.interpolationT : 1.0;

  // Helper to convert Cartesian (x, y) to canvas coordinates
  const toCanvas = (x, y) => ({
    cx: (x + half) * cs + cs / 2,
    cy: (half - y) * cs + cs / 2,
  });

  // 1. Draw Reflection Axis or Mirror Line (if reflection)
  if (type === 'reflect') {
    ctx.save();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    const sub = params.subType;
    if (sub === 'x-axis') {
      const y0 = half * cs + cs / 2;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(total, y0);
      ctx.stroke();
      drawOverlayLabel(ctx, 'Cermin: Sumbu X (y = 0)', total - 120, y0 - 8, '#ffaa00');
    } else if (sub === 'y-axis') {
      const x0 = half * cs + cs / 2;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, total);
      ctx.stroke();
      drawOverlayLabel(ctx, 'Cermin: Sumbu Y (x = 0)', x0 + 8, 20, '#ffaa00');
    } else if (sub === 'y=x') {
      const p1 = toCanvas(-half, -half);
      const p2 = toCanvas(half, half);
      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();
      drawOverlayLabel(ctx, 'Cermin: y = x', p2.cx - 70, p2.cy + 15, '#ffaa00');
    } else if (sub === 'y=-x') {
      const p1 = toCanvas(-half, half);
      const p2 = toCanvas(half, -half);
      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();
      drawOverlayLabel(ctx, 'Cermin: y = -x', p2.cx - 75, p2.cy - 10, '#ffaa00');
    } else if (sub === 'origin') {
      const o = toCanvas(0, 0);
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(o.cx, o.cy, 5, 0, Math.PI * 2);
      ctx.fill();
      drawOverlayLabel(ctx, 'Pusat Refleksi (0, 0)', o.cx + 8, o.cy - 8, '#ffaa00');
    } else if (sub === 'x=k') {
      const k = params.k || 0;
      const xk = toCanvas(k, 0).cx;
      ctx.beginPath();
      ctx.moveTo(xk, 0);
      ctx.lineTo(xk, total);
      ctx.stroke();
      drawOverlayLabel(ctx, `Cermin: x = ${fmt(k)}`, xk + 8, 24, '#ffaa00');
    } else if (sub === 'y=k') {
      const k = params.k || 0;
      const yk = toCanvas(0, k).cy;
      ctx.beginPath();
      ctx.moveTo(0, yk);
      ctx.lineTo(total, yk);
      ctx.stroke();
      drawOverlayLabel(ctx, `Cermin: y = ${fmt(k)}`, total - 120, yk - 8, '#ffaa00');
    }
    ctx.restore();
  }

  // 2. Draw Pivot Center (for rotation or scaling with custom pivot)
  if ((type === 'rotate' || type === 'scale') && (params.xp !== undefined || params.yp !== undefined)) {
    const xp = params.xp || 0;
    const yp = params.yp || 0;
    const p = toCanvas(xp, yp);

    ctx.save();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;

    // Crosshair target
    const r = 8;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, r, 0, Math.PI * 2);
    ctx.moveTo(p.cx - r - 4, p.cy);
    ctx.lineTo(p.cx + r + 4, p.cy);
    ctx.moveTo(p.cx, p.cy - r - 4);
    ctx.lineTo(p.cx, p.cy + r + 4);
    ctx.stroke();

    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, 3, 0, Math.PI * 2);
    ctx.fill();

    drawOverlayLabel(ctx, `Pivot (${fmt(xp)}, ${fmt(yp)})`, p.cx + 12, p.cy - 10, '#ffaa00');
    ctx.restore();
  }

  // 3. Draw Original Polygon (dashed cyan outline, translucent fill)
  if (orig.length >= 2) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = 'rgba(0, 255, 204, 0.06)';

    ctx.beginPath();
    const p0 = toCanvas(orig[0].x, orig[0].y);
    ctx.moveTo(p0.cx, p0.cy);
    for (let i = 1; i < orig.length; i++) {
      const pi = toCanvas(orig[i].x, orig[i].y);
      ctx.lineTo(pi.cx, pi.cy);
    }
    if (orig.length > 2) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  }

  // 4. Draw Original Vertex Dots and Labels
  orig.forEach((v, idx) => {
    const p = toCanvas(v.x, v.y);
    ctx.save();
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#070714';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawOverlayLabel(ctx, `${v.label || `P${idx + 1}`} (${fmt(v.x)}, ${fmt(v.y)})`, p.cx + 8, p.cy - 8, '#00ffcc');
    ctx.restore();
  });

  // 5. Draw Transformed Polygon & Displacement Vectors
  if (trans.length > 0) {
    // Displacement Vectors (arrows from original to transformed)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);

    trans.forEach((tv, idx) => {
      const ov = orig[idx];
      if (!ov) return;
      const p1 = toCanvas(ov.x, ov.y);
      // Interpolated position according to t
      const curX = ov.x + (tv.x - ov.x) * t;
      const curY = ov.y + (tv.y - ov.y) * t;
      const p2 = toCanvas(curX, curY);

      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();

      // Small arrowhead
      drawArrowHead(ctx, p1.cx, p1.cy, p2.cx, p2.cy, 6, '#ffaa00');
    });
    ctx.restore();

    // Transformed Shape Outline (glowing neon magenta)
    if (trans.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 51, 102, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255, 51, 102, 0.12)';

      ctx.beginPath();
      const p0 = toCanvas(
        orig[0].x + (trans[0].x - orig[0].x) * t,
        orig[0].y + (trans[0].y - orig[0].y) * t
      );
      ctx.moveTo(p0.cx, p0.cy);
      for (let i = 1; i < trans.length; i++) {
        const curX = orig[i].x + (trans[i].x - orig[i].x) * t;
        const curY = orig[i].y + (trans[i].y - orig[i].y) * t;
        const pi = toCanvas(curX, curY);
        ctx.lineTo(pi.cx, pi.cy);
      }
      if (trans.length > 2 && (state.isComplete || trans.length === orig.length)) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();
    }

    // Transformed Vertex Dots and Labels
    trans.forEach((tv, idx) => {
      const ov = orig[idx];
      const curX = ov ? ov.x + (tv.x - ov.x) * t : tv.x;
      const curY = ov ? ov.y + (tv.y - ov.y) * t : tv.y;
      const p = toCanvas(curX, curY);
      const isHighlighted = activeIdx === idx;

      ctx.save();
      ctx.fillStyle = isHighlighted ? '#ffff00' : '#ff3366';
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = isHighlighted ? 12 : 6;
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, isHighlighted ? 6.5 : 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const label = `${tv.label || `P${idx + 1}`}' (${fmt(tv.x)}, ${fmt(tv.y)})`;
      drawOverlayLabel(ctx, label, p.cx + 8, p.cy + 14, isHighlighted ? '#ffff00' : '#ff3366');
      ctx.restore();
    });
  }
}

function drawOverlayLabel(ctx, text, x, y, color = '#ffffff') {
  ctx.save();
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(7, 7, 20, 0.75)';
  const width = ctx.measureText(text).width;
  ctx.fillRect(x - 2, y - 9, width + 4, 12);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawArrowHead(ctx, fromX, fromY, toX, toY, size, color) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist < size) return;

  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
