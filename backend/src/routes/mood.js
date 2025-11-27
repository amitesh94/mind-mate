const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const detectStress = require('../services/stressDetector');

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

async function writeData(entries) {
  await fs.outputFile(DATA_PATH, JSON.stringify(entries, null, 2));
}

router.post('/', async (req, res) => {
  const { mood, stress } = req.body;
  if (typeof mood !== 'number' || typeof stress !== 'number') {
    return res.status(400).json({ error: 'mood and stress (numbers) required' });
  }
  const entries = await readData();
  const entry = { mood, stress, timestamp: new Date().toISOString() };
  entries.push(entry);
  await writeData(entries);

  const detection = detectStress(entries);
  const last10 = entries.slice(-10);
  res.json({ detection, entries: last10 });
});

// GET /mood - return last 10 entries
router.get('/', async (req, res) => {
  const entries = await readData();
  const last10 = entries.slice(-10);
  res.json({ entries: last10 });
});

// POST /mood/clear - clear all data
router.post('/clear', async (req, res) => {
  try {
    await writeData([]);
    console.log('✓ All mood data cleared');
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (err) {
    console.error('Error clearing data:', err);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

module.exports = router;
