/**
 * server/src/routes/sendEmail.js
 *
 * The ONLY route that can send an email on the user's behalf. The Converse
 * agent can create Gmail drafts (draft_email tool) but can never call this
 * route itself — it's only ever invoked by the client, only after the user
 * explicitly clicks "Send" on the draft-confirmation popup.
 */

import { Router } from 'express';
import { sendGmailDraft } from '../lib/googleApis.js';

const router = Router();

router.post('/', async (req, res) => {
  const { draftId } = req.body;
  const accessToken = req.get('X-Google-Access-Token') || null;

  if (!draftId) return res.status(400).json({ error: 'draftId is required.' });
  if (!accessToken) return res.status(401).json({ error: 'Missing Google access token.' });

  try {
    const result = await sendGmailDraft(accessToken, draftId);
    res.json({ sent: true, messageId: result.id });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default router;
