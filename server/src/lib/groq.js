import Groq from 'groq-sdk';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(completion.choices[0].message.content);
}

/**
 * Tool-enabled completion — used by the Converse agent loop.
 * Returns the raw assistant message (may contain `tool_calls`).
 * Caller is responsible for executing tools and looping back with results.
 */
export async function groqWithTools(messages, tools) {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools,
    tool_choice: 'auto',
  });
  return completion.choices[0].message;
}

