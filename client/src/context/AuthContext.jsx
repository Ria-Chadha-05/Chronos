/**
 * AuthContext.jsx — Chronos Authentication Layer (Redesigned)
 *
 * Architecture: Firebase-first + GIS Token Model (sequenced, gesture-bound)
 *
 * Problem solved:
 *   The previous architecture assumed credential.accessToken would be available
 *   after page reload, and that GIS could silently re-issue a token via hidden
 *   iframe. Neither is true: Firebase does not persist OAuth access tokens, and
 *   GIS silent refresh relies on third-party cookies that Safari (and increasingly
 *   all browsers) block by default. The result was an invisible popup fired from
 *   useEffect with no user gesture — which every browser blocks.
 *
 * Solution:
 *   1. During sign-in, run BOTH Firebase signInWithPopup AND GIS requestAccessToken
 *      back-to-back inside the same user-gesture event handler. Both popups are
 *      covered by the browser's gesture window (≈5 s from click). Since Firebase
 *      already requested calendar/gmail consent, the GIS popup auto-accepts with
 *      a single "Continue as [Name]" confirmation — no second consent screen.
 *
 *   2. Store the access token in sessionStorage (not just in-memory). sessionStorage
 *      survives page reloads within the same browser session, so the token is
 *      recovered automatically without any popup after a soft refresh.
 *
 *   3. Never attempt GIS silent refresh. It is dead on Safari and dying everywhere.
 *      When the token is absent or expired, getAccessToken() returns null and the
 *      caller (CalendarService → CommitmentContext) surfaces a visible "Reconnect"
 *      affordance rather than firing a background popup.
 *
 *   4. All existing public APIs are preserved: { user, loading, signIn, signOut,
 *      getAccessToken }. No downstream code changes required.
 *
 * Production upgrade path:
 *   Replace the GIS Token Model with the GIS Authorization Code Model (PKCE).
 *   GIS returns an auth code → your /api/oauth/exchange endpoint exchanges it for
 *   a refresh token → server stores it securely → vends short-lived access tokens
 *   on demand. This eliminates all popup-after-reload UX and works on every browser
 *   forever. The AuthContext API surface stays identical; only signIn() changes
 *   internally.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.js';
import { GOOGLE_API_SCOPES, loadGoogleIdentityServices } from '../lib/googleIdentityServices.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOKEN_EXPIRY_SKEW_MS   = 60 * 1000;   // treat token as expired 60 s early
const SESSION_STORAGE_KEY    = 'chronos_gtoken';

// ─── Module-level accessor (used by calendarService without React) ────────────

let activeAccessTokenGetter = null;

export async function getAccessToken() {
  if (!activeAccessTokenGetter) return null;
  return activeAccessTokenGetter();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGoogleOAuthClientId() {
  const clientId =
    import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      'Missing Google OAuth client ID. Set VITE_GOOGLE_OAUTH_CLIENT_ID in .env.local.'
    );
  }

  return clientId;
}

/**
 * Plain serialisable profile — never contains tokens.
 */
function toProfile(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    uid:         firebaseUser.uid,
    displayName: firebaseUser.displayName,
    email:       firebaseUser.email,
    photoURL:    firebaseUser.photoURL,
  };
}

// ─── sessionStorage token cache ───────────────────────────────────────────────
//
// sessionStorage persists across soft page reloads (F5 / ⌘R) within the same
// browser tab session. It is cleared when the tab is closed, unlike localStorage.
// This gives us token recovery on reload without any popup or cookie dependency.

function readStoredToken() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expiresAt) return null;
    if (parsed.expiresAt - TOKEN_EXPIRY_SKEW_MS <= Date.now()) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredToken(token, expiresInSeconds = 3600) {
  try {
    const entry = {
      token,
      expiresAt: Date.now() + Number(expiresInSeconds) * 1000,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(entry));
    return entry;
  } catch {
    // sessionStorage full or blocked — not fatal; in-memory ref still works
    return { token, expiresAt: Date.now() + Number(expiresInSeconds) * 1000 };
  }
}

function clearStoredToken() {
  try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Firebase user object (not serialised — kept in ref to avoid re-renders)
  const firebaseUserRef = useRef(null);

  // In-memory token cache (redundant with sessionStorage, but avoids a parse
  // on every getAccessToken() call during the same JS execution context)
  const tokenEntryRef = useRef(null);

  // ── Token management ───────────────────────────────────────────────────────

  const storeToken = useCallback((token, expiresInSeconds = 3600) => {
    if (!token) return;
    tokenEntryRef.current = writeStoredToken(token, expiresInSeconds);
    console.info('[Chronos Auth] OAuth access token stored', {
      expiresInSeconds,
      expiresAt: new Date(tokenEntryRef.current.expiresAt).toISOString(),
    });
  }, []);

  const clearToken = useCallback(() => {
    tokenEntryRef.current = null;
    clearStoredToken();
  }, []);

  /**
   * Returns a valid access token or null.
   *
   * Priority:
   *   1. In-memory ref (fastest — same JS context)
   *   2. sessionStorage (survives page reload in the same tab session)
   *   3. null — caller should surface a "Reconnect" affordance
   *
   * We deliberately do NOT attempt a GIS silent refresh here. Silent refresh
   * via GIS Token Model uses third-party cookies that are blocked on Safari
   * and being deprecated on Chrome. We never fire a popup from this function
   * because it may be called outside a user-gesture window (e.g. from useEffect).
   */
  const getAccessTokenForCurrentUser = useCallback(async () => {
    if (!firebaseUserRef.current) return null;

    // 1. Check in-memory ref
    if (
      tokenEntryRef.current?.token &&
      tokenEntryRef.current.expiresAt - TOKEN_EXPIRY_SKEW_MS > Date.now()
    ) {
      return tokenEntryRef.current.token;
    }

    // 2. Check sessionStorage (e.g. after page reload)
    const stored = readStoredToken();
    if (stored?.token) {
      tokenEntryRef.current = stored;
      console.info('[Chronos Auth] OAuth access token recovered from sessionStorage');
      return stored.token;
    }

    // 3. Token absent or expired — return null
    // The caller (CommitmentContext → CalendarService) will surface a
    // "Reconnect Calendar" button that the user consciously clicks,
    // which will re-enter signIn() inside a valid gesture window.
    console.info(
      '[Chronos Auth] OAuth access token unavailable — user must reconnect to refresh.'
    );
    return null;
  }, []);

  // ── GIS Token request (MUST be called inside a user-gesture window) ────────

  /**
   * Opens the GIS popup to request an OAuth access token.
   *
   * IMPORTANT: This function must be called synchronously inside a user-gesture
   * handler (button click). It MUST NOT be called from useEffect, setTimeout,
   * or any async context that has broken out of the gesture window.
   *
   * On first sign-in: Google shows a brief "Continue as [Name]" confirmation
   * because Firebase already collected consent for all scopes.
   *
   * On reconnect (token expired): same brief confirmation — no second full
   * consent screen because the user has already granted the scopes.
   */
  const requestGISToken = useCallback(
    (emailHint) =>
      new Promise(async (resolve, reject) => {
        let google;
        try {
          google = await loadGoogleIdentityServices();
        } catch (err) {
          reject(new Error('Failed to load Google Identity Services: ' + err.message));
          return;
        }

        // Each call creates a fresh client so the callback captures the current
        // resolve/reject pair without any ref juggling.
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: getGoogleOAuthClientId(),
          scope: GOOGLE_API_SCOPES,
          include_granted_scopes: true,
          hint: emailHint || undefined,

          callback: (response) => {
            if (response.error) {
              const msg = response.error_description || response.error;
              console.error('[Chronos Auth] GIS token response error:', msg);
              reject(new Error(msg));
              return;
            }
            storeToken(response.access_token, response.expires_in);
            resolve(response.access_token);
          },

          error_callback: (error) => {
            // GIS fires this for popup_closed_by_user, access_denied, etc.
            const msg = error?.message || error?.type || 'GIS token request failed.';
            console.error('[Chronos Auth] GIS error_callback:', msg);
            reject(new Error(msg));
          },
        });

        // prompt: 'consent' is intentional.
        // We never use prompt: '' (silent). Silent mode requires third-party
        // cookies which Safari blocks. With prompt: 'consent', Google presents
        // a lightweight "Continue as [Name]" screen if all scopes were already
        // granted — it resolves in under 1 second.
        tokenClient.requestAccessToken({ prompt: 'consent' });
      }),
    [storeToken]
  );

  // ── Sign-in ────────────────────────────────────────────────────────────────

  /**
   * Sign in with Google.
   *
   * Both the Firebase popup and the GIS token popup are opened back-to-back
   * inside the same user-gesture window (browser grants ≈5 s from the click).
   * This guarantees:
   *   - Firebase authenticates the user (ID token for identity).
   *   - GIS issues a fresh OAuth access token (for Calendar/Gmail API calls).
   *
   * The access token is stored in sessionStorage so it survives page reloads
   * without any further popup.
   */
  const signIn = async () => {
    setLoading(true);
    clearToken();

    try {
      // Step 1: Firebase authentication popup.
      // Firebase's GoogleAuthProvider already requests calendar + gmail scopes
      // (configured in firebase.js), so the user grants all permissions here.
      console.info('[Chronos Auth] Step 1/2: Firebase sign-in popup');
      const result     = await signInWithPopup(auth, googleProvider);
      const profile    = toProfile(result.user);
      firebaseUserRef.current = result.user;

      setUser(profile);

      // Step 2: GIS token popup — immediately after, still in gesture window.
      // Because Firebase already obtained consent for all scopes, Google presents
      // a minimal "Continue as [Name]" confirmation (not a full consent screen).
      // This typically resolves in < 1 second.
      console.info('[Chronos Auth] Step 2/2: GIS access token popup');
      try {
        await requestGISToken(result.user.email);
        console.info('[Chronos Auth] Sign-in complete — Firebase authenticated + OAuth token ready');
      } catch (gisError) {
        // GIS step failed (e.g. user closed the second popup).
        // Firebase auth still succeeded — the user IS signed in.
        // Calendar will be unavailable until they reconnect.
        console.warn(
          '[Chronos Auth] GIS token step failed. Firebase auth succeeded; Calendar unavailable.',
          { message: gisError.message }
        );
        // We do NOT throw here. The user is authenticated. Downstream code
        // (CommitmentContext) will surface a reconnect affordance when Calendar
        // access is attempted and getAccessToken() returns null.
      }

      setLoading(false);
      return profile;

    } catch (error) {
      // Firebase sign-in itself failed (user cancelled, network error, etc.)
      clearToken();
      firebaseUserRef.current = null;
      setUser(null);
      await firebaseSignOut(auth).catch(() => {});
      setLoading(false);
      throw error;
    }
  };

  /**
   * Re-request an OAuth token after expiry or sessionStorage loss.
   *
   * This is a separate, user-triggered action. Call it from a "Reconnect
   * Calendar" button click — NOT from useEffect. The user gesture is required
   * for the popup to open without being blocked.
   *
   * Usage in a component:
   *   const { reconnectCalendar } = useAuth();
   *   <button onClick={reconnectCalendar}>Reconnect Calendar</button>
   */
  const reconnectCalendar = async () => {
    if (!firebaseUserRef.current) {
      throw new Error('Cannot reconnect Calendar: user is not signed in.');
    }
    console.info('[Chronos Auth] Reconnecting Google Calendar access token');
    await requestGISToken(firebaseUserRef.current.email);
  };

  // ── Sign-out ───────────────────────────────────────────────────────────────

  const signOut = async () => {
    clearToken();
    firebaseUserRef.current = null;
    setUser(null);
    await firebaseSignOut(auth);
    console.info('[Chronos Auth] Signed out, OAuth token cleared');
  };

  // ── Firebase auth state observer ───────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      firebaseUserRef.current = firebaseUser;

      if (!firebaseUser) {
        // Signed out (externally or via signOut())
        clearToken();
        setUser(null);
      } else {
        // Restore user profile. Token may already be in sessionStorage (soft reload).
        setUser(toProfile(firebaseUser));
        const restored = readStoredToken();
        if (restored) {
          tokenEntryRef.current = restored;
          console.info('[Chronos Auth] Auth state restored — token recovered from sessionStorage');
        } else {
          console.info(
            '[Chronos Auth] Auth state restored — no cached token (user must reconnect Calendar)'
          );
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [clearToken]);

  // ── Register module-level accessor for calendarService ────────────────────

  useEffect(() => {
    activeAccessTokenGetter = getAccessTokenForCurrentUser;
    return () => {
      if (activeAccessTokenGetter === getAccessTokenForCurrentUser) {
        activeAccessTokenGetter = null;
      }
    };
  }, [getAccessTokenForCurrentUser]);

  // ─── Context value ─────────────────────────────────────────────────────────
  //
  // Public API (unchanged from previous version):
  //   user              — serialisable profile | null
  //   loading           — boolean
  //   signIn()          — opens Firebase + GIS popups, returns profile
  //   signOut()         — clears everything
  //   getAccessToken()  — returns valid token | null (no popup side-effects)
  //
  // New additions (additive — no downstream breakage):
  //   reconnectCalendar() — call from a button click to re-acquire token after expiry

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        getAccessToken: getAccessTokenForCurrentUser,
        reconnectCalendar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
