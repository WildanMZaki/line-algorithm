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

// ---------- SINGLETON INSTANCES ----------
const grid = new Grid();
const codeView = new CodeView();
const tracer = new Tracer();
const simulator = new Simulator();

// ---------- DOM REFERENCES ----------
let els = {};

// ---------- INITIALIZATION ----------
document.addEventListener('DOMContentLoaded', () => {
  // Grab all DOM elements
  els = {
    // Controls
    algoSelect:   document.getElementById('algo-select'),
    inputX1:      document.getElementById('input-x1'),
    inputY1:      document.getElementById('input-y1'),
    inputX2:      document.getElementById('input-x2'),
    inputY2:      document.getElementById('input-y2'),
    gridSizeSelect: document.getElementById('grid-size-select'),
    presetContainer: document.getElementById('preset-container'),

    // Playback
    btnPlay:      document.getElementById('btn-play'),
    btnStep:      document.getElementById('btn-step'),
    btnReset:     document.getElementById('btn-reset'),
    speedSlider:  document.getElementById('speed-slider'),
    speedLabel:   document.getElementById('speed-label'),
    stepCounter:  document.getElementById('step-counter'),

    // Info bar
    infoBar:      document.getElementById('info-bar'),

    // Grid
    gridCanvas:   document.getElementById('grid-canvas'),
    hoverCoord:   document.getElementById('hover-coord'),

    // Code & Trace
    codeContainer:   document.getElementById('code-container'),
    stepDescription: document.getElementById('step-description'),
    traceHead:       document.getElementById('trace-head'),
    traceBody:       document.getElementById('trace-body'),
    traceScroll:     document.getElementById('trace-scroll'),
  };

  // Initialize modules
  const gridHalf = parseInt(els.gridSizeSelect.value) || 32;
  grid.init(els.gridCanvas, gridHalf);
  codeView.init(els.codeContainer);
  tracer.init(els.traceHead, els.traceBody, els.traceScroll);
  simulator.init(grid, codeView, tracer, els.stepDescription, els.stepCounter);

  // Setup event listeners
  setupPresets();
  setupControls();
  setupPlayback();
  setupGridHover();
  setupResizeHandler();

  // Load initial simulation state (endpoints, ideal line, code, trace columns)
  loadSimulation();
});

// ---------- PRESETS ----------
function setupPresets() {
  PRESETS.forEach((preset, idx) => {
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

// ---------- CONTROLS ----------
function setupControls() {
  // Algorithm change
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

  // Grid size change
  els.gridSizeSelect.addEventListener('change', () => {
    const half = parseInt(els.gridSizeSelect.value) || 32;
    grid.setGridHalf(half);
    loadSimulation();
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
}

// ---------- PLAYBACK ----------
function setupPlayback() {
  els.btnPlay.addEventListener('click', () => {
    if (simulator.isFinished()) return;
    if (!simulator.generator) {
      loadSimulation();
    }
    simulator.togglePlay();
  });

  els.btnStep.addEventListener('click', () => {
    if (simulator.isFinished()) return;
    if (!simulator.generator) {
      loadSimulation();
    }
    simulator.pause();
    simulator.step();
  });

  els.btnReset.addEventListener('click', () => {
    loadSimulation();
  });

  // State change callback
  simulator.onStateChange((state) => {
    updatePlaybackUI(state);
  });
}

/** Load (or reload) simulation with current inputs */
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

/** Update the info bar with line equation details */
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

// ---------- GRID HOVER ----------
function setupGridHover() {
  grid.onHover((x, y) => {
    els.hoverCoord.textContent = `(${x}, ${y})`;
  });

  els.gridCanvas.addEventListener('mouseleave', () => {
    els.hoverCoord.textContent = '—';
  });
}

// ---------- RESIZE ----------
function setupResizeHandler() {
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      grid.resize();
    }, 150);
  });
}
