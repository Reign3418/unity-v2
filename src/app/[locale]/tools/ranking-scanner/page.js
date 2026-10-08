import RankingScanner from '@/components/tools/RankingScanner';

export const metadata = {
  title: 'AI Ranking & Leaderboard Scanner — Unity',
  description: 'Capture sequential RoK event rankings, auto-stitch overlapping frames, and export weekly alliance stats.',
};

export default async function RankingScannerPage({ params, searchParams }) {
  const { locale } = await params;
  const sParams = await searchParams;
  const isApplet = sParams?.applet === 'true' || sParams?.applet === '1';

  return <RankingScanner isAppletMode={isApplet} locale={locale} />;
}
