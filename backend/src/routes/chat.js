const express = require('express');
const llm = require('../services/llm');

const router = express.Router();

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message string required' });
  }
  // placeholder llm reply
  try {
    // support optional streaming: ?stream=1 or body.stream = true
    const wantStream = (req.query && req.query.stream === '1') || req.body.stream === true;
    if (wantStream) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      // attempt to get reply and stream it in small chunks
      const reply = await llm.generateChatReply(message);
      // naive chunking: split by words to simulate streaming
      const parts = String(reply).split(' ');
      for (let i = 0; i < parts.length; i++) {
        res.write(parts[i] + (i < parts.length - 1 ? ' ' : ''));
        // small delay between chunks to simulate stream
        await new Promise(r => setTimeout(r, 30));
      }
      res.end();
      return;
    }
    const reply = await llm.generateChatReply(message);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'LLM error' });
  }
});

module.exports = router;
