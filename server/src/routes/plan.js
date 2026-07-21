import { Router } from 'express';
import { groq } from '../lib/groq.js';

const router = Router();

router.post('/', async (req, res) => {
  console.log(`[Chronos] POST /api/plan body keys: ${Object.keys(req.body || {}).join(', ')}`);
  const { tasks, lifeMode, energyProfile } = req.body;
  if (!tasks?.length) return res.status(400).json({ error: 'No tasks provided' });

  try {
    const data = await groq(`You are Chronos Planner. Life mode: ${lifeMode || 'college'}.

TASKS:
${JSON.stringify(tasks, null, 2)}

ENERGY PROFILE: ${energyProfile || 'Morning person — peak 8–12, dip 14–16, second wind 17–20'}

STRICT RULES:
- FIXED tasks NEVER move under any circumstances.
- NEGOTIABLE tasks move only if a conflict forces it.
- FLEXIBLE tasks fill remaining capacity freely.
- Match energyLoad (deep/medium/light) to energy windows.
- Real capacity = 16 waking hours minus all fixed durations.
- Detect ALL conflicts: time overlap, overload, dependency blocks.

Respond ONLY with valid JSON:
{
  "schedule": [{
    "id": "string",
    "title": "string",
    "scheduledStart": "HH:MM",
    "scheduledEnd": "HH:MM",
    "flexibility": "fixed|negotiable|flexible",
    "priority": "critical|high|medium|low",
    "energyLoad": "deep|medium|light",
    "energyMatch": "perfect|good|suboptimal",
    "reasoning": "one sentence why this slot"
  }],
  "conflicts": [{
    "type": "overlap|overload|dependency",
    "affectedTaskIds": ["string"],
    "description": "string",
    "severity": "critical|warning"
  }],
  "capacityAnalysis": {
    "totalAvailableMinutes": 0,
    "totalRequiredMinutes": 0,
    "feasible": true,
    "overloadMinutes": 0,
    "reserveMinutes": 0
  },
  "realityGap": {
    "hasGap": false,
    "gapMinutes": 0,
    "gapDescription": "string",
    "recommendation": "string"
  },
  "planningTrace": ["step1", "step2", "step3", "step4"]
}`);
    res.json(data);
  } catch (e) {
    console.error(`[Chronos] /api/plan failed:`, e.stack || e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

export default router;
