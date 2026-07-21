import { Router } from 'express';
import { groq } from '../lib/groq.js';

const router = Router();

router.post('/', async (req, res) => {
  const { existingTasks, newItem, capacityAnalysis } = req.body;

  try {
    const data = await groq(`You are Chronos Consequence Simulator. The user wants to add a new commitment. Show them what breaks.

EXISTING TASKS: ${JSON.stringify(existingTasks, null, 2)}
NEW ITEM: ${JSON.stringify(newItem, null, 2)}
CURRENT CAPACITY: ${JSON.stringify(capacityAnalysis, null, 2)}

Respond ONLY with valid JSON:
{
  "canAccept": true,
  "verdict": "safe|tight|risky|impossible",
  "verdictReason": "string",
  "whatGetsSqueezed": [{
    "taskId": "string",
    "taskTitle": "string",
    "impact": "string",
    "severity": "low|medium|high|critical"
  }],
  "recommendation": "accept|negotiate|decline|defer",
  "recommendationReason": "string",
  "alternativeSlot": "string or null",
  "simulationTrace": ["step 1", "step 2"]
}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
