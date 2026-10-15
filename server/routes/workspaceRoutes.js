const express = require('express');
const router = express.Router();
const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  joinByInviteCode,
  regenerateInviteCode,
  leaveWorkspace,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').post(createWorkspace).get(getMyWorkspaces);
router.post('/join', joinByInviteCode);
router.route('/:id').get(getWorkspaceById).put(updateWorkspace);
router.post('/:id/regenerate-invite', regenerateInviteCode);
router.post('/:id/leave', leaveWorkspace);

module.exports = router;
