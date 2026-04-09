const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const studentsController = require('../../controllers/hod/students.controller');

const router = express.Router();

// expose template publicly so frontend can download without requiring an auth token
router.get('/template', studentsController.template);

router.use(authMiddleware);

router.get('/', studentsController.list);
router.post('/', studentsController.create);
router.put('/:id', studentsController.update);
router.delete('/:id', studentsController.remove);
router.get('/:usn', studentsController.getByUsn);
router.post('/upload', studentsController.upload);
router.get('/template', studentsController.template);

module.exports = router;
