const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const studentsController = require('../../controllers/hod/students.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/', studentsController.list);
router.get('/:usn', studentsController.getByUsn);

module.exports = router;
