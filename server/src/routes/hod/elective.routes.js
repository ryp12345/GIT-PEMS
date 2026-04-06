const express = require('express');
const router = express.Router();
const multer = require('multer');
const electiveController = require('../../controllers/hod/elective.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

// CRUD routes
router.get('/', electiveController.list);
router.post('/', electiveController.create);
router.put('/:id', electiveController.update);
router.delete('/:id', electiveController.remove);

module.exports = router;
