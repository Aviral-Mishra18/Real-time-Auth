const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { summarizeChannel, askAi } = require('../controllers/aiController');

router.use(protect);

router.post('/summarize/:channelId', summarizeChannel);
router.post('/ask', askAi);

module.exports = router;
