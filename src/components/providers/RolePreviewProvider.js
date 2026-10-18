'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';

const RolePreviewContext = createContext({
  previewRole: null, // null = full SuperAdmin, 'leader', 'analyst', 'member', 'guest'
  setPreviewRole: () => {},
  resetPreview: () => {},
  osMode: 'valheon', // 'valheon' | 'unity' (only applies to Founder)
  setOsMode: () => {},
  toggleOsMode: () => {},
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
  const [osModeState, setOsModeState] = useState('valheon');

  // Exclusive Founder tier above SuperAdmin (Lauren / reign3418 only)
  const isRealValheonFounder = checkIsValheonFounder(session?.user);
  // Check if the authenticated user is genuinely a SuperAdmin (or Founder)
  const isRealSuperAdmin = Boolean(session?.user?.isSuperAdmin) || isRealValheonFounder;

  // Hydrate preview role and OS mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem('unty_preview_role');
      if (savedRole && ['leader', 'analyst', 'member', 'guest'].includes(savedRole)) {
        setPreviewRoleState(savedRole);
      }
      const savedOs = localStorage.getItem('valheon_os_mode');
      if (savedOs === 'unity' || savedOs === 'valheon') {
        setOsModeState(savedOs);
      }
    }
  }, []);

  const setOsMode = (mode) => {
    const next = mode === 'unity' ? 'unity' : 'valheon';
    setOsModeState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('valheon_os_mode', next);
    }
  };

  const toggleOsMode = () => {
    setOsModeState((prev) => {
      const next = prev === 'valheon' ? 'unity' : 'valheon';
      if (typeof window !== 'undefined') {
        localStorage.setItem('valheon_os_mode', next);
      }
      return next;
    });
  };

  // Global Alt+V hotkey for Founder to flip instantly between Valheon and screenshot-safe Classic Unity
  useEffect(() => {
    if (!isRealValheonFounder) return;
    const handleKey = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        toggleOsMode();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isRealValheonFounder]);

  const setPreviewRole = (role) => {
    if (!role || role === 'founder' || role === 'superadmin' || role === 'real') {
      setPreviewRoleState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('unty_preview_role');
      }
    } else if (role === 'unity_superadmin') {
      setPreviewRoleState(null);
      setOsMode('unity');
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

  // Exclusive Valheon Founder UI surface flag: ONLY true for Lauren when osMode === 'valheon' and not impersonating a lower role
  const effectiveIsValheonFounder =
    isRealValheonFounder && osModeState === 'valheon' && !activePreview;

  // Compute effective permissions based on simulated tier
  // Note: when Lauren switches osMode to 'unity', she STILL has full SuperAdmin permissions in Classic Unity with ZERO preview banners!
  const effectiveIsSuperAdmin = isRealSuperAdmin && !activePreview;
  const effectiveIsLeader =
    activePreview === 'leader' ||
    (effectiveIsSuperAdmin ? Boolean(session?.user?.isLeader ?? true) : false);
  const effectiveIsAnalyst =
    activePreview === 'analyst' ||
    activePreview === 'leader' ||
    (effectiveIsSuperAdmin ? Boolean(session?.user?.isAnalyst ?? true) : false);
  const effectiveIsMember = activePreview
    ? activePreview !== 'guest'
    : Boolean(session?.user?.isMember);
  const effectiveIsSupporter =
    activePreview === 'guest' ? false : Boolean(session?.user?.isSupporter);

  const effectiveRole = activePreview
    ? activePreview === 'leader'
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
        osMode: isRealValheonFounder ? osModeState : 'unity',
        setOsMode,
        toggleOsMode,
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
