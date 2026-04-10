const studentsModel = require('../../models/students.model');

async function listByDepartment(deptid) {
  return studentsModel.getStudentsByDept(deptid);
}

async function listByInstance(instanceId, deptid) {
  return studentsModel.getStudentsByInstance(instanceId, deptid);
}

async function listPendingByInstance(instanceId, deptid) {
  return studentsModel.getPendingStudentsByInstance(instanceId, deptid);
}

async function getByUsn(usn) {
  return studentsModel.findByUsn(usn);
}

async function create(data) {
  return studentsModel.create(data);
}

async function update(id, data) {
  return studentsModel.update(id, data);
}

async function remove(id, deptid, instanceId) {
  return studentsModel.remove(id, deptid, instanceId);
}

async function existsByUsnOrUid(usn, uid, deptid, instanceId) {
  const byUsn = usn ? await studentsModel.findByUsnAndInstance(usn, deptid, instanceId) : null;
  if (byUsn) return true;
  const byUid = uid ? await studentsModel.findByUidAndInstance(uid, deptid, instanceId) : null;
  return !!byUid;
}

module.exports = { listByDepartment, listByInstance, listPendingByInstance, getByUsn, create, update, remove, existsByUsnOrUid };
