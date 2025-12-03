const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const detectStress = require('../services/stressDetector');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '..', 'data', 'data.json');

// Middleware to extract userId from token or query
function extractUserId(req, res, next) {
  const userId = req.query.userId || req.body.userId;
  if (!userId) {
    return res.status(401).json({ error: 'userId required' });
  }
  req.userId = userId;
  next();
}

router.use(extractUserId);

async function readData() {
  await fs.ensureFile(DATA_PATH);
  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(()=> '{}');
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

async function writeData(allData) {
  await fs.outputFile(DATA_PATH, JSON.stringify(allData, null, 2));
}

// GET user's data
function getUserData(allData, userId) {
  return allData[userId] || [];
}

// SET user's data
function setUserData(allData, userId, data) {
  allData[userId] = data;
  return allData;
}

router.post('/', async (req, res) => {
  const { mood, stress } = req.body;
  if (typeof mood !== 'number' || typeof stress !== 'number') {
    return res.status(400).json({ error: 'mood and stress (numbers) required' });
  }
  
  const allData = await readData();
  const entries = getUserData(allData, req.userId);
  
  const entry = { mood, stress, timestamp: new Date().toISOString() };
  entries.push(entry);
  
  const updatedData = setUserData(allData, req.userId, entries);
  await writeData(updatedData);

  const detection = detectStress(entries);
  const last10 = entries.slice(-10);
  res.json({ detection, entries: last10 });
});

// GET /mood - return last 10 entries for current user
router.get('/', async (req, res) => {
  const allData = await readData();
  const entries = getUserData(allData, req.userId);
  const last10 = entries.slice(-10);
  res.json({ entries: last10 });
});

// POST /mood/clear - clear user's data
router.post('/clear', async (req, res) => {
  try {
    const allData = await readData();
    const updatedData = setUserData(allData, req.userId, []);
    await writeData(updatedData);
    console.log(`✓ All mood data cleared for user ${req.userId}`);
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (err) {
    console.error('Error clearing data:', err);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

module.exports = router;
