import { Blob } from '@google/genai';

// Convert Float32 audio data (Web Audio API) to Int16 (PCM for Gemini)
export function float32ToPcm16(float32Arr: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Arr.length);
  for (let i = 0; i < float32Arr.length; i++) {
    // Clamp values to [-1, 1]
    const s = Math.max(-1, Math.min(1, float32Arr[i]));
    // Scale to 16-bit integer range
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
}

// Convert Int16 PCM data to Float32 (Web Audio API)
export function pcm16ToFloat32(int16Arr: Int16Array): Float32Array {
  const float32 = new Float32Array(int16Arr.length);
  for (let i = 0; i < int16Arr.length; i++) {
    const int = int16Arr[i];
    // Normalize to [-1, 1]
    float32[i] = int >= 0 ? int / 0x7FFF : int / 0x8000;
  }
  return float32;
}

export function encodePcmToB64(int16: Int16Array): string {
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeB64ToPcm(base64: string): Int16Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export function createPcmBlob(data: Float32Array): Blob {
  const pcm16 = float32ToPcm16(data);
  const b64 = encodePcmToB64(pcm16);
  return {
    data: b64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

export async function createAudioContexts() {
  const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000,
  });
  
  const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 24000, 
  });

  return { inputCtx, outputCtx };
}

export async function playAudioBuffer(
  ctx: AudioContext, 
  float32Data: Float32Array, 
  startTime: number,
  playbackRate: number = 1.0,
  volume: number = 1.0
): Promise<{ source: AudioBufferSourceNode, duration: number, gainNode: GainNode }> {
  const buffer = ctx.createBuffer(1, float32Data.length, 24000);
  buffer.copyToChannel(float32Data, 0);

  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  gainNode.gain.value = volume;

  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  source.start(startTime);
  
  return { source, duration: buffer.duration / playbackRate, gainNode };
}