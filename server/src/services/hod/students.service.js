const studentsModel = require('../../models/students.model');

async function listByDepartment(deptid) {
  return studentsModel.getStudentsByDept(deptid);
}

async function getByUsn(usn) {
  return studentsModel.findByUsn(usn);
}

module.exports = { listByDepartment, getByUsn };
