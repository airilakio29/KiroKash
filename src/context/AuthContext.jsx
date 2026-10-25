import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  auth, 
  onAuthStateChanged,
  getRedirectResult,
  linkWithCredential,
  OAuthProvider,
  isFirebaseConfigured
} from '../firebase';
import { loadSavedTheme } from '../utils/themeEngine';
import {
  formatFirebaseUser,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle as authLoginWithGoogle,
  loginWithMicrosoft as authLoginWithMicrosoft,
  sendPasswordReset,
  logoutUser
} from '../services/authService';
import {
  fetchUserProfile,
  saveFullUserProfile
} from '../services/profileService';

const AuthContext = createContext();

export const STORAGE_KEY_AUTH_HINT = 'kirokash_auth_hint';
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
          localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'in');
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
  const [pendingLinkCredential, setPendingLinkCredential] = useState(null);
  const [redirectError, setRedirectError] = useState(null);

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

  // Handle redirect result (Microsoft & Google redirects) and onAuthStateChanged
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsAuthResolved(true);
      return;
    }

    let isMounted = true;

    async function initAuthFlow() {
      // 1. Process getRedirectResult before deciding route
      try {
        const redirectResult = await getRedirectResult(auth);
        sessionStorage.removeItem('kirokash_redirect_pending');
        if (redirectResult && redirectResult.user && isMounted) {
          localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'in');
          const baseUser = formatFirebaseUser(redirectResult.user);
          setUser(baseUser);
        }
      } catch (err) {
        sessionStorage.removeItem('kirokash_redirect_pending');
        console.warn('Firebase redirect auth error:', err);
        if (err.code === 'auth/account-exists-with-different-credential') {
          try {
            const cred = OAuthProvider.credentialFromError(err);
            const email = err.customData?.email || err.email;
            if (isMounted) {
              setPendingLinkCredential({ credential: cred, email });
              setRedirectError({
                code: err.code,
                message: 'An account with this email already exists using a different sign in method. Please sign in with your original method, and we will link your Microsoft account.',
                email
              });
            }
          } catch (_e) {}
        } else if (err.code !== 'auth/popup-closed-by-user' && isMounted) {
          setRedirectError({ code: err.code, message: err.message });
        }
      }

      // 2. Listen to onAuthStateChanged
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;
        if (firebaseUser) {
          localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'in');
          const baseUser = formatFirebaseUser(firebaseUser);
          setUser(prev => prev ? { ...prev, ...baseUser } : baseUser);

          // If there is a pending Microsoft credential to link to this existing account:
          if (pendingLinkCredential && pendingLinkCredential.credential) {
            try {
              await linkWithCredential(firebaseUser, pendingLinkCredential.credential);
              setPendingLinkCredential(null);
              setRedirectError(null);
            } catch (linkErr) {
              console.warn('Auto credential linking error', linkErr);
            }
          }

          // Fetch cloud profile from Firestore
          try {
            const cloudProfile = await fetchUserProfile(firebaseUser.uid);
            if (cloudProfile && isMounted) {
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
            localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'out');
            setUser(null);
          }
        }
        setIsAuthResolved(true);
      });

      return unsubscribe;
    }

    const unsubPromise = initAuthFlow();

    return () => {
      isMounted = false;
      unsubPromise.then(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [pendingLinkCredential]);

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

  const linkPendingCredentialIfAny = async (firebaseUser) => {
    if (pendingLinkCredential && pendingLinkCredential.credential && firebaseUser) {
      try {
        await linkWithCredential(firebaseUser, pendingLinkCredential.credential);
        setPendingLinkCredential(null);
        setRedirectError(null);
        return true;
      } catch (err) {
        console.warn('Credential linking failed:', err);
      }
    }
    return false;
  };

  const loginWithFirebase = async (email, password) => {
    const res = await loginWithEmail(email, password);
    if (res.success) {
      localStorage.removeItem('kampuskash_is_demo');
      localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'in');
      setUser(res.user);
      if (auth.currentUser) {
        await linkPendingCredentialIfAny(auth.currentUser);
      }
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
      localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'in');
      setUser(res.user);
      if (auth.currentUser) {
        await linkPendingCredentialIfAny(auth.currentUser);
      }
    }
    return res;
  };

  const loginWithGoogle = async () => {
    const res = await authLoginWithGoogle();
    if (res.success && res.user) {
      localStorage.removeItem('kampuskash_is_demo');
      localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'in');
      setUser(res.user);
      if (auth.currentUser) {
        await linkPendingCredentialIfAny(auth.currentUser);
      }
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

  const signInWithMicrosoft = async () => {
    const res = await authLoginWithMicrosoft();
    if (res.success && res.user) {
      localStorage.removeItem('kampuskash_is_demo');
      localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'in');
      setUser(res.user);
      try {
        const cloudProfile = await fetchUserProfile(res.user.id);
        if (cloudProfile) {
          setUser(prev => prev ? ({ ...prev, ...cloudProfile }) : null);
        }
      } catch (err) {
        console.warn('Failed to fetch cloud profile post-Microsoft login', err);
      }
    } else if (res.code === 'auth/account-exists-with-different-credential') {
      setPendingLinkCredential({ credential: res.credential, email: res.email });
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
      localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'in');
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
      localStorage.setItem(STORAGE_KEY_AUTH_HINT, 'out');
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

  const clearRedirectError = useCallback(() => {
    setRedirectError(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isAuthResolved,
    isFirebaseConfigured,
    loginWithFirebase,
    signupWithFirebase,
    loginWithGoogle,
    signInWithMicrosoft,
    loginWithMicrosoft: signInWithMicrosoft,
    pendingLinkCredential,
    redirectError,
    clearRedirectError,
    loginAsDemo,
    resetPasswordWithFirebase,
    logout,
    updateUserProfile,
    saveProfile
  }), [
    user,
    isAuthResolved,
    pendingLinkCredential,
    redirectError,
    clearRedirectError,
    updateUserProfile,
    saveProfile,
    loginAsDemo
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
