import { getAccessToken } from '../context/AuthContext.jsx';

// In production the frontend and backend are separate Vercel projects on
// different domains, so the backend URL must be explicit — set
// VITE_API_URL to the deployed backend's URL (e.g. https://chronos-api.vercel.app).
// In local dev, VITE_API_URL is left unset and this falls back to the
// relative '/api' path, which Vite's dev-server proxy forwards to the
// local Express server (see vite.config.js) — unchanged local behavior.
const API_ROOT = import.meta.env.VITE_API_URL || '';
const BASE = `${API_ROOT}/api`;

// ROOT CAUSE GUARD: in a production build, VITE_API_URL is baked in at
// *build time*. If the Vercel project for the frontend doesn't have this
// env var set, API_ROOT silently falls back to '' and every request goes
// to `${window.location.origin}/api/...` - the frontend's own domain,
// which has no backend routes (backend is a separate Vercel project).
// fetch() then fails at the network/routing layer with a generic,
// unhelpful "Load failed" - exactly the symptom this guard prevents.
if (import.meta.env.PROD && !API_ROOT) {
  // eslint-disable-next-line no-console
  console.error(
    '[Chronos] VITE_API_URL is not set in this production build. ' +
    'All AI requests will be sent to this frontend\'s own domain ' +
    '(no backend exists there) and will fail with "Load failed". ' +
    'Fix: in the FRONTEND Vercel project -> Settings -> Environment ' +
    'Variables, add VITE_API_URL=https://<your-backend>.vercel.app, ' +
    'then redeploy (env vars only take effect on the next build).'
  );
}

async function post(endpoint, body, extraHeaders = {}) {
  const url = `${BASE}${endpoint}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    // fetch() itself threw - DNS failure, CORS block, connection refused,
    // mixed content, etc. This is the "Load failed" case. Surface the
    // actual target URL so misconfiguration is obvious instead of opaque.
    console.error(`[Chronos] Network request to ${url} failed:`, networkErr);
    const hint = !API_ROOT
      ? ' (VITE_API_URL is unset - see console warning above)'
      : '';
    throw new Error(
      `Could not reach the Chronos backend at ${url}${hint}. ${networkErr.message}`
    );
  }

  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (parseErr) {
    // Backend returned non-JSON (e.g. an HTML 404/500 page from Vercel's
    // routing layer). Surface enough to diagnose instead of throwing an
    // opaque "Unexpected token < in JSON" error.
    console.error(`[Chronos] Non-JSON response from ${url} (status ${res.status}):`, raw.slice(0, 300));
    throw new Error(`Backend returned a non-JSON response (HTTP ${res.status}) from ${url}`);
  }

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const plan         = (body) => post('/plan',         body);
export const rescue       = (body) => post('/rescue',       body);
export const review       = (body) => post('/review',       body);
export const reflect      = (body) => post('/reflect',      body);
export const simulate     = (body) => post('/simulate',     body);
export const prep         = (body) => post('/prep',         body);
export const intelligence = (body) => post('/intelligence', body);

// converse now forwards the user's Google access token so the agent can
// actually create/reschedule calendar events and draft emails server-side.
// If the user hasn't connected Google (or the token expired), this is just
// omitted — the agent will surface a "reconnect" message when it tries to
// use a Google-dependent tool and has no token.
export const converse = async (body) => {
  const token = await getAccessToken();
  return post('/converse', body, token ? { 'X-Google-Access-Token': token } : {});
};

// Sends a previously-drafted email. Only ever called after the user
// explicitly confirms in the draft-confirmation popup.
export const sendEmail = async (draftId) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google account not connected — reconnect to send.');
  return post('/send-email', { draftId }, { 'X-Google-Access-Token': token });
};
