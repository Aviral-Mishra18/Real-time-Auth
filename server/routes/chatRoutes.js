const express = require('express');
const router = express.Router();
const { getOrCreateDirectChat, getDirectChats } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getDirectChats).post(getOrCreateDirectChat);

module.exports = router;
