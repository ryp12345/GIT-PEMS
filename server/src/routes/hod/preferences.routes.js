const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const prefsController = require('../../controllers/hod/preferences.controller');

const router = express.Router();

router.use(authMiddleware);

// GET /api/hod/preferences?coursecodes=C1,C2
router.get('/', prefsController.list);
// GET /api/hod/preferences/counts?coursecodes=C1,C2
router.get('/counts', prefsController.counts);

module.exports = router;
