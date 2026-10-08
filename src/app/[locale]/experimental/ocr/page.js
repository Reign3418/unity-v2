'use client';

import React from 'react';
import RankingScanner from '@/components/tools/RankingScanner';
import { useLocale } from 'next-intl';

export default function ExperimentalApplet() {
    const locale = useLocale();
    return <RankingScanner isAppletMode={true} locale={locale} />;
}
