const express = require('express');
const router = express.Router();
const {
  createChannel,
  getWorkspaceChannels,
  updateChannel,
  deleteChannel,
  updateNotepad,
} = require('../controllers/channelController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createChannel);
router.get('/workspace/:workspaceId', getWorkspaceChannels);
router.route('/:id').put(updateChannel).delete(deleteChannel);
router.put('/:id/notepad', updateNotepad);

module.exports = router;
