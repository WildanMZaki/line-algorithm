// ============================================================
// grid.js — Canvas Grid Renderer (Cartesian Coordinate System)
// ============================================================
// Renders a cartesian grid on an HTML5 Canvas.
// (0,0) is at the center. X→ right, Y→ up.
// Each integer coordinate is represented as a square cell.
// ============================================================

export class Grid {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.gridHalf = 32;         // range: -gridHalf .. +gridHalf
    this.cellSize = 10;         // computed dynamically
    this.pixels = new Map();    // "x,y" → color
    this.latestPixel = null;    // most recently placed pixel {x, y}
    this.startPoint = null;     // {x, y}
    this.endPoint = null;       // {x, y}
    this.hoverCell = null;      // {x, y} or null
    this.idealLine = null;      // {x1,y1,x2,y2} or null
    this._onHover = null;       // callback(cellX, cellY) or null
  }

  /**
   * Initialize the grid on a canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {number} gridHalf — half-extent (default 32 → range -32..+32)
   */
  init(canvas, gridHalf = 32) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridHalf = gridHalf;
    this._setupMouseEvents();
    this.resize();
  }

  /** Recompute cell size and re-render based on container size */
  resize() {
    const container = this.canvas.parentElement;
    const size = Math.min(container.clientWidth, container.clientHeight);
    const gridCount = this.gridHalf * 2 + 1; // e.g. 65 for gridHalf=32
    this.cellSize = Math.max(2, Math.floor(size / gridCount));

    const canvasSize = this.cellSize * gridCount;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = canvasSize * dpr;
    this.canvas.height = canvasSize * dpr;
    this.canvas.style.width = canvasSize + 'px';
    this.canvas.style.height = canvasSize + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.render();
  }

  /** Change grid extent and re-render */
  setGridHalf(half) {
    this.gridHalf = half;
    this.clearPixels();
    this.resize();
  }

  getGridHalf() {
    return this.gridHalf;
  }

  /** Set the start and end target points (displayed differently) */
  setEndpoints(x1, y1, x2, y2) {
    this.startPoint = { x: x1, y: y1 };
    this.endPoint = { x: x2, y: y2 };
    this.idealLine = { x1, y1, x2, y2 };
    this.render();
  }

  /** Place a pixel at cartesian (x, y) with optional color */
  putPixel(x, y, color = null) {
    const key = `${x},${y}`;
    this.pixels.set(key, color || 'active');
    this.latestPixel = { x, y };
    this.render();
  }

  /** Clear all placed pixels */
  clearPixels() {
    this.pixels.clear();
    this.latestPixel = null;
    this.startPoint = null;
    this.endPoint = null;
    this.idealLine = null;
    this.render();
  }

  /** Set hover callback */
  onHover(cb) {
    this._onHover = cb;
  }

  // ---------- RENDERING ----------

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const half = this.gridHalf;
    const count = half * 2 + 1;
    const total = cs * count;

    // 1. Background
    ctx.fillStyle = '#080818';
    ctx.fillRect(0, 0, total, total);

    // 2. Grid cells & lines
    this._drawGridLines(ctx, cs, half, count, total);

    // 3. Ideal mathematical line (thin, semi-transparent)
    if (this.idealLine) {
      this._drawIdealLine(ctx, cs, half);
    }

    // 4. Active pixels
    this._drawPixels(ctx, cs, half);

    // 5. Axis labels
    this._drawAxisLabels(ctx, cs, half, count);

    // 6. Hover highlight
    if (this.hoverCell) {
      this._drawHoverCell(ctx, cs, half);
    }
  }

  _drawGridLines(ctx, cs, half, count, total) {
    // Minor grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= count; i++) {
      const pos = i * cs;
      // Vertical
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, total);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(total, pos);
      ctx.stroke();
    }

    // Major grid lines (every 4 cells)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= count; i++) {
      const coord = i - half;
      if (coord % 4 !== 0 || coord === 0) continue;
      const pos = i * cs;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, total);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(total, pos);
      ctx.stroke();
    }

    // Axis lines (x=0 and y=0)
    const axisPos = half * cs;
    ctx.strokeStyle = 'rgba(120, 120, 220, 0.45)';
    ctx.lineWidth = 1.5;
    // X axis (horizontal line at y=0)
    ctx.beginPath();
    ctx.moveTo(0, axisPos + cs * 0.5);
    ctx.lineTo(total, axisPos + cs * 0.5);
    ctx.stroke();
    // Y axis (vertical line at x=0)
    ctx.beginPath();
    ctx.moveTo(axisPos + cs * 0.5, 0);
    ctx.lineTo(axisPos + cs * 0.5, total);
    ctx.stroke();
  }

  _drawIdealLine(ctx, cs, half) {
    const { x1, y1, x2, y2 } = this.idealLine;
    const sx = (x1 + half) * cs + cs / 2;
    const sy = (half - y1) * cs + cs / 2;
    const ex = (x2 + half) * cs + cs / 2;
    const ey = (half - y2) * cs + cs / 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  _drawPixels(ctx, cs, half) {
    const latestKey = this.latestPixel ? `${this.latestPixel.x},${this.latestPixel.y}` : null;

    for (const [key, color] of this.pixels) {
      const [x, y] = key.split(',').map(Number);
      const sx = (x + half) * cs;
      const sy = (half - y) * cs;

      const isLatest = (key === latestKey);
      const isStart = this.startPoint && x === this.startPoint.x && y === this.startPoint.y;
      const isEnd = this.endPoint && x === this.endPoint.x && y === this.endPoint.y;

      // Determine fill color
      let fillColor;
      if (isStart) fillColor = '#00ff88';
      else if (isEnd && this.pixels.size > 1) fillColor = '#ff3366';
      else if (isLatest) fillColor = '#00ffee';
      else fillColor = '#00ddb8';

      // Glow effect for latest pixel
      if (isLatest) {
        ctx.save();
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = cs * 0.8;
        ctx.fillStyle = fillColor;
        ctx.fillRect(sx + 1, sy + 1, cs - 2, cs - 2);
        ctx.restore();
      }

      // Fill the cell
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = isLatest ? 1.0 : 0.75;
      ctx.fillRect(sx + 1, sy + 1, cs - 2, cs - 2);
      ctx.globalAlpha = 1.0;

      // Subtle border for start/end
      if (isStart || isEnd) {
        ctx.strokeStyle = isStart ? '#00ff88' : '#ff3366';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, cs, cs);
      }
    }
  }

  _drawAxisLabels(ctx, cs, half, count) {
    if (cs < 8) return; // too small to show labels

    const fontSize = Math.max(7, Math.min(10, cs * 0.65));
    ctx.font = `${fontSize}px "JetBrains Mono", "Fira Code", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(136, 136, 187, 0.6)';

    // Determine label interval
    let interval = 4;
    if (cs < 12) interval = 8;
    if (cs < 6) interval = 16;

    // X axis labels (along bottom of grid's y=0 area)
    for (let i = 0; i <= count; i++) {
      const coord = i - half;
      if (coord === 0 || coord % interval !== 0) continue;
      const px = i * cs + cs / 2;
      const py = half * cs + cs + fontSize + 2;
      if (py < count * cs) {
        ctx.fillText(String(coord), px, py);
      }
    }

    // Y axis labels (along left of grid's x=0 area)
    for (let i = 0; i <= count; i++) {
      const coord = half - i;
      if (coord === 0 || coord % interval !== 0) continue;
      const px = half * cs - fontSize - 4;
      const py = i * cs + cs / 2;
      if (px > 0) {
        ctx.fillText(String(coord), px, py);
      }
    }

    // Origin label
    const ox = half * cs - fontSize - 2;
    const oy = half * cs + cs + fontSize + 2;
    ctx.fillStyle = 'rgba(136, 136, 187, 0.8)';
    ctx.fillText('0', half * cs + cs / 2, oy);
  }

  _drawHoverCell(ctx, cs, half) {
    const { x, y } = this.hoverCell;
    const sx = (x + half) * cs;
    const sy = (half - y) * cs;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, cs, cs);
  }

  // ---------- MOUSE EVENTS ----------

  _setupMouseEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / (window.devicePixelRatio || 1) / rect.width;
      const scaleY = this.canvas.height / (window.devicePixelRatio || 1) / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const half = this.gridHalf;
      const cs = this.cellSize;
      const col = Math.floor(mx / cs);
      const row = Math.floor(my / cs);
      const cx = col - half;
      const cy = half - row;

      if (cx >= -half && cx <= half && cy >= -half && cy <= half) {
        this.hoverCell = { x: cx, y: cy };
        if (this._onHover) this._onHover(cx, cy);
      } else {
        this.hoverCell = null;
      }
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCell = null;
      this.render();
    });
  }
}
