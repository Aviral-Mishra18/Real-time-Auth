const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  togglePin,
  getPinnedMessages,
  uploadAttachment,
  getThreadReplies,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.route('/').get(getMessages).post(sendMessage);
router.get('/pinned', getPinnedMessages);
router.get('/thread/:threadParentId', getThreadReplies);
router.post('/upload', upload.single('file'), uploadAttachment);
router.route('/:id').put(editMessage).delete(deleteMessage);
router.post('/:id/react', toggleReaction);
router.post('/:id/pin', togglePin);

module.exports = router;
