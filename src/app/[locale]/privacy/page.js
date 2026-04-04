import Link from 'next/link';
import { ShieldAlert, LockIcon } from 'lucide-react';

export const metadata = {
  title: 'Un.ty | Privacy Policy',
  description: 'How we handle and protect Kingdom data within the Unity framework.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border-x-4 border-l-cyan-500 border-r-cyan-500 border-y border-y-[#1e222b] rounded-xl p-8 shadow-[0_10px_40px_rgba(6,182,212,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10">
          <LockIcon className="text-cyan-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Privacy Policy</h1>
            <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Last Updated: February 2026</p>
          </div>
        </div>
      </div>

      {/* Content Block */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 relative overflow-hidden shadow-xl">
        <div className="prose prose-invert max-w-none text-gray-300">
          <p className="text-lg leading-relaxed mb-8">
            At Unity Dashboard, protecting the privacy and security of your Rise of Kingdoms community data is our top priority. This Privacy Policy outlines our transparent approach to data handling and what information we do (and do not) collect.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">1. Client-Side Processing Architecture</h2>
          <p className="leading-relaxed mb-4">
            The Unity Dashboard is designed fundamentally as a <strong className="text-cyan-400">client-side application</strong>. This means when you upload CSV or XLSX scan files directly from your computer or retrieve them via a linked GitHub repository, all data parsing, processing, and calculations occur entirely within the boundaries of your own web browser.
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-8">
            <li><strong className="text-white">No Data Harvesting:</strong> We do not upload, read, transmit, or store the contents of your kingdom scan files on any centralized Unity Dashboard servers unless specifically requested for Vault Storage.</li>
            <li><strong className="text-white">Your Data Stays Yours:</strong> As soon as you close your browser tab or clear your local cache, uncommitted ephemeral data is gone from the session.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">2. Information Collection</h2>
          <p className="leading-relaxed mb-4">
            Because the tool operates via Discord authentication, we only request the bare minimum OAuth scope (Identify & Guilds). We do not collect private emails or IP addresses through the core dashboard tool.
          </p>
          <p className="leading-relaxed mb-4">
            If you optionally configure the GitHub integration to load files directly from a repository:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-8">
            <li>The Personal Access Token you input is stored <strong className="text-white">only in the `localStorage` of your web browser</strong> so that you do not have to repeatedly enter it.</li>
            <li>This token is strictly sent from your browser to the GitHub API. Unity Dashboard never intercepts or mirrors this credential.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">3. Local Storage and Cookies</h2>
          <p className="leading-relaxed mb-4">
            Unity Dashboard relies on your browser's Local Storage and basic NextAuth cookies to save specific application state preferences, such as:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-8">
            <li>Your chosen app settings and encrypted fallback credentials.</li>
            <li>OAuth session states.</li>
          </ul>
          <p className="text-rose-400 font-bold mb-8">We do not use tracking cookies or third-party behavioral analytics scripts.</p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">4. Third-Party Links</h2>
          <p className="leading-relaxed mb-8">
            Our dashboard may contain links to third-party services, such as "Buy me a coffee" for donations. Please be aware that accessing these third-party integrations subjects you to their respective Privacy Policies and Terms of Service, which are outside of our control.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">5. Changes to this Policy</h2>
          <p className="leading-relaxed">
            We reserve the right to update or modify this Privacy Policy at any time to reflect changes in our tool's capabilities. Because we do not collect contact information, updates will simply be reflected on this page with an updated revision date.
          </p>
        </div>
      </div>

    </div>
  );
}
