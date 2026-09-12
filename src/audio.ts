import { InstrumentType, NoiseType } from './types';

const SOUND_EFFECTS = {
  correct: {
    type: 'sine',
    frequencies: [523.25, 659.25, 783.99], // C5, E5, G5 (major chord)
    durations: [0.1, 0.1, 0.4]
  },
  incorrect: {
    type: 'sine',
    frequencies: [392.00, 369.99], // G4, F#4 (dissonant)
    durations: [0.1, 0.3]
  },
  gameOver: {
    type: 'sine',
    frequencies: [523.25, 392.00, 329.63, 261.63], // C5, G4, E4, C4 (descending)
    durations: [0.2, 0.2, 0.2, 0.5]
  }
};

// One engine per mounted app; audio starts only after the user's Start gesture.
export class AudioEngine {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private noise: AudioBufferSourceNode | null = null;

  async init() {
    if (!this.context || this.context.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is unavailable');
      this.context = new AudioContextClass();
      this.output = this.context.createGain();
      this.output.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  private track<T extends AudioScheduledSourceNode>(source: T): T {
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
    };
    return source;
  }

  stop() {
    this.sources.forEach(source => {
      source.stop();
      source.disconnect();
    });
    this.sources.clear();
    this.noise = null;
  }

  close() {
    this.stop();
    const context = this.context;
    this.context = null;
    this.output = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }

  startNoise(type: NoiseType) {
    if (this.noise || type === 'none' || !this.context) return;
    const source = this.track(this.context.createBufferSource());
    const gain = this.context.createGain();
    source.buffer = this.createNoiseBuffer(type);
    source.loop = true;
    gain.gain.value = 0.05;
    source.connect(gain);
    gain.connect(this.output!);
    source.start();
    this.noise = source;
  }

  private createNoiseBuffer(type: 'white' | 'pink'): AudioBuffer {
    const audioContext = this.context;
    if (!audioContext) throw new Error('Audio context not initialized');
    
    const bufferSize = audioContext.sampleRate * 2; // 2 seconds of noise
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    if (type === 'white') {
      // White noise: equal power across all frequencies
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      // Pink noise: power decreases by 3dB per octave
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // Scale down
        b6 = white * 0.115926;
      }
    }
    
    return buffer;
  }

  playTone(frequency: number, instrument: InstrumentType, duration = 1) {
    const audioContext = this.context;
    if (!audioContext) return;
    
    const gainNode = audioContext.createGain();
    gainNode.connect(this.output!);
    
    switch (instrument) {
      case 'piano':
        // Piano: fundamental + harmonics with exponential decay
        [1, 2, 3, 4, 5].forEach((harmonic) => {
          const osc = this.track(audioContext!.createOscillator());
          const harmGain = audioContext!.createGain();
          
          osc.frequency.value = frequency * harmonic;
          osc.type = 'sine';
          
          const amplitude = 0.3 / Math.pow(harmonic, 0.8);
          harmGain.gain.setValueAtTime(0, audioContext!.currentTime);
          harmGain.gain.linearRampToValueAtTime(amplitude, audioContext!.currentTime + 0.01);
          harmGain.gain.exponentialRampToValueAtTime(0.001, audioContext!.currentTime + duration);
          
          osc.connect(harmGain);
          harmGain.connect(gainNode);
          osc.start();
          osc.stop(audioContext!.currentTime + duration);
        });
        break;
        
      case 'violin':
        // Violin: sawtooth with slight vibrato and bow noise
        const violinOsc = this.track(audioContext.createOscillator());
        const violinGain = audioContext.createGain();
        const vibratoOsc = this.track(audioContext.createOscillator());
        const vibratoGain = audioContext.createGain();
        
        violinOsc.type = 'sawtooth';
        violinOsc.frequency.value = frequency;
        
        // Add subtle vibrato
        vibratoOsc.frequency.value = 5; // 5Hz vibrato
        vibratoGain.gain.value = 2; // Small frequency modulation
        vibratoOsc.connect(vibratoGain);
        vibratoGain.connect(violinOsc.frequency);
        
        violinGain.gain.setValueAtTime(0, audioContext.currentTime);
        violinGain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.1);
        violinGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + duration - 0.1);
        violinGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
        
        violinOsc.connect(violinGain);
        violinGain.connect(gainNode);
        violinOsc.start();
        vibratoOsc.start();
        violinOsc.stop(audioContext.currentTime + duration);
        vibratoOsc.stop(audioContext.currentTime + duration);
        break;
        
      case 'flute':
        // Flute: sine wave with breath noise and harmonics
        const fluteOsc = this.track(audioContext.createOscillator());
        const fluteGain = audioContext.createGain();
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        // Generate breath noise
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() * 2 - 1) * 0.02;
        }
        
        const noiseSource = this.track(audioContext.createBufferSource());
        const noiseGain = audioContext.createGain();
        const noiseFilter = audioContext.createBiquadFilter();
        
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = frequency * 2;
        noiseGain.gain.value = 0.1;
        
        fluteOsc.type = 'sine';
        fluteOsc.frequency.value = frequency;
        
        fluteGain.gain.setValueAtTime(0, audioContext.currentTime);
        fluteGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        fluteGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + duration - 0.05);
        fluteGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
        
        fluteOsc.connect(fluteGain);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(gainNode);
        fluteGain.connect(gainNode);
        
        fluteOsc.start();
        noiseSource.start();
        fluteOsc.stop(audioContext.currentTime + duration);
        noiseSource.stop(audioContext.currentTime + duration);
        break;
        
      default:
        // Basic waveforms (sine, sawtooth, square, triangle)
        const oscillator = this.track(audioContext.createOscillator());
        const basicGain = audioContext.createGain();
        
        oscillator.type = instrument as OscillatorType;
        oscillator.frequency.value = frequency;
        
        basicGain.gain.setValueAtTime(0, audioContext.currentTime);
        basicGain.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
        basicGain.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + duration - 0.05);
        basicGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
        
        oscillator.connect(basicGain);
        basicGain.connect(gainNode);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
        break;
    }
  }

  playEffect(effectName: keyof typeof SOUND_EFFECTS) {
    const audioContext = this.context;
    if (!audioContext || !SOUND_EFFECTS[effectName]) return;
    
    const effect = SOUND_EFFECTS[effectName];
    let startTime = audioContext.currentTime;
    
    effect.frequencies.forEach((freq: number, index: number) => {
      if (!audioContext) return;
      const oscillator = this.track(audioContext.createOscillator());
      const gainNode = audioContext.createGain();
      
      oscillator.type = effect.type as OscillatorType;
      oscillator.frequency.value = freq;
      
      // Apply envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + effect.durations[index] - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + effect.durations[index]);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.output!);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + effect.durations[index]);
      
      startTime += effect.durations[index];
    });
  }
}
