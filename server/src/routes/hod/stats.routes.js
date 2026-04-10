const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const statsController = require('../../controllers/hod/stats.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/electives', statsController.listElectives);
router.put('/electives/minmax', statsController.updateMinMax);
router.get('/elective-students', statsController.listElectiveStudents);
router.get('/elective-students/export', statsController.exportElectiveStudents);
router.post('/elective-students/reset', statsController.resetElectiveAllocations);

module.exports = router;
