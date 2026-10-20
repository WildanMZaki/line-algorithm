// ============================================================
// main.js — Application Initializer & Event Wiring
// ============================================================

import { Grid } from './grid.js';
import { CodeView } from './codeview.js';
import { Tracer } from './tracer.js';
import { Simulator } from './simulator.js';
import {
  DDA_CODE, BRESENHAM_CODE,
  DDA_COLUMNS, BRESENHAM_COLUMNS,
  PRESETS, getLineInfo,
  lineDDA, lineBresenham,
} from './algorithms.js';
import {
  SHAPES, SHAPE_LIST, SHAPE_TRACE_COLUMNS,
  shapeGenerator, computePixelsDDA, computePixelsBresenham,
} from './shapes.js';
import {
  CURVES, CURVE_LIST, OCTANT_COLORS, QUADRANT_COLORS,
} from './curves.js';
import {
  TRANSFORM_OBJECTS, TRANSFORM_PRESETS,
  computeTransformationMatrix, generateManualCalculation,
  buildMatrixPanelHtml, buildCalculationPanelHtml,
  transformStepGenerator, drawTransformOverlay, fmt, cleanNumber,
} from './transform.js';
import { animationManager } from './animations.js';

// ---------- SINGLETON INSTANCES ----------
const grid = new Grid();
const codeView = new CodeView();
const tracer = new Tracer();
const simulator = new Simulator();

// ---------- STATE ----------
let currentTab = 'line';    // 'line' | 'shapes' | 'curves' | 'transform' | 'animations'
let currentShape = 'persegi';
let currentCurve = 'circle';
let currentTransformType = 'translate';
let currentTransformObj = 'triangle';
let customCoords = '2,2; 8,2; 5,7';
let transformState = {
  originalVertices: [],
  transformedVertices: [],
  activeVertexIndex: null,
  isComplete: false,
  type: 'translate',
  params: { tx: 6, ty: 4 },
  interpolationT: 1.0,
};

// ---------- DOM REFERENCES ----------
let els = {};

// ---------- INITIALIZATION ----------
document.addEventListener('DOMContentLoaded', () => {
  // Grab all DOM elements
  els = {
    // Tab
    tabBtns:          document.querySelectorAll('.tab-btn'),
    lineControls:     document.getElementById('line-controls'),
    shapesControls:   document.getElementById('shapes-controls'),
    curvesControls:   document.getElementById('curves-controls'),
    transformControls: document.getElementById('transform-controls'),
    animationsControls: document.getElementById('animations-controls'),

    // Line Controls
    algoSelect:       document.getElementById('algo-select'),
    inputX1:          document.getElementById('input-x1'),
    inputY1:          document.getElementById('input-y1'),
    inputX2:          document.getElementById('input-x2'),
    inputY2:          document.getElementById('input-y2'),
    presetContainer:  document.getElementById('preset-container'),

    // Shapes Controls
    shapeAlgoSelect:  document.getElementById('shape-algo-select'),
    shapeParamsBar:   document.getElementById('shape-params-bar'),
    shapeSelectorBar: document.getElementById('shape-selector-bar'),

    // Curves Controls
    curveParamsBar:   document.getElementById('curve-params-bar'),
    curveSelectorBar: document.getElementById('curve-selector-bar'),
    symmetryLegend:   document.getElementById('symmetry-legend-container'),

    // Transform Controls
    transformTypeSelect:      document.getElementById('transform-type-select'),
    transformObjSelect:       document.getElementById('transform-obj-select'),
    transformParamsContainer: document.getElementById('transform-params-container'),
    transformPresetContainer: document.getElementById('transform-preset-container'),
    transformMatrixPanel:     document.getElementById('transform-matrix-panel'),
    transformCalcPanel:       document.getElementById('transform-calc-panel'),
    transformAnimGroup:       document.getElementById('transform-anim-group'),
    transformTSlider:         document.getElementById('transform-t-slider'),
    transformTLabel:          document.getElementById('transform-t-label'),

    // Animations Controls & Sidebar
    animSidebar:        document.getElementById('anim-sidebar'),
    animCodeContainer:  document.getElementById('anim-code-container'),
    animInspectorPanel: document.getElementById('anim-inspector-panel'),

    // Shared Controls
    gridSizeSelect:   document.getElementById('grid-size-select'),

    // Playback
    btnPlay:          document.getElementById('btn-play'),
    btnStep:          document.getElementById('btn-step'),
    btnReset:         document.getElementById('btn-reset'),
    speedSlider:      document.getElementById('speed-slider'),
    speedLabel:       document.getElementById('speed-label'),
    stepCounter:      document.getElementById('step-counter'),

    // Info bar
    infoBar:          document.getElementById('info-bar'),

    // Grid
    gridCanvas:       document.getElementById('grid-canvas'),
    hoverCoord:       document.getElementById('hover-coord'),

    // Code & Trace
    codeContainer:    document.getElementById('code-container'),
    stepDescription:  document.getElementById('step-description'),
    traceHead:        document.getElementById('trace-head'),
    traceBody:        document.getElementById('trace-body'),
    traceScroll:      document.getElementById('trace-scroll'),

    // Panel titles & icons
    codePanelIcon:    document.getElementById('code-panel-icon'),
    codePanelTitle:   document.getElementById('code-panel-title'),
    tracePanelIcon:   document.getElementById('trace-panel-icon'),
    tracePanelTitle:  document.getElementById('trace-panel-title'),
  };

  // Initialize modules
  const gridHalf = parseInt(els.gridSizeSelect.value) || 32;
  grid.init(els.gridCanvas, gridHalf);
  codeView.init(els.codeContainer);
  tracer.init(els.traceHead, els.traceBody, els.traceScroll);
  simulator.init(grid, codeView, tracer, els.stepDescription, els.stepCounter);
  animationManager.init(grid, {
    animSidebar: els.animSidebar,
    animCodeContainer: els.animCodeContainer,
    animInspectorPanel: els.animInspectorPanel,
    infoBar: els.infoBar,
  });

  // Setup transform-specific step listener
  simulator.onStep((data) => {
    if (currentTab === 'transform') {
      transformState.activeVertexIndex = data.activeVertexIndex;
      transformState.transformedVertices = data.transformedVertices || [];
      transformState.isComplete = data.isComplete;
      grid.render();

      // Highlight active card
      const cards = els.transformCalcPanel.querySelectorAll('.calc-card');
      cards.forEach(c => c.classList.remove('active-card'));
      if (data.activeVertexIndex !== null && data.activeVertexIndex !== undefined) {
        const activeCard = document.getElementById(`calc-card-${data.activeVertexIndex}`);
        if (activeCard) {
          activeCard.classList.add('active-card');
          activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      // Highlight active table row
      const rows = els.transformCalcPanel.querySelectorAll('.calc-row');
      rows.forEach(r => r.classList.remove('active-row'));
      if (data.activeVertexIndex !== null && data.activeVertexIndex !== undefined) {
        const activeRow = els.transformCalcPanel.querySelector(`.calc-row[data-vertex-idx="${data.activeVertexIndex}"]`);
        if (activeRow) activeRow.classList.add('active-row');
      }
    }
  });

  // Setup event listeners
  setupTabs();
  setupPresets();
  setupControls();
  setupShapeSelector();
  setupCurveSelector();
  setupTransform();
  setupAnimationsSidebar();
  setupPlayback();
  setupGridHover();
  setupResizeHandler();

  // Load initial simulation state
  loadSimulation();
});

// ============================================================
//  TAB SWITCHING
// ============================================================

function setupTabs() {
  els.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === currentTab) return;

      currentTab = tab;
      simulator.stop();

      // Pause animation loop if leaving animations tab
      if (tab !== 'animations') {
        animationManager.pause();
      }

      // Update tab button active states
      els.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

      // Show/hide header controls
      els.lineControls.classList.toggle('hidden', tab !== 'line');
      els.shapesControls.classList.toggle('hidden', tab !== 'shapes');
      els.curvesControls.classList.toggle('hidden', tab !== 'curves');
      els.transformControls.classList.toggle('hidden', tab !== 'transform');
      els.animationsControls.classList.toggle('hidden', tab !== 'animations');

      // Show/hide animations sidebar
      els.animSidebar.classList.toggle('hidden', tab !== 'animations');

      // Show/hide shape-specific panel elements
      els.shapeParamsBar.classList.toggle('hidden', tab !== 'shapes');
      els.shapeSelectorBar.classList.toggle('hidden', tab !== 'shapes');

      // Show/hide curve-specific panel elements
      els.curveParamsBar.classList.toggle('hidden', tab !== 'curves');
      els.curveSelectorBar.classList.toggle('hidden', tab !== 'curves');

      // Show/hide transform specific panel elements
      els.codeContainer.classList.toggle('hidden', tab === 'transform' || tab === 'animations');
      els.transformMatrixPanel.classList.toggle('hidden', tab !== 'transform');
      els.animCodeContainer.classList.toggle('hidden', tab !== 'animations');

      els.traceScroll.classList.toggle('hidden', tab === 'transform' || tab === 'animations');
      els.transformCalcPanel.classList.toggle('hidden', tab !== 'transform');
      els.animInspectorPanel.classList.toggle('hidden', tab !== 'animations');
      els.transformAnimGroup.classList.toggle('hidden', tab !== 'transform');

      // Clear overlay if not transform or animations
      if (tab !== 'transform' && tab !== 'animations') {
        grid.setOverlay(null);
      }

      // Update panel header labels
      if (tab === 'shapes') {
        if (els.codePanelIcon) els.codePanelIcon.textContent = '📝';
        els.codePanelTitle.textContent = 'Shape Code (C#)';
        if (els.tracePanelIcon) els.tracePanelIcon.textContent = '📊';
        els.tracePanelTitle.textContent = 'Shape Trace';
      } else if (tab === 'curves') {
        if (els.codePanelIcon) els.codePanelIcon.textContent = '📝';
        els.codePanelTitle.textContent = 'Curve Code (C#)';
        if (els.tracePanelIcon) els.tracePanelIcon.textContent = '📊';
        els.tracePanelTitle.textContent = 'Curve Trace';
      } else if (tab === 'transform') {
        if (els.codePanelIcon) els.codePanelIcon.textContent = '📐';
        els.codePanelTitle.textContent = 'Matriks Homogen 3×3 & Teori';
        if (els.tracePanelIcon) els.tracePanelIcon.textContent = '🧮';
        els.tracePanelTitle.textContent = 'Runtutan Perhitungan Manual';
      } else if (tab === 'animations') {
        if (els.codePanelIcon) els.codePanelIcon.textContent = '📝';
        els.codePanelTitle.textContent = 'Codebase & Algoritma';
        if (els.tracePanelIcon) els.tracePanelIcon.textContent = '📊';
        els.tracePanelTitle.textContent = 'Live Inspector & Kontrol';
      } else {
        if (els.codePanelIcon) els.codePanelIcon.textContent = '📝';
        els.codePanelTitle.textContent = 'Algorithm Code (C#)';
        if (els.tracePanelIcon) els.tracePanelIcon.textContent = '📊';
        els.tracePanelTitle.textContent = 'Tracing Table';
      }

      // Load the appropriate simulation
      loadCurrentSimulation();

      // If switched to animations, start running animation
      if (tab === 'animations') {
        animationManager.play();
        updatePlaybackUI({ playing: true, finished: false });
      }
    });
  });
}

function setupAnimationsSidebar() {
  if (!els.animSidebar) return;
  els.animSidebar.querySelectorAll('.anim-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const animKey = btn.dataset.anim;
      animationManager.switchAnimation(animKey);
    });
  });
}

// ============================================================
//  PRESETS (Line mode only)
// ============================================================

function setupPresets() {
  PRESETS.forEach((preset) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.title = `(${preset.x1}, ${preset.y1}) → (${preset.x2}, ${preset.y2})`;
    btn.addEventListener('click', () => {
      els.inputX1.value = preset.x1;
      els.inputY1.value = preset.y1;
      els.inputX2.value = preset.x2;
      els.inputY2.value = preset.y2;
      loadSimulation();
    });
    els.presetContainer.appendChild(btn);
  });
}

// ============================================================
//  CONTROLS
// ============================================================

function setupControls() {
  // Algorithm change (line mode)
  els.algoSelect.addEventListener('change', () => {
    loadSimulation();
  });

  // Coordinate inputs — update simulation dynamically as user modifies numbers
  [els.inputX1, els.inputY1, els.inputX2, els.inputY2].forEach(input => {
    input.addEventListener('input', () => {
      loadSimulation();
    });
    input.addEventListener('change', () => {
      loadSimulation();
    });
  });

  // Grid size change (shared between tabs)
  els.gridSizeSelect.addEventListener('change', () => {
    const half = parseInt(els.gridSizeSelect.value) || 32;
    grid.setGridHalf(half);
    loadCurrentSimulation();
  });

  // Speed slider
  els.speedSlider.addEventListener('input', () => {
    const val = parseInt(els.speedSlider.value);
    // Slider 1 (slow) to 100 (fast)
    // Map to ms: 1 → 2000ms, 100 → 30ms (exponential)
    const ms = Math.round(2000 * Math.pow(0.955, val));
    simulator.setSpeed(ms);
    els.speedLabel.textContent = `${ms}ms`;
  });

  // Initialize speed
  els.speedSlider.dispatchEvent(new Event('input'));

  // Shape algorithm change
  els.shapeAlgoSelect.addEventListener('change', () => {
    if (currentTab === 'shapes') loadShapeSimulation();
  });
}

// ============================================================
//  SHAPE SELECTOR & PARAMS
// ============================================================

function setupShapeSelector() {
  SHAPE_LIST.forEach((shape, idx) => {
    const btn = document.createElement('button');
    btn.className = 'shape-btn' + (idx === 0 ? ' active' : '');
    btn.dataset.shape = shape.key;
    btn.textContent = `${shape.icon} ${shape.name}`;
    btn.addEventListener('click', () => {
      // Update active state
      els.shapeSelectorBar.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentShape = shape.key;
      buildShapeParams(shape.key);
      loadShapeSimulation();
    });
    els.shapeSelectorBar.appendChild(btn);
  });

  // Initialize first shape's params
  buildShapeParams('persegi');
}

/** Build parameter input fields for the selected shape */
function buildShapeParams(shapeKey) {
  const shape = SHAPES[shapeKey];
  els.shapeParamsBar.innerHTML = '';

  shape.params.forEach(param => {
    const group = document.createElement('div');
    group.className = 'param-group';

    const label = document.createElement('label');
    label.textContent = param.label + ':';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'coord-input shape-param';
    input.dataset.key = param.key;
    input.value = param.default;
    if (param.min !== undefined) input.min = param.min;

    input.addEventListener('input', () => loadShapeSimulation());
    input.addEventListener('change', () => loadShapeSimulation());

    group.appendChild(label);
    group.appendChild(input);
    els.shapeParamsBar.appendChild(group);
  });
}

// ============================================================
//  CURVE SELECTOR & PARAMS
// ============================================================

function setupCurveSelector() {
  CURVE_LIST.forEach((curve, idx) => {
    const btn = document.createElement('button');
    btn.className = 'curve-btn' + (idx === 0 ? ' active' : '');
    btn.dataset.curve = curve.key;
    btn.textContent = `${curve.icon} ${curve.name}`;
    btn.addEventListener('click', () => {
      // Update active state
      els.curveSelectorBar.querySelectorAll('.curve-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentCurve = curve.key;
      buildCurveParams(curve.key);
      buildSymmetryLegend(curve.key);
      loadCurveSimulation();
    });
    els.curveSelectorBar.appendChild(btn);
  });

  // Initialize first curve params and legend
  buildCurveParams('circle');
  buildSymmetryLegend('circle');
}

/** Build parameter input fields for the selected curve */
function buildCurveParams(curveKey) {
  const curve = CURVES[curveKey];
  els.curveParamsBar.innerHTML = '';

  curve.params.forEach(param => {
    const group = document.createElement('div');
    group.className = 'param-group';

    const label = document.createElement('label');
    label.textContent = param.label + ':';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'coord-input curve-param';
    input.dataset.key = param.key;
    input.value = param.default;
    if (param.min !== undefined) input.min = param.min;

    input.addEventListener('input', () => {
      if (currentTab === 'curves') loadCurveSimulation();
    });
    input.addEventListener('change', () => {
      if (currentTab === 'curves') loadCurveSimulation();
    });

    group.appendChild(label);
    group.appendChild(input);
    els.curveParamsBar.appendChild(group);
  });
}

/** Build the symmetry legend chips (8 octants or 4 quadrants) */
function buildSymmetryLegend(curveKey) {
  if (!els.symmetryLegend) return;
  els.symmetryLegend.innerHTML = '';

  if (curveKey === 'circle') {
    const octNames = [
      'Oktan 1 (0°–45°, Primer)',
      'Oktan 2 (45°–90°)',
      'Oktan 3 (90°–135°)',
      'Oktan 4 (135°–180°)',
      'Oktan 5 (180°–225°)',
      'Oktan 6 (225°–270°)',
      'Oktan 7 (270°–315°)',
      'Oktan 8 (315°–360°)',
    ];
    octNames.forEach((name, i) => {
      const chip = document.createElement('span');
      chip.className = 'symmetry-chip';
      chip.innerHTML = `<span class="chip-dot" style="background:${OCTANT_COLORS[i]};"></span>${name}`;
      els.symmetryLegend.appendChild(chip);
    });
  } else {
    const qNames = [
      'Kuadran 1 (+x, +y)',
      'Kuadran 2 (-x, +y)',
      'Kuadran 3 (-x, -y)',
      'Kuadran 4 (+x, -y)',
    ];
    qNames.forEach((name, i) => {
      const chip = document.createElement('span');
      chip.className = 'symmetry-chip';
      chip.innerHTML = `<span class="chip-dot" style="background:${QUADRANT_COLORS[i]};"></span>${name}`;
      els.symmetryLegend.appendChild(chip);
    });
  }
}

// ============================================================
//  PLAYBACK
// ============================================================

function setupPlayback() {
  els.btnPlay.addEventListener('click', () => {
    if (currentTab === 'animations') {
      animationManager.togglePlay();
      updatePlaybackUI({ playing: animationManager.running, finished: false });
      return;
    }
    if (simulator.isFinished()) return;
    if (!simulator.generator) {
      loadCurrentSimulation();
    }
    simulator.togglePlay();
  });

  els.btnStep.addEventListener('click', () => {
    if (currentTab === 'animations') {
      animationManager.step();
      updatePlaybackUI({ playing: false, finished: false });
      return;
    }
    if (simulator.isFinished()) return;
    if (!simulator.generator) {
      loadCurrentSimulation();
    }
    simulator.pause();
    simulator.step();
  });

  els.btnReset.addEventListener('click', () => {
    if (currentTab === 'animations') {
      animationManager.reset();
      updatePlaybackUI({ playing: false, finished: false });
      return;
    }
    loadCurrentSimulation();
  });

  // State change callback
  simulator.onStateChange((state) => {
    if (currentTab !== 'animations') {
      updatePlaybackUI(state);
    }
  });
}

// ============================================================
//  SIMULATION LOADERS
// ============================================================

/** Route to the correct loader based on active tab */
function loadCurrentSimulation() {
  if (currentTab === 'shapes') {
    loadShapeSimulation();
  } else if (currentTab === 'curves') {
    loadCurveSimulation();
  } else if (currentTab === 'transform') {
    loadTransformSimulation();
  } else if (currentTab === 'animations') {
    animationManager.switchAnimation(animationManager.currentKey);
  } else {
    loadSimulation();
  }
}

/** Load (or reload) line algorithm simulation with current inputs */
function loadSimulation() {
  const algo = els.algoSelect.value;
  const rawX1 = (els.inputX1.value || '').trim();
  const rawY1 = (els.inputY1.value || '').trim();
  const rawX2 = (els.inputX2.value || '').trim();
  const rawY2 = (els.inputY2.value || '').trim();

  // Avoid premature recalculation if user is currently typing a sign or empty
  if (rawX1 === '' || rawX1 === '-' ||
      rawY1 === '' || rawY1 === '-' ||
      rawX2 === '' || rawX2 === '-' ||
      rawY2 === '' || rawY2 === '-') {
    return;
  }

  const x1 = parseInt(rawX1, 10);
  const y1 = parseInt(rawY1, 10);
  const x2 = parseInt(rawX2, 10);
  const y2 = parseInt(rawY2, 10);

  if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;

  const gen = algo === 'dda' ? lineDDA(x1, y1, x2, y2) : lineBresenham(x1, y1, x2, y2);
  const code = algo === 'dda' ? DDA_CODE : BRESENHAM_CODE;
  const cols = algo === 'dda' ? DDA_COLUMNS : BRESENHAM_COLUMNS;

  simulator.load(gen, code, cols, x1, y1, x2, y2);
  updateInfoBar(x1, y1, x2, y2);
  updatePlaybackUI({ playing: false, finished: false });
}

/** Load shape simulation with current shape and params */
function loadShapeSimulation() {
  const shape = SHAPES[currentShape];
  if (!shape) return;

  // Gather parameter values from inputs
  const params = {};
  const inputs = els.shapeParamsBar.querySelectorAll('.shape-param');
  for (const input of inputs) {
    const val = input.value.trim();
    if (val === '' || val === '-') return; // still typing
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    params[input.dataset.key] = num;
  }

  const algo = els.shapeAlgoSelect.value;
  const gen = shapeGenerator(currentShape, params, algo);

  // Load into simulator without endpoints (shapes don't need ideal line / start-end markers)
  simulator.load(gen, shape.code, SHAPE_TRACE_COLUMNS);
  updateShapeInfoBar(shape, params, algo);
  updatePlaybackUI({ playing: false, finished: false });
}

/** Load curve simulation with current curve and params */
function loadCurveSimulation() {
  const curve = CURVES[currentCurve];
  if (!curve) return;

  // Gather parameter values from inputs
  const params = {};
  const inputs = els.curveParamsBar.querySelectorAll('.curve-param');
  for (const input of inputs) {
    const val = input.value.trim();
    if (val === '' || val === '-') return; // still typing
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    params[input.dataset.key] = num;
  }

  const gen = curve.createGenerator(params);
  simulator.load(gen, curve.code, curve.columns);
  els.infoBar.innerHTML = curve.getInfoHtml(params);
  updatePlaybackUI({ playing: false, finished: false });
}

// ============================================================
//  INFO BAR
// ============================================================

/** Update info bar for line algorithm mode */
function updateInfoBar(x1, y1, x2, y2) {
  if (x1 === undefined) {
    els.infoBar.innerHTML = '<span class="info-hint">Masukkan koordinat lalu tekan Play/Step atau pilih preset.</span>';
    return;
  }

  const info = getLineInfo(x1, y1, x2, y2);
  els.infoBar.innerHTML = `
    <span class="info-item"><strong>Persamaan:</strong> ${info.equation}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>m:</strong> ${info.m}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>Δx:</strong> ${info.dx}  <strong>Δy:</strong> ${info.dy}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>Pengendali:</strong> ${info.dominant}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>Total Steps:</strong> ${info.steps}</span>
  `;
}

/** Update info bar for shapes mode */
function updateShapeInfoBar(shape, params, algo) {
  const lines = shape.getLines(params);
  const algoName = algo === 'bresenham' ? 'Bresenham' : 'DDA';
  const computeFn = algo === 'bresenham' ? computePixelsBresenham : computePixelsDDA;
  const totalPixels = lines.reduce((sum, l) => sum + computeFn(l.x1, l.y1, l.x2, l.y2).length, 0);
  const paramStr = shape.params.map(p => `<strong>${p.label}:</strong> ${params[p.key]}`).join('  ');

  els.infoBar.innerHTML = `
    <span class="info-item"><strong>Shape:</strong> ${shape.icon} ${shape.name}</span>
    <span class="info-sep">|</span>
    <span class="info-item">${paramStr}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>DrawLine:</strong> ${lines.length}x</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>Total Pixel:</strong> ${totalPixels}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>via:</strong> ${algoName}</span>
  `;
}

// ============================================================
//  PLAYBACK UI
// ============================================================

/** Update playback button states */
function updatePlaybackUI(state) {
  if (state.playing) {
    els.btnPlay.textContent = '⏸ Pause';
    els.btnPlay.classList.add('playing');
  } else {
    els.btnPlay.textContent = '▶ Play';
    els.btnPlay.classList.remove('playing');
  }

  if (state.finished) {
    els.btnPlay.disabled = true;
    els.btnStep.disabled = true;
  } else {
    els.btnPlay.disabled = false;
    els.btnStep.disabled = false;
  }
}

// ============================================================
//  GRID HOVER
// ============================================================

function setupGridHover() {
  grid.onHover((x, y) => {
    els.hoverCoord.textContent = `(${x}, ${y})`;
  });

  els.gridCanvas.addEventListener('mouseleave', () => {
    els.hoverCoord.textContent = '—';
  });
}

// ============================================================
//  RESIZE
// ============================================================

function setupResizeHandler() {
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      grid.resize();
    }, 150);
  });
}

// ============================================================
//  TRANSFORMATION MODE
// ============================================================

function setupTransform() {
  if (!els.transformTypeSelect) return;

  // Transform type selection change
  els.transformTypeSelect.addEventListener('change', () => {
    currentTransformType = els.transformTypeSelect.value;
    buildTransformParamsInputs();
    if (currentTab === 'transform') loadTransformSimulation();
  });

  // Object selection change
  els.transformObjSelect.addEventListener('change', () => {
    currentTransformObj = els.transformObjSelect.value;
    buildTransformParamsInputs();
    if (currentTab === 'transform') loadTransformSimulation();
  });

  // Transition slider (t: 0% to 100%)
  if (els.transformTSlider) {
    els.transformTSlider.addEventListener('input', () => {
      const val = parseInt(els.transformTSlider.value, 10);
      els.transformTLabel.textContent = `${val}%`;
      transformState.interpolationT = val / 100;
      grid.render();
    });
  }

  // Interactive clicking on calculation cards or table rows
  if (els.transformCalcPanel) {
    els.transformCalcPanel.addEventListener('click', (e) => {
      const target = e.target.closest('[data-vertex-idx]');
      if (!target) return;
      const vIdx = parseInt(target.dataset.vertexIdx, 10);
      if (isNaN(vIdx)) return;

      transformState.activeVertexIndex = vIdx;
      grid.render();

      // Update active card
      const cards = els.transformCalcPanel.querySelectorAll('.calc-card');
      cards.forEach(c => c.classList.remove('active-card'));
      const card = document.getElementById(`calc-card-${vIdx}`);
      if (card) {
        card.classList.add('active-card');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Update active row
      const rows = els.transformCalcPanel.querySelectorAll('.calc-row');
      rows.forEach(r => r.classList.remove('active-row'));
      const row = els.transformCalcPanel.querySelector(`.calc-row[data-vertex-idx="${vIdx}"]`);
      if (row) row.classList.add('active-row');
    });
  }

  // Setup Presets
  setupTransformPresets();

  // Initial params setup
  buildTransformParamsInputs();
}

function setupTransformPresets() {
  if (!els.transformPresetContainer) return;
  els.transformPresetContainer.innerHTML = '<label>Preset:</label>';

  TRANSFORM_PRESETS.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
      currentTransformType = preset.type;
      els.transformTypeSelect.value = preset.type;
      buildTransformParamsInputs(preset.params);
      if (currentTab === 'transform') loadTransformSimulation();
    });
    els.transformPresetContainer.appendChild(btn);
  });
}

function buildTransformParamsInputs(overrideParams = null) {
  if (!els.transformParamsContainer) return;
  els.transformParamsContainer.innerHTML = '';

  const type = currentTransformType;

  // Custom coordinates input if object is 'custom'
  if (currentTransformObj === 'custom') {
    const grp = document.createElement('div');
    grp.className = 'transform-param-group';
    grp.innerHTML = `
      <label>Koordinat (x,y; ...):</label>
      <input type="text" class="custom-coords-input" id="custom-coords-input" value="${customCoords}" placeholder="e.g. 2,2; 8,2; 5,7">
    `;
    const input = grp.querySelector('#custom-coords-input');
    input.addEventListener('change', () => {
      customCoords = input.value;
      if (currentTab === 'transform') loadTransformSimulation();
    });
    input.addEventListener('input', () => {
      customCoords = input.value;
      if (currentTab === 'transform') loadTransformSimulation();
    });
    els.transformParamsContainer.appendChild(grp);
  }

  if (type === 'translate') {
    const tx = overrideParams && overrideParams.tx !== undefined ? overrideParams.tx : 6;
    const ty = overrideParams && overrideParams.ty !== undefined ? overrideParams.ty : 4;
    const grp = document.createElement('div');
    grp.className = 'transform-param-group';
    grp.innerHTML = `
      <label>Tx:</label>
      <input type="number" id="input-tx" class="coord-input" value="${tx}">
      <label>Ty:</label>
      <input type="number" id="input-ty" class="coord-input" value="${ty}">
    `;
    bindInputEvents(grp);
    els.transformParamsContainer.appendChild(grp);
  } else if (type === 'reflect') {
    const sub = overrideParams && overrideParams.subType ? overrideParams.subType : 'x-axis';
    const k = overrideParams && overrideParams.k !== undefined ? overrideParams.k : 4;

    const grp = document.createElement('div');
    grp.className = 'transform-param-group';
    grp.innerHTML = `
      <label>Cermin:</label>
      <select id="reflect-sub-select">
        <option value="x-axis" ${sub === 'x-axis' ? 'selected' : ''}>Sumbu X (y = 0)</option>
        <option value="y-axis" ${sub === 'y-axis' ? 'selected' : ''}>Sumbu Y (x = 0)</option>
        <option value="origin" ${sub === 'origin' ? 'selected' : ''}>Titik Asal (0, 0)</option>
        <option value="y=x" ${sub === 'y=x' ? 'selected' : ''}>Garis y = x</option>
        <option value="y=-x" ${sub === 'y=-x' ? 'selected' : ''}>Garis y = -x</option>
        <option value="x=k" ${sub === 'x=k' ? 'selected' : ''}>Garis Vertikal x = k</option>
        <option value="y=k" ${sub === 'y=k' ? 'selected' : ''}>Garis Horizontal y = k</option>
      </select>
      <span id="k-param-wrap" class="${sub === 'x=k' || sub === 'y=k' ? '' : 'hidden'}">
        <label>k:</label>
        <input type="number" id="input-refl-k" class="coord-input" value="${k}">
      </span>
    `;

    const subSelect = grp.querySelector('#reflect-sub-select');
    const kWrap = grp.querySelector('#k-param-wrap');
    subSelect.addEventListener('change', () => {
      const val = subSelect.value;
      kWrap.classList.toggle('hidden', val !== 'x=k' && val !== 'y=k');
      if (currentTab === 'transform') loadTransformSimulation();
    });

    bindInputEvents(grp);
    els.transformParamsContainer.appendChild(grp);
  } else if (type === 'rotate') {
    const deg = overrideParams && overrideParams.deg !== undefined ? overrideParams.deg : 45;
    const xp = overrideParams && overrideParams.xp !== undefined ? overrideParams.xp : 0;
    const yp = overrideParams && overrideParams.yp !== undefined ? overrideParams.yp : 0;

    const grp = document.createElement('div');
    grp.className = 'transform-param-group';
    grp.innerHTML = `
      <label>Sudut θ:</label>
      <input type="number" id="input-rot-deg" class="coord-input" value="${deg}" style="width: 58px;">
      <span style="font-size: 11px; color: var(--text-muted);">°</span>
      <div style="display: inline-flex; gap: 3px; margin: 0 4px;">
        <button type="button" class="preset-btn rot-quick" data-deg="30">30°</button>
        <button type="button" class="preset-btn rot-quick" data-deg="45">45°</button>
        <button type="button" class="preset-btn rot-quick" data-deg="60">60°</button>
        <button type="button" class="preset-btn rot-quick" data-deg="90">90°</button>
        <button type="button" class="preset-btn rot-quick" data-deg="180">180°</button>
        <button type="button" class="preset-btn rot-quick" data-deg="-90">-90°</button>
      </div>
      <label>Pivot (xp, yp):</label>
      <input type="number" id="input-rot-xp" class="coord-input" value="${xp}" title="xp">
      <input type="number" id="input-rot-yp" class="coord-input" value="${yp}" title="yp">
    `;

    grp.querySelectorAll('.rot-quick').forEach(b => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.deg, 10);
        grp.querySelector('#input-rot-deg').value = d;
        if (currentTab === 'transform') loadTransformSimulation();
      });
    });

    bindInputEvents(grp);
    els.transformParamsContainer.appendChild(grp);
  } else if (type === 'scale') {
    const sx = overrideParams && overrideParams.sx !== undefined ? overrideParams.sx : 2;
    const sy = overrideParams && overrideParams.sy !== undefined ? overrideParams.sy : 2;
    const xp = overrideParams && overrideParams.xp !== undefined ? overrideParams.xp : 0;
    const yp = overrideParams && overrideParams.yp !== undefined ? overrideParams.yp : 0;

    const grp = document.createElement('div');
    grp.className = 'transform-param-group';
    grp.innerHTML = `
      <label>Sx:</label>
      <input type="number" step="0.5" id="input-scale-sx" class="coord-input" value="${sx}">
      <label>Sy:</label>
      <input type="number" step="0.5" id="input-scale-sy" class="coord-input" value="${sy}">
      <div style="display: inline-flex; gap: 3px; margin: 0 4px;">
        <button type="button" class="preset-btn scale-quick" data-s="0.5">0.5x</button>
        <button type="button" class="preset-btn scale-quick" data-s="1.5">1.5x</button>
        <button type="button" class="preset-btn scale-quick" data-s="2">2x</button>
        <button type="button" class="preset-btn scale-quick" data-s="-1">-1x</button>
      </div>
      <label>Pivot (xp, yp):</label>
      <input type="number" id="input-scale-xp" class="coord-input" value="${xp}" title="xp">
      <input type="number" id="input-scale-yp" class="coord-input" value="${yp}" title="yp">
    `;

    grp.querySelectorAll('.scale-quick').forEach(b => {
      b.addEventListener('click', () => {
        const s = parseFloat(b.dataset.s);
        grp.querySelector('#input-scale-sx').value = s;
        grp.querySelector('#input-scale-sy').value = s;
        if (currentTab === 'transform') loadTransformSimulation();
      });
    });

    bindInputEvents(grp);
    els.transformParamsContainer.appendChild(grp);
  } else if (type === 'shear') {
    const stype = overrideParams && overrideParams.type ? overrideParams.type : 'horizontal';
    const shx = overrideParams && overrideParams.shx !== undefined ? overrideParams.shx : 1.5;
    const shy = overrideParams && overrideParams.shy !== undefined ? overrideParams.shy : 1.0;
    const yref = overrideParams && overrideParams.yref !== undefined ? overrideParams.yref : 0;
    const xref = overrideParams && overrideParams.xref !== undefined ? overrideParams.xref : 0;

    const grp = document.createElement('div');
    grp.className = 'transform-param-group';
    grp.innerHTML = `
      <label>Arah:</label>
      <select id="shear-type-select">
        <option value="horizontal" ${stype === 'horizontal' ? 'selected' : ''}>Horizontal (X-Shear)</option>
        <option value="vertical" ${stype === 'vertical' ? 'selected' : ''}>Vertikal (Y-Shear)</option>
        <option value="both" ${stype === 'both' ? 'selected' : ''}>Simultan (X & Y)</option>
      </select>
      <span id="shx-wrap" class="${stype === 'vertical' ? 'hidden' : ''}">
        <label>Shx:</label>
        <input type="number" step="0.5" id="input-shear-shx" class="coord-input" value="${shx}">
        <label>y_ref:</label>
        <input type="number" id="input-shear-yref" class="coord-input" value="${yref}">
      </span>
      <span id="shy-wrap" class="${stype === 'horizontal' ? 'hidden' : ''}">
        <label>Shy:</label>
        <input type="number" step="0.5" id="input-shear-shy" class="coord-input" value="${shy}">
        <label>x_ref:</label>
        <input type="number" id="input-shear-xref" class="coord-input" value="${xref}">
      </span>
    `;

    const sel = grp.querySelector('#shear-type-select');
    const shxWrap = grp.querySelector('#shx-wrap');
    const shyWrap = grp.querySelector('#shy-wrap');
    sel.addEventListener('change', () => {
      shxWrap.classList.toggle('hidden', sel.value === 'vertical');
      shyWrap.classList.toggle('hidden', sel.value === 'horizontal');
      if (currentTab === 'transform') loadTransformSimulation();
    });

    bindInputEvents(grp);
    els.transformParamsContainer.appendChild(grp);
  }
}

function bindInputEvents(container) {
  const inputs = container.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      if (currentTab === 'transform') loadTransformSimulation();
    });
    input.addEventListener('change', () => {
      if (currentTab === 'transform') loadTransformSimulation();
    });
  });
}

function getTransformParamsFromInputs() {
  const type = currentTransformType;
  const p = {};

  if (type === 'translate') {
    const tx = parseFloat(document.getElementById('input-tx')?.value || 0);
    const ty = parseFloat(document.getElementById('input-ty')?.value || 0);
    p.tx = isNaN(tx) ? 0 : tx;
    p.ty = isNaN(ty) ? 0 : ty;
  } else if (type === 'reflect') {
    p.subType = document.getElementById('reflect-sub-select')?.value || 'x-axis';
    const k = parseFloat(document.getElementById('input-refl-k')?.value || 0);
    p.k = isNaN(k) ? 0 : k;
  } else if (type === 'rotate') {
    const deg = parseFloat(document.getElementById('input-rot-deg')?.value || 0);
    const xp = parseFloat(document.getElementById('input-rot-xp')?.value || 0);
    const yp = parseFloat(document.getElementById('input-rot-yp')?.value || 0);
    p.deg = isNaN(deg) ? 0 : deg;
    p.xp = isNaN(xp) ? 0 : xp;
    p.yp = isNaN(yp) ? 0 : yp;
  } else if (type === 'scale') {
    const sx = parseFloat(document.getElementById('input-scale-sx')?.value || 1);
    const sy = parseFloat(document.getElementById('input-scale-sy')?.value || 1);
    const xp = parseFloat(document.getElementById('input-scale-xp')?.value || 0);
    const yp = parseFloat(document.getElementById('input-scale-yp')?.value || 0);
    p.sx = isNaN(sx) ? 1 : sx;
    p.sy = isNaN(sy) ? 1 : sy;
    p.xp = isNaN(xp) ? 0 : xp;
    p.yp = isNaN(yp) ? 0 : yp;
  } else if (type === 'shear') {
    p.type = document.getElementById('shear-type-select')?.value || 'horizontal';
    const shx = parseFloat(document.getElementById('input-shear-shx')?.value || 0);
    const shy = parseFloat(document.getElementById('input-shear-shy')?.value || 0);
    const yref = parseFloat(document.getElementById('input-shear-yref')?.value || 0);
    const xref = parseFloat(document.getElementById('input-shear-xref')?.value || 0);
    p.shx = isNaN(shx) ? 0 : shx;
    p.shy = isNaN(shy) ? 0 : shy;
    p.yref = isNaN(yref) ? 0 : yref;
    p.xref = isNaN(xref) ? 0 : xref;
  }

  return p;
}

function getTransformVertices() {
  if (currentTransformObj === 'custom') {
    const pairs = (customCoords || '').split(';');
    const v = [];
    for (let i = 0; i < pairs.length; i++) {
      const parts = pairs[i].split(',');
      if (parts.length >= 2) {
        const x = parseFloat(parts[0].trim());
        const y = parseFloat(parts[1].trim());
        if (!isNaN(x) && !isNaN(y)) {
          v.push({ label: String.fromCharCode(65 + (i % 26)), x, y });
        }
      }
    }
    return v.length > 0 ? v : [{ label: 'A', x: 2, y: 2 }, { label: 'B', x: 8, y: 2 }, { label: 'C', x: 5, y: 7 }];
  }

  const obj = TRANSFORM_OBJECTS[currentTransformObj];
  return obj ? obj.vertices : TRANSFORM_OBJECTS.triangle.vertices;
}

function loadTransformSimulation() {
  const vertices = getTransformVertices();
  const params = getTransformParamsFromInputs();
  const matrixInfo = computeTransformationMatrix(currentTransformType, params);
  const calcs = generateManualCalculation(vertices, matrixInfo, currentTransformType, params);

  // Render Column 2 (Matrix & Theory)
  els.transformMatrixPanel.innerHTML = buildMatrixPanelHtml(matrixInfo, currentTransformType, params);

  // Render Column 3 (Manual Calculation Breakdown)
  els.transformCalcPanel.innerHTML = buildCalculationPanelHtml(calcs, null);

  // Update transformation state
  const tVal = els.transformTSlider ? parseInt(els.transformTSlider.value, 10) / 100 : 1.0;
  transformState = {
    originalVertices: vertices,
    transformedVertices: calcs.map(c => ({ label: c.label, x: c.to.x, y: c.to.y })),
    activeVertexIndex: null,
    isComplete: true,
    type: currentTransformType,
    params,
    interpolationT: tVal,
  };

  // Compute and rasterize pixels onto grid
  grid.clearPixels();
  const rasterPixels = [];

  // 1. Original shape edge pixels (dim cyan)
  if (vertices.length >= 2) {
    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];
      if (vertices.length === 2 && i === 1) break;
      const pxs = computePixelsDDA(Math.round(p1.x), Math.round(p1.y), Math.round(p2.x), Math.round(p2.y));
      for (const p of pxs) {
        rasterPixels.push({ x: p.x, y: p.y, color: 'rgba(0, 221, 184, 0.45)' });
      }
    }
  }

  // 2. Transformed shape edge pixels (vibrant magenta)
  if (calcs.length >= 2) {
    for (let i = 0; i < calcs.length; i++) {
      const p1 = calcs[i].to;
      const p2 = calcs[(i + 1) % calcs.length].to;
      if (calcs.length === 2 && i === 1) break;
      const pxs = computePixelsDDA(Math.round(p1.x), Math.round(p1.y), Math.round(p2.x), Math.round(p2.y));
      for (const p of pxs) {
        rasterPixels.push({ x: p.x, y: p.y, color: '#ff3366' });
      }
    }
  }

  grid.putPixels(rasterPixels);

  // Set grid overlay callback
  grid.setOverlay((ctx, cs, half, total) => {
    drawTransformOverlay(ctx, cs, half, total, transformState);
  });

  // Prepare generator for simulator
  const gen = transformStepGenerator(vertices, matrixInfo, currentTransformType, params);
  simulator.load(gen, [], []);

  // Update info bar
  updateTransformInfoBar(matrixInfo, vertices);
  updatePlaybackUI({ playing: false, finished: false });
}

function updateTransformInfoBar(matrixInfo, vertices) {
  const detStr = fmt(matrixInfo.det);
  const areaStr = matrixInfo.isAreaPreserved ? 'Tetap (1×)' : `${fmt(matrixInfo.areaFactor)}×`;
  const orientStr = matrixInfo.isOrientationReversed ? 'Terbalik (Cermin)' : 'Normal';

  els.infoBar.innerHTML = `
    <span class="info-item"><strong>Transformasi:</strong> ${matrixInfo.title}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>Objek:</strong> ${vertices.map(v => v.label).join('-')} (${vertices.length} titik)</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>det(M):</strong> ${detStr}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>Luas:</strong> ${areaStr}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>Orientasi:</strong> ${orientStr}</span>
    <span class="info-sep">|</span>
    <span class="info-item"><strong>Dimensi:</strong> Matriks Homogen 3×3</span>
  `;
}
