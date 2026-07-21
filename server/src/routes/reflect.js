import { Router } from 'express';
import { groq } from '../lib/groq.js';

const router = Router();

router.post('/', async (req, res) => {
  const { weekSummary, lifeAreas, feelings } = req.body;

  try {
    const data = await groq(`You are Chronos Weekly Reflection Engine.

WEEK SUMMARY: ${JSON.stringify(weekSummary, null, 2)}
LIFE AREAS RATED BY USER (0–10): ${JSON.stringify(lifeAreas, null, 2)}
USER FEELINGS: "${feelings}"

Synthesize what felt missing, what was too heavy, and how to rebalance next week.
Be specific, personal, and actionable — not generic.

Respond ONLY with valid JSON:
{
  "reflectionInsights": [{
    "area": "academics|internship|relationships|health|rest|personal",
    "status": "thriving|balanced|neglected|overloaded",
    "insight": "specific observation about this area",
    "nextWeekAction": "concrete action for next week"
  }],
  "updatedWeights": {
    "academics": 0,
    "internship": 0,
    "relationships": 0,
    "health": 0,
    "rest": 0,
    "personal": 0
  },
  "weekScore": {
    "productivity": 0,
    "balance": 0,
    "wellbeing": 0,
    "overall": 0
  },
  "nextWeekFocus": "one clear priority for the coming week",
  "reflectionTrace": ["observation 1", "observation 2", "observation 3"]
}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
