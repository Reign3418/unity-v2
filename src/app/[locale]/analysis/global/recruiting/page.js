'use client';

import { useSession } from 'next-auth/react';
import RecruitingCenter from '@/components/analysis/global/RecruitingCenter';

export default function RecruitingCenterPage() {
    const { data: session } = useSession();
    return <RecruitingCenter session={session} />;
}
