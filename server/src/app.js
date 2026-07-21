import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import planRouter         from './routes/plan.js';
import rescueRouter       from './routes/rescue.js';
import reviewRouter       from './routes/review.js';
import reflectRouter      from './routes/reflect.js';
import simulateRouter     from './routes/simulate.js';
import prepRouter         from './routes/prep.js';
import intelligenceRouter from './routes/intelligence.js';
import converseRouter     from './routes/converse.js';
import sendEmailRouter    from './routes/sendEmail.js';

const app = express();

// ── Startup env var check ──────────────────────────────────────────────────
// Runs once per cold start on Vercel. Logs to the Vercel function log so a
// missing key shows up immediately instead of surfacing as an opaque 500
// on the first real request.
const REQUIRED_ENV = ['GROQ_API_KEY'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`[Chronos] Missing required env var(s): ${missingEnv.join(', ')}. ` +
    'Set these in the BACKEND Vercel project -> Settings -> Environment Variables.');
}
if (!process.env.CLIENT_ORIGIN) {
  console.warn('[Chronos] CLIENT_ORIGIN is not set - CORS will allow all origins (*). ' +
    'Set CLIENT_ORIGIN to the frontend\'s deployed URL to lock this down.');
}

// CORS: reads CLIENT_ORIGIN in production (the frontend's Vercel URL).
// Falls back to allowing all origins so local dev and existing deployments
// keep working unchanged if CLIENT_ORIGIN isn't set.
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
}));
app.use(express.json({ limit: '4mb' }));

// ── Request logging ────────────────────────────────────────────────────────
// Every request hitting the backend gets a line in the Vercel function log,
// so "does the request even arrive here" is answerable at a glance.
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[Chronos] --> ${req.method} ${req.originalUrl} (origin: ${req.get('origin') || 'n/a'})`);
  res.on('finish', () => {
    console.log(`[Chronos] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Root health check (required by deployment tooling / uptime checks)
app.get('/', (_, res) =>
  res.json({ status: 'ok', service: 'Chronos Backend' })
);

// API routes
app.use('/api/plan',         planRouter);
app.use('/api/rescue',       rescueRouter);
app.use('/api/review',       reviewRouter);
app.use('/api/reflect',      reflectRouter);
app.use('/api/simulate',     simulateRouter);
app.use('/api/prep',         prepRouter);
app.use('/api/intelligence', intelligenceRouter);
app.use('/api/converse',    converseRouter);
app.use('/api/send-email',  sendEmailRouter);

// Health check (unchanged, unrenamed) - now also reports whether required
// env vars are present (booleans only, never values) so a misconfigured
// deploy can be diagnosed by hitting one URL.
app.get('/api/health', (_, res) =>
  res.json({
    status: 'CHRONOS ONLINE',
    timestamp: new Date().toISOString(),
    env: {
      GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY),
      CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || null,
      NODE_ENV: process.env.NODE_ENV || null,
    },
  })
);

// NOTE: This backend intentionally does NOT serve the frontend.
// Frontend and backend are deployed as two separate Vercel projects.

// ── Catch-all JSON 404 ─────────────────────────────────────────────────────
// Without this, an unmatched route falls through to Vercel's default 404
// HTML page. The frontend's fetch then gets HTML back where it expected
// JSON, `res.json()` throws, and the failure looks like a mysterious
// "Load failed" instead of a clear "route not found".
app.use((req, res) => {
  console.warn(`[Chronos] 404 - no route matches ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}` });
});

// ── Global error handler ───────────────────────────────────────────────────
// Catches anything thrown/rejected in a route that wasn't already caught
// (e.g. a sync throw, or express.json() failing on malformed body). Always
// returns JSON, never lets Vercel's default HTML error page leak through,
// and logs the full stack trace to the function log for debugging.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[Chronos] Unhandled error on ${req.method} ${req.originalUrl}:`, err.stack || err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
