import { getAccessToken } from '../context/AuthContext.jsx';

// In production the frontend and backend are separate Vercel projects on
// different domains, so the backend URL must be explicit — set
// VITE_API_URL to the deployed backend's URL (e.g. https://chronos-api.vercel.app).
// In local dev, VITE_API_URL is left unset and this falls back to the
// relative '/api' path, which Vite's dev-server proxy forwards to the
// local Express server (see vite.config.js) — unchanged local behavior.
const API_ROOT = import.meta.env.VITE_API_URL || '';
const BASE = `${API_ROOT}/api`;

async function post(endpoint, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
  const data = await res.json();
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
