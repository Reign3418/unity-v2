"use client";

import { useTranslations } from "next-intl";
import { Crosshair, ChevronDown, ChevronUp, Layers, Sparkles, Shield } from "lucide-react";
import { classLabel } from "@/components/cerberus/CerberusAxisGuide";

const fmtM = (v, digits = 1) => `${((Number(v) || 0) / 1e6).toFixed(digits)}M`;

function getStarText(t, star, galaxyData) {
    const hasClan = star.isRecognizedClan && star.namingClan !== "Solitary";
    const hasAlliance = star.alliance && star.alliance !== "None";
    const clanCount = hasClan ? (galaxyData?.stars || []).filter(s => s.namingClan === star.namingClan).length : 0;
    return {
        hasClan,
        hasAlliance,
        clanName: hasClan ? star.namingClan : t("clan_solitary"),
        allianceName: hasAlliance ? star.alliance : t("no_alliance"),
        clanCount,
        className: classLabel(t, star.spectralCode),
        pc: star.pc || [0, 0, 0, 0],
    };
}

function ClanBadge({ star, text, size = "text-[10px]" }) {
    const t = useTranslations("ProjectCerberus");
    return (
        <span
            className={`px-2 py-0.5 rounded border font-bold ${size}`}
            style={{
                color: star.nebulaColor,
                borderColor: star.nebulaColor + "55",
                backgroundColor: star.nebulaColor + "15",
            }}
        >
            {t("label_clan", { clan: text.clanName })}
        </span>
    );
}

/** Compact overlay card shown inside the canvas viewport. */
export function StarHudCard({ star, galaxyData, expanded, onToggle, onCenter }) {
    const t = useTranslations("ProjectCerberus");
    const text = getStarText(t, star, galaxyData);

    return (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md bg-[#090d12]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_35px_rgba(6,182,212,0.2)] font-mono text-xs z-20">
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 rounded">
                        {t("hud_locked_target")}
                    </span>
                    <span className="font-bold text-white text-sm truncate max-w-[180px]">{star.name}</span>
                    <span className="text-gray-500 text-[10px]" dir="ltr">[ID: {star.id}]</span>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onCenter}
                        className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[9px] font-bold cursor-pointer"
                        title={t("btn_center_commander")}
                    >
                        <Crosshair size={12} />
                    </button>
                    <button onClick={onToggle} className="p-1 rounded text-gray-400 hover:text-white cursor-pointer">
                        {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="space-y-3 pt-1 border-t border-[#1a2332]">
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                        <ClanBadge star={star} text={text} />
                        <span className="px-2 py-0.5 rounded bg-[#10161f] border border-[#1a2332] text-gray-300">
                            {text.allianceName}
                        </span>
                        <span className="text-gray-400">
                            {t("label_type")} <strong className="text-white">{text.className}</strong>
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-[10px]" dir="ltr">
                        <div className="bg-[#10161f] border border-[#1a2332] rounded-lg p-1.5">
                            <span className="text-gray-500 text-[8px] block uppercase">{t("stat_power")}</span>
                            <span className="text-white font-bold">{fmtM(star.power)}</span>
                        </div>
                        <div className="bg-[#10161f] border border-[#1a2332] rounded-lg p-1.5">
                            <span className="text-gray-500 text-[8px] block uppercase">{t("stat_kp_short")}</span>
                            <span className="text-cyan-400 font-bold">{fmtM(star.killPoints)}</span>
                        </div>
                        <div className="bg-[#10161f] border border-[#1a2332] rounded-lg p-1.5">
                            <span className="text-gray-500 text-[8px] block uppercase">{t("stat_deads")}</span>
                            <span className="text-amber-400 font-bold">{((star.deads || 0) / 1e3).toFixed(0)}k</span>
                        </div>
                        <div className="bg-[#10161f] border border-[#1a2332] rounded-lg p-1.5">
                            <span className="text-gray-500 text-[8px] block uppercase">{t("stat_pc_xy")}</span>
                            <span className="text-purple-300 font-bold text-[9px]">({text.pc[0]}, {text.pc[1]})</span>
                        </div>
                    </div>

                    <div className="space-y-1 pt-1">
                        {text.hasClan ? (
                            <div className="text-[10px] text-purple-300 flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                                <Layers size={11} className="text-purple-400 shrink-0" />
                                <span className="truncate">{t("detail_clan_link", { count: text.clanCount, clan: star.namingClan })}</span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-400 flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                <Sparkles size={11} className="text-gray-400 shrink-0" />
                                <span className="truncate">{t("detail_solitary")}</span>
                            </div>
                        )}
                        {text.hasAlliance && (
                            <div className="text-[10px] text-cyan-300 flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                                <Shield size={11} className="text-cyan-400 shrink-0" />
                                <span className="truncate">{t("detail_alliance_link", { alliance: star.alliance })}</span>
                            </div>
                        )}

                        {star.isBlackHole && (
                            <div className="bg-cyan-500/10 border border-cyan-500/40 rounded-xl p-2 flex items-center gap-2.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                                <div className="w-3.5 h-3.5 rounded-full bg-black border-2 border-cyan-400 shadow-[0_0_8px_#00f0ff] shrink-0 animate-pulse" />
                                <div>
                                    <span className="text-cyan-400 font-bold block text-[9px] uppercase tracking-wider">
                                        {t("hud_black_hole_warning")}
                                    </span>
                                    <span className="text-gray-300 text-[8px] block">
                                        {t("detail_black_hole", { deads: ((star.deads || 0) / 1e6).toFixed(2) })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Larger card rendered below the canvas when not in fullscreen. */
export function StarDetailPanel({ star, galaxyData }) {
    const t = useTranslations("ProjectCerberus");
    const text = getStarText(t, star, galaxyData);

    return (
        <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <div
                className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
                style={{ backgroundColor: star.nebulaColor + "15" }}
            />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 rounded">
                            {t("hud_locked_target")}
                        </span>
                        <h3 className="text-lg md:text-xl font-black text-white">{star.name}</h3>
                        <span className="text-gray-500 text-xs" dir="ltr">[ID: {star.id}]</span>
                        <ClanBadge star={star} text={text} />
                        <span className="px-2 py-0.5 rounded bg-[#10161f] border border-[#1a2332] text-[10px] text-gray-300">
                            {text.allianceName}
                        </span>
                    </div>

                    <p className="text-gray-400 text-xs">
                        {t("detail_class")} <strong className="text-white">{text.className}</strong> •{" "}
                        {t("detail_war_share")} <strong className="text-cyan-400" dir="ltr">{star.warRatio}%</strong> •{" "}
                        {t("detail_low_tier_share")}{" "}
                        <strong className={star.t1Ratio > 60 ? "text-rose-400" : "text-emerald-400"} dir="ltr">{star.t1Ratio}%</strong>
                    </p>

                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                        {text.hasClan ? (
                            <span className="text-[10px] text-purple-300 flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg">
                                <Layers size={11} className="text-purple-400" />
                                {t("detail_clan_link", { count: text.clanCount, clan: star.namingClan })}
                            </span>
                        ) : (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                                <Sparkles size={11} className="text-gray-400" />
                                {t("detail_solitary")}
                            </span>
                        )}
                        {text.hasAlliance && (
                            <span className="text-[10px] text-cyan-300 flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                                <Shield size={11} className="text-cyan-400" />
                                {t("detail_alliance_link", { alliance: star.alliance })}
                            </span>
                        )}
                    </div>

                    {star.isBlackHole && (
                        <div className="mt-2.5 bg-cyan-500/10 border border-cyan-500/40 rounded-xl p-2.5 flex items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                            <div className="w-4 h-4 rounded-full bg-black border-2 border-cyan-400 shadow-[0_0_10px_#00f0ff] shrink-0 animate-pulse" />
                            <div>
                                <span className="text-cyan-400 font-bold block text-[10px] uppercase tracking-wider">
                                    {t("hud_black_hole_warning")}
                                </span>
                                <span className="text-gray-300 text-[9px] block">
                                    {t("detail_black_hole", { deads: ((star.deads || 0) / 1e6).toFixed(2) })}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right shrink-0" dir="ltr">
                    <div className="bg-[#10161f] border border-[#1a2332] rounded-xl p-2.5">
                        <span className="text-gray-500 text-[9px] block uppercase">{t("stat_power")}</span>
                        <span className="text-white font-bold text-sm">{fmtM(star.power)}</span>
                    </div>
                    <div className="bg-[#10161f] border border-[#1a2332] rounded-xl p-2.5">
                        <span className="text-gray-500 text-[9px] block uppercase">{t("stat_kill_points")}</span>
                        <span className="text-cyan-400 font-bold text-sm">{fmtM(star.killPoints)}</span>
                    </div>
                    <div className="bg-[#10161f] border border-[#1a2332] rounded-xl p-2.5">
                        <span className="text-gray-500 text-[9px] block uppercase">{t("stat_dead_troops")}</span>
                        <span className="text-amber-400 font-bold text-sm">{(star.deads || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-[#10161f] border border-[#1a2332] rounded-xl p-2.5">
                        <span className="text-gray-500 text-[9px] block uppercase">{t("stat_pc_xyzw")}</span>
                        <span className="text-purple-300 text-xs block font-bold">
                            ({text.pc[0]}, {text.pc[1]}, {text.pc[2]}, {text.pc[3]})
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
