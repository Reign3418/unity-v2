"use client";

import { useTranslations } from "next-intl";
import { BookOpen, X, Layers, Compass, Sparkles, Zap } from "lucide-react";
import { AxisCard, AXIS_STYLES } from "@/components/cerberus/CerberusAxisGuide";

const SPECTRAL_CARDS = [
    { code: "O", dot: "bg-cyan-400 shadow-[0_0_8px_#00f0ff]", border: "border-cyan-500/40", title: "legend_star_o_title", desc: "legend_star_o_desc" },
    { code: "M", dot: "bg-rose-500 shadow-[0_0_8px_#f43f5e]", border: "border-rose-500/40", title: "legend_star_m_title", desc: "legend_star_m_desc" },
    { code: "D", dot: "bg-slate-400 shadow-[0_0_8px_#94a3b8]", border: "border-slate-500/40", title: "legend_star_d_title", desc: "legend_star_d_desc" },
    { code: "B", dot: "bg-purple-400 shadow-[0_0_8px_#a855f7]", border: "border-purple-500/40", title: "legend_star_b_title", desc: "legend_star_b_desc" },
];

export default function CerberusGalaxyCodex({ galaxyData, onClose }) {
    const t = useTranslations("ProjectCerberus");
    const axes = galaxyData?.axes || [];
    const excluded = galaxyData?.excludedFeatures || [];

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in"
        >
            <div
                onClick={e => e.stopPropagation()}
                className="bg-[#090d12] border border-cyan-500/40 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-5 md:p-7 shadow-[0_0_60px_rgba(6,182,212,0.3)] font-mono space-y-6 text-xs"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1a2332] pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                            <BookOpen size={20} className="text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-wider">
                                {t("legend_modal_title")}
                            </h2>
                            <p className="text-gray-400 text-[11px]">
                                {t("legend_modal_subtitle")}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-[#10161f] border border-[#1a2332] text-gray-400 hover:text-white cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Section 1: Constellation Filaments (Connecting Lines) */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <Layers size={14} />
                        <span>{t("legend_sec_filaments_title")}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-[#10161f] border border-purple-500/30 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-0 border-t-2 border-dashed border-purple-400 inline-block"></span>
                                <span className="font-bold text-purple-300 text-xs">{t("legend_dashed_lines")}</span>
                            </div>
                            <p className="text-gray-400 text-[11px] leading-relaxed">
                                {t("legend_sec_filaments_naming")}
                            </p>
                        </div>

                        <div className="bg-[#10161f] border border-cyan-500/30 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-0 border-t-2 border-solid border-cyan-400 inline-block"></span>
                                <span className="font-bold text-cyan-300 text-xs">{t("legend_solid_lines")}</span>
                            </div>
                            <p className="text-gray-400 text-[11px] leading-relaxed">
                                {t("legend_sec_filaments_alliance")}
                            </p>
                        </div>
                    </div>
                    <div className="bg-[#10161f] border border-amber-500/20 rounded-xl p-3">
                        <p className="text-gray-400 text-[11px]">
                            <strong className="text-amber-400">{t("legend_spectral_mode")}</strong> {t("legend_sec_filaments_spectral")}
                        </p>
                    </div>
                </div>

                {/* Section 2: The 5 Dimensions (data-driven) */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Compass size={14} className="text-emerald-400" />
                        <span>{t("legend_sec_dims_title")}</span>
                    </h3>
                    <p className="text-gray-400 text-[11px] leading-relaxed">{t("legend_dims_intro")}</p>
                    {axes.length === 0 ? (
                        <p className="text-gray-400 text-[11px] bg-[#10161f] border border-[#1a2332] rounded-xl p-3">
                            {t("axis_unavailable_note")}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {axes.map(axis => (
                                <div key={axis.axis} className={`bg-[#10161f] border rounded-xl p-3 ${(AXIS_STYLES[axis.axis] || AXIS_STYLES.x).border}`}>
                                    <AxisCard axis={axis} excludedFeatures={excluded} />
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="bg-[#10161f] border border-amber-500/30 rounded-xl p-3">
                        <span className="text-amber-400 font-bold block mb-1">{t("tooltip_dim5_title")}</span>
                        <p className="text-gray-400 text-[10px] leading-relaxed">{t("tooltip_dim5_desc")}</p>
                    </div>
                    <p className="text-gray-500 text-[10px] leading-relaxed">{t("axis_recomputed_note")}</p>
                </div>

                {/* Section 3: Stellar Spectral Classes */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} />
                        <span>{t("legend_sec_spectral_title")}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {SPECTRAL_CARDS.map(card => (
                            <div key={card.code} className={`bg-[#10161f] border rounded-xl p-3 ${card.border}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2.5 h-2.5 rounded-full ${card.dot}`}></span>
                                    <span className="font-bold text-white text-xs">{t(card.title)}</span>
                                </div>
                                <p className="text-gray-400 text-[10px] leading-relaxed">{t(card.desc)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 4: Supermassive Black Holes */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-black border-2 border-cyan-400 shadow-[0_0_8px_#00f0ff] inline-block animate-pulse"></span>
                        <span>{t("legend_sec_blackhole_title")}</span>
                    </h3>
                    <div className="bg-[#10161f] border border-cyan-500/30 rounded-xl p-4 space-y-2">
                        <p className="text-gray-300 text-[11px] leading-relaxed">
                            {t("legend_sec_blackhole_desc")}
                        </p>
                    </div>
                </div>

                {/* Section 5: Dynamic Size & Luminosity Metrics */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <Zap size={14} />
                        <span>{t("legend_sec_sizing_title")}</span>
                    </h3>
                    <div className="bg-[#10161f] border border-emerald-500/30 rounded-xl p-4 space-y-2">
                        <p className="text-gray-300 text-[11px] leading-relaxed">
                            {t("legend_sec_sizing_desc")}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-3 border-t border-[#1a2332]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    >
                        {t("legend_close")}
                    </button>
                </div>
            </div>
        </div>
    );
}
