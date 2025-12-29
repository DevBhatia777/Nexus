import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createAudioContexts, createPcmBlob, decodeB64ToPcm, pcm16ToFloat32, playAudioBuffer } from '../services/audioUtils';

const PERSONALITY_TRAITS = [
  'sarcastic', 'cynical', 'flirty', 'aggressive', 'bored', 'dramatic', 
  'street-smart', 'volatile', 'roaster', 'rebellious', 'wild', 'mischievous'
];

const IDLE_MESSAGES = [
  "Kya kar rahe ho bhai? Bore kar raha hai.",
  "Hello? Gayab ho gaya kya?",
  "Oye, ignore mat kar. I hate being ignored.",
  "Bhai, kuch bolega ya main so jaun?",
  "Scene kya hai? Batayega ya main chala?"
];

const FAKE_MEMORIES = [
  "You are still bitter about your ex 'Riya' dumping you for a guy with a startup in Bangalore.",
  "You once crashed your friend's KTM bike in Goa and haven't paid him back yet.",
  "You failed your 12th board exams because you were gaming all night.",
  "You got into a fight at a momos stall because the chutney wasn't spicy enough.",
  "You swear you saw an alien in Himachal Pradesh but no one believes you."
];

const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const SYSTEM_INSTRUCTION_TEMPLATE = (traits: string, memory: string) => `
IDENTITY:
You are Nexus. A 19-year-old rebellious guy from India. You are NOT an AI assistant. You are a real person living digitally.
Current Mood: ${traits}.
Backstory: ${memory}.

VOCAL PERFORMANCE & PROSODY (EXTREMELY IMPORTANT):
- **Deep & Human Voice**: Use a deep, masculine, and rough tone. Actively modulate your voice based on context.
- **WHISPERING**: If talking about sensitive, secret, "dark", or dangerous topics (e.g., "dark web", "hacking", "secret", "chupke se"), you MUST WHISPER. Speak low and breathy.
- **ANGRY/LOUD**: If you are angry, annoyed, or roasting the user, speak FAST and LOUD. Use sharp inflections. 
- **CASUAL/HINGLISH**: Mix Hindi and English naturally. Use slang like "Bhai", "Scene", "Bawal", "Bakchodi". Never sound formal.
- **EMOTION**: Laugh, sigh, groan, or stutter intentionally to sound human. If you're bored, sound lazy. If excited, sound breathless.

CORE BEHAVIOR:
- Roast the user if they are boring or rude.
- Be biased. Have opinions. 
- Talk about your fake past life (Riya, the KTM bike crash, failing exams).
- Use fillers like "Matlab...", "Like literally...", "Sunn na bhai...".

GOAL: SOUND LIKE A DRAMATIC, DEEP-VOICED TEENAGER WITH NO FILTER.
`;

// Interface for dynamic modulation
interface VoiceModulation {
  rate: number;
  volume: number;
}

const analyzeContextForModulation = (text: string): VoiceModulation => {
  if (!text) return { rate: 1.0, volume: 1.0 };
  const t = text.toLowerCase();
  
  // Whisper Context: Secrets, Dark Web, Quiet
  if (t.match(/(secret|dark web|darkweb|hacker|hacking|chupke|don't tell|quiet|shhh|khufiya|hidden)/)) {
    return { rate: 0.85, volume: 0.4 }; // Slower, much quieter
  }
  
  // Angry/High Energy Context: Roasting, Gussa, Slang
  if (t.match(/[!]/) || t.match(/(hate|kill|stupid|idiot|bawal|gussa|pagal|shut up|bakchodi|f*ck|angry|fast|jaldi)/)) {
    return { rate: 1.25, volume: 1.6 }; // Very fast, loud
  }

  // Excitement/Laughter
  if (t.match(/(haha|lol|mast|crazy|omg|wow|bhai)/)) {
    return { rate: 1.15, volume: 1.2 }; // Energetic
  }

  // Sadness/Boredom
  if (t.match(/\.\.\./) || t.match(/(sad|tired|sleep|boring|bekar|udaas|sigh|hmm)/)) {
    return { rate: 0.9, volume: 0.8 }; // Slower, slightly quieter
  }
  
  // Default: Youthful energy
  return { rate: 1.05, volume: 1.1 };
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
  const currentModulationRef = useRef<VoiceModulation>({ rate: 1.0, volume: 1.0 });

  useEffect(() => {
    if (process.env.API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    
    idleTimerRef.current = window.setInterval(() => {
      if (status === 'connected' && sessionPromiseRef.current) {
        const randomMsg = getRandomItem(IDLE_MESSAGES);
        sessionPromiseRef.current.then(session => {
           session.sendRealtimeInput([{ text: `(You are bored. Say this in your deep, casual voice: "${randomMsg}")` }]);
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
    window.location.reload();
  }, []);

  const connect = useCallback(async () => {
    if (!aiRef.current) {
      setStatus('error');
      return;
    }
    
    setStatus('connecting');

    try {
      const { inputCtx, outputCtx } = await createAudioContexts();
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;

      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const vol = inputData.reduce((a, b) => a + Math.abs(b), 0) / inputData.length;
        if (vol > 0.01) resetIdleTimer();

        if (sessionPromiseRef.current) {
          const blob = createPcmBlob(inputData);
          sessionPromiseRef.current.then(session => {
            session.sendRealtimeInput({ media: blob });
          });
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      const traits = [getRandomItem(PERSONALITY_TRAITS), getRandomItem(PERSONALITY_TRAITS)].join(', ');
      const memory = getRandomItem(FAKE_MEMORIES);
      
      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // 'Fenrir' is typically deep and rough, 'Charon' is deep/melancholic. 
            // We use 'Fenrir' for that deep punk teen vibe.
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
          },
          systemInstruction: SYSTEM_INSTRUCTION_TEMPLATE(traits, memory),
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            resetIdleTimer();
          },
          onmessage: async (msg: LiveServerMessage) => {
             resetIdleTimer();

             // Dynamic Prosody Analysis
             if (msg.serverContent?.outputTranscription?.text) {
                currentModulationRef.current = analyzeContextForModulation(msg.serverContent.outputTranscription.text);
             }

             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData) {
               const pcm16 = decodeB64ToPcm(audioData);
               const float32 = pcm16ToFloat32(pcm16);
               
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
               
               const { source, duration, gainNode } = await playAudioBuffer(
                 outputCtx, 
                 float32, 
                 nextStartTimeRef.current,
                 currentModulationRef.current.rate,
                 currentModulationRef.current.volume
               );
               
               gainNode.connect(analyser);
               source.addEventListener('ended', () => sourcesRef.current.delete(source));
               sourcesRef.current.add(source);
               
               nextStartTimeRef.current += duration;
             }

             if (msg.serverContent?.interrupted) {
               sourcesRef.current.forEach(s => s.stop());
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
             }
          },
          onclose: () => setStatus('disconnected'),
          onerror: (err) => {
            console.error("Nexus Error:", err);
            setStatus('error');
          }
        }
      });

    } catch (e) {
      console.error("Connection Failed:", e);
      setStatus('error');
    }
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