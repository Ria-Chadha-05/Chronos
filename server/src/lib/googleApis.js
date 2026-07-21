/**
 * server/src/lib/googleApis.js
 *
 * Server-side execution of Google Calendar + Gmail actions on behalf of the
 * signed-in user. Every function takes the user's Google OAuth access token
 * (forwarded from the client per-request — Chronos never stores it) and
 * calls Google's REST APIs directly.
 *
 * SCOPES REQUIRED (see client/src/lib/firebase.js + googleIdentityServices.js):
 *   https://www.googleapis.com/auth/calendar.events   — create/update events
 *   https://www.googleapis.com/auth/gmail.compose      — create/send drafts
 *
 * NOTE ON THE "DRAFT-ONLY" GUARANTEE:
 *   Google does not offer a scope that permits creating drafts but forbids
 *   sending them — gmail.compose covers both. The "never send without
 *   confirmation" guarantee is therefore enforced at the application layer:
 *   the agent is only ever allowed to call createGmailDraft(); sendGmailDraft()
 *   is wired to a *separate* endpoint (/api/send-email) that only the client
 *   calls, and only after the user explicitly confirms in the UI.
 */

const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const GMAIL_DRAFTS_URL    = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts';

async function googleFetch(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error?.message || `Google API request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

/** Create a new Google Calendar event. */
export async function createCalendarEvent(token, { title, description, startISO, endISO, timeZone }) {
  return googleFetch(CALENDAR_EVENTS_URL, token, {
    method: 'POST',
    body: JSON.stringify({
      summary: title,
      description: description || '',
      start: { dateTime: startISO, timeZone: timeZone || 'Asia/Kolkata' },
      end:   { dateTime: endISO,   timeZone: timeZone || 'Asia/Kolkata' },
    }),
  });
}

/** Reschedule (patch) an existing Google Calendar event. */
export async function rescheduleCalendarEvent(token, { eventId, startISO, endISO, timeZone }) {
  return googleFetch(`${CALENDAR_EVENTS_URL}/${eventId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      start: { dateTime: startISO, timeZone: timeZone || 'Asia/Kolkata' },
      end:   { dateTime: endISO,   timeZone: timeZone || 'Asia/Kolkata' },
    }),
  });
}

function buildRawEmail({ to, subject, body }) {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Create a Gmail draft. Does NOT send it. */
export async function createGmailDraft(token, { to, subject, body }) {
  const raw = buildRawEmail({ to, subject, body });
  return googleFetch(GMAIL_DRAFTS_URL, token, {
    method: 'POST',
    body: JSON.stringify({ message: { raw } }),
  });
}

/** Send a previously-created Gmail draft. Only ever called after explicit user confirmation. */
export async function sendGmailDraft(token, draftId) {
  return googleFetch(`${GMAIL_DRAFTS_URL}/send`, token, {
    method: 'POST',
    body: JSON.stringify({ id: draftId }),
  });
}
