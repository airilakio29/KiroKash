import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  auth, 
  onAuthStateChanged,
  isFirebaseConfigured
} from '../firebase';
import { loadSavedTheme } from '../utils/themeEngine';
import {
  formatFirebaseUser,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle as authLoginWithGoogle,
  sendPasswordReset,
  logoutUser
} from '../services/authService';
import {
  fetchUserProfile,
  saveFullUserProfile
} from '../services/profileService';

const AuthContext = createContext();

const STORAGE_KEY_USER = 'student_tracker_user';
const LEGACY_KEYS = [
  'student_tracker_auth_state'
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === 'true' || params.get('demo') === '1' || window.location.hash === '#demo') {
          const demoUser = {
            id: 'demo-student',
            username: 'Demo Student',
            email: 'demo@kampuskash.com',
            university: 'Universiti Malaya (UM)',
            avatar: '🎓',
            isDemoUser: true,
            currency: 'RM',
            isFirebaseUser: false
          };
          localStorage.setItem('kampuskash_is_demo', 'true');
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demoUser));
          return demoUser;
        }
      }
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isDemoUser) return parsed;
      }
    } catch {}
    return null;
  });
  const [isAuthResolved, setIsAuthResolved] = useState(!isFirebaseConfigured);

  // Initialize theme on app load
  useEffect(() => {
    loadSavedTheme();
  }, []);

  // Purge any session left over from old scheme if not demo user
  useEffect(() => {
    try {
      const isDemo = localStorage.getItem('kampuskash_is_demo');
      if (!isDemo) {
        LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
      }
    } catch (e) {
      console.error('Failed to clear legacy auth state', e);
    }
  }, []);

  // Firebase is the single source of truth for the real session
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsAuthResolved(true);
      return;
    }

    const fallbackTimer = setTimeout(() => {
      setIsAuthResolved(true);
    }, 600);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(fallbackTimer);
      if (firebaseUser) {
        const baseUser = formatFirebaseUser(firebaseUser);
        setUser(baseUser);

        // Fetch cloud profile from Firestore
        try {
          const cloudProfile = await fetchUserProfile(firebaseUser.uid);
          if (cloudProfile) {
            setUser(prev => prev ? ({
              ...prev,
              ...cloudProfile,
              username: cloudProfile.username || prev.username,
              avatar: cloudProfile.avatar || prev.avatar
            }) : null);
          }
        } catch (err) {
          console.warn('Failed to load cloud profile on auth state change', err);
        }
      } else {
        // Only clear if not in demo mode
        const isDemo = localStorage.getItem('kampuskash_is_demo');
        if (!isDemo) {
          setUser(null);
        }
      }
      setIsAuthResolved(true);
    });

    return () => unsubscribe();
  }, []);

  // Cache the resolved profile
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {
      console.error('Failed to save user state', e);
    }
  }, [user]);

  const loginWithFirebase = async (email, password) => {
    const res = await loginWithEmail(email, password);
    if (res.success) {
      localStorage.removeItem('kampuskash_is_demo');
      setUser(res.user);
      try {
        const cloudProfile = await fetchUserProfile(res.user.id);
        if (cloudProfile) {
          setUser(prev => prev ? ({ ...prev, ...cloudProfile }) : null);
        }
      } catch (err) {
        console.warn('Failed to fetch cloud profile post-login', err);
      }
    }
    return res;
  };

  const signupWithFirebase = async (email, password, displayName, university) => {
    const res = await registerWithEmail(email, password, displayName, university);
    if (res.success) {
      localStorage.removeItem('kampuskash_is_demo');
      setUser(res.user);
    }
    return res;
  };

  const loginWithGoogle = async () => {
    const res = await authLoginWithGoogle();
    if (res.success) {
      localStorage.removeItem('kampuskash_is_demo');
      setUser(res.user);
      try {
        const cloudProfile = await fetchUserProfile(res.user.id);
        if (cloudProfile) {
          setUser(prev => prev ? ({ ...prev, ...cloudProfile }) : null);
        }
      } catch (err) {
        console.warn('Failed to fetch cloud profile post-Google login', err);
      }
    }
    return res;
  };

  const loginAsDemo = useCallback(() => {
    const demoUser = {
      id: 'demo-student',
      username: 'Demo Student',
      email: 'demo@kampuskash.com',
      university: 'Universiti Malaya (UM)',
      avatar: '🎓',
      isDemoUser: true,
      currency: 'RM',
      isFirebaseUser: false
    };
    try {
      localStorage.setItem('kampuskash_is_demo', 'true');
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demoUser));
    } catch {}
    setUser(demoUser);
    return { success: true, user: demoUser };
  }, []);

  const resetPasswordWithFirebase = async (email) => {
    return await sendPasswordReset(email);
  };

  const logout = async () => {
    try {
      if (!user?.isDemoUser) {
        await logoutUser();
      }
    } catch (e) {
      console.error('Firebase signout failed', e);
    }
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem('kampuskash_is_demo');
      localStorage.removeItem('kirokash_tutorial_current_step');
    } catch (e) {
      console.error('Failed to clear user cache', e);
    }
  };

  const updateUserProfile = useCallback((newDetails) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        ...newDetails,
        username: newDetails.username || prev.username,
        avatar: newDetails.avatar || prev.avatar
      };
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save user cache', e);
      }
      return updated;
    });
  }, []);

  const saveProfile = useCallback(async (profileData) => {
    if (!user?.id) return { success: false, error: 'No user authenticated.' };
    updateUserProfile(profileData);
    if (user.isDemoUser) {
      return { success: true };
    }
    return await saveFullUserProfile(user.id, profileData);
  }, [user, updateUserProfile]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isAuthResolved,
    isFirebaseConfigured,
    loginWithFirebase,
    signupWithFirebase,
    loginWithGoogle,
    loginAsDemo,
    resetPasswordWithFirebase,
    logout,
    updateUserProfile,
    saveProfile
  }), [user, isAuthResolved, updateUserProfile, saveProfile, loginAsDemo]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
