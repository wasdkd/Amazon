import type { TransportMode } from '../types/geo';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playVehicleHorn(mode: TransportMode): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (mode === 'hsr') {
    // Classic dual-tone high-speed train horn
    [293.66, 369.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.42);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.68);
    });
  } else if (mode === 'flight') {
    // Cabin seat-belt / chime ding-dong
    [880, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.16;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.48);
    });
  } else {
    // Crisp dual-tone car horn
    [415.3, 523.25].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }
}
