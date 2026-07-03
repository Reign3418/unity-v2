import { Suspense } from 'react';
import PublicSoCHub from '@/components/analysis/kingdom/PublicSoCHub';

export default function SharedSocPage({ searchParams }) {
    const kd = searchParams.kd;
    const baselineScan = searchParams.baseline;

    if (!kd || !baselineScan) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6 text-slate-400 font-mono">
                Invalid Link: Missing Kingdom ID or Baseline Scan parameter.
            </div>
        );
    }

    return (
        <Suspense fallback={<div className="min-h-screen bg-[#060810] flex items-center justify-center text-slate-400">Loading Coalition Hub...</div>}>
            <PublicSoCHub targetKd={kd} baselineScan={baselineScan} />
        </Suspense>
    );
}
