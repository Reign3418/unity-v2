import BastionCommandCenter from '@/components/bastion/BastionCommandCenter';

export const metadata = {
  title: 'Bastion MoE Ring — Valheon Autonomous Fleet & Genesis Command',
  description:
    'Three-Ring Autonomous Emulator Orchestrator (KENT, SCOUT, TANK, NULL, BIG JON, NUMNUM, CIPHER, DOZER, AUDIT) with per-ring LLM/SLM routing and Day-1 New Kingdom Genesis Governor capture.',
};

export default async function BastionPage({ params }) {
  await params;
  return <BastionCommandCenter />;
}
