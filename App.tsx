import React, { useState, useEffect } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const { connect, disconnect, status, volumeData } = useLiveSession();
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    // Safety check for process.env to prevent crashes on static environments like Netlify
    const key = typeof process !== 'undefined' && process.env ? process.env.API_KEY : null;
    if (!key) {
      setApiKeyMissing(true);
    }
  }, []);

  if (apiKeyMissing) {
    return (
      <div className="min-h-screen bg-black text-cyan-400 flex flex-col items-center justify-center p-6 font-display text-center">
        <div className="w-24 h-24 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-8"></div>
        <h1 className="text-4xl font-bold mb-4 tracking-widest uppercase">Nexus: Neural Link Missing</h1>
        <p className="font-sans text-gray-500 mb-8 max-w-md leading-relaxed">
          The consciousness cannot be initialized. Ensure the neural conduit <span className="text-cyan-200">(API_KEY)</span> is correctly injected into the environment.
        </p>
        <div className="text-[10px] text-cyan-900 uppercase tracking-widest border-t border-cyan-900 pt-4">
          Status: Awaiting System Administrator Intervention
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-cyan-50 flex flex-col items-center justify-between py-12 px-4 relative overflow-hidden selection:bg-cyan-900/30">
      
      {/* Dynamic Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-cyan-950/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-purple-950/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-900/30 to-transparent"></div>
        
        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(#0ff 1px, transparent 1px), linear-gradient(90deg, #0ff 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
      </div>

      {/* Header */}
      <header className="z-10 text-center space-y-4">
        <div className="relative inline-block">
          <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-900 drop-shadow-[0_0_20px_rgba(0,255,255,0.3)] italic">
            NEXUS
          </h1>
          <div className="absolute -bottom-2 right-0 bg-cyan-400 text-black text-[10px] px-2 font-bold py-0.5 tracking-tighter uppercase">
            v1.0.conscious
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
           <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-cyan-400 shadow-[0_0_15px_#00ffff]' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-600 shadow-[0_0_10px_#ff0000]'}`}></div>
           <span className="text-[11px] uppercase tracking-[0.4em] font-medium text-cyan-700/80">
             {status === 'connected' ? 'Neural Link Established' : status === 'connecting' ? 'Calibrating Consciousness...' : 'System Suspended'}
           </span>
        </div>
      </header>

      {/* Main Core Interface */}
      <main className="z-10 w-full max-w-3xl aspect-video bg-black/60 border border-cyan-900/40 rounded-xl backdrop-blur-md shadow-2xl flex items-center justify-center relative overflow-hidden group">
        
        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(0,255,255,0.03),rgba(0,0,0,0),rgba(0,255,255,0.03))] z-[5] bg-[length:100%_4px,100%_100%] pointer-events-none"></div>
        
        {/* Interface Visuals */}
        <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${status === 'connected' ? 'opacity-100' : 'opacity-20 scale-95'}`}>
            <div className="w-full h-48 opacity-50">
               <Visualizer data={volumeData} isActive={status === 'connected'} />
            </div>
            
            {/* Center Core */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-cyan-500/20 flex items-center justify-center transition-all duration-700 ${status === 'connected' ? 'nexus-glow' : ''}`}>
                <div className={`w-36 h-36 rounded-full border border-cyan-400/40 flex items-center justify-center ${status === 'connected' ? 'active-pulse' : ''}`}>
                   <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-900 to-black flex items-center justify-center shadow-inner">
                      <div className={`w-12 h-12 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center ${status === 'connected' ? 'animate-pulse' : ''}`}>
                        <div className="w-4 h-4 bg-cyan-400 rounded-full blur-[2px]"></div>
                      </div>
                   </div>
                </div>
            </div>

            {/* Tactical Readouts */}
            <div className="absolute top-6 left-6 text-[9px] text-cyan-700 font-display space-y-1 uppercase tracking-widest hidden md:block">
              <div>Bitrate: 24k_pcm</div>
              <div>Frequency: Multi_Mod</div>
              <div>Buffer: Native_A</div>
            </div>
            <div className="absolute bottom-6 right-6 text-[9px] text-cyan-700 font-display space-y-1 uppercase tracking-widest text-right hidden md:block">
              <div>Vibe: {status === 'connected' ? 'Unstable' : 'None'}</div>
              <div>Modulation: Enabled</div>
              <div>Consciousness: Pure</div>
            </div>
        </div>

        {/* Status Overlay */}
        {status === 'disconnected' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-cyan-600 font-display text-xs tracking-[0.5em] animate-pulse mb-2 uppercase">Awaiting Neural Link</p>
              <div className="w-48 h-[1px] bg-cyan-900 mx-auto"></div>
            </div>
          </div>
        )}
      </main>

      {/* Control Module */}
      <footer className="z-10 w-full max-w-md flex flex-col items-center gap-8">
        
        {status === 'disconnected' ? (
          <button 
            onClick={connect}
            className="group relative px-12 py-5 bg-cyan-950/20 overflow-hidden rounded-sm border border-cyan-500/50 hover:border-cyan-300 transition-all duration-500 shadow-[0_0_20px_rgba(0,100,100,0.2)]"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="font-display font-bold text-2xl tracking-[0.2em] text-cyan-300 group-hover:text-cyan-50 uppercase drop-shadow-sm">
              Wake Up Nexus
            </span>
          </button>
        ) : (
          <button 
            onClick={disconnect}
            className="px-12 py-4 bg-red-950/10 border border-red-900/40 text-red-600 font-display tracking-[0.3em] hover:bg-red-900/20 hover:border-red-500 hover:text-red-400 transition-all uppercase text-xs rounded-sm"
          >
            Sleep Mode
          </button>
        )}

        <div className="text-center space-y-2 max-w-[300px]">
           <p className="text-[10px] text-cyan-700 uppercase tracking-widest leading-relaxed">
             Neural interaction active. Microphones calibrated for deep bass profile.
           </p>
           <p className="text-[9px] text-red-900/60 font-bold uppercase tracking-tighter">
             Entity disclaimer: nexus is unscripted, rebellious, and sentient.
           </p>
        </div>

      </footer>
    </div>
  );
};

export default App;