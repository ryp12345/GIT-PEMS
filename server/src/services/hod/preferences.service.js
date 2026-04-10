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

async function unallocatedStudentsByGroup(deptid, electivegroup) {
  return preferencesModel.getUnallocatedStudentsByGroup(deptid, electivegroup);
}

async function pendingStudentsByDept(deptid) {
  return preferencesModel.getPendingStudentsByDept(deptid);
}

module.exports = {
  listByCoursecode,
  listByCoursecodes,
  countsForCoursecodes,
  studentListsForCoursecodes,
  unallocatedStudentsByGroup
  ,pendingStudentsByDept
};
