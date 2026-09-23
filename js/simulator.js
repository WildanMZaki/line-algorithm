// ============================================================
// simulator.js — Step-by-Step Execution Engine
// ============================================================
// Orchestrates the algorithm generator, grid, code view, and
// tracer. Supports step, play (auto-advance), pause, and reset.
// ============================================================

export class Simulator {
  constructor() {
    this.grid = null;
    this.codeView = null;
    this.tracer = null;
    this.descriptionEl = null;
    this.stepCounterEl = null;

    this.generator = null;     // current algorithm generator
    this.stepIndex = 0;
    this.totalSteps = null;    // estimated total (not always known)
    this.finished = false;
    this.playing = false;
    this.playTimer = null;
    this.speed = 600;          // ms between auto-steps (default)

    this._onStepCallback = null;
    this._onFinishCallback = null;
    this._onStateChangeCallback = null;
  }

  /**
   * Initialize the simulator with rendering targets.
   */
  init(grid, codeView, tracer, descriptionEl, stepCounterEl) {
    this.grid = grid;
    this.codeView = codeView;
    this.tracer = tracer;
    this.descriptionEl = descriptionEl;
    this.stepCounterEl = stepCounterEl;
  }

  /** Register callback for each step: cb(stepData) */
  onStep(cb) { this._onStepCallback = cb; }

  /** Register callback when algorithm finishes */
  onFinish(cb) { this._onFinishCallback = cb; }

  /** Register callback when play/pause/reset state changes */
  onStateChange(cb) { this._onStateChangeCallback = cb; }

  /**
   * Load an algorithm generator and prepare for execution.
   * @param {Generator} generator — from lineDDA or lineBresenham
   * @param {string[]} codeLines — algorithm code for display
   * @param {Array} columns — tracing table column definitions
   * @param {number} x1, y1, x2, y2 — coordinates
   */
  load(generator, codeLines, columns, x1, y1, x2, y2) {
    this.stop();
    this.generator = generator;
    this.stepIndex = 0;
    this.finished = false;
    this.playing = false;

    // Reset visual components
    this.grid.clearPixels();
    this.grid.setEndpoints(x1, y1, x2, y2);
    this.codeView.setCode(codeLines);
    this.tracer.setColumns(columns);

    if (this.descriptionEl) {
      this.descriptionEl.textContent = 'Tekan "Step" atau "Play" untuk mulai simulasi.';
      this.descriptionEl.classList.remove('finished');
    }
    this._updateStepCounter();
    this._emitStateChange();
  }

  /** Advance one step. Returns true if step was executed, false if finished. */
  step() {
    if (!this.generator || this.finished) return false;

    const result = this.generator.next();
    if (result.done) {
      this.finished = true;
      this.stop();
      if (this.descriptionEl) {
        this.descriptionEl.textContent = '✅ Simulasi selesai! Semua piksel telah digambar.';
        this.descriptionEl.classList.add('finished');
      }
      this._emitStateChange();
      if (this._onFinishCallback) this._onFinishCallback();
      return false;
    }

    const data = result.value;
    this.stepIndex++;

    // 1. Update code highlighting
    if (data.highlightLines) {
      this.codeView.highlightLines(data.highlightLines, data.annotations || {});
    }

    // 2. Place pixel on grid
    if (data.pixel) {
      this.grid.putPixel(data.pixel.x, data.pixel.y);
    }

    // 3. Add tracing table row
    if (data.tableRow) {
      this.tracer.addRow(data.tableRow);
    }

    // 4. Update description
    if (data.description && this.descriptionEl) {
      this.descriptionEl.textContent = data.description;
      this.descriptionEl.classList.remove('finished');
    }

    // 5. Update step counter
    this._updateStepCounter();

    if (this._onStepCallback) this._onStepCallback(data);

    return true;
  }

  /** Start auto-advancing (play mode) */
  play() {
    if (this.finished || this.playing) return;
    this.playing = true;
    this._emitStateChange();
    this._autoStep();
  }

  /** Pause auto-advancing */
  pause() {
    this.playing = false;
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
    this._emitStateChange();
  }

  /** Stop and cleanup */
  stop() {
    this.pause();
  }

  /** Toggle play/pause */
  togglePlay() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  /** Set auto-advance speed in milliseconds */
  setSpeed(ms) {
    this.speed = ms;
  }

  /** Check if currently playing */
  isPlaying() {
    return this.playing;
  }

  /** Check if algorithm has finished */
  isFinished() {
    return this.finished;
  }

  // ---------- INTERNAL ----------

  _autoStep() {
    if (!this.playing || this.finished) return;

    const hasMore = this.step();
    if (!hasMore) {
      this.playing = false;
      this._emitStateChange();
      return;
    }

    this.playTimer = setTimeout(() => this._autoStep(), this.speed);
  }

  _updateStepCounter() {
    if (this.stepCounterEl) {
      this.stepCounterEl.textContent = `Step: ${this.stepIndex}`;
    }
  }

  _emitStateChange() {
    if (this._onStateChangeCallback) {
      this._onStateChangeCallback({
        playing: this.playing,
        finished: this.finished,
        stepIndex: this.stepIndex,
      });
    }
  }
}
