"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, BookOpen } from "lucide-react";

// Static key maps so every translation key appears literally in source (checked by scripts/check-i18n.js).
export const FEATURE_LABEL_KEYS = {
    power: "feature_power",
    warKills: "feature_warKills",
    deads: "feature_deads",
    killPoints: "feature_killPoints",
    assists: "feature_assists",
    gathered: "feature_gathered",
    lowTierShare: "feature_lowTierShare",
};

export const CLASS_LABEL_KEYS = {
    BH: "class_BH",
    O: "class_O",
    M: "class_M",
    D: "class_D",
    B: "class_B",
};

export const featureLabel = (t, key) => (FEATURE_LABEL_KEYS[key] ? t(FEATURE_LABEL_KEYS[key]) : key);
export const classLabel = (t, code) => t(CLASS_LABEL_KEYS[code] || CLASS_LABEL_KEYS.B);

export const AXIS_STYLES = {
    x: { text: "text-cyan-400", border: "border-cyan-500/30", hover: "hover:bg-cyan-500/20 hover:border-cyan-400", bg: "bg-cyan-500/10" },
    y: { text: "text-emerald-400", border: "border-emerald-500/30", hover: "hover:bg-emerald-500/20 hover:border-emerald-400", bg: "bg-emerald-500/10" },
    z: { text: "text-purple-400", border: "border-purple-500/30", hover: "hover:bg-purple-500/20 hover:border-purple-400", bg: "bg-purple-500/10" },
    w: { text: "text-pink-400", border: "border-pink-500/30", hover: "hover:bg-pink-500/20 hover:border-pink-400", bg: "bg-pink-500/10" },
};

/** Short badge text from the two strongest loadings, e.g. "Deads / Kill points" or "Power / −Low-tier share". */
export function axisShortLabel(t, axis) {
    return (axis?.loadings || [])
        .slice(0, 2)
        .map(l => `${l.weight < 0 ? "−" : ""}${featureLabel(t, l.feature)}`)
        .join(" / ");
}

/** Full description of one PCA axis: explained variance + signed loading bars + caveats. */
export function AxisCard({ axis, excludedFeatures = [] }) {
    const t = useTranslations("ProjectCerberus");
    const style = AXIS_STYLES[axis.axis] || AXIS_STYLES.x;
    const pct = (axis.explained * 100).toFixed(1);

    return (
        <div className="space-y-2">
            <div className={`font-bold text-sm ${style.text}`}>
                {t("axis_tooltip_title", { axis: axis.axis.toUpperCase(), component: axis.component, pct })}
            </div>

            <div className="space-y-1">
                {axis.loadings.map(l => (
                    <div key={l.feature} className="flex items-center gap-2 text-[10px]">
                        <span className="w-28 shrink-0 text-gray-300 truncate">{featureLabel(t, l.feature)}</span>
                        <div className="flex-1 h-2 bg-[#10161f] rounded-full overflow-hidden relative">
                            <div
                                className={`absolute top-0 bottom-0 ${l.weight >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                                style={{ left: 0, width: `${Math.min(100, Math.abs(l.weight) * 100)}%` }}
                            />
                        </div>
                        <span className={`w-12 text-right ${l.weight >= 0 ? "text-emerald-400" : "text-rose-400"}`} dir="ltr">
                            {l.weight > 0 ? "+" : ""}{l.weight.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>

            <p className="text-gray-400 text-[10px] leading-relaxed">{t("axis_direction_hint")}</p>
            {axis.axis === "w" && (
                <p className="text-pink-300 text-[10px] leading-relaxed">{t("axis_w_note")}</p>
            )}
            {excludedFeatures.length > 0 && (
                <p className="text-amber-300/80 text-[10px] leading-relaxed">
                    {t("axis_excluded_note", { features: excludedFeatures.map(f => featureLabel(t, f)).join(", ") })}
                </p>
            )}
        </div>
    );
}

/** Bottom-left overlay: one badge per data-driven axis, plus the 5th (class/clan) dimension. */
export default function CerberusAxisGuide({ axes = [], excludedFeatures = [], geometryMode, onOpenCodex }) {
    const t = useTranslations("ProjectCerberus");
    const [active, setActive] = useState(null); // 'x' | 'y' | 'z' | 'w' | 'dim5' | 'spiral' | 'none'
    const activeAxis = axes.find(a => a.axis === active);

    return (
        <>
            <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-1.5 flex-wrap max-w-[60%] bg-[#090d12]/90 backdrop-blur-md border border-white/10 rounded-xl p-1.5 text-[9px] shadow-2xl font-mono">
                {geometryMode === "spiral" ? (
                    <div
                        onMouseEnter={() => setActive("spiral")}
                        onMouseLeave={() => setActive(null)}
                        className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 cursor-help font-bold"
                    >
                        {t("axis_spiral_badge")}
                    </div>
                ) : axes.length === 0 ? (
                    <div
                        onMouseEnter={() => setActive("none")}
                        onMouseLeave={() => setActive(null)}
                        className="px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/10 cursor-help font-bold"
                    >
                        {t("axis_unavailable_badge")}
                    </div>
                ) : (
                    axes.map(axis => {
                        const style = AXIS_STYLES[axis.axis] || AXIS_STYLES.x;
                        return (
                            <div
                                key={axis.axis}
                                onMouseEnter={() => setActive(axis.axis)}
                                onMouseLeave={() => setActive(null)}
                                className={`px-2 py-1 rounded border cursor-help transition-all font-bold ${style.bg} ${style.text} ${style.border} ${style.hover}`}
                            >
                                <span dir="ltr">{axis.axis.toUpperCase()}</span>: {axisShortLabel(t, axis)}
                            </div>
                        );
                    })
                )}

                <div
                    onMouseEnter={() => setActive("dim5")}
                    onMouseLeave={() => setActive(null)}
                    className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400 cursor-help transition-all font-bold"
                >
                    {t("axis_dim5_badge")}
                </div>

                <button
                    onClick={onOpenCodex}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-400 border border-white/10 hover:border-cyan-400 transition-all cursor-pointer flex items-center gap-1 font-bold"
                    title={t("legend_btn_title")}
                >
                    <BookOpen size={11} />
                    <span>{t("legend_btn_title")}</span>
                </button>
            </div>

            {active && (
                <div className="absolute bottom-16 left-4 z-30 w-[22rem] max-w-[calc(100%-2rem)] bg-[#090d12]/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.3)] font-mono text-xs pointer-events-none">
                    {activeAxis && <AxisCard axis={activeAxis} excludedFeatures={excludedFeatures} />}
                    {activeAxis && (
                        <p className="text-gray-500 text-[10px] leading-relaxed mt-2 pt-2 border-t border-white/10">
                            {t("axis_recomputed_note")}
                        </p>
                    )}
                    {active === "spiral" && (
                        <p className="text-gray-300 text-[11px] leading-relaxed">{t("axis_spiral_note")}</p>
                    )}
                    {active === "none" && (
                        <p className="text-gray-300 text-[11px] leading-relaxed">{t("axis_unavailable_note")}</p>
                    )}
                    {active === "dim5" && (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                                <Sparkles size={14} />
                                <span>{t("tooltip_dim5_title")}</span>
                            </div>
                            <p className="text-gray-300 text-[11px] leading-relaxed">{t("tooltip_dim5_desc")}</p>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
