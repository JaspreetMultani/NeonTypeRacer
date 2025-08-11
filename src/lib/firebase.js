import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

// Helpful console warning if env is missing
(() => {
    const required = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_APP_ID',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
    ];
    const missing = required.filter((k) => !import.meta.env[k]);
    if (missing.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('Missing Firebase env vars:', missing.join(', '));
    }
})();

const app = initializeApp(firebaseConfig);

// App Check: initialize synchronously as early as possible
// Allow debug token in dev when enforcement is on
if (!import.meta.env.PROD && import.meta.env.VITE_APPCHECK_DEBUG === 'true') {
    // eslint-disable-next-line no-undef
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (import.meta.env.VITE_APPCHECK_KEY) {
    try {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(import.meta.env.VITE_APPCHECK_KEY),
            isTokenAutoRefreshEnabled: true,
        });
    } catch {
        // ignore re-init during HMR
    }
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);


