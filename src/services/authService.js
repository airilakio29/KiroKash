/**
 * KiroKash Authentication Service
 * Wraps Firebase Authentication methods and provides user formatting
 * Phase 1: Firebase Auth & Google Login
 * Future (Phase 2): AWS Cognito
 */

import {
  auth,
  googleProvider,
  microsoftProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  linkWithCredential,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  isFirebaseConfigured
} from '../firebase.js';

/**
 * Format raw Firebase errors into user-friendly plain language.
 * Popup closed/cancelled returns empty string (no error shown).
 */
export function formatAuthError(err) {
  if (!err) return '';
  const code = err.code || err.message || '';
  if (
    code.includes('auth/popup-closed-by-user') ||
    code.includes('auth/cancelled-popup-request')
  ) {
    return '';
  }
  if (code.includes('auth/popup-blocked')) {
    return 'The sign-in popup was blocked by your browser. Please allow popups or try again.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  if (code.includes('auth/unauthorized-domain')) {
    return 'This domain is not authorized for authentication. Please verify your Firebase Authorized Domains configuration.';
  }
  if (code.includes('auth/account-exists-with-different-credential')) {
    return 'An account already exists with this email using a different sign-in method. Please sign in with your original method, and we will link your Microsoft account.';
  }
  if (
    code.includes('auth/invalid-credential') ||
    code.includes('auth/wrong-password') ||
    code.includes('auth/user-not-found')
  ) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('auth/operation-not-allowed')) {
    return 'This sign-in provider is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.';
  }
  return err.message || 'Authentication error. Please try again.';
}

function shouldUseRedirect() {
  if (typeof window === 'undefined') return false;
  const isIosStandalone =
    window.navigator?.standalone ||
    (window.matchMedia?.('(display-mode: standalone)').matches &&
      /iPhone|iPad|iPod/.test(navigator.userAgent));
  const isWebview =
    /;\s*wv\)/.test(navigator.userAgent) ||
    /FBAN|FBAV|Instagram|Line|MicroMessenger|GSA/.test(navigator.userAgent);
  return Boolean(isIosStandalone || isWebview);
}

/**
 * Check if a string looks like a technical UID or hex hash
 */
export function isTechnicalId(str) {
  if (!str || typeof str !== 'string') return true;
  const clean = str.replace(/[\s-_]/g, '');
  // 20+ hex characters or 28+ alphanumeric chars with no vowels/spaces
  if (/^[a-f0-9]{20,}$/i.test(clean)) return true;
  if (/^[a-zA-Z0-9]{28,}$/.test(clean)) return true;
  return false;
}

/**
 * Format raw Firebase User into clean application user object.
 * Priority for display name:
 * 1. Saved profile displayName
 * 2. Firebase Authentication displayName
 * 3. Clean name derived from email prefix
 * 4. Generic fallback "Student"
 * Never returns UID or technical hash.
 */
export function formatFirebaseUser(fbUser, overrides = {}) {
  if (!fbUser) return null;

  let name = overrides.username || fbUser.displayName;
  if (!name || name === fbUser.uid || isTechnicalId(name)) {
    if (fbUser.email) {
      name = fbUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
    } else {
      name = 'Student';
    }
  }

  // Capitalize words
  name = name
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim() || 'Student';

  return {
    id: fbUser.uid,
    username: name,
    email: fbUser.email || '',
    university: overrides.university || 'Campus Student',
    avatar: overrides.avatar || fbUser.photoURL || '🎓',
    isFirebaseUser: true,
    currency: overrides.currency || 'RM',
    ...overrides
  };
}

export async function loginWithEmail(email, password) {
  if (!isFirebaseConfigured || !auth) {
    return { success: false, code: 'auth/not-configured', error: 'Firebase is not configured.' };
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = formatFirebaseUser(cred.user);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

export async function registerWithEmail(email, password, displayName, university) {
  if (!isFirebaseConfigured || !auth) {
    return { success: false, code: 'auth/not-configured', error: 'Firebase is not configured.' };
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    const user = formatFirebaseUser(cred.user, {
      username: displayName || email.split('@')[0],
      university: university || 'Campus Student'
    });
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

export async function loginWithGoogle() {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    return { success: false, code: 'auth/not-configured', error: 'Firebase is not configured.' };
  }

  if (shouldUseRedirect()) {
    try {
      sessionStorage.setItem('kirokash_redirect_pending', 'google');
      await signInWithRedirect(auth, googleProvider);
      return { success: true, redirect: true };
    } catch (redirectErr) {
      return { success: false, error: redirectErr.message, code: redirectErr.code };
    }
  }

  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = formatFirebaseUser(cred.user, {
      username: cred.user.displayName || 'Google Student',
      university: 'Campus Student',
      avatar: cred.user.photoURL || '🌐'
    });
    return { success: true, user, credential: cred };
  } catch (error) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
      try {
        sessionStorage.setItem('kirokash_redirect_pending', 'google');
        await signInWithRedirect(auth, googleProvider);
        return { success: true, redirect: true };
      } catch (redirectErr) {
        return { success: false, error: redirectErr.message, code: redirectErr.code };
      }
    }
    return {
      success: false,
      error: error.message,
      code: error.code,
      email: error.customData?.email || error.email,
      credential: OAuthProvider.credentialFromError(error)
    };
  }
}

export async function loginWithMicrosoft() {
  if (!isFirebaseConfigured || !auth || !microsoftProvider) {
    return { success: false, code: 'auth/not-configured', error: 'Firebase is not configured.' };
  }

  if (shouldUseRedirect()) {
    try {
      sessionStorage.setItem('kirokash_redirect_pending', 'microsoft');
      await signInWithRedirect(auth, microsoftProvider);
      return { success: true, redirect: true };
    } catch (redirectErr) {
      return { success: false, error: redirectErr.message, code: redirectErr.code };
    }
  }

  try {
    const cred = await signInWithPopup(auth, microsoftProvider);
    const user = formatFirebaseUser(cred.user, {
      username: cred.user.displayName || (cred.user.email ? cred.user.email.split('@')[0] : 'Microsoft Student'),
      university: 'Campus Student',
      avatar: cred.user.photoURL || '🎓'
    });
    return { success: true, user, credential: cred };
  } catch (error) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
      try {
        sessionStorage.setItem('kirokash_redirect_pending', 'microsoft');
        await signInWithRedirect(auth, microsoftProvider);
        return { success: true, redirect: true };
      } catch (redirectErr) {
        return { success: false, error: redirectErr.message, code: redirectErr.code };
      }
    }
    return {
      success: false,
      error: error.message,
      code: error.code,
      email: error.customData?.email || error.email,
      credential: OAuthProvider.credentialFromError(error)
    };
  }
}

export async function sendPasswordReset(email, customSettings) {
  if (!isFirebaseConfigured || !auth) {
    return { success: false, code: 'auth/not-configured', error: 'Firebase is not configured.' };
  }
  try {
    const actionCodeSettings = customSettings || {
      url: 'https://kirokash.vercel.app/reset-password',
      handleCodeInApp: true,
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

export async function verifyResetCode(actionCode) {
  if (!isFirebaseConfigured || !auth) {
    return { success: false, code: 'auth/not-configured', error: 'Firebase is not configured.' };
  }
  try {
    const email = await verifyPasswordResetCode(auth, actionCode);
    return { success: true, email };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

export async function confirmNewPassword(actionCode, newPassword) {
  if (!isFirebaseConfigured || !auth) {
    return { success: false, code: 'auth/not-configured', error: 'Firebase is not configured.' };
  }
  try {
    await confirmPasswordReset(auth, actionCode, newPassword);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

export { confirmPasswordReset };

export async function logoutUser() {
  if (auth) {
    await firebaseSignOut(auth);
  }
}
