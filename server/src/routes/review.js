import { Router } from 'express';
import { groq } from '../lib/groq.js';

const router = Router();

router.post('/', async (req, res) => {
  const { schedule, anchors, lifeMode } = req.body;

  try {
    const data = await groq(`You are Chronos Nightly Reviewer. Evaluate tomorrow's plan.

SCHEDULE: ${JSON.stringify(schedule, null, 2)}
LIFE ANCHORS: ${JSON.stringify(anchors, null, 2)}
LIFE MODE: ${lifeMode || 'college'}

Check: Are anchors preserved? Is there breathing room? Are high-priority items in peak energy slots?
Surface what the user must approve, what to celebrate, and what to adjust.

Respond ONLY with valid JSON:
{
  "reviewItems": [{
    "id": "string",
    "type": "approve|warn|celebrate|suggest",
    "title": "string",
    "description": "string",
    "relatedTaskId": "string or null",
    "urgency": "must-decide|good-to-know"
  }],
  "anchorStatus": [{
    "anchorName": "string",
    "status": "protected|at-risk|violated",
    "note": "one sentence"
  }],
  "tomorrowReadiness": {
    "score": 75,
    "label": "MISSION READY|NEEDS ATTENTION|AT RISK|CRITICAL",
    "headline": "one punchy sentence about tomorrow"
  },
  "nightlyTrace": ["observation 1", "observation 2", "observation 3"]
}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
