/**
 * firebase.js — Firebase initialisation for Chronos
 *
 * The GoogleAuthProvider is configured here with all OAuth scopes that Chronos
 * needs. Requesting them in the Firebase popup ensures the user grants consent
 * for Calendar and Gmail at sign-in time. When the subsequent GIS token popup
 * opens, Google recognises that consent was already given and skips the full
 * consent screen, presenting only a lightweight "Continue as [Name]" confirmation.
 *
 * DO NOT remove the calendar/gmail scopes from this provider. If they are absent,
 * the GIS token popup will show a second, full consent screen — making it feel
 * like a two-step auth flow rather than a single click.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// Identity scopes — Firebase needs these for the user profile
googleProvider.addScope('profile');
googleProvider.addScope('email');

// API scopes — must match GOOGLE_API_SCOPES in googleIdentityServices.js exactly.
// Granting them here means the GIS popup (Step 2 of sign-in) auto-accepts.
//
// UPGRADED from *.readonly to write scopes: Chronos's agent now creates and
// reschedules calendar events, and creates (never sends) Gmail drafts.
// NOTE: Google has no scope that permits creating Gmail drafts but forbids
// sending — gmail.compose covers both. The "never send without confirmation"
// guarantee is enforced in app logic (server/src/lib/agentTools.js), not by
// this OAuth scope.
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.compose');

googleProvider.setCustomParameters({
  // include_granted_scopes ensures incremental auth works correctly if you
  // add new scopes later without revoking existing ones.
  include_granted_scopes: 'true',

  // select_account forces the account picker so users with multiple Google
  // accounts can choose which one to use. Remove if you want auto-selection.
  prompt: 'select_account',
});

export { auth, googleProvider };
