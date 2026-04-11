const preferencesModel = require('../../models/preferences.model');

async function listByCoursecode(coursecode) {
  return preferencesModel.getPreferencesByCoursecode(coursecode);
}

async function listByCoursecodes(coursecodes) {
  return preferencesModel.getPreferencesByCoursecodes(coursecodes);
}

async function countsForCoursecodes(coursecodes) {
  return preferencesModel.countPreferencesByCoursecodes(coursecodes);
}

async function studentListsForCoursecodes(coursecodes, deptid) {
  return preferencesModel.getStudentListsForCoursecodes(coursecodes, deptid);
}

async function studentListsForCoursecodesByInstance(coursecodes, deptid, instanceId) {
  return preferencesModel.getStudentListsForCoursecodesByInstance(coursecodes, deptid, instanceId);
}

async function unallocatedStudentsByGroup(deptid, electivegroup) {
  return preferencesModel.getUnallocatedStudentsByGroup(deptid, electivegroup);
}

async function unallocatedStudentsByGroupAndInstance(deptid, electivegroup, instanceId) {
  return preferencesModel.getUnallocatedStudentsByGroupAndInstance(deptid, electivegroup, instanceId);
}

async function pendingStudentsByDept(deptid) {
  return preferencesModel.getPendingStudentsByDept(deptid);
}

async function pendingStudentsByDeptAndInstance(deptid, instanceId) {
  return preferencesModel.getPendingStudentsByDeptAndInstance(deptid, instanceId);
}

module.exports = {
  listByCoursecode,
  listByCoursecodes,
  countsForCoursecodes,
  studentListsForCoursecodes,
  studentListsForCoursecodesByInstance,
  unallocatedStudentsByGroup,
  unallocatedStudentsByGroupAndInstance,
  pendingStudentsByDept,
  pendingStudentsByDeptAndInstance
};
