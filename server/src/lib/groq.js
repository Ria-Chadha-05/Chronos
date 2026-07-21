import Groq from 'groq-sdk';

// Lazily construct the client so a missing key produces a clear error at
// first use (and gets logged) rather than a confusing failure deep inside
// the SDK, and so `new Groq()` doesn't itself throw during module import
// (which on Vercel would crash the whole function's cold start silently).
let _client = null;
function getClient() {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error(
      'GROQ_API_KEY is not set. Add it in the BACKEND Vercel project -> ' +
      'Settings -> Environment Variables, then redeploy.'
    );
    console.error('[Chronos] groq client init failed:', err.message);
    throw err;
  }
  if (!_client) {
    _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('[Chronos] Groq client initialized.');
  }
  return _client;
}

// Groq deprecated its classic Llama chat models (llama-3.3-70b-versatile,
// llama-3.1-8b-instant) — openai/gpt-oss-120b is the current recommendation
// for general-purpose reasoning workloads. Swap to -20b if you want faster/
// cheaper responses at some quality cost.
const MODEL = 'openai/gpt-oss-120b';

/** One-shot JSON completion from a raw prompt string. */
export async function groq(prompt) {
  return groqJSON([{ role: 'user', content: prompt }]);
}

/** JSON completion from a full messages array (used for the agent's final turn). */
export async function groqJSON(messages) {
  try {
    const completion = await getClient().chat.completions.create({
      model: MODEL,
      messages,
      response_format: { type: 'json_object' },
    });
    const raw = completion.choices[0].message.content;
    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      console.error('[Chronos] Groq returned non-JSON content:', raw?.slice(0, 500));
      throw new Error(`Groq response was not valid JSON: ${parseErr.message}`);
    }
  } catch (err) {
    // Real, full error from the Groq SDK (bad key, rate limit, model not
    // found, network timeout, etc.) — logged with stack so it's visible in
    // the Vercel function log instead of only surfacing as a generic 500.
    console.error('[Chronos] groqJSON failed:', err.stack || err);
    throw err;
  }
}

/**
 * Tool-enabled completion — used by the Converse agent loop.
 * Returns the raw assistant message (may contain `tool_calls`).
 * Caller is responsible for executing tools and looping back with results.
 */
export async function groqWithTools(messages, tools) {
  try {
    const completion = await getClient().chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
    });
    return completion.choices[0].message;
  } catch (err) {
    console.error('[Chronos] groqWithTools failed:', err.stack || err);
    throw err;
  }
}

