import { Router } from 'express';
import { groq } from '../lib/groq.js';

const router = Router();

router.post('/', async (req, res) => {
  console.log(`[Chronos] POST /api/rescue body keys: ${Object.keys(req.body || {}).join(', ')}`);
  const { tasks, conflicts, capacityAnalysis, anchors } = req.body;

  try {
    const data = await groq(`You are Chronos Rescue Engine. The day is BROKEN. Fix it decisively.

TASKS: ${JSON.stringify(tasks, null, 2)}
CONFLICTS: ${JSON.stringify(conflicts, null, 2)}
CAPACITY: ${JSON.stringify(capacityAnalysis, null, 2)}
LIFE ANCHORS (sacred — always ask approval): ${JSON.stringify(anchors, null, 2)}

Available rescue actions: compress, split, move, defer, drop, delegate.
FIXED tasks are UNTOUCHABLE. Anchor items require userMustApprove = true.
For Firefighter Mode: draft real, complete, ready-to-send messages.

Respond ONLY with valid JSON:
{
  "rescueActions": [{
    "actionType": "compress|split|move|defer|drop|delegate",
    "targetTaskId": "string",
    "targetTaskTitle": "string",
    "from": "string",
    "to": "string",
    "reason": "one crisp sentence",
    "impact": "minimal|moderate|significant",
    "userMustApprove": false
  }],
  "rescuedSchedule": [{
    "id": "string",
    "title": "string",
    "scheduledStart": "HH:MM",
    "scheduledEnd": "HH:MM",
    "status": "kept|moved|compressed|split|deferred|dropped|delegated"
  }],
  "rescueSummary": "2-3 sentences describing what broke and what was done",
  "firefighterDrafts": [{
    "type": "extension|reschedule|apology|delegation",
    "to": "recipient or role",
    "subject": "string",
    "body": "full ready-to-send message"
  }],
  "rescueTrace": ["decision step 1", "decision step 2", "decision step 3"]
}`);
    res.json(data);
  } catch (e) {
    console.error(`[Chronos] /api/rescue failed:`, e.stack || e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

export default router;
