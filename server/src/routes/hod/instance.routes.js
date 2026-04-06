const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const instanceController = require('../../controllers/hod/instance.controller');

const router = express.Router();

router.use(authMiddleware);
router.get('/', instanceController.list);
router.post('/', instanceController.create);
router.put('/:id', instanceController.update);
router.patch('/:id/activate', instanceController.activate);
router.delete('/:id', instanceController.remove);

module.exports = router;
