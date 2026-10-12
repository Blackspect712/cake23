// Web Audio API ambient soundscape & interaction sounds
class SoundscapeEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.droneNodes = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  toggle() {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stopDrone();
      this.isPlaying = false;
    } else {
      this.startDrone();
      this.isPlaying = true;
      this.playChime(587.33); // D5 pleasant chime
    }
    return this.isPlaying;
  }

  startDrone() {
    if (!this.ctx) return;
    this.stopDrone();

    // Warm chord notes (D2, A2, F#3, A3)
    const freqs = [73.42, 110.00, 185.00, 220.00];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Warm lowpass filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + idx * 60, this.ctx.currentTime);

      // Low volume for gentle background presence
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04 / (idx + 1), this.ctx.currentTime + 2.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      this.droneNodes.push({ osc, gain });
    });
  }

  stopDrone() {
    if (!this.ctx) return;
    this.droneNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
        setTimeout(() => {
          try { osc.stop(); } catch (e) {}
        }, 900);
      } catch (e) {}
    });
    this.droneNodes = [];
  }

  playChime(freq = 440, duration = 1.2) {
    if (!this.ctx || !this.isPlaying) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playClick() {
    if (!this.ctx || !this.isPlaying) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }
}

export const soundscape = new SoundscapeEngine();
