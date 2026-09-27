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

// ---------- SINGLETON INSTANCES ----------
const grid = new Grid();
const codeView = new CodeView();
const tracer = new Tracer();
const simulator = new Simulator();

// ---------- STATE ----------
let currentTab = 'line';    // 'line' | 'shapes'
let currentShape = 'persegi';

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

    // Panel titles
    codePanelTitle:   document.getElementById('code-panel-title'),
    tracePanelTitle:  document.getElementById('trace-panel-title'),
  };

  // Initialize modules
  const gridHalf = parseInt(els.gridSizeSelect.value) || 32;
  grid.init(els.gridCanvas, gridHalf);
  codeView.init(els.codeContainer);
  tracer.init(els.traceHead, els.traceBody, els.traceScroll);
  simulator.init(grid, codeView, tracer, els.stepDescription, els.stepCounter);

  // Setup event listeners
  setupTabs();
  setupPresets();
  setupControls();
  setupShapeSelector();
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

      // Update tab button active states
      els.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

      // Show/hide header controls
      els.lineControls.classList.toggle('hidden', tab !== 'line');
      els.shapesControls.classList.toggle('hidden', tab !== 'shapes');

      // Show/hide shape-specific panel elements
      els.shapeParamsBar.classList.toggle('hidden', tab !== 'shapes');
      els.shapeSelectorBar.classList.toggle('hidden', tab !== 'shapes');

      // Update panel header labels
      if (tab === 'shapes') {
        els.codePanelTitle.textContent = 'Shape Code (C#)';
        els.tracePanelTitle.textContent = 'Shape Trace';
      } else {
        els.codePanelTitle.textContent = 'Algorithm Code (C#)';
        els.tracePanelTitle.textContent = 'Tracing Table';
      }

      // Load the appropriate simulation
      loadCurrentSimulation();
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
//  PLAYBACK
// ============================================================

function setupPlayback() {
  els.btnPlay.addEventListener('click', () => {
    if (simulator.isFinished()) return;
    if (!simulator.generator) {
      loadCurrentSimulation();
    }
    simulator.togglePlay();
  });

  els.btnStep.addEventListener('click', () => {
    if (simulator.isFinished()) return;
    if (!simulator.generator) {
      loadCurrentSimulation();
    }
    simulator.pause();
    simulator.step();
  });

  els.btnReset.addEventListener('click', () => {
    loadCurrentSimulation();
  });

  // State change callback
  simulator.onStateChange((state) => {
    updatePlaybackUI(state);
  });
}

// ============================================================
//  SIMULATION LOADERS
// ============================================================

/** Route to the correct loader based on active tab */
function loadCurrentSimulation() {
  if (currentTab === 'shapes') {
    loadShapeSimulation();
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
