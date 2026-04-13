const express = require('express');
const router = express.Router();
const studentController = require('../../controllers/student/student.controller');

router.post('/checkname', studentController.checkName);

module.exports = router;
