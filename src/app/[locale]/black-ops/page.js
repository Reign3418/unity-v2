import BlackOpsRadarClient from '@/components/blackops/BlackOpsRadarClient';

export const metadata = {
  title: 'Black Ops Gov Hunter & Territory Radar | Valheon Unity',
  description: 'Classified governor coordinate tracking, territory movement detection, and mobile alert dispatch for Rise of Kingdoms.',
};

export default async function BlackOpsPage({ params }) {
  const { locale } = await params;
  return <BlackOpsRadarClient locale={locale} />;
}
