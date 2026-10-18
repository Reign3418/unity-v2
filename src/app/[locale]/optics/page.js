'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Camera,
  UploadCloud,
  CheckSquare,
  MessageSquare,
  ExternalLink,
  Sparkles,
  Cpu,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { useValheonCommand } from '@/components/command/ValheonCommandProvider';

export default function ValheonOpticsPage() {
  const t = useTranslations('Valheon');
  const { pastedImage, setPastedImage, setIsOpticsOpen } = useValheonCommand();
  const [engineMode, setEngineMode] = useState('LOCAL_WEBGPU');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPastedImage({
        dataUrl: ev.target?.result,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        timestamp: new Date().toLocaleTimeString(),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Suite Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b0e17] via-[#1a0d26] to-[#0b0e17] border border-purple-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-black tracking-widest">
              SUITE 05 // FLOATING AI VISION & CLIPBOARD HUD
            </span>
            <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-300 text-[10px] font-mono">
              CTRL+V INTERCEPTOR ACTIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide mt-2 flex items-center gap-2.5">
            <Camera className="text-purple-400" size={28} />
            <span>{t('suite_optics_title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {t('optics_page_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              window.open(
                '/en/tools/ranking-scanner?applet=true',
                'Valheon Optics Applet',
                'width=620,height=900,toolbar=0,menubar=0,location=0,resizable=1'
              );
            }}
            className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs font-mono flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
          >
            <ExternalLink size={15} />
            <span>Launch Floating Scanner Applet</span>
          </button>
        </div>
      </div>

      {/* Dual-Engine Selector & Live Clipboard Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0b0e17] border border-[#1e2638] flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-mono font-black text-purple-400 uppercase">
              DUAL-ENGINE VISION ARCHITECTURE
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Toggle between zero-cost local WebGPU/Canvas optical extraction and
              serverless Google Gemini 3.1 Flash-Lite.
            </p>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => setEngineMode('LOCAL_WEBGPU')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  engineMode === 'LOCAL_WEBGPU'
                    ? 'bg-emerald-500/10 border-emerald-400'
                    : 'bg-[#06080d] border-[#1e2638] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-emerald-400 flex items-center gap-1.5">
                    <Cpu size={14} />
                    <span>01. Local WebGPU / Canvas Engine</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    $0.00 / OFFLINE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Zero API quota used. Automatic pixel-alignment overlap
                  deduplication and T1–T5 badge recognition.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEngineMode('GEMINI_CLOUD')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  engineMode === 'GEMINI_CLOUD'
                    ? 'bg-purple-500/10 border-purple-400'
                    : 'bg-[#06080d] border-[#1e2638] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-purple-300 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>02. Gemini 3.1 Flash-Lite / 3.5 Flash</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 text-[10px] font-mono font-bold">
                    500 RPD QUOTA
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Multimodal OCR for complex profile registration, multilingual
                  governor names, and battle log parsing.
                </p>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpticsOpen(true)}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold cursor-pointer"
          >
            Open Bottom-Right Ctrl+V HUD Dock
          </button>
        </div>

        {/* Right: Clipboard / Screenshot Dropzone */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0b0e17] border border-purple-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
            <div>
              <div className="text-xs font-mono font-black text-white uppercase">
                GLOBAL CLIPBOARD SCREENSHOT INGESTION (PRESS CTRL+V ANYWHERE)
              </div>
              <div className="text-xs text-slate-400">
                Active Engine: {engineMode}
              </div>
            </div>
            <Link
              href="/tools/ranking-scanner"
              className="text-xs font-mono text-purple-300 hover:underline flex items-center gap-1"
            >
              <span>Full Multi-Shot Scanner</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {pastedImage ? (
            <div className="my-4 p-4 rounded-xl bg-[#06080d] border border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">
                  ✓ Captured: {pastedImage.name} ({pastedImage.sizeKb} KB)
                </span>
                <button
                  type="button"
                  onClick={() => setPastedImage(null)}
                  className="text-rose-400 hover:underline"
                >
                  Clear Capture
                </button>
              </div>
              <img
                src={pastedImage.dataUrl}
                alt="Captured RoK Frame"
                className="w-full max-h-56 object-contain rounded-lg border border-[#1e2638]"
              />
              <div className="flex items-center gap-3">
                <Link
                  href="/tools/ranking-scanner"
                  className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs font-mono text-center"
                >
                  Process in Ranking Scanner →
                </Link>
                <Link
                  href="/calculators"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs font-mono text-center"
                >
                  Route to Calculators →
                </Link>
              </div>
            </div>
          ) : (
            <label className="my-4 flex-1 min-h-[210px] rounded-xl border-2 border-dashed border-purple-500/35 bg-[#06080d] hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer">
              <Upload size={32} className="text-purple-400 mb-2" />
              <div className="text-sm font-black text-white">
                {t('optics_drop_label')}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Supports Ranking Tables, Governor Profiles, Speedup Bags & RSS
                Inventories
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}

          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-[#1e2638]">
            <span>Auto-Deduplicates Overlapping Leaderboard Scrolls</span>
            <span className="text-purple-300">T1–T5 Badge Recognition</span>
          </div>
        </div>
      </div>

      {/* Optics Sub-Module Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          {
            title: 'Vision Ranking Scanner',
            desc: 'Multi-shot leaderboard grabber with pixel-aligned overlap deduplication.',
            href: '/tools/ranking-scanner',
            icon: Camera,
          },
          {
            title: 'Scan Ingestion Pipeline',
            desc: 'Upload CSV / Excel (.xlsx) workbooks or batch OCR kingdom snapshots.',
            href: '/upload',
            icon: UploadCloud,
          },
          {
            title: '7 Audited RoK Calculators',
            desc: 'Speedups, AP Battle Plan, SOC Flag Cost Engine, Forge, and RSS.',
            href: '/calculators',
            icon: CheckSquare,
          },
          {
            title: '12-Language Chat Translator',
            desc: 'Real-time RoK slang & diplomatic translation across 12 languages.',
            href: '/translator',
            icon: MessageSquare,
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className="p-4 rounded-xl bg-[#0b0e17] border border-[#1e2638] hover:border-purple-500/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <Icon size={18} className="text-purple-400" />
                <div className="text-sm font-black text-white mt-2.5 group-hover:text-purple-300">
                  {item.title}
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#1e2638] flex items-center justify-between text-[11px] font-mono text-purple-400">
                <span>Open Module</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
