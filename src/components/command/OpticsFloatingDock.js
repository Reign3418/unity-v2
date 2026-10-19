'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Camera,
  X,
  Sparkles,
  ExternalLink,
  Upload,
  CheckCircle2,
  Shield,
  Search,
} from 'lucide-react';
import { useValheonCommand } from './ValheonCommandProvider';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';

export default function OpticsFloatingDock() {
  const t = useTranslations('Valheon');
  const { effectiveIsValheonFounder } = useRolePreview();
  const {
    isOpticsOpen,
    setIsOpticsOpen,
    pastedImage,
    setPastedImage,
    setIsOmniOpen,
    setIsForensicsOpen,
  } = useValheonCommand();

  const [detectedMode, setDetectedMode] = useState('RANKING_TABLE');
  const [ocrStatus, setOcrStatus] = useState(null);

  if (!effectiveIsValheonFounder) return null;

  const handleFileChange = (e) => {
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
      setOcrStatus(null);
    };
    reader.readAsDataURL(file);
  };

  const handleQuickAnalyze = () => {
    setOcrStatus('SCANNING');
    setTimeout(() => {
      setOcrStatus('READY');
    }, 650);
  };

  if (!isOpticsOpen) return null;

  return (
    <>
      {/* Expanded Floating Optics Clipboard HUD */}
      {isOpticsOpen && (
        <div className="fixed bottom-6 right-6 z-[80] w-[92vw] max-w-md bg-[#06080d] border border-purple-500/40 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden animate-fade-in">
          <div className="px-4 py-3 bg-[#0b0e17] border-b border-[#1e2638] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-purple-400" />
              <span className="text-xs font-mono font-black tracking-wider text-purple-300 uppercase">
                {t('optics_hud_title')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  window.open(
                    '/en/tools/ranking-scanner?applet=true',
                    'Valheon Optics Applet',
                    'width=620,height=900,toolbar=0,menubar=0,location=0,resizable=1'
                  );
                }}
                className="px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[10px] font-mono flex items-center gap-1 hover:bg-purple-500/30 transition-all"
              >
                <span>Applet</span>
                <ExternalLink size={10} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpticsOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('optics_hud_desc')}
            </p>

            {/* Target Classification Selector */}
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
              {[
                { id: 'RANKING_TABLE', label: 'Ranking Table' },
                { id: 'GOV_PROFILE', label: 'Gov Profile' },
                { id: 'BATTLE_REPORT', label: 'Battle Log' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDetectedMode(m.id)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                    detectedMode === m.id
                      ? 'bg-purple-500/20 border-purple-400 text-white font-bold'
                      : 'bg-[#0b0e17] border-[#1e2638] text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Pasted Screenshot Preview or Dropzone */}
            {pastedImage ? (
              <div className="p-3 rounded-xl bg-[#0b0e17] border border-purple-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold truncate">
                    ✓ {pastedImage.name} ({pastedImage.sizeKb} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPastedImage(null);
                      setOcrStatus(null);
                    }}
                    className="text-slate-400 hover:text-rose-400 text-[11px]"
                  >
                    Clear
                  </button>
                </div>
                <img
                  src={pastedImage.dataUrl}
                  alt="Clipboard Capture"
                  className="w-full h-36 object-cover rounded-lg border border-[#1e2638]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickAnalyze}
                    className="flex-1 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles size={13} />
                    <span>
                      {ocrStatus === 'SCANNING'
                        ? 'Scanning Optical Grid...'
                        : 'Run Vision Extract'}
                    </span>
                  </button>
                  <Link
                    href="/tools/ranking-scanner"
                    onClick={() => setIsOpticsOpen(false)}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold"
                  >
                    Full Scanner →
                  </Link>
                </div>
                {ocrStatus === 'READY' && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>
                      Optical frame locked ({detectedMode}). Ready in Ranking
                      Scanner pipeline.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-purple-500/40 bg-[#0b0e17]/70 hover:bg-purple-500/5 transition-all cursor-pointer text-center">
                <Upload size={22} className="text-purple-400 mb-1.5" />
                <span className="text-xs font-bold text-white">
                  {t('optics_drop_label')}
                </span>
                <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                  WebGPU Local ($0.00) + Gemini 3.1 Flash-Lite
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}

            <div className="pt-2 border-t border-[#1e2638] flex items-center justify-between text-xs font-mono">
              <Link
                href="/optics"
                onClick={() => setIsOpticsOpen(false)}
                className="text-purple-300 hover:text-purple-200 font-bold"
              >
                {t('suite_optics_title')} →
              </Link>
              <Link
                href="/calculators"
                onClick={() => setIsOpticsOpen(false)}
                className="text-cyan-400 hover:text-cyan-300"
              >
                7 Calculators →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
