export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AudioVisualizerData {
  input: Uint8Array;
  output: Uint8Array;
}

export interface NexusState {
  isConnected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  mood: string;
}

export enum NexusEvents {
  AudioData = 'audio_data',
  TurnComplete = 'turn_complete',
  Interrupted = 'interrupted',
}