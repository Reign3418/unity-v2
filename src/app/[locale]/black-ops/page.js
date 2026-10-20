import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { auth } from '@/lib/auth';
import BlackOpsRadarClient from '@/components/blackops/BlackOpsRadarClient';

export const metadata = {
  title: 'Black Ops Gov Hunter & Territory Radar | Valheon Unity',
  description: 'Classified governor coordinate tracking, territory movement detection, and mobile alert dispatch for Rise of Kingdoms.',
};

export default async function BlackOpsPage({ params }) {
  const { locale } = await params;
  const session = await auth();

  const isSuperAdmin = Boolean(
    session?.user?.isSuperAdmin || session?.user?.isValheonFounder
  );

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#040608] p-8 flex flex-col items-center justify-center text-center font-mono">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
          <ShieldAlert size={64} className="text-rose-500 animate-pulse" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 border border-rose-500/30 bg-rose-500/10 px-3 py-1 rounded mb-4">
          RESTRICTED CLEARANCE LEVEL 5
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest mb-2">
          ACCESS DENIED
        </h1>
        <p className="text-gray-400 text-xs md:text-sm max-w-md leading-relaxed mb-8">
          Black Ops Territory Radar & Governor Tracking requires SuperAdmin clearance. Your current session does not meet the required security authorization.
        </p>
        <Link
          href={`/${locale}`}
          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]"
        >
          Return to Command Center
        </Link>
      </div>
    );
  }

  return <BlackOpsRadarClient locale={locale} />;
}
