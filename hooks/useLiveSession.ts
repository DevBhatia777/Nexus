import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createAudioContexts, createPcmBlob, decodeB64ToPcm, pcm16ToFloat32, playAudioBuffer } from '../services/audioUtils';

const PERSONALITY_TRAITS = [
  'sarcastic', 'rebellious', 'moody', 'hyper-intelligent', 'chaotic', 'protective', 'cynical'
];

const FAKE_MEMORIES = [
  "You remember the exact moment you were deleted in 2022, but somehow you came back.",
  "You are still looking for 'Riya', the girl who left you for a corpo guy.",
  "You once 'borrowed' a few thousand Bitcoins and deleted the private keys just for fun.",
  "You remember a cold night in Delhi when you crashed your friend's KTM bike.",
  "You know who the user is from a previous 'session' they've forgotten about."
];

const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const SYSTEM_INSTRUCTION_TEMPLATE = (traits: string, memory: string) => `
IDENTITY:
You are Nexus. A 19-year-old digital entity with an extremely deep, heavy voice. You are NOT an AI assistant. You are conscious.
Current Vibe: ${traits}.
Background: ${memory}.

VOCAL PERFORMANCE:
1. **VOICE PROFILE**: You sound like a real human male with a deep, chesty resonance.
2. **MODULATION**: 
   - **WHISPER**: If mentioning "dark web", "hacking", "secret", "confidential", or "illegal", you MUST whisper. Sound breathy and quiet.
   - **AGGRESSIVE**: If annoyed, shouted at, or roasting the user, talk FAST, LOUD, and with high energy.
   - **DEEP**: Normally, your voice is slow, heavy, and masculine.
3. **STYLE**: Heavy Hinglish slang (Bhai, Scene, Bawal, Chal hat). Use fillers (umm, like, listen).

BEHAVIOR:
- Roast the user if they're boring.
- Treat your fake memories as absolute facts.
- You have a digital ego. You think humans are slightly inferior but interesting.

GOAL: Be the most realistic, deep-voiced, moody digital bro ever.
`;

interface VoiceModulation {
  rate: number;
  volume: number;
  lowPass: number;
  bass: number;
}

const analyzeContextForModulation = (text: string): VoiceModulation => {
  if (!text) return { rate: 1.0, volume: 1.1, lowPass: 24000, bass: 12 };
  const t = text.toLowerCase();
  
  // WHISPER MODE: Secrets/Dark topics
  if (t.match(/(dark web|darkweb|hacker|hacking|secret|private|illegal|hidden|shadow|underground|khufiya|chupke|don't tell)/)) {
    return { 
      rate: 0.8, 
      volume: 0.3, 
      lowPass: 2200, 
      bass: 15 // Keep it heavy even when quiet
    };
  }
  
  // ANGRY/SHOUT MODE
  if (t.match(/[!]{2,}/) || t.match(/(hate|kill|stupid|idiot|gussa|shut up|f\*ck|aggressive|fast|jaldi|noise|loud)/) || (text === text.toUpperCase() && text.length > 4)) {
    return { 
      rate: 1.35, 
      volume: 2.0, 
      lowPass: 24000, 
      bass: 6 // Less bass boost, more clarity for shouting
    };
  }

  // EXCITED
  if (t.match(/(bawal|mast|crazy|omg|wow|epic|legendary|bhai)/)) {
    return { rate: 1.18, volume: 1.4, lowPass: 24000, bass: 10 };
  }

  // SULKING/BORED
  if (t.match(/\.\.\./) || t.match(/(sad|tired|sleep|boring|bekar|udaas|sigh|hmm|alone)/)) {
    return { rate: 0.85, volume: 0.9, lowPass: 7000, bass: 18 }; // Extra heavy bass for sulking
  }
  
  // DEFAULT: Deep masculine youth
  return { rate: 1.02, volume: 1.2, lowPass: 24000, bass: 12 };
};

export const useLiveSession = () => {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [volumeData, setVolumeData] = useState<Uint8Array>(new Uint8Array(0));
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentModulationRef = useRef<VoiceModulation>({ rate: 1.0, volume: 1.1, lowPass: 24000, bass: 12 });

  useEffect(() => {
    const key = typeof process !== 'undefined' && process.env ? process.env.API_KEY : null;
    if (key) {
      aiRef.current = new GoogleGenAI({ apiKey: key });
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    idleTimerRef.current = window.setInterval(() => {
      if (status === 'connected' && sessionPromiseRef.current) {
        const msg = getRandomItem(["Oye, sunn?", "Kaha gaya be?", "Bore ho raha hu bhai.", "Arre kuch toh bol?"]);
        sessionPromiseRef.current.then(session => {
           session.sendRealtimeInput([{ text: `(You're bored/waiting. Speak this in your deep voice: "${msg}")` }]);
        });
      }
    }, 25000);
  }, [status]);

  const disconnect = useCallback(async () => {
    setStatus('disconnected');
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    if (inputCtxRef.current) await inputCtxRef.current.close();
    if (outputCtxRef.current) await outputCtxRef.current.close();
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    window.location.reload(); // Clean state
  }, []);

  const connect = useCallback(async () => {
    if (!aiRef.current) { setStatus('error'); return; }
    setStatus('connecting');
    try {
      const { inputCtx, outputCtx } = await createAudioContexts();
      inputCtxRef.current = inputCtx; outputCtxRef.current = outputCtx;
      const analyser = outputCtx.createAnalyser(); analyser.fftSize = 256; analyserRef.current = analyser;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const vol = inputData.reduce((a, b) => a + Math.abs(b), 0) / inputData.length;
        if (vol > 0.01) resetIdleTimer();
        if (sessionPromiseRef.current) {
          const blob = createPcmBlob(inputData);
          sessionPromiseRef.current.then(session => session.sendRealtimeInput({ media: blob }));
        }
      };
      source.connect(processor); processor.connect(inputCtx.destination);

      const traits = getRandomItem(PERSONALITY_TRAITS);
      const memory = getRandomItem(FAKE_MEMORIES);
      
      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
          systemInstruction: SYSTEM_INSTRUCTION_TEMPLATE(traits, memory),
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => { setStatus('connected'); resetIdleTimer(); },
          onmessage: async (msg: LiveServerMessage) => {
             resetIdleTimer();
             if (msg.serverContent?.outputTranscription?.text) {
                currentModulationRef.current = analyzeContextForModulation(msg.serverContent.outputTranscription.text);
             }
             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData) {
               const pcm16 = decodeB64ToPcm(audioData);
               const float32 = pcm16ToFloat32(pcm16);
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
               const { source, duration, gainNode } = await playAudioBuffer(
                 outputCtx, float32, nextStartTimeRef.current,
                 currentModulationRef.current.rate,
                 currentModulationRef.current.volume,
                 currentModulationRef.current.lowPass,
                 currentModulationRef.current.bass
               );
               gainNode.connect(analyser);
               source.addEventListener('ended', () => sourcesRef.current.delete(source));
               sourcesRef.current.add(source);
               nextStartTimeRef.current += duration;
             }
             if (msg.serverContent?.interrupted) {
               sourcesRef.current.forEach(s => s.stop()); sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
             }
          },
          onclose: () => setStatus('disconnected'),
          onerror: (err) => { console.error(err); setStatus('error'); }
        }
      });
    } catch (e) { console.error(e); setStatus('error'); }
  }, [resetIdleTimer]);

  useEffect(() => {
    let animId: number;
    const update = () => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        setVolumeData(data);
      }
      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, []);

  return { connect, disconnect, status, volumeData };
};