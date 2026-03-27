import Link from 'next/link';
import { ShieldAlert, Book } from 'lucide-react';

export const metadata = {
  title: 'Un.ty | Terms of Service',
  description: 'Rules and responsibilities for utilizing the Unity Kingdom analytical engine.',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border-x-4 border-l-cyan-500 border-r-cyan-500 border-y border-y-[#1e222b] rounded-xl p-8 shadow-[0_10px_40px_rgba(6,182,212,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10">
          <Book className="text-cyan-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Terms of Service</h1>
            <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Last Updated: February 2026</p>
          </div>
        </div>
      </div>

      {/* Content Block */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 relative overflow-hidden shadow-xl">
        <div className="prose prose-invert max-w-none text-gray-300">
          <p className="text-lg leading-relaxed mb-8">
            Welcome to the Unity Dashboard! By accessing and using this tool, you agree to comply with and be bound by the following Terms of Service. Please review these terms carefully.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">1. Acceptance of Terms</h2>
          <p className="leading-relaxed mb-8">
            By utilizing the Unity Dashboard to process, analyze, or format data related to Rise of Kingdoms, you acknowledge that you have read, understood, and agreed to these Terms of Service. If you do not agree with any part of these terms, you should cease using the tool immediately.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">2. Nature of the Service</h2>
          <p className="leading-relaxed mb-4">
            The Unity Dashboard is a community-developed, third-party analytics utility designed to assist players and kingdom leadership in managing performance metrics for the mobile game Rise of Kingdoms. It is provided "as is" without representations or warranties of any kind.
          </p>
          <p className="leading-relaxed mb-8 text-cyan-400">
            <strong>Disclaimer of Affiliation:</strong> Unity Dashboard is an independent project and is in no way affiliated with, endorsed by, sponsored by, or officially connected to Lilith Games, FARLIGHT, or any of their subsidiaries or affiliates. "Rise of Kingdoms" is a trademark of Lilith Games.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">3. User Responsibilities</h2>
          <p className="leading-relaxed mb-4">
            You agree to use this tool responsibly and in a manner consistent with any applicable laws or regulations. As the user, you are solely responsible for the origin and accuracy of the data pipelines (CSV or XLSX files) you supply to the tool.
          </p>
          <p className="leading-relaxed mb-8">
            If you choose to use the GitHub integration, you are solely responsible for safeguarding your GitHub Personal Access Token. The Unity Dashboard maintainers decline all responsibility for compromised tokens resulting from insecure handling on the user's end.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">4. Limitation of Liability</h2>
          <p className="leading-relaxed mb-8">
            In no event shall the creators, contributors, or maintainers of the Unity Dashboard be liable for any direct, indirect, incidental, consequential, or special damages arising out of or in connection with your use of the tool. This includes, but is not limited to, data loss, miscalculations resulting in detrimental in-game kingdom management decisions, or any other damages.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">5. Modifications and Interruptions</h2>
          <p className="leading-relaxed text-gray-400 italic">
            We reserve the right to modify, suspend, or discontinue the Unity Dashboard, either temporarily or permanently, with or without notice. We shall not be liable to you or to any third party for any modification or discontinuation of access to the tool.
          </p>
        </div>
      </div>

    </div>
  );
}
