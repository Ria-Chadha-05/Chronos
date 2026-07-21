import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import planRouter         from './routes/plan.js';
import rescueRouter       from './routes/rescue.js';
import reviewRouter       from './routes/review.js';
import reflectRouter      from './routes/reflect.js';
import simulateRouter     from './routes/simulate.js';
import prepRouter         from './routes/prep.js';
import intelligenceRouter from './routes/intelligence.js';
import converseRouter     from './routes/converse.js';
import sendEmailRouter    from './routes/sendEmail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '4mb' }));

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

// Health check
app.get('/api/health', (_, res) =>
  res.json({ status: 'CHRONOS ONLINE', timestamp: new Date().toISOString() })
);

// Serve built React app in production
const distPath = path.join(__dirname, '../../client/dist');
app.use(express.static(distPath));
app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`⚡ CHRONOS SERVER :${PORT}`));
