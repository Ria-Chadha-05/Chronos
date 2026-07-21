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

// CORS: reads CLIENT_ORIGIN in production (the frontend's Vercel URL).
// Falls back to allowing all origins so local dev and existing deployments
// keep working unchanged if CLIENT_ORIGIN isn't set.
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
}));
app.use(express.json({ limit: '4mb' }));

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

// Health check (unchanged, unrenamed)
app.get('/api/health', (_, res) =>
  res.json({ status: 'CHRONOS ONLINE', timestamp: new Date().toISOString() })
);

// NOTE: This backend intentionally does NOT serve the frontend.
// Frontend and backend are deployed as two separate Vercel projects.

export default app;
