import { getAccessToken } from '../context/AuthContext.jsx';

const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function parseGoogleApiResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchUpcomingEvents({ accessToken = null } = {}) {
  console.info('[Chronos Calendar] fetchUpcomingEvents called');

  const token = accessToken || await getAccessToken();

  if (!token) {
    console.warn('[Chronos Calendar] No Google OAuth access token available');
    throw new Error('Google Calendar requires an authenticated Google session.');
  }

  console.info('[Chronos Calendar] Google OAuth access token acquired');

  const params = new URLSearchParams({
    maxResults: '30',
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMin: new Date().toISOString(),
  });

  const response = await fetch(`${CALENDAR_EVENTS_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const data = await parseGoogleApiResponse(response);

  console.info('[Chronos Calendar] Calendar API response received', {
    ok: response.ok,
    status: response.status,
    eventCount: Array.isArray(data?.items) ? data.items.length : 0,
  });

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error_description ||
      `Google Calendar request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    console.error('[Chronos Calendar] Calendar API request failed', {
      status: response.status,
      message,
      details: data,
    });
    throw error;
  }

  return data;
}
