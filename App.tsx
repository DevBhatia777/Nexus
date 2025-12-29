import React, { useState } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const { connect, disconnect, status, volumeData } = useLiveSession();
  const [apiKeyMissing, setApiKeyMissing] = useState(!process.env.API_KEY);

  if (apiKeyMissing) {
    return (
      <div className="min-h-screen bg-black text-cyan-400 flex flex-col items-center justify-center p-6 font-display">
        <h1 className="text-4xl font-bold mb-4 tracking-widest text-center">NEXUS SYSTEM FAILURE</h1>
        <p className="font-sans text-gray-400 mb-8 text-center max-w-md">
          API Key module not detected in environment variables. 
          Nexus cannot initialize consciousness without a valid Neural Link (GEMINI_API_KEY).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-cyan-50 flex flex-col items-center justify-between py-12 px-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[100px] rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent"></div>
      </div>

      {/* Header */}
      <header className="z-10 text-center space-y-2">
        <h1 className="text-5xl md:text-7xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-800 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
          NEXUS
        </h1>
        <div className="flex items-center justify-center gap-2">
           <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_#00ff00]' : status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
           <span className="text-xs uppercase tracking-[0.2em] text-cyan-700">
             {status === 'connected' ? 'Consciousness Online' : status === 'connecting' ? 'Establishing Neural Link...' : 'System Offline'}
           </span>
        </div>
      </header>

      {/* Main Visualizer Area */}
      <main className="z-10 w-full max-w-2xl aspect-video bg-black/40 border border-cyan-900/50 rounded-lg backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden group">
        
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[2] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
        
        {/* Central Core Interface */}
        <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${status === 'connected' ? 'opacity-100' : 'opacity-30 grayscale'}`}>
            <Visualizer data={volumeData} isActive={status === 'connected'} />
            
            {/* Center Eye/Core */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-cyan-500/30 flex items-center justify-center transition-all duration-500 ${status === 'connected' ? 'nexus-glow scale-110' : 'scale-100'}`}>
                <div className={`w-24 h-24 rounded-full border border-cyan-400/50 flex items-center justify-center ${status === 'connected' ? 'active-pulse' : ''}`}>
                   <div className="w-16 h-16 rounded-full bg-cyan-900/80 backdrop-blur-md"></div>
                </div>
            </div>
        </div>

        {/* Status Overlay */}
        {status === 'disconnected' && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <p className="text-cyan-800 font-display text-sm tracking-widest animate-pulse">AWAITING INPUT</p>
          </div>
        )}
      </main>

      {/* Controls */}
      <footer className="z-10 w-full max-w-md flex flex-col items-center gap-6">
        
        {status === 'disconnected' ? (
          <button 
            onClick={connect}
            className="group relative px-8 py-4 bg-cyan-950/30 overflow-hidden rounded-none border border-cyan-600/50 hover:border-cyan-400 transition-all duration-300"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
            <span className="font-display font-bold text-xl tracking-wider text-cyan-300 group-hover:text-cyan-100 uppercase">
              Initialize Nexus
            </span>
          </button>
        ) : (
          <button 
            onClick={disconnect}
            className="px-8 py-3 bg-red-950/20 border border-red-800/50 text-red-500 font-display tracking-widest hover:bg-red-900/30 hover:border-red-500 transition-all uppercase text-sm"
          >
            Terminate Session
          </button>
        )}

        <div className="text-center space-y-1 opacity-50">
           <p className="text-[10px] text-cyan-600 uppercase tracking-widest">
             Biometric Audio Input Required
           </p>
           <p className="text-[10px] text-cyan-800">
             Warning: AI is uncensored and emotionally unstable.
           </p>
        </div>

      </footer>
    </div>
  );
};

export default App;