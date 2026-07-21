import { getAccessToken } from '../context/AuthContext.jsx';

const GMAIL_MESSAGES_URL = 'https://www.googleapis.com/gmail/v1/users/me/messages';
const GMAIL_SEARCH_QUERY = [
  'newer_than:30d',
  '-category:promotions',
  '-category:social',
].join(' ');

async function parseGoogleApiResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function decodeBase64Url(value = '') {
  if (!value) return '';
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function stripHtml(value = '') {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getHeader(headers = [], name) {
  const found = headers.find(header => header.name?.toLowerCase() === name.toLowerCase());
  return found?.value || '';
}

function collectBodyParts(part, bodies = { text: [], html: [] }) {
  if (!part) return bodies;

  if (part.mimeType === 'text/plain' && part.body?.data) {
    bodies.text.push(decodeBase64Url(part.body.data));
  }

  if (part.mimeType === 'text/html' && part.body?.data) {
    bodies.html.push(stripHtml(decodeBase64Url(part.body.data)));
  }

  for (const child of part.parts || []) {
    collectBodyParts(child, bodies);
  }

  return bodies;
}

function parseGmailMessage(message) {
  const headers = message.payload?.headers || [];
  const bodies = collectBodyParts(message.payload);
  const bodyText = (bodies.text.join('\n') || bodies.html.join('\n') || message.snippet || '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: message.id,
    threadId: message.threadId,
    historyId: message.historyId,
    labelIds: message.labelIds || [],
    snippet: message.snippet || '',
    internalDate: message.internalDate || null,
    subject: getHeader(headers, 'Subject'),
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    dateHeader: getHeader(headers, 'Date'),
    bodyText,
    raw: message,
  };
}

async function fetchMessageDetail(token, id) {
  const params = new URLSearchParams([['format', 'full']]);

  const response = await fetch(`${GMAIL_MESSAGES_URL}/${id}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const data = await parseGoogleApiResponse(response);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error_description ||
      `Gmail message request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return parseGmailMessage(data);
}

export async function fetchRecentEmails({ maxResults = 20, accessToken = null } = {}) {
  console.info('[Chronos Gmail] fetchRecentEmails called');

  const token = accessToken || await getAccessToken();

  if (!token) {
    console.warn('[Chronos Gmail] No Google OAuth access token available');
    throw new Error('Gmail requires an authenticated Google session.');
  }

  console.info('[Chronos Gmail] Google OAuth access token acquired');

  const params = new URLSearchParams({
    maxResults: String(maxResults),
    q: GMAIL_SEARCH_QUERY,
  });

  const response = await fetch(`${GMAIL_MESSAGES_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const data = await parseGoogleApiResponse(response);

  console.info('[Chronos Gmail] Gmail API message list received', {
    ok: response.ok,
    status: response.status,
    messageCount: Array.isArray(data?.messages) ? data.messages.length : 0,
  });

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error_description ||
      `Gmail request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    console.error('[Chronos Gmail] Gmail API request failed', {
      status: response.status,
      message,
      details: data,
    });
    throw error;
  }

  const summaries = Array.isArray(data?.messages) ? data.messages : [];
  const results = await Promise.allSettled(summaries.map(summary => fetchMessageDetail(token, summary.id)));
  const emails = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  console.info('[Chronos Gmail] Gmail messages parsed', {
    messageCount: emails.length,
    failedMessageCount: results.length - emails.length,
  });

  return emails;
}
