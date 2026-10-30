// Fully synthesized sound effects (no files needed)
export class Sfx {
  constructor() { this.ctx = null; this.volume = 0.7; this.muted = false; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain(); this.master.gain.value = this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp); comp.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // engine
    this.eng = this.ctx.createOscillator(); this.eng.type = 'sawtooth'; this.eng.frequency.value = 40;
    this.eng2 = this.ctx.createOscillator(); this.eng2.type = 'square'; this.eng2.frequency.value = 20;
    this.engF = this.ctx.createBiquadFilter(); this.engF.type = 'lowpass'; this.engF.frequency.value = 180;
    this.engG = this.ctx.createGain(); this.engG.gain.value = 0.0;
    this.eng.connect(this.engF); this.eng2.connect(this.engF); this.engF.connect(this.engG); this.engG.connect(this.master);
    this.eng.start(); this.eng2.start();
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  engine(speed, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = Math.min(1, Math.abs(speed) / 9);
    this.eng.frequency.setTargetAtTime(38 + s * 45, t, 0.1);
    this.eng2.frequency.setTargetAtTime(19 + s * 22, t, 0.1);
    this.engG.gain.setTargetAtTime(on ? 0.05 + s * 0.08 : 0, t, 0.2);
  }
  _noise(dur, { freq = 800, q = 0.7, type = 'lowpass', vol = 0.5, attack = 0.002, decay = dur, sweepTo = null, pan = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    src.connect(f); f.connect(g);
    if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(this.master); } else g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  _tone(freq, dur, { type = 'sine', vol = 0.3, to = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  cannon() { this._noise(1.2, { freq: 900, sweepTo: 60, vol: 0.9, decay: 1.1 }); this._tone(70, 0.5, { type: 'sine', vol: 0.8, to: 30 }); }
  mg() { this._noise(0.09, { freq: 2500, type: 'bandpass', q: 1.2, vol: 0.35 }); }
  rocket() { this._noise(0.8, { freq: 1500, type: 'bandpass', q: 0.8, vol: 0.4, sweepTo: 400, attack: 0.05 }); }
  rail() { this._tone(1800, 0.5, { type: 'sawtooth', vol: 0.2, to: 120 }); this._noise(0.4, { freq: 4000, type: 'highpass', vol: 0.3 }); this._tone(60, 0.6, { vol: 0.6, to: 30 }); }
  explosion(size = 1, pan = 0, vol = 1) { this._noise(0.9 + size * 0.6, { freq: 600, sweepTo: 50, vol: Math.min(1, 0.5 * size) * vol, decay: 0.8 + size * 0.6, pan }); this._tone(55, 0.6 + size * 0.2, { vol: 0.5 * vol * Math.min(1.5, size), to: 25 }); }
  enemyShot(pan, kind) {
    if (kind === 'rocket') this._noise(0.6, { freq: 1200, type: 'bandpass', vol: 0.25, sweepTo: 500, pan });
    else if (kind === 'shell') { this._noise(0.9, { freq: 700, sweepTo: 80, vol: 0.5, pan }); }
    else this._noise(0.07, { freq: 3200, type: 'bandpass', q: 2, vol: 0.12, pan });
  }
  hit() { this._noise(0.12, { freq: 3000, type: 'highpass', vol: 0.25 }); this._tone(300, 0.08, { type: 'square', vol: 0.05 }); }
  ping() { this._tone(2400, 0.15, { type: 'triangle', vol: 0.12, to: 1800 }); }
  pickup() { [660, 880, 1320].forEach((f, i) => this._tone(f, 0.18, { type: 'triangle', vol: 0.18, delay: i * 0.07 })); }
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.3, { type: 'square', vol: 0.09, delay: i * 0.09 })); }
  mission() { [392, 523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.4, { type: 'triangle', vol: 0.18, delay: i * 0.12 })); }
  click() { this._tone(900, 0.05, { type: 'square', vol: 0.06 }); }
  scream() { this._tone(500 + Math.random() * 200, 0.35, { type: 'sawtooth', vol: 0.04, to: 200 }); }
}
