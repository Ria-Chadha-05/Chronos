import { Router } from 'express';
import { groq } from '../lib/groq.js';

const router = Router();

router.post('/', async (req, res) => {
  console.log(`[Chronos] POST /api/prep body keys: ${Object.keys(req.body || {}).join(', ')}`);
  const { task } = req.body;

  try {
    const data = await groq(`You are Chronos Prep Pack Generator. Generate a preparation checklist for this commitment.

TASK: ${JSON.stringify(task, null, 2)}

Respond ONLY with valid JSON:
{
  "prepItems": [{
    "category": "materials|mental|logistics|review|communication",
    "item": "specific prep action",
    "timeNeeded": 15,
    "priority": "must|should|nice"
  }],
  "totalPrepMinutes": 0,
  "keyFocus": "the single most important thing to prepare",
  "prepTrace": "one sentence summary"
}`);
    res.json(data);
  } catch (e) {
    console.error(`[Chronos] /api/prep failed:`, e.stack || e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

export default router;
