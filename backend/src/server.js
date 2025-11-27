const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const moodRouter = require('./routes/mood');
const chatRouter = require('./routes/chat');
const summaryRouter = require('./routes/summary');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/mood', moodRouter);
app.use('/chat', chatRouter);
app.use('/summary', summaryRouter);

module.exports = app;

// If run directly, start the server
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Mind Mate backend listening on port ${PORT}`);
  });
}
