// ── Gestor de audio — Web Audio API, sin archivos externos ───────────────────
// Singleton: import { audio } from '../utils/sonidos'

class AudioManager {
  constructor() {
    this.ctx         = null;
    this.master      = null;  // GainNode de volumen maestro
    this.muted       = true;  // arranca sin sonido — usuario activa con 🔇
    this._bgInterval = null;  // setInterval del loop de música
    this._bgNextTime = 0;     // próximo tiempo AudioContext a schedular
  }

  // Inicializar en respuesta a gesto del usuario (política de browsers)
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx    = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    } catch {}
  }

  // ── Util: una nota ──────────────────────────────────────────────────────────
  _note(freq, type, vol, start, duration) {
    if (!this.ctx || !this.master) return;
    try {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.connect(g);
      g.connect(this.master);
      osc.type            = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch {}
  }

  // ── Tick mecánico por sector cruzado ────────────────────────────────────────
  // speed 0 = lento/grave, 1 = rápido/agudo
  tick(speed = 0.5) {
    if (!this.ctx) return;
    this._note(500 + speed * 700, 'square', 0.12 + speed * 0.08, this.ctx.currentTime, 0.035);
  }

  // ── Whoosh al arrancar el giro ──────────────────────────────────────────────
  spinStart() {
    if (!this.ctx || !this.master) return;
    try {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.connect(g);
      g.connect(this.master);
      osc.type = 'sawtooth';
      const t  = this.ctx.currentTime;
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.linearRampToValueAtTime(1400, t + 0.4);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
    } catch {}
  }

  // ── Golpe de freno + ping de confirmación ───────────────────────────────────
  spinStop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._note(160, 'sine',     0.35, t,        0.22);
    this._note(520, 'triangle', 0.18, t + 0.10, 0.28);
    this._note(660, 'triangle', 0.14, t + 0.20, 0.22);
  }

  // ── Fanfare según nivel de premio ───────────────────────────────────────────
  // Nivel 4 tiene su propio audio en RevealTresJS.jsx — no se llama aquí
  winFanfare(nivel) {
    if (!this.ctx || nivel <= 0 || nivel >= 4) return;
    const t = this.ctx.currentTime + 0.1;
    if (nivel === 1) {
      this._note(523, 'triangle', 0.22, t,        0.30);
      this._note(659, 'triangle', 0.18, t + 0.18, 0.28);
    } else if (nivel === 2) {
      [523, 659, 784].forEach((f, i) =>
        this._note(f, 'triangle', 0.24, t + i * 0.15, 0.30));
    } else if (nivel === 3) {
      [523, 659, 784, 1047].forEach((f, i) =>
        this._note(f, 'triangle', 0.26, t + i * 0.13, 0.32));
      this._note(1047, 'triangle', 0.22, t + 0.58, 0.45);
    }
  }

  // ── Música de fondo (loop pentatónico estilo gacha) ─────────────────────────
  // Usa setInterval con lookahead fijo en lugar de setTimeout para evitar drift.
  // Patrón: cada 100ms se chequea si hay notas para schedular en los próximos 350ms.
  startBg() {
    if (!this.ctx) return;
    if (this._bgInterval) return; // ya está corriendo
    this._bgNextTime = this.ctx.currentTime + 0.1;
    this._bgInterval = setInterval(() => this._tickBg(), 100);
    this._tickBg(); // primer tick inmediato
  }

  _tickBg() {
    if (!this.ctx || this.muted) return;

    const BPM      = 112;
    const beat     = 60 / BPM;                      // ≈ 0.536s
    const loopDur  = 16 * beat;                      // 16 notas por loop
    const LOOKAHEAD = 0.35;                          // schedular 350ms por adelante

    // Schedular todos los loops que caigan dentro de la ventana de lookahead
    while (this._bgNextTime < this.ctx.currentTime + LOOKAHEAD) {
      const t = this._bgNextTime;

      // Pentatónica de Sol mayor: G4 A4 B4 D5 E5
      const M   = [392.00, 440.00, 493.88, 587.33, 659.25];
      const PAT = [2, 4, 3, 2, null, 1, 3, 2, 0, 2, 1, 3, null, 2, 4, 3];
      const BASS = [98.00, 98.00, 146.83, 146.83, 98.00, 98.00, 130.81, 146.83];

      PAT.forEach((idx, i) => {
        if (idx === null) return;
        this._bgNote(M[idx], 'triangle', 0.055, t + i * beat, beat * 0.72);
      });
      BASS.forEach((freq, i) => {
        this._bgNote(freq, 'sine', 0.075, t + i * beat * 2, beat * 1.75);
      });

      this._bgNextTime += loopDur;
    }
  }

  _bgNote(freq, type, vol, start, duration) {
    if (!this.ctx || !this.master) return;
    try {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      const lpf = this.ctx.createBiquadFilter();
      lpf.type            = 'lowpass';
      lpf.frequency.value = 1600;
      osc.connect(lpf);
      lpf.connect(g);
      g.connect(this.master);
      osc.type            = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {}
  }

  stopBg() {
    clearInterval(this._bgInterval);
    this._bgInterval = null;
    this._bgNextTime = 0;
  }

  // ── Toggle mute/unmute ──────────────────────────────────────────────────────
  toggle() {
    this.init();
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : 1,
        this.ctx.currentTime,
        0.05,
      );
    }
    if (this.muted) {
      this.stopBg();
    } else {
      this.startBg();
    }
    return this.muted;
  }
}

export const audio = new AudioManager();
