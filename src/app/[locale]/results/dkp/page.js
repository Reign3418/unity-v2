"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw, Plus, X, Upload } from "lucide-react";

const formatNum = (num) => {
  if (!num && num !== 0) return "0";
  return Number(num).toLocaleString();
};

export default function DkpResults() {
  const { data: session } = useSession();

  // --- Kingdom Selection ---
  const [kdInput, setKdInput] = useState("");
  const [selectedKds, setSelectedKds] = useState([]);

  // --- Scan Dates (fetched based on first KD added) ---
  const [availableDates, setAvailableDates] = useState([]);
  const [startScan, setStartScan] = useState("");
  const [endScan, setEndScan] = useState("");
  const [isDatesLoading, setIsDatesLoading] = useState(false);

  // --- Algorithmic Controls ---
  const [t4Pts, setT4Pts] = useState(10);
  const [t5Pts, setT5Pts] = useState(20);
  const [deadsPts, setDeadsPts] = useState(30);
  const [govCount, setGovCount] = useState("All");
  const [dkpMode, setDkpMode] = useState("Basic");

  // --- Results ---
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingHoh, setIsUploadingHoh] = useState(null);
  const fileInputRefs = useRef({});

  // -------------------------------------------------------
  // Fetch available scan dates for a given kingdom
  // -------------------------------------------------------
  const fetchDates = useCallback(async (kd) => {
    setIsDatesLoading(true);
    try {
      const res = await fetch(`/api/aws/dkp/dates?kd=${kd}`);
      const data = await res.json();
      if (res.ok && data.dates && data.dates.length > 0) {
        setAvailableDates(data.dates);
        setStartScan(data.dates[0]);
        setEndScan(data.dates[data.dates.length - 1]);
      }
    } catch (err) {
      console.error("[DKP] Failed to fetch dates:", err);
    } finally {
      setIsDatesLoading(false);
    }
  }, []);

  // -------------------------------------------------------
  // On session load, seed from localStorage
  // -------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("unty_active_kd");
    if (stored && !selectedKds.includes(stored)) {
      setSelectedKds([stored]);
      fetchDates(stored);
    }
  }, [session]);

  // -------------------------------------------------------
  // Add a kingdom from the input box
  // -------------------------------------------------------
  const handleAddKd = (e) => {
    e.preventDefault();
    const clean = kdInput.replace(/\D/g, "").trim();
    if (!clean) return;
    if (selectedKds.includes(clean)) { setKdInput(""); return; }
    const isFirst = selectedKds.length === 0;
    setSelectedKds((prev) => [...prev, clean]);
    if (isFirst) fetchDates(clean);
    setKdInput("");
  };

  const handleRemoveKd = (kd) => {
    setSelectedKds((prev) => prev.filter((k) => k !== kd));
    setRows((prev) => prev.filter((r) => r.kingdom !== kd));
  };

  // -------------------------------------------------------
  // Upload Kingdom HOH Screenshot
  // -------------------------------------------------------
  const handleHohUpload = async (kd, e) => {
    const file = e.target.files?.[0];
    if (!file || !endScan) return;

    setIsUploadingHoh(kd);
    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = reader.result.split(',')[1];
            const mimeType = file.type;

            const res = await fetch('/api/aws/admin/vision/hoh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64: base64Data, mimeType, kd, endScan })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                // Refresh data to pull the new HOH exact numbers
                fetchAllKingdoms();
            } else {
                alert("HOH OCR Failed: " + (data.error || "Unknown error"));
            }
            setIsUploadingHoh(null);
        };
        reader.readAsDataURL(file);
    } catch (err) {
        console.error("HOH Upload error:", err);
        alert("Upload failed. Check console.");
        setIsUploadingHoh(null);
    }
  };

  // -------------------------------------------------------
  // Fetch DKP data for all selected kingdoms
  // -------------------------------------------------------
  const fetchAllKingdoms = useCallback(async () => {
    if (selectedKds.length === 0 || !startScan || !endScan) return;
    setIsLoading(true);
    const newRows = [];
    try {
      for (const kd of selectedKds) {
        const params = new URLSearchParams({
          kd,
          start: startScan,
          end: endScan,
          t4: t4Pts,
          t5: t5Pts,
          deads: deadsPts,
          mode: dkpMode === "Advanced (HoH Scan)" ? "hoh" : "basic"
        });
        const res = await fetch(`/api/aws/dkp?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || !data.rankings) continue;

        let players = [...data.rankings].sort((a, b) => b.dkpScore - a.dkpScore);
        if (govCount !== "All") {
          players = players.slice(0, parseInt(govCount));
        }

        let agg = players.reduce(
          (acc, gov) => {
            acc.totalPower += gov.power || 0;
            acc.powerDelta += typeof gov.pDelta === "number" ? gov.pDelta : 0;
            acc.t4Kills += typeof gov.t4Delta === "number" ? gov.t4Delta : 0;
            acc.t5Kills += typeof gov.t5Delta === "number" ? gov.t5Delta : 0;
            acc.totalDeads += typeof gov.dDelta === "number" ? gov.dDelta : 0;
            acc.totalKp += gov.kDelta || 0;
            acc.totalDkp += gov.dkpScore || 0;
            return acc;
          },
          { kingdom: kd, totalPower: 0, powerDelta: 0, t4Kills: 0, t5Kills: 0, totalDeads: 0, totalKp: 0, totalDkp: 0 }
        );

        if (dkpMode === "Advanced (HoH Scan)" && data.kingdomHoh) {
            agg.totalDeads = data.kingdomHoh.t4Deads + data.kingdomHoh.t5Deads;
            agg.totalDkp = (agg.t4Kills * 1) + (agg.t5Kills * 5) + (data.kingdomHoh.t4Deads * 15) + (data.kingdomHoh.t5Deads * 30);
            agg.hasExactHoh = true;
        }

        newRows.push(agg);
      }
      setRows(newRows.sort((a, b) => b.totalDkp - a.totalDkp));
    } catch (err) {
      console.error("[DKP] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedKds, startScan, endScan, t4Pts, t5Pts, deadsPts, govCount]);

  // Auto-fetch when dates or controls change
  useEffect(() => {
    if (startScan && endScan && selectedKds.length > 0) {
      fetchAllKingdoms();
    }
  }, [startScan, endScan, t4Pts, t5Pts, deadsPts, govCount, dkpMode]);

  return (
    <div className="w-full space-y-0 animate-fade-in pb-12">

      {/* ─── Kingdom Tab Bar (U1 style) ─────────────────────── */}
      <div className="w-full border-b border-[#1e222b] bg-[#0a0c0f] px-4 py-2 flex items-center gap-2 flex-wrap overflow-x-auto">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 shrink-0 mr-2">
          DKP Results
        </span>

        {selectedKds.map((kd) => (
          <div
            key={kd}
            className="flex items-center gap-1.5 bg-[#13161c] border border-[#2d323e] hover:border-fuchsia-500/40 text-fuchsia-300 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded transition-colors"
          >
            Kingdom {kd}
            <button
              onClick={() => handleRemoveKd(kd)}
              className="text-gray-500 hover:text-white transition-colors ml-1"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {/* Inline KD add form */}
        <form onSubmit={handleAddKd} className="flex items-center gap-1">
          <input
            type="text"
            value={kdInput}
            onChange={(e) => setKdInput(e.target.value)}
            placeholder="Add KD #"
            className="bg-[#13161c] border border-[#1e222b] focus:border-fuchsia-500/50 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded outline-none w-24 transition-colors"
          />
          <button
            type="submit"
            className="bg-[#13161c] border border-[#1e222b] hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 text-fuchsia-400 px-2 py-1 rounded transition-colors"
          >
            <Plus size={14} />
          </button>
        </form>

        <div className="ml-auto shrink-0 text-[11px] font-mono text-emerald-500 font-bold tracking-widest">
          Cloud: AWS Connected
        </div>
      </div>

      {/* ─── Main Content Panel ──────────────────────────────── */}
      <div className="px-6 pt-6">

        {/* Controls row */}
        <div className="flex flex-col xl:flex-row xl:items-end gap-6 mb-6">

          {/* Title + Scan Range */}
          <div className="flex flex-col gap-3">
            <h1 className="text-xl font-black text-white uppercase tracking-widest">
              All Kingdom DKP Results
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Start Scan</span>
                <select
                  value={startScan}
                  onChange={(e) => setStartScan(e.target.value)}
                  disabled={isDatesLoading || availableDates.length === 0}
                  className="bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-mono px-2 py-1.5 rounded outline-none focus:border-fuchsia-500 disabled:opacity-40 min-w-[200px]"
                >
                  {availableDates.length === 0 && <option>— Add a KD first —</option>}
                  {availableDates.map((d) => (
                    <option key={`s-${d}`} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">End Scan</span>
                <select
                  value={endScan}
                  onChange={(e) => setEndScan(e.target.value)}
                  disabled={isDatesLoading || availableDates.length === 0}
                  className="bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-mono px-2 py-1.5 rounded outline-none focus:border-fuchsia-500 disabled:opacity-40 min-w-[200px]"
                >
                  {availableDates.length === 0 && <option>— Add a KD first —</option>}
                  {availableDates.map((d) => (
                    <option key={`e-${d}`} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right-side controls */}
          <div className="flex flex-wrap items-end gap-4 xl:ml-auto">
            {/* DKP Mode */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">DKP Mode</span>
              <select 
                value={dkpMode}
                onChange={(e) => setDkpMode(e.target.value)}
                className="bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-bold px-3 py-1.5 rounded outline-none"
              >
                <option value="Basic">Basic</option>
                <option value="Advanced (HoH Scan)">Advanced (HoH Scan)</option>
              </select>
            </div>

            {/* T4 Pts */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-cyan-500 uppercase font-black tracking-widest">T4 Pts</span>
              <input
                type="number"
                value={dkpMode === "Advanced (HoH Scan)" ? "1" : t4Pts}
                disabled={dkpMode === "Advanced (HoH Scan)"}
                onChange={(e) => setT4Pts(parseFloat(e.target.value) || 0)}
                className="w-14 bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-mono font-bold text-center py-1.5 rounded outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* T5 Pts */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-indigo-400 uppercase font-black tracking-widest">T5 Pts</span>
              <input
                type="number"
                value={dkpMode === "Advanced (HoH Scan)" ? "5" : t5Pts}
                disabled={dkpMode === "Advanced (HoH Scan)"}
                onChange={(e) => setT5Pts(parseFloat(e.target.value) || 0)}
                className="w-14 bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-mono font-bold text-center py-1.5 rounded outline-none focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Deads Pts */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-rose-500 uppercase font-black tracking-widest">Deads Pts</span>
              <input
                type="number"
                value={dkpMode === "Advanced (HoH Scan)" ? "30" : deadsPts}
                disabled={dkpMode === "Advanced (HoH Scan)"}
                onChange={(e) => setDeadsPts(parseFloat(e.target.value) || 0)}
                className="w-14 bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-mono font-bold text-center py-1.5 rounded outline-none focus:border-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Governor Count */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Governor Count</span>
              <select
                value={govCount}
                onChange={(e) => setGovCount(e.target.value)}
                className="bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-bold px-3 py-1.5 rounded outline-none"
              >
                <option value="All">All Governors</option>
                <option value="1000">Top 1000</option>
                <option value="650">Top 650</option>
                <option value="400">Top 400</option>
                <option value="300">Top 300</option>
                <option value="100">Top 100</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchAllKingdoms}
              disabled={isLoading || selectedKds.length === 0}
              className="flex items-center justify-center w-9 h-9 bg-[#13161c] border border-[#1e222b] hover:border-fuchsia-500/40 rounded transition-colors disabled:opacity-40"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin text-fuchsia-500" : "text-gray-400"} />
            </button>
          </div>
        </div>

        {/* ─── Data Table ─────────────────────────────────────── */}
        <div className="border border-[#1e222b] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-[12px]">
              <thead className="bg-[#0a0c0f] border-b border-[#1e222b]">
                <tr>
                  {["Kingdom","Total Power","Power +/-","T4 Kills +/-","T5 Kills +/-","Deads +/-","Total KP +/-","Total DKP"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-bold uppercase tracking-wider text-gray-500 text-[10px]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b] bg-[#0d1014]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <RefreshCw size={24} className="animate-spin text-fuchsia-500 mx-auto mb-3" />
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                        Calculating DKP…
                      </p>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[11px] font-bold uppercase tracking-widest text-gray-600">
                      {selectedKds.length === 0
                        ? "Add kingdoms above to load DKP results"
                        : "No Data — Upload missing file to see results"}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.kingdom} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-black text-white tracking-widest flex items-center gap-2">
                        {row.kingdom}
                        {dkpMode === "Advanced (HoH Scan)" && (
                          <>
                            <button
                              onClick={() => fileInputRefs.current[row.kingdom]?.click()}
                              disabled={isUploadingHoh === row.kingdom}
                              className={`p-1 rounded transition-colors ${row.hasExactHoh ? 'bg-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/40' : 'bg-[#1e222b] text-gray-400 hover:text-white hover:bg-[#2d323e]'} disabled:opacity-50`}
                              title={row.hasExactHoh ? "HOH Exact Match Verified. Click to re-upload." : "Upload Kingdom HOH Screenshot"}
                            >
                              {isUploadingHoh === row.kingdom ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
                            </button>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={(el) => (fileInputRefs.current[row.kingdom] = el)}
                              onChange={(e) => handleHohUpload(row.kingdom, e)}
                            />
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">{formatNum(row.totalPower)}</td>
                      <td className={`px-4 py-3 font-mono font-bold ${row.powerDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {row.powerDelta >= 0 ? "+" : ""}{formatNum(row.powerDelta)}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">{formatNum(row.t4Kills)}</td>
                      <td className="px-4 py-3 font-mono text-gray-300">{formatNum(row.t5Kills)}</td>
                      <td className="px-4 py-3 font-mono text-rose-400 font-bold">{formatNum(row.totalDeads)}</td>
                      <td className="px-4 py-3 font-mono text-cyan-400">{formatNum(row.totalKp)}</td>
                      <td className="px-4 py-3 font-mono font-black text-fuchsia-400 text-[13px]">
                        {formatNum(row.totalDkp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* U1 bottom gradient bar */}
          <div className="h-[3px] bg-gradient-to-r from-transparent via-fuchsia-600/60 to-transparent" />
        </div>

      </div>
    </div>
  );
}
