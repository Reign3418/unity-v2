'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getActiveTargetKingdom } from '@/lib/activeKingdom';
import {
  BENCHMARK_GOVERNORS,
  evaluateGovernorTrust,
  evaluateKingdomTrustMatrix,
} from '@/lib/valheonTrustEngine';

const ValheonCommandContext = createContext(null);

export function ValheonCommandProvider({ children }) {
  const { data: session } = useSession();
  const [isOmniOpen, setIsOmniOpen] = useState(false);
  const [isForensicsOpen, setIsForensicsOpen] = useState(false);
  const [isOpticsOpen, setIsOpticsOpen] = useState(false);
  const [pastedImage, setPastedImage] = useState(null);
  const [activeKd, setActiveKd] = useState('3418');
  const [governorPool, setGovernorPool] = useState(() =>
    evaluateKingdomTrustMatrix(BENCHMARK_GOVERNORS).governors
  );
  const [selectedGovernor, setSelectedGovernor] = useState(() =>
    evaluateGovernorTrust(BENCHMARK_GOVERNORS[0])
  );

  // Sync active kingdom & fetch live 35-field governor telemetry when available
  useEffect(() => {
    const kd = getActiveTargetKingdom(session, '4194');
    setActiveKd(kd);

    let cancelled = false;
    async function hydrateKingdomRoster() {
      try {
        // 1. First pull live 45-field MuMu RAM + binary save telemetry
        const liveRes = await fetch(`/api/aws/governor-search?limit=300&_t=${Date.now()}`);
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (!cancelled && Array.isArray(liveData?.results) && liveData.results.length > 0) {
            const matrix = evaluateKingdomTrustMatrix(liveData.results);
            const enriched = matrix.governors.map((mg) => {
              const rawGov = liveData.results.find((r) => String(r.id) === String(mg.id)) || {};
              return { ...rawGov, ...mg };
            });
            setGovernorPool(enriched);
            setSelectedGovernor(enriched[0]);
            return;
          }
        }

        // 2. Fallback to anomaly-detector
        const res = await fetch(
          `/api/lab/anomaly-detector?kingdom=${encodeURIComponent(kd)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const rawList =
          data?.rosterWithScores || data?.roster || data?.governors || [];
        if (!cancelled && Array.isArray(rawList) && rawList.length > 0) {
          const matrix = evaluateKingdomTrustMatrix(rawList);
          setGovernorPool(matrix.governors);
          setSelectedGovernor(matrix.governors[0]);
        }
      } catch {
        // Offline / fallback to BENCHMARK_GOVERNORS seamlessly
      }
    }

    hydrateKingdomRoster();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const inspectGovernor = useCallback(
    async (govOrId) => {
      if (!govOrId) {
        setIsForensicsOpen(true);
        return;
      }
      if (typeof govOrId === 'string' || typeof govOrId === 'number') {
        const query = String(govOrId).toLowerCase().trim();
        const found = governorPool.find(
          (g) =>
            String(g.id).toLowerCase() === query ||
            String(g.name).toLowerCase().includes(query)
        );
        if (found) {
          setSelectedGovernor(found);
          setIsForensicsOpen(true);
          return;
        }
        try {
          const sRes = await fetch(`/api/aws/governor-search?q=${encodeURIComponent(query)}&limit=5`);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData?.results?.length > 0) {
              const hit = sData.results[0];
              const dossier = { ...hit, ...evaluateGovernorTrust(hit) };
              setSelectedGovernor(dossier);
              setIsForensicsOpen(true);
              return;
            }
          }
        } catch {}
        setSelectedGovernor(
          evaluateGovernorTrust({
            id: String(govOrId),
            name: `Governor #${govOrId}`,
            alliance: activeKd,
            power: 14_272_961,
            killPoints: 536_287,
            deads: 0,
          })
        );
      } else if (typeof govOrId === 'object') {
        const dossier =
          govOrId.trustIndex !== undefined
            ? govOrId
            : { ...govOrId, ...evaluateGovernorTrust(govOrId) };
        setSelectedGovernor(dossier);
      }
      setIsForensicsOpen(true);
    },
    [governorPool, activeKd]
  );

  // Global keyboard shortcuts: Ctrl+K / Cmd+K (OmniBar), Ctrl+Shift+F (Forensics Drawer)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOmniOpen((prev) => !prev);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'f'
      ) {
        e.preventDefault();
        setIsForensicsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOmniOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Ctrl+V clipboard image interceptor for Valheon Optics HUD
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setPastedImage({
                dataUrl: ev.target?.result,
                name: file.name || `rok-capture-${Date.now()}.png`,
                sizeKb: Math.round(file.size / 1024),
                timestamp: new Date().toLocaleTimeString(),
              });
              setIsOpticsOpen(true);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <ValheonCommandContext.Provider
      value={{
        isOmniOpen,
        setIsOmniOpen,
        isForensicsOpen,
        setIsForensicsOpen,
        isOpticsOpen,
        setIsOpticsOpen,
        pastedImage,
        setPastedImage,
        activeKd,
        governorPool,
        setGovernorPool,
        selectedGovernor,
        inspectGovernor,
      }}
    >
      {children}
    </ValheonCommandContext.Provider>
  );
}

export function useValheonCommand() {
  const ctx = useContext(ValheonCommandContext);
  if (!ctx) {
    return {
      isOmniOpen: false,
      setIsOmniOpen: () => {},
      isForensicsOpen: false,
      setIsForensicsOpen: () => {},
      isOpticsOpen: false,
      setIsOpticsOpen: () => {},
      pastedImage: null,
      setPastedImage: () => {},
      activeKd: '3418',
      governorPool: [],
      setGovernorPool: () => {},
      selectedGovernor: null,
      inspectGovernor: () => {},
    };
  }
  return ctx;
}
