'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';

const RolePreviewContext = createContext({
  previewRole: null, // null = full Founder/SuperAdmin, 'unity_superadmin', 'leader', 'analyst', 'member', 'guest'
  setPreviewRole: () => {},
  resetPreview: () => {},
  isRealValheonFounder: false,
  isRealSuperAdmin: false,
  effectiveRole: 'User',
  effectiveIsValheonFounder: false,
  effectiveIsSuperAdmin: false,
  effectiveIsLeader: false,
  effectiveIsAnalyst: false,
  effectiveIsMember: false,
  effectiveIsSupporter: false,
  effectiveSession: null,
});

function checkIsValheonFounder(user) {
  if (!user) return false;
  if (user.isValheonFounder) return true;
  const uname = String(user.username || user.name || user.id || '').trim().toLowerCase();
  const email = String(user.email || '').trim().toLowerCase();
  const govName = String(user.governorConfig?.governorName || '').trim().toLowerCase();
  if (
    uname === 'reign3418' ||
    uname === 'reign' ||
    uname.includes('reign3418') ||
    uname.includes('lauren') ||
    email === 'lauren.alvarado@gmail.com' ||
    email.includes('lauren') ||
    govName.includes('reign') ||
    govName.includes('lauren')
  ) {
    return true;
  }
  return false;
}

export function RolePreviewProvider({ children }) {
  const { data: session } = useSession();
  const [previewRole, setPreviewRoleState] = useState(null);

  // Exclusive Founder tier above SuperAdmin (Lauren / reign3418 only)
  const isRealValheonFounder = checkIsValheonFounder(session?.user);
  // Check if the authenticated user is genuinely a SuperAdmin (or Founder)
  const isRealSuperAdmin = Boolean(session?.user?.isSuperAdmin) || isRealValheonFounder;

  // Hydrate preview role from localStorage on mount (only for verified SuperAdmins)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unty_preview_role');
      if (saved && ['unity_superadmin', 'leader', 'analyst', 'member', 'guest'].includes(saved)) {
        setPreviewRoleState(saved);
      }
    }
  }, []);

  const setPreviewRole = (role) => {
    if (!role || role === 'founder' || role === 'superadmin' || role === 'real') {
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

  // Exclusive Valheon Founder UI surface flag: ONLY true for Lauren when not previewing a Unity tier
  const effectiveIsValheonFounder = isRealValheonFounder && !activePreview;

  // Compute effective permissions based on simulated tier
  const effectiveIsSuperAdmin =
    isRealSuperAdmin && (!activePreview || activePreview === 'unity_superadmin');
  const effectiveIsLeader =
    activePreview === 'leader' ||
    activePreview === 'unity_superadmin' ||
    (effectiveIsSuperAdmin ? Boolean(session?.user?.isLeader ?? true) : false);
  const effectiveIsAnalyst =
    activePreview === 'analyst' ||
    activePreview === 'leader' ||
    activePreview === 'unity_superadmin' ||
    (effectiveIsSuperAdmin ? Boolean(session?.user?.isAnalyst ?? true) : false);
  const effectiveIsMember = activePreview
    ? activePreview !== 'guest'
    : Boolean(session?.user?.isMember);
  const effectiveIsSupporter =
    activePreview === 'guest' ? false : Boolean(session?.user?.isSupporter);

  const effectiveRole = activePreview
    ? activePreview === 'unity_superadmin'
      ? 'Admin'
      : activePreview === 'leader'
      ? 'Leader'
      : activePreview === 'analyst'
      ? 'Data Analyst'
      : activePreview === 'member'
      ? 'User'
      : 'Guest'
    : session?.user?.role || 'User';

  const effectiveSession = useMemo(() => {
    if (!session) return null;
    if (!activePreview) return session;

    const singleKd = session.user.allowedKingdoms?.[0] || '3418';

    return {
      ...session,
      accessToken: activePreview === 'guest' ? 'FREE_MODE' : session.accessToken,
      user: {
        ...session.user,
        isValheonFounder: effectiveIsValheonFounder,
        isSuperAdmin: effectiveIsSuperAdmin,
        isLeader: effectiveIsLeader,
        isAnalyst: effectiveIsAnalyst,
        isMember: effectiveIsMember,
        isSupporter: effectiveIsSupporter,
        role: effectiveRole,
        allowedKingdoms:
          activePreview === 'guest'
            ? []
            : activePreview === 'member' || activePreview === 'leader'
            ? [singleKd]
            : session.user.allowedKingdoms,
      },
    };
  }, [
    session,
    activePreview,
    effectiveIsValheonFounder,
    effectiveIsSuperAdmin,
    effectiveIsLeader,
    effectiveIsAnalyst,
    effectiveIsMember,
    effectiveIsSupporter,
    effectiveRole,
  ]);

  return (
    <RolePreviewContext.Provider
      value={{
        previewRole: activePreview,
        setPreviewRole,
        resetPreview,
        isRealValheonFounder,
        isRealSuperAdmin,
        effectiveRole,
        effectiveIsValheonFounder,
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
