'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';

const RolePreviewContext = createContext({
  previewRole: null, // null = full SuperAdmin, 'leader', 'analyst', 'member', 'guest'
  setPreviewRole: () => {},
  resetPreview: () => {},
  isRealSuperAdmin: false,
  effectiveRole: 'User',
  effectiveIsSuperAdmin: false,
  effectiveIsLeader: false,
  effectiveIsAnalyst: false,
  effectiveIsMember: false,
  effectiveIsSupporter: false,
  effectiveSession: null,
});

export function RolePreviewProvider({ children }) {
  const { data: session } = useSession();
  const [previewRole, setPreviewRoleState] = useState(null);

  // Check if the authenticated user is genuinely a SuperAdmin
  const isRealSuperAdmin = Boolean(session?.user?.isSuperAdmin);

  // Hydrate preview role from localStorage on mount (only for verified SuperAdmins)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unty_preview_role');
      if (saved && ['leader', 'analyst', 'member', 'guest'].includes(saved)) {
        setPreviewRoleState(saved);
      }
    }
  }, []);

  const setPreviewRole = (role) => {
    if (!role || role === 'superadmin' || role === 'real') {
      setPreviewRoleState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('unty_preview_role');
      }
    } else {
      setPreviewRoleState(role);
      if (typeof window !== 'undefined') {
        localStorage.setItem('unty_preview_role', role);
      }
    }
  };

  const resetPreview = () => setPreviewRole(null);

  // Only genuinely authorized SuperAdmins can activate preview mode
  const activePreview = isRealSuperAdmin ? previewRole : null;

  // Compute effective permissions based on simulated tier
  const effectiveIsSuperAdmin = isRealSuperAdmin && !activePreview;
  const effectiveIsLeader = activePreview === 'leader' || (effectiveIsSuperAdmin ? Boolean(session?.user?.isLeader) : false);
  const effectiveIsAnalyst = activePreview === 'analyst' || activePreview === 'leader' || (effectiveIsSuperAdmin ? Boolean(session?.user?.isAnalyst) : false);
  const effectiveIsMember = activePreview ? activePreview !== 'guest' : Boolean(session?.user?.isMember);
  const effectiveIsSupporter = activePreview === 'guest' ? false : Boolean(session?.user?.isSupporter);

  const effectiveRole = activePreview 
    ? (activePreview === 'leader' ? 'Leader' : activePreview === 'analyst' ? 'Data Analyst' : activePreview === 'member' ? 'User' : 'Guest')
    : (session?.user?.role || 'User');

  const effectiveSession = useMemo(() => {
    if (!session) return null;
    if (!activePreview) return session;

    const singleKd = session.user.allowedKingdoms?.[0] || '3418';

    return {
      ...session,
      accessToken: activePreview === 'guest' ? 'FREE_MODE' : session.accessToken,
      user: {
        ...session.user,
        isSuperAdmin: effectiveIsSuperAdmin,
        isLeader: effectiveIsLeader,
        isAnalyst: effectiveIsAnalyst,
        isMember: effectiveIsMember,
        isSupporter: effectiveIsSupporter,
        role: effectiveRole,
        allowedKingdoms: activePreview === 'guest' 
          ? [] 
          : (activePreview === 'member' || activePreview === 'leader' ? [singleKd] : session.user.allowedKingdoms),
      }
    };
  }, [session, activePreview, effectiveIsSuperAdmin, effectiveIsLeader, effectiveIsAnalyst, effectiveIsMember, effectiveIsSupporter, effectiveRole]);

  return (
    <RolePreviewContext.Provider
      value={{
        previewRole: activePreview,
        setPreviewRole,
        resetPreview,
        isRealSuperAdmin,
        effectiveRole,
        effectiveIsSuperAdmin,
        effectiveIsLeader,
        effectiveIsAnalyst,
        effectiveIsMember,
        effectiveIsSupporter,
        effectiveSession,
      }}
    >
      {children}
    </RolePreviewContext.Provider>
  );
}

export function useRolePreview() {
  return useContext(RolePreviewContext);
}
