// ============================================================
// animations.js — 2D Interactive Animation Showcase System
// ============================================================
// Provides 4 specialized 2D graphic simulations:
// 1. Radar Sweep (Periodic Rotation + Blip Target Detection)
// 2. Kinematic Movement (Oriented Triangle + Turn-then-Move)
// 3. Explosion (Midpoint Circle + Radial Dilation + Shrapnel)
// 4. Smoke Plume (Multi-Ellipse Spread + Upward Buoyancy + Drift)
// ============================================================

import { computePixelsDDA } from './shapes.js';

// ---------- HELPER MATH UTILITIES ----------

function clean(n, dec = 2) {
  if (Math.abs(n) < 1e-9) return 0;
  const f = Math.pow(10, dec);
  return Math.round(n * f) / f;
}

// ============================================================
// 1. RADAR SWEEP ANIMATION
// ============================================================

export class RadarAnimation {
  constructor() {
    this.key = 'radar';
    this.name = 'Radar Sweep';
    this.icon = '🛰️';
    this.angle = 0;           // current sweep angle in degrees
    this.angularSpeed = 90;   // degrees per second
    this.radius = 24;         // radar range in grid units
    this.targets = [
      { id: 1, label: 'Alpha', x: 12, y: 14, alpha: 0, lastDetected: 0 },
      { id: 2, label: 'Bravo', x: -16, y: 10, alpha: 0, lastDetected: 0 },
      { id: 3, label: 'Charlie', x: -10, y: -15, alpha: 0, lastDetected: 0 },
      { id: 4, label: 'Delta', x: 18, y: -12, alpha: 0, lastDetected: 0 },
    ];
    this.trailLength = 40;    // degrees of fading beam sector
    this.sweepCount = 0;
  }

  reset() {
    this.angle = 0;
    this.sweepCount = 0;
    this.targets.forEach(t => { t.alpha = 0; });
  }

  update(dt) {
    const prevAngle = this.angle;
    this.angle = (this.angle + this.angularSpeed * dt) % 360;

    // Check targets passed by the sweep beam
    this.targets.forEach(t => {
      // Calculate target angle in degrees (0 to 360 CCW from +X axis)
      let tAngle = (Math.atan2(t.y, t.x) * 180) / Math.PI;
      if (tAngle < 0) tAngle += 360;

      // Check if sweep line crossed this angle in current frame
      const crossed = (prevAngle <= tAngle && this.angle >= tAngle) ||
                      (prevAngle > this.angle && (tAngle >= prevAngle || tAngle <= this.angle));

      if (crossed) {
        t.alpha = 1.0;
        t.lastDetected = Date.now();
      } else {
        // Exponential decay
        t.alpha = Math.max(0, t.alpha - dt * 0.45);
      }
    });
  }

  step() {
    this.update(0.1); // advance 100ms
  }

  addTarget(x, y) {
    const id = this.targets.length + 1;
    this.targets.push({
      id,
      label: `Echo-${id}`,
      x: clean(x, 1),
      y: clean(y, 1),
      alpha: 1.0,
      lastDetected: Date.now(),
    });
  }

  draw(ctx, cs, half, total) {
    const toCanvas = (x, y) => ({
      cx: (x + half) * cs + cs / 2,
      cy: (half - y) * cs + cs / 2,
    });

    const center = toCanvas(0, 0);
    const radPx = this.radius * cs;

    // 1. Radar Background Glow & Rings
    ctx.save();
    ctx.fillStyle = 'rgba(0, 30, 15, 0.35)';
    ctx.beginPath();
    ctx.arc(center.cx, center.cy, radPx, 0, Math.PI * 2);
    ctx.fill();

    // Concentric Range Rings (Every 8 grid units)
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
    ctx.lineWidth = 1;
    [8, 16, 24].forEach(r => {
      const px = r * cs;
      ctx.beginPath();
      ctx.arc(center.cx, center.cy, px, 0, Math.PI * 2);
      ctx.stroke();

      // Range labels
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.45)';
      ctx.fillText(`${r} km`, center.cx + px - 16, center.cy - 4);
    });

    // Cardinal Axes cross
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
    ctx.beginPath();
    ctx.moveTo(center.cx - radPx, center.cy);
    ctx.lineTo(center.cx + radPx, center.cy);
    ctx.moveTo(center.cx, center.cy - radPx);
    ctx.lineTo(center.cx, center.cy + radPx);
    ctx.stroke();

    // 2. Phosphorescent Sweep Sector (Decaying Trail)
    const curRad = (this.angle * Math.PI) / 180;
    const trailRad = ((this.angle - this.trailLength) * Math.PI) / 180;

    const grad = ctx.createRadialGradient(
      center.cx, center.cy, 0,
      center.cx, center.cy, radPx
    );
    grad.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
    grad.addColorStop(1, 'rgba(0, 255, 136, 0.02)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(center.cx, center.cy);
    ctx.arc(center.cx, center.cy, radPx, -curRad, -trailRad, true); // Canvas Y inverted
    ctx.closePath();
    ctx.fill();

    // 3. Sharp Sweep Line
    const endX = center.cx + radPx * Math.cos(curRad);
    const endY = center.cy - radPx * Math.sin(curRad);

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(center.cx, center.cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();

    // 4. Target Blips
    this.targets.forEach(t => {
      const p = toCanvas(t.x, t.y);
      const dist = Math.hypot(t.x, t.y);
      if (dist > this.radius) return;

      const alpha = Math.max(0.12, t.alpha);
      ctx.save();
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = t.alpha > 0.5 ? 12 : 4;

      // Blip circle
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Detection ring pulse
      if (t.alpha > 0.3) {
        ctx.strokeStyle = `rgba(0, 255, 136, ${t.alpha * 0.7})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, 6 + (1 - t.alpha) * 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Blip Text Tag
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(0, 255, 136, ${Math.max(0.4, alpha)})`;
      ctx.fillText(`${t.label} (${clean(t.x, 1)}, ${clean(t.y, 1)})`, p.cx + 8, p.cy - 6);
      ctx.restore();
    });

    // 5. Radar Center Dot & Angle Display
    ctx.save();
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(center.cx, center.cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`θ = ${Math.round(this.angle)}° | ω = ${this.angularSpeed}°/s`, center.cx - 60, center.cy + radPx + 18);
    ctx.restore();
  }

  getCode() {
    return [
      '// === SIMULASI RADAR SWEEP (C#) ===',
      'public class RadarSweep',
      '{',
      '    public double Angle = 0;       // Derajat sweep',
      '    public double Omega = 90;      // Kecepatan putar (deg/detik)',
      '    public double Range = 24;      // Jangkauan radar (km)',
      '',
      '    // 1. Pembaruan sudut tiap frame via rotasi periodik',
      '    public void Update(double dt)',
      '    {',
      '        Angle = (Angle + Omega * dt) % 360.0;',
      '    }',
      '',
      '    // 2. Posisi ujung garis pemindai dengan rotasi trigonometri',
      '    public Vector2 GetBeamEndpoint()',
      '    {',
      '        double rad = Angle * Math.PI / 180.0;',
      '        double x = Range * Math.Cos(rad);',
      '        double y = Range * Math.Sin(rad);',
      '        return new Vector2(x, y);',
      '    }',
      '',
      '    // 3. Deteksi Target saat berkas garis melintasi koordinat target',
      '    public bool CheckTargetHit(Vector2 target, double thresholdDeg = 5.0)',
      '    {',
      '        double targetAngle = Math.Atan2(target.Y, target.X) * 180.0 / Math.PI;',
      '        if (targetAngle < 0) targetAngle += 360.0;',
      '        return Math.Abs(Angle - targetAngle) < thresholdDeg;',
      '    }',
      '}',
    ];
  }

  getInspectorHtml() {
    const detectedCount = this.targets.filter(t => t.alpha > 0.4).length;
    const targetsList = this.targets
      .map(
        t => `
        <div class="target-card ${t.alpha > 0.4 ? 'detected' : ''}">
          <span class="target-name">🎯 ${t.label}</span>
          <span class="target-coord">(${clean(t.x, 1)}, ${clean(t.y, 1)})</span>
          <span class="target-dist">${clean(Math.hypot(t.x, t.y), 1)} km</span>
          <span class="target-status">${t.alpha > 0.4 ? '🟢 Terdeteksi' : '⚪ Standby'}</span>
        </div>
      `
      )
      .join('');

    return `
      <div class="inspector-box">
        <div class="inspector-row">
          <span class="ins-label">Sudut Beam:</span>
          <span class="ins-val highlight">${Math.round(this.angle)}°</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Kecepatan ω:</span>
          <span class="ins-val">${this.angularSpeed}°/detik</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Target Terdeteksi:</span>
          <span class="ins-val">${detectedCount} / ${this.targets.length}</span>
        </div>
        <div class="inspector-section-title">Daftar Titik Radar:</div>
        <div class="target-list-scroll">${targetsList}</div>
        <div class="ins-hint">💡 Klik pada canvas untuk menambahkan target blip baru!</div>
      </div>
    `;
  }
}

// ============================================================
// 2. KINEMATIC MOVEMENT ANIMATION (TRIANGLE ON GRID)
// ============================================================

export class KinematicAnimation {
  constructor() {
    this.key = 'kinematic';
    this.name = 'Kinematic Movement';
    this.icon = '🔺';
    this.pos = { x: 0, y: 0 };           // current grid position
    this.angle = 0;                     // 0° = Up, 90° = Right, 180° = Down, 270° = Left
    this.fromAngle = 0;
    this.targetAngle = 0;
    this.targetPos = { x: 0, y: 0 };
    this.state = 'idle';                // 'idle' | 'rotating' | 'translating'
    this.progress = 0;                  // 0.0 to 1.0 for smooth motion
    this.actionQueue = [];              // queue of pending movements
    this.history = [{ x: 0, y: 0 }];
    this.turnFirstMode = true;           // Rotasi dulu sebelum translasi!
    this.lastActionText = 'Siap menerima perintah gerak (Panah / WASD / D-Pad / Klik Grid).';
  }

  reset() {
    this.pos = { x: 0, y: 0 };
    this.angle = 0;
    this.fromAngle = 0;
    this.targetAngle = 0;
    this.targetPos = { x: 0, y: 0 };
    this.state = 'idle';
    this.progress = 0;
    this.actionQueue = [];
    this.history = [{ x: 0, y: 0 }];
    this.lastActionText = 'Posisi direset ke (0, 0) menghadap Atas (0°).';
  }

  _getLastPlannedAngle() {
    for (let i = this.actionQueue.length - 1; i >= 0; i--) {
      if (this.actionQueue[i].type === 'rotate') {
        return this.actionQueue[i].targetAngle;
      }
    }
    if (this.state === 'rotating') {
      return this.targetAngle;
    }
    return this.angle;
  }

  _getLastPlannedPos() {
    let px = this.state === 'translating' ? this.targetPos.x : this.pos.x;
    let py = this.state === 'translating' ? this.targetPos.y : this.pos.y;
    for (const act of this.actionQueue) {
      if (act.type === 'translate') {
        px += act.dx;
        py += act.dy;
      }
    }
    return { x: px, y: py };
  }

  // Request move direction: 'up', 'right', 'down', 'left'
  requestDirection(dir) {
    const dirAngles = {
      up: 0,
      right: 90,
      down: 180,
      left: 270,
    };
    const dirVectors = {
      up: { dx: 0, dy: 1 },
      right: { dx: 1, dy: 0 },
      down: { dx: 0, dy: -1 },
      left: { dx: -1, dy: 0 },
    };

    const targetA = dirAngles[dir];
    const vec = dirVectors[dir];
    if (targetA === undefined || !vec) return;

    // Ambil sudut terakhir yang direncanakan di antrean gerak
    const plannedAngle = this._getLastPlannedAngle();

    // LANGKAH 1: Jika arah berbeda, wajib rotasi terlebih dahulu!
    if (plannedAngle !== targetA) {
      this.actionQueue.push({ type: 'rotate', targetAngle: targetA, dirName: dir });
    }
    // LANGKAH 2: Translasi diskrit 1 blok kisi
    this.actionQueue.push({ type: 'translate', dx: vec.dx, dy: vec.dy, dirName: dir });

    this._processNextAction();
  }

  _processNextAction() {
    if (this.state !== 'idle' || this.actionQueue.length === 0) return;

    const action = this.actionQueue.shift();
    if (action.type === 'rotate') {
      this.state = 'rotating';
      this.fromAngle = this.angle;
      this.targetAngle = action.targetAngle;
      this.progress = 0;
      this.lastActionText = `🔄 Rotasi menghadap ${action.dirName.toUpperCase()} (${action.targetAngle}°)...`;
    } else if (action.type === 'translate') {
      this.state = 'translating';
      this.targetPos = {
        x: this.pos.x + action.dx,
        y: this.pos.y + action.dy,
      };
      this.progress = 0;
      this.lastActionText = `➡️ Translasi sejauh 1 blok ke (${this.targetPos.x}, ${this.targetPos.y})...`;
    }
  }

  update(dt) {
    if (this.state === 'idle') {
      this._processNextAction();
      return;
    }

    const speed = 4.5; // animation speed
    this.progress += dt * speed;

    if (this.progress >= 1.0) {
      this.progress = 1.0;

      if (this.state === 'rotating') {
        this.angle = this.targetAngle;
        this.fromAngle = this.targetAngle;
        this.state = 'idle';
        this.lastActionText = `✅ Rotasi selesai. Menghadap ${this.angle}° (${this._getDirLabel(this.angle)}).`;
      } else if (this.state === 'translating') {
        this.pos = { ...this.targetPos };
        this.history.push({ ...this.pos });
        if (this.history.length > 30) this.history.shift();
        this.state = 'idle';
        this.lastActionText = `✅ Translasi selesai. Posisi (${this.pos.x}, ${this.pos.y}).`;
      }

      this._processNextAction();
    }
  }

  step() {
    // If there is an action queued or in progress, advance immediately to completion
    if (this.state === 'rotating') {
      this.angle = this.targetAngle;
      this.fromAngle = this.targetAngle;
      this.state = 'idle';
    } else if (this.state === 'translating') {
      this.pos = { ...this.targetPos };
      this.history.push({ ...this.pos });
      this.state = 'idle';
    }
    this._processNextAction();
  }

  draw(ctx, cs, half, total) {
    const toCanvas = (x, y) => ({
      cx: (x + half) * cs + cs / 2,
      cy: (half - y) * cs + cs / 2,
    });

    // 1. Draw Breadcrumb Path History
    if (this.history.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      const p0 = toCanvas(this.history[0].x, this.history[0].y);
      ctx.moveTo(p0.cx, p0.cy);
      for (let i = 1; i < this.history.length; i++) {
        const pi = toCanvas(this.history[i].x, this.history[i].y);
        ctx.lineTo(pi.cx, pi.cy);
      }
      ctx.stroke();

      // Dots on visited cells
      this.history.forEach(h => {
        const hp = toCanvas(h.x, h.y);
        ctx.fillStyle = 'rgba(255, 170, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(hp.cx, hp.cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 2. Current Interpolated Position and Angle
    let curX = this.pos.x;
    let curY = this.pos.y;
    let curAngle = this.angle;

    if (this.state === 'translating') {
      curX = this.pos.x + (this.targetPos.x - this.pos.x) * this.progress;
      curY = this.pos.y + (this.targetPos.y - this.pos.y) * this.progress;
    } else if (this.state === 'rotating') {
      // Find shortest angular direction from this.fromAngle to this.targetAngle
      let diff = this.targetAngle - this.fromAngle;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      curAngle = this.fromAngle + diff * this.progress;
    }

    const center = toCanvas(curX, curY);

    // 3. Draw Vehicle (Oriented Triangle)
    // Model lokal segitiga menghadap KE ATAS (+Y):
    // - P0 (Hidung Depan): (0, +1.8)
    // - P1 (Sayap Kiri Belakang): (-1.2, -1.2)
    // - P2 (Sayap Kanan Belakang): (+1.2, -1.2)
    const basePts = [
      { x: 0, y: 1.8 },      // Hidung Depan (Front Nose)
      { x: -1.2, y: -1.2 },  // Sayap Kiri Belakang (Rear Left)
      { x: 1.2, y: -1.2 },   // Sayap Kanan Belakang (Rear Right)
    ];

    // Rotasi Searah Jarum Jam (Clockwise) terhadap sudut heading curAngle:
    // 0° = Atas (+Y), 90° = Kanan (+X), 180° = Bawah (-Y), 270° = Kiri (-X)
    // Matriks rotasi heading:
    // x' =  x * cos(θ) + y * sin(θ)
    // y' = -x * sin(θ) + y * cos(θ)
    const theta = (curAngle * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const rotPts = basePts.map(pt => ({
      x: pt.x * cos + pt.y * sin,
      y: -pt.x * sin + pt.y * cos,
    }));

    const canvasPts = rotPts.map(pt => toCanvas(curX + pt.x, curY + pt.y));

    ctx.save();

    // 4. Thruster Flame saat bergerak translasi
    if (this.state === 'translating') {
      const flameLength = 1.0 + Math.random() * 0.6;
      const flameBase = { x: 0, y: -1.2 };
      const flameTip = { x: 0, y: -1.2 - flameLength };
      
      const flameTipRot = {
        x: flameTip.x * cos + flameTip.y * sin,
        y: -flameTip.x * sin + flameTip.y * cos,
      };
      const flameTipCanvas = toCanvas(curX + flameTipRot.x, curY + flameTipRot.y);
      const flameBaseL = canvasPts[1];
      const flameBaseR = canvasPts[2];

      ctx.fillStyle = 'rgba(255, 100, 0, 0.65)';
      ctx.shadowColor = '#ff5500';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(flameBaseL.cx, flameBaseL.cy);
      ctx.lineTo(flameTipCanvas.cx, flameTipCanvas.cy);
      ctx.lineTo(flameBaseR.cx, flameBaseR.cy);
      ctx.closePath();
      ctx.fill();
    }

    // 5. Triangle Body (Neon Cyan Glow)
    ctx.fillStyle = 'rgba(0, 255, 204, 0.25)';
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(canvasPts[0].cx, canvasPts[0].cy);
    ctx.lineTo(canvasPts[1].cx, canvasPts[1].cy);
    ctx.lineTo(canvasPts[2].cx, canvasPts[2].cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. Distinct Golden Front Indicator (Penanda Bagian Depan)
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(canvasPts[0].cx, canvasPts[0].cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pivot center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center.cx, center.cy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Coordinate & Angle label above triangle
    const displayAngle = Math.round(((curAngle % 360) + 360) % 360);
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(`(${clean(curX, 1)}, ${clean(curY, 1)}) [${displayAngle}°]`, center.cx - 28, center.cy - 24);

    ctx.restore();
  }

  getCode() {
    return [
      '// === GERAK KINEMATIK DISKRIT & ROTASI PIVOT (C#) ===',
      'public class KinematicVehicle',
      '{',
      '    public Point2D Pos = new Point2D(0, 0);',
      '    public double Angle = 0; // 0=Atas (+Y), 90=Kanan (+X), 180=Bawah (-Y), 270=Kiri (-X)',
      '',
      '    // Perintah gerak: Cek rotasi dulu sebelum translasi jika arah berubah!',
      '    public void MoveDirection(Direction targetDir)',
      '    {',
      '        double targetAngle = GetAngle(targetDir);',
      '        Vector2 delta = GetStepVector(targetDir);',
      '',
      '        // LANGKAH 1: Jika arah berbeda, putar kendaraan terlebih dahulu',
      '        if (Angle != targetAngle)',
      '        {',
      '            RotateVehicleTo(targetAngle);',
      '        }',
      '',
      '        // LANGKAH 2: Translasi diskrit 1 blok kisi',
      '        TranslateStep(delta.X, delta.Y);',
      '    }',
      '',
      '    // Matriks Transformasi Homogen 3x3 (Rotasi Searah Jarum Jam + Translasi):',
      '    // [ x\']   [ cos(θ)   sin(θ)   tx ] [ x ]',
      '    // [ y\'] = [-sin(θ)   cos(θ)   ty ] [ y ]',
      '    // [ 1  ]   [   0        0       1 ] [ 1 ]',
      '    public Point2D TransformVertex(Point2D localPt)',
      '    {',
      '        double rad = Angle * Math.PI / 180.0;',
      '        double cos = Math.Cos(rad);',
      '        double sin = Math.Sin(rad);',
      '',
      '        double worldX =  localPt.X * cos + localPt.Y * sin + Pos.X;',
      '        double worldY = -localPt.X * sin + localPt.Y * cos + Pos.Y;',
      '        return new Point2D(worldX, worldY);',
      '    }',
      '',
      '    private void RotateVehicleTo(double newAngle) { Angle = newAngle; }',
      '    private void TranslateStep(int dx, int dy) { Pos.X += dx; Pos.Y += dy; }',
      '}',
    ];
  }

  getInspectorHtml() {
    const displayAngle = Math.round(((this.angle % 360) + 360) % 360);
    return `
      <div class="inspector-box">
        <div class="inspector-row">
          <span class="ins-label">Posisi Grid:</span>
          <span class="ins-val highlight">(${this.pos.x}, ${this.pos.y})</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Arah Hadap:</span>
          <span class="ins-val">${displayAngle}° (${this._getDirLabel(displayAngle)})</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Status Gerak:</span>
          <span class="ins-val">${this.state.toUpperCase()}</span>
        </div>
        <div class="action-status-card">${this.lastActionText}</div>

        <div class="inspector-section-title">🕹️ Kontrol Kemudi (D-Pad):</div>
        <div class="dpad-container">
          <button class="dpad-btn up" data-dir="up">⬆️</button>
          <div class="dpad-row">
            <button class="dpad-btn left" data-dir="left">⬅️</button>
            <div class="dpad-center">🔺</div>
            <button class="dpad-btn right" data-dir="right">➡️</button>
          </div>
          <button class="dpad-btn down" data-dir="down">⬇️</button>
        </div>
        <div class="ins-hint">💡 Gunakan tombol Panah Keyboard / WASD / Klik Grid di sekitar segitiga!</div>
      </div>
    `;
  }

  _getDirLabel(a) {
    if (a === 0) return 'Atas (+Y)';
    if (a === 90) return 'Kanan (+X)';
    if (a === 180) return 'Bawah (-Y)';
    if (a === 270) return 'Kiri (-X)';
    return `${a}°`;
  }
}

// ============================================================
// 3. EXPLOSION ANIMATION (CIRCLE + RADIAL DILATION)
// ============================================================

export class ExplosionAnimation {
  constructor() {
    this.key = 'explosion';
    this.name = 'Animasi Ledakan';
    this.icon = '💥';
    this.center = { x: 0, y: 0 };
    this.maxRadius = 18;
    this.expansionSpeed = 16;   // grid units / sec
    this.rings = [];
    this.particles = [];
    this.active = false;
    this.autoRepeat = true;
    this.timer = 0;
  }

  reset() {
    this.rings = [];
    this.particles = [];
    this.active = false;
    this.timer = 0;
  }

  triggerExplosion(x = 0, y = 0) {
    this.center = { x: clean(x, 1), y: clean(y, 1) };
    this.active = true;

    // Create 3 concentric expanding shockwave rings
    this.rings = [
      { radius: 0.5, speed: 22, maxR: this.maxRadius, alpha: 1.0, color: '#ffffff', width: 2.5 },
      { radius: 0.2, speed: 18, maxR: this.maxRadius * 0.85, alpha: 1.0, color: '#ffcc00', width: 2.0 },
      { radius: 0.1, speed: 13, maxR: this.maxRadius * 0.65, alpha: 1.0, color: '#ff3300', width: 1.5 },
    ];

    // Create 32 radial shrapnel particles
    this.particles = [];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.25;
      const speed = 6 + Math.random() * 14;
      this.particles.push({
        x: this.center.x,
        y: this.center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#ffaa00' : '#ff3366',
      });
    }
  }

  update(dt) {
    if (!this.active && this.autoRepeat) {
      this.timer += dt;
      if (this.timer > 1.8) {
        this.timer = 0;
        this.triggerExplosion((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
      }
      return;
    }

    if (!this.active) return;

    // 1. Expand rings via radial dilation
    let aliveRings = 0;
    this.rings.forEach(r => {
      r.radius += r.speed * dt;
      r.alpha = Math.max(0, 1.0 - r.radius / r.maxR);
      if (r.alpha > 0.02) aliveRings++;
    });

    // 2. Disperse shrapnel particles
    let aliveParticles = 0;
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94; // drag
      p.vy *= 0.94;
      p.alpha = Math.max(0, p.alpha - dt * 1.1);
      if (p.alpha > 0.02) aliveParticles++;
    });

    if (aliveRings === 0 && aliveParticles === 0) {
      this.active = false;
      this.timer = 0;
    }
  }

  step() {
    if (!this.active) {
      this.triggerExplosion(0, 0);
    } else {
      this.update(0.08);
    }
  }

  draw(ctx, cs, half, total) {
    const toCanvas = (x, y) => ({
      cx: (x + half) * cs + cs / 2,
      cy: (half - y) * cs + cs / 2,
    });

    const c = toCanvas(this.center.x, this.center.y);

    // 1. Expanding Shockwave Rings (Midpoint Circle equivalent)
    ctx.save();
    this.rings.forEach(r => {
      if (r.alpha <= 0.02) return;
      const pxRadius = r.radius * cs;

      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = r.width;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 10 * r.alpha;

      ctx.beginPath();
      ctx.arc(c.cx, c.cy, pxRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Semi-transparent shockwave fill
      ctx.fillStyle = r.color;
      ctx.globalAlpha = r.alpha * 0.08;
      ctx.fill();
    });
    ctx.restore();

    // 2. Dispersing Shrapnel Particles
    ctx.save();
    this.particles.forEach(p => {
      if (p.alpha <= 0.02) return;
      const pos = toCanvas(p.x, p.y);

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(pos.cx, pos.cy, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 3. Center Flash Dot
    if (this.active) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getCode() {
    return [
      '// === ANIMASI LEDAKAN: LINGKARAN + DILATASI (C#) ===',
      'public class ShockwaveExplosion',
      '{',
      '    public Vector2 Center;',
      '    public double Radius = 0.5;',
      '    public double MaxRadius = 18.0;',
      '    public double ExpansionSpeed = 16.0; // Dilatasi per detik',
      '    public double Alpha = 1.0;',
      '',
      '    // Update radius via faktor skala dilatasi bertahap',
      '    public void Update(double dt)',
      '    {',
      '        // Dilatasi radial bertahap',
      '        Radius += ExpansionSpeed * dt;',
      '',
      '        // Memudar (alpha fade)',
      '        Alpha = Math.Max(0.0, 1.0 - (Radius / MaxRadius));',
      '    }',
      '',
      '    // Gambar lingkaran gelombang kejut menggunakan Midpoint Circle',
      '    public void Render(Graphics g)',
      '    {',
      '        if (Alpha <= 0) return;',
      '        DrawMidpointCircle((int)Center.X, (int)Center.Y, (int)Radius, Alpha);',
      '    }',
      '}',
    ];
  }

  getInspectorHtml() {
    const curR = this.rings[0] ? clean(this.rings[0].radius, 1) : 0;
    return `
      <div class="inspector-box">
        <div class="inspector-row">
          <span class="ins-label">Status Ledakan:</span>
          <span class="ins-val highlight">${this.active ? '💥 AKTIF (Mengembang)' : '💤 Selesai / Menunggu'}</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Pusat Ledakan:</span>
          <span class="ins-val">(${this.center.x}, ${this.center.y})</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Radius Gelombang:</span>
          <span class="ins-val">${curR} / ${this.maxRadius} blok</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Jumlah Serpihan:</span>
          <span class="ins-val">${this.particles.length} partikel</span>
        </div>

        <button class="trigger-btn" id="btn-trigger-explosion">💥 Picu Ledakan Baru</button>
        <div class="ins-hint">💡 Anda juga bisa mengklik di mana saja pada canvas kisi untuk meledak di titik tersebut!</div>
      </div>
    `;
  }
}

// ============================================================
// 4. SMOKE PLUME ANIMATION (MULTI-ELLIPSE SPREAD)
// ============================================================

export class SmokeAnimation {
  constructor() {
    this.key = 'smoke';
    this.name = 'Sebaran Asap';
    this.icon = '💨';
    this.source = { x: 0, y: -20 };       // Smoke emitter source
    this.puffs = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.18;            // seconds between new puffs
    this.windSpeed = 0.8;                 // horizontal drift (positive = right)
    this.buoyancy = 4.2;                  // upward rising speed
  }

  reset() {
    this.puffs = [];
    this.spawnTimer = 0;
  }

  spawnPuff() {
    this.puffs.push({
      x: this.source.x + (Math.random() - 0.5) * 1.5,
      y: this.source.y,
      rx: 1.8 + Math.random() * 0.8,      // initial semi-major
      ry: 1.2 + Math.random() * 0.6,      // initial semi-minor
      angle: (Math.random() - 0.5) * 30,  // tilt angle
      rotSpeed: (Math.random() - 0.5) * 20,
      vy: this.buoyancy + (Math.random() - 0.5) * 1.2,
      vx: this.windSpeed + (Math.random() - 0.5) * 0.6,
      alpha: 0.75,
      growRate: 0.12 + Math.random() * 0.08,
      age: 0,
      maxAge: 7.5,
    });
  }

  update(dt) {
    // 1. Spawner
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnPuff();
    }

    // 2. Update each smoke puff: Translation + Dilation + Rotation + Fade
    this.puffs.forEach(p => {
      p.age += dt;

      // Translasi ke atas (apung) & samping (angin)
      p.y += p.vy * dt;
      p.x += p.vx * dt;

      // Dilatasi membesar seiring naik
      p.rx += p.growRate * dt * 4;
      p.ry += p.growRate * dt * 3;

      // Rotasi pelan
      p.angle += p.rotSpeed * dt;

      // Pudar berkurang
      p.alpha = Math.max(0, 0.75 * (1.0 - p.age / p.maxAge));
    });

    // Remove dead puffs
    this.puffs = this.puffs.filter(p => p.alpha > 0.02 && p.y < 34);
  }

  step() {
    this.update(0.12);
  }

  draw(ctx, cs, half, total) {
    const toCanvas = (x, y) => ({
      cx: (x + half) * cs + cs / 2,
      cy: (half - y) * cs + cs / 2,
    });

    // 1. Draw Emitter Chimney
    const s = toCanvas(this.source.x, this.source.y);
    ctx.save();
    ctx.fillStyle = '#444466';
    ctx.fillRect(s.cx - 6, s.cy, 12, 16);
    ctx.strokeStyle = '#666688';
    ctx.strokeRect(s.cx - 6, s.cy, 12, 16);
    ctx.restore();

    // 2. Draw Multi-Ellipse Smoke Puffs
    this.puffs.forEach(p => {
      const pos = toCanvas(p.x, p.y);
      const pxRx = p.rx * cs;
      const pxRy = p.ry * cs;
      const rad = (p.angle * Math.PI) / 180;

      ctx.save();
      ctx.translate(pos.cx, pos.cy);
      ctx.rotate(rad);

      // Gradient radial puff
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(pxRx, pxRy));
      grad.addColorStop(0, `rgba(180, 190, 210, ${p.alpha * 0.45})`);
      grad.addColorStop(0.6, `rgba(140, 150, 175, ${p.alpha * 0.25})`);
      grad.addColorStop(1, 'rgba(100, 110, 130, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, pxRx, pxRy, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle outline of the ellipse
      ctx.strokeStyle = `rgba(180, 190, 220, ${p.alpha * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, pxRx, pxRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  getCode() {
    return [
      '// === SEBARAN ASAP: MULTI-ELLIPSE SPREAD (C#) ===',
      'public class SmokePuff',
      '{',
      '    public Vector2 Pos;          // Koordinat pusat elips',
      '    public double Rx = 1.8;      // Jari-jari semi-mayor',
      '    public double Ry = 1.2;      // Jari-jari semi-minor',
      '    public double Angle = 0;     // Sudut rotasi tilt',
      '    public double Vy = 4.2;      // Kecepatan apung ke atas',
      '    public double Vx = 0.8;      // Drift angin samping',
      '    public double Alpha = 0.8;   // Opasitas',
      '',
      '    public void Update(double dt)',
      '    {',
      '        // 1. Translasi ke atas (apung) & angin',
      '        Pos.Y += Vy * dt;',
      '        Pos.X += Vx * dt;',
      '',
      '        // 2. Dilatasi (asap mengembang semakin tinggi)',
      '        Rx += 0.5 * dt;',
      '        Ry += 0.4 * dt;',
      '',
      '        // 3. Pudar (alpha decay)',
      '        Alpha = Math.Max(0.0, Alpha - 0.1 * dt);',
      '    }',
      '',
      '    public void Render(Graphics g)',
      '    {',
      '        DrawMidpointEllipse(Pos.X, Pos.Y, Rx, Ry, Angle, Alpha);',
      '    }',
      '}',
    ];
  }

  getInspectorHtml() {
    return `
      <div class="inspector-box">
        <div class="inspector-row">
          <span class="ins-label">Gumpalan Aktif:</span>
          <span class="ins-val highlight">${this.puffs.length} elips</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Kecepatan Apung (Vy):</span>
          <span class="ins-val">${this.buoyancy} blok/s</span>
        </div>
        <div class="inspector-row">
          <span class="ins-label">Angin Samping (Vx):</span>
          <span class="ins-val">${this.windSpeed} blok/s</span>
        </div>

        <div class="inspector-section-title">🌬️ Kontrol Angin & Emisi:</div>
        <div class="slider-control-group">
          <label>Kecepatan Angin:</label>
          <input type="range" id="smoke-wind-slider" min="-20" max="20" value="${this.windSpeed * 10}">
          <span class="slider-val" id="smoke-wind-val">${this.windSpeed}</span>
        </div>
        <div class="slider-control-group">
          <label>Gaya Apung (Naik):</label>
          <input type="range" id="smoke-buoyancy-slider" min="10" max="80" value="${this.buoyancy * 10}">
          <span class="slider-val" id="smoke-buoyancy-val">${this.buoyancy}</span>
        </div>
        <div class="ins-hint">💡 Gabungan Midpoint Ellipse dengan translasi vertikal dan dilatasi berkelanjutan.</div>
      </div>
    `;
  }
}

// ============================================================
// ANIMATION MANAGER (SINGLETON CONTROLLER)
// ============================================================

export class AnimationManager {
  constructor() {
    this.animations = {
      radar: new RadarAnimation(),
      kinematic: new KinematicAnimation(),
      explosion: new ExplosionAnimation(),
      smoke: new SmokeAnimation(),
    };
    this.currentKey = 'radar';
    this.running = false;
    this.animFrameId = null;
    this.lastTime = 0;
    this.grid = null;
    this.els = null;
  }

  init(grid, els) {
    this.grid = grid;
    this.els = els;
    this.setupListeners();
  }

  getCurrent() {
    return this.animations[this.currentKey];
  }

  switchAnimation(key) {
    if (!this.animations[key]) return;
    this.currentKey = key;

    // Reset current animation
    const anim = this.getCurrent();
    anim.reset();

    // Trigger initial explosion if explosion
    if (key === 'explosion') {
      anim.triggerExplosion(0, 0);
    }

    this.renderUI();

    // Render grid overlay
    if (this.grid) {
      this.grid.clearPixels();
      this.grid.setOverlay((ctx, cs, half, total) => {
        anim.draw(ctx, cs, half, total);
      });
      this.grid.render();
    }

    if (!this.running) {
      this.play();
    }
  }

  play() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  pause() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  togglePlay() {
    if (this.running) this.pause();
    else this.play();
  }

  step() {
    this.pause();
    const anim = this.getCurrent();
    if (anim) {
      anim.step();
      this.renderUI();
      if (this.grid) this.grid.render();
    }
  }

  reset() {
    this.pause();
    const anim = this.getCurrent();
    if (anim) {
      anim.reset();
      if (this.currentKey === 'explosion') anim.triggerExplosion(0, 0);
      this.renderUI();
      if (this.grid) this.grid.render();
    }
  }

  _loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const anim = this.getCurrent();
    if (anim) {
      anim.update(dt);
      if (this.grid) this.grid.render();
      // Periodically update inspector text
      this.updateInspectorOnly();
    }

    this.animFrameId = requestAnimationFrame(() => this._loop());
  }

  renderUI() {
    const anim = this.getCurrent();
    if (!anim) return;

    // 1. Sidebar Active State
    if (this.els.animSidebar) {
      this.els.animSidebar.querySelectorAll('.anim-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.anim === this.currentKey);
      });
    }

    // 2. Code Panel (Column 2)
    if (this.els.animCodeContainer) {
      const lines = anim.getCode();
      this.els.animCodeContainer.innerHTML = lines
        .map((l, i) => `
          <div class="code-line">
            <span class="line-num">${String(i + 1).padStart(2, ' ')}</span>
            <span class="line-code">${this._escapeHtml(l)}</span>
          </div>
        `)
        .join('');
    }

    // 3. Inspector Panel (Column 3)
    if (this.els.animInspectorPanel) {
      this.els.animInspectorPanel.innerHTML = anim.getInspectorHtml();
      this._wireInspectorEvents();
    }

    // 4. Info Bar
    if (this.els.infoBar) {
      this.els.infoBar.innerHTML = `
        <span class="info-item"><strong>Animasi:</strong> ${anim.icon} ${anim.name}</span>
        <span class="info-sep">|</span>
        <span class="info-item"><strong>Mode:</strong> Showcase Interaktif</span>
        <span class="info-sep">|</span>
        <span class="info-item"><strong>Primitif:</strong> Transformasi 2D + DDA/Midpoint</span>
      `;
    }
  }

  updateInspectorOnly() {
    // Light weight update of numerical values without rebinding DOM
    const anim = this.getCurrent();
    if (!anim || !this.els.animInspectorPanel) return;

    if (this.currentKey === 'radar') {
      const angleEl = this.els.animInspectorPanel.querySelector('.ins-val.highlight');
      if (angleEl) angleEl.textContent = `${Math.round(anim.angle)}°`;
    } else if (this.currentKey === 'kinematic') {
      const posEl = this.els.animInspectorPanel.querySelector('.ins-val.highlight');
      if (posEl) posEl.textContent = `(${anim.pos.x}, ${anim.pos.y})`;
    } else if (this.currentKey === 'explosion') {
      // update text
    } else if (this.currentKey === 'smoke') {
      const countEl = this.els.animInspectorPanel.querySelector('.ins-val.highlight');
      if (countEl) countEl.textContent = `${anim.puffs.length} elips`;
    }
  }

  _wireInspectorEvents() {
    if (!this.els.animInspectorPanel) return;

    // Kinematic D-Pad
    this.els.animInspectorPanel.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.dir;
        this.animations.kinematic.requestDirection(dir);
        if (!this.running) this.play();
        this.renderUI();
        if (this.grid) this.grid.render();
      });
    });

    // Explosion Trigger Button
    const trigBtn = this.els.animInspectorPanel.querySelector('#btn-trigger-explosion');
    if (trigBtn) {
      trigBtn.addEventListener('click', () => {
        this.animations.explosion.triggerExplosion(0, 0);
        this.renderUI();
        if (this.grid) this.grid.render();
      });
    }

    // Smoke Wind Slider
    const windSlider = this.els.animInspectorPanel.querySelector('#smoke-wind-slider');
    const windVal = this.els.animInspectorPanel.querySelector('#smoke-wind-val');
    if (windSlider && windVal) {
      windSlider.addEventListener('input', () => {
        const v = parseFloat(windSlider.value) / 10;
        this.animations.smoke.windSpeed = v;
        windVal.textContent = String(v);
      });
    }

    // Smoke Buoyancy Slider
    const buoySlider = this.els.animInspectorPanel.querySelector('#smoke-buoyancy-slider');
    const buoyVal = this.els.animInspectorPanel.querySelector('#smoke-buoyancy-val');
    if (buoySlider && buoyVal) {
      buoySlider.addEventListener('input', () => {
        const v = parseFloat(buoySlider.value) / 10;
        this.animations.smoke.buoyancy = v;
        buoyVal.textContent = String(v);
      });
    }
  }

  setupListeners() {
    // Keyboard controls for Kinematic Movement (Arrow Keys & WASD)
    window.addEventListener('keydown', (e) => {
      if (this.currentKey !== 'kinematic') return;
      const k = e.key.toLowerCase();
      let dir = null;
      if (k === 'arrowup' || k === 'w') dir = 'up';
      else if (k === 'arrowright' || k === 'd') dir = 'right';
      else if (k === 'arrowdown' || k === 's') dir = 'down';
      else if (k === 'arrowleft' || k === 'a') dir = 'left';

      if (dir) {
        e.preventDefault();
        this.animations.kinematic.requestDirection(dir);
        if (!this.running) this.play();
        this.renderUI();
        if (this.grid) this.grid.render();
      }
    });

    // Canvas click interaction for active animations
    if (this.grid && this.grid.canvas) {
      this.grid.canvas.addEventListener('click', (e) => {
        if (!this.grid.hoverCell) return;
        const { x, y } = this.grid.hoverCell;

        if (this.currentKey === 'radar') {
          this.animations.radar.addTarget(x, y);
          this.renderUI();
          this.grid.render();
        } else if (this.currentKey === 'explosion') {
          this.animations.explosion.triggerExplosion(x, y);
          this.renderUI();
          this.grid.render();
        } else if (this.currentKey === 'kinematic') {
          const kAnim = this.animations.kinematic;
          const lastPos = kAnim._getLastPlannedPos();
          const dx = x - lastPos.x;
          const dy = y - lastPos.y;
          if (dx !== 0 || dy !== 0) {
            let dir = null;
            if (Math.abs(dx) >= Math.abs(dy)) {
              dir = dx > 0 ? 'right' : 'left';
            } else {
              dir = dy > 0 ? 'up' : 'down';
            }
            if (dir) {
              kAnim.requestDirection(dir);
              if (!this.running) this.play();
              this.renderUI();
              this.grid.render();
            }
          }
        }
      });
    }
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export const animationManager = new AnimationManager();
