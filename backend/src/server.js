const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const moodRouter = require('./routes/mood');
const chatRouter = require('./routes/chat');
const summaryRouter = require('./routes/summary');
const loginRouter = require('./routes/login');
const googleAuthRouter = require('./routes/googleAuth');
const googleFitRouter = require('./routes/googleFit');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/login', loginRouter);
app.use('/mood', moodRouter);
app.use('/chat', chatRouter);
app.use('/summary', summaryRouter);
app.use('/google-auth', googleAuthRouter);
app.use('/google-fit', googleFitRouter);

// Root handler for health check
app.get('/', (req, res) => {
  // If there's a code query parameter, it's the Google OAuth callback
  if (req.query.code) {
    // Redirect to google-auth callback
    return res.redirect(`/google-auth/callback?${Object.keys(req.query).map(k => `${k}=${req.query[k]}`).join('&')}`);
  }
  res.json({ message: 'Mind Mate Backend is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// If run directly, start the server
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Mind Mate backend listening on port ${PORT}`);
  });
}
