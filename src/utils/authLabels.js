/**
 * Multi-language authentication labels
 * KampusKash currently operates primarily in English ('en') with Malaysian ('ms') dictionary support.
 */
export const AUTH_LABELS = {
  en: {
    continueWithGoogle: 'Continue with Google',
    continueWithMicrosoft: 'Continue with Microsoft',
    orWithEmail: 'OR WITH EMAIL & PASSWORD',
    backToHome: 'Back to home',
    signInWithOriginal: (method) =>
      `An account with this email already exists using ${method}. Please sign in with ${method} so we can link your Microsoft account.`
  },
  ms: {
    continueWithGoogle: 'Teruskan dengan Google',
    continueWithMicrosoft: 'Teruskan dengan Microsoft',
    orWithEmail: 'ATAU DENGAN EMEL & KATA LALUAN',
    backToHome: 'Kembali ke laman utama',
    signInWithOriginal: (method) =>
      `Akaun dengan emel ini sudah wujud menggunakan ${method}. Sila log masuk dengan ${method} untuk memautkan akaun Microsoft anda.`
  }
};

export function getAuthLabel(key, lang = 'en', ...args) {
  const dict = AUTH_LABELS[lang] || AUTH_LABELS.en;
  const value = dict[key] || AUTH_LABELS.en[key] || key;
  if (typeof value === 'function') {
    return value(...args);
  }
  return value;
}
