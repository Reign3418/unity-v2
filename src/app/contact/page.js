'use client';

import { MailIcon, MessageSquare, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function ContactPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('reign3418');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border-x-4 border-l-cyan-500 border-r-cyan-500 border-y border-y-[#1e222b] rounded-xl p-8 shadow-[0_10px_40px_rgba(6,182,212,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10">
          <MailIcon className="text-cyan-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Contact Us</h1>
            <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Get Support & Report Issues</p>
          </div>
        </div>
      </div>

      {/* Content Block */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 relative overflow-hidden shadow-xl text-center">
        <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
          Have questions about how to format your kingdom scan data? Need to report a bug, or have a feature request for the Unity Dashboard? We're here to help.
        </p>

        <div className="bg-[#0a0c10] border-2 border-[#1e222b] rounded-xl max-w-md mx-auto p-8 shadow-lg">
          <div className="w-16 h-16 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="text-[#5865F2]" size={28} />
          </div>
          
          <p className="text-gray-400 mb-6 text-sm">
            We don't have a community Discord server set up just yet, but you can reach out directly!
          </p>
          
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-lg p-4 mb-6">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Discord Identifier</p>
            <p className="text-2xl text-white font-mono font-bold tracking-widest">reign3418</p>
          </div>

          <button 
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-bold transition-all uppercase tracking-widest text-sm ${
              copied 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-[0_4px_14px_rgba(88,101,242,0.3)]'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle size={18} />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy Username
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
