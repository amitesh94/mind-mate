const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const llm = require('../services/llm');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '..', 'data', 'data.json');

async function readData() {
  await fs.ensureFile(DATA_PATH);
  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(()=> '[]');
  try {
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

router.get('/', async (req, res) => {
  const entries = await readData();
  const last12 = entries.slice(-12);
  try {
    const summary = await llm.generateSummary(last12);
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'LLM error' });
  }
});

module.exports = router;
