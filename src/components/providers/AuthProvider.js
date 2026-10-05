'use client';

import { SessionProvider } from 'next-auth/react';
import { RolePreviewProvider } from './RolePreviewProvider';

export default function AuthProvider({ children }) {
    return (
        <SessionProvider>
            <RolePreviewProvider>
                {children}
            </RolePreviewProvider>
        </SessionProvider>
    );
}
