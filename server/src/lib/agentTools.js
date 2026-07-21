/**
 * server/src/lib/agentTools.js
 *
 * Tool definitions (Groq/OpenAI function-calling schema) for the Converse
 * agent, plus the dispatcher that actually executes them.
 *
 * Execution model:
 *   - create_calendar_event / reschedule_calendar_event  → real Google Calendar API calls
 *   - draft_email                                        → real Gmail draft (never sent)
 *   - activate_rescue_mode / activate_firefighter_mode   → Chronos-internal state.
 *     There is no external API for these — they're this app's own UI mode.
 *     The server marks them "executed"; the client applies the mode switch
 *     on receiving the response (no confirmation needed, per product decision).
 *
 * IMPORTANT: send_email is intentionally NOT a tool the agent can call.
 * Sending only happens via POST /api/send-email, triggered by the user
 * clicking "Send" on the draft-confirmation popup client-side.
 */

import {
  createCalendarEvent,
  rescheduleCalendarEvent,
  createGmailDraft,
} from './googleApis.js';

export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new event on the user\'s Google Calendar.',
      parameters: {
        type: 'object',
        properties: {
          title:       { type: 'string', description: 'Event title' },
          description: { type: 'string', description: 'Event description (optional)' },
          startISO:    { type: 'string', description: 'Start time, ISO 8601 (e.g. 2026-07-20T09:00:00)' },
          endISO:      { type: 'string', description: 'End time, ISO 8601' },
        },
        required: ['title', 'startISO', 'endISO'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_calendar_event',
      description: 'Move an existing Google Calendar event to a new start/end time.',
      parameters: {
        type: 'object',
        properties: {
          eventId:  { type: 'string', description: 'Google Calendar event ID' },
          startISO: { type: 'string', description: 'New start time, ISO 8601' },
          endISO:   { type: 'string', description: 'New end time, ISO 8601' },
        },
        required: ['eventId', 'startISO', 'endISO'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'activate_rescue_mode',
      description: 'Activate Chronos Rescue Mode to replan a broken day.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'activate_firefighter_mode',
      description: 'Activate Chronos Firefighter Mode for an active crisis/emergency.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_email',
      description:
        'Create a Gmail draft. This ONLY creates a draft — it is never sent automatically. ' +
        'The user must explicitly confirm sending in the UI.',
      parameters: {
        type: 'object',
        properties: {
          to:      { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body:    { type: 'string', description: 'Email body, plain text' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
];

/**
 * Execute a single tool call. Returns { result, executedAction, emailDraft? }.
 * Throws if a Google API call fails (caller decides how to surface it).
 */
export async function executeTool(name, args, { accessToken }) {
  switch (name) {
    case 'create_calendar_event': {
      if (!accessToken) throw new Error('No Google access token — cannot create calendar event.');
      const event = await createCalendarEvent(accessToken, args);
      return {
        result: { eventId: event.id, htmlLink: event.htmlLink },
        executedAction: { type: 'CREATED_EVENT', label: `Created "${args.title}"` },
      };
    }
    case 'reschedule_calendar_event': {
      if (!accessToken) throw new Error('No Google access token — cannot reschedule event.');
      const event = await rescheduleCalendarEvent(accessToken, args);
      return {
        result: { eventId: event.id, htmlLink: event.htmlLink },
        executedAction: { type: 'RESCHEDULED_EVENT', label: 'Rescheduled event' },
      };
    }
    case 'activate_rescue_mode':
      return {
        result: { activated: true },
        executedAction: { type: 'RESCUE_MODE', label: 'Rescue Mode activated' },
      };
    case 'activate_firefighter_mode':
      return {
        result: { activated: true },
        executedAction: { type: 'FIREFIGHTER_MODE', label: 'Firefighter Mode activated' },
      };
    case 'draft_email': {
      if (!accessToken) throw new Error('No Google access token — cannot create email draft.');
      const draft = await createGmailDraft(accessToken, args);
      return {
        result: { draftId: draft.id },
        executedAction: { type: 'EMAIL_DRAFTED', label: `Drafted email to ${args.to}` },
        emailDraft: { id: draft.id, to: args.to, subject: args.subject, body: args.body },
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
