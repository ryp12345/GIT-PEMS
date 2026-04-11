const electivesModel = require('../../models/electives.model');
const prefsService = require('./preferences.service');

async function listElectivesStats(deptid) {
  const groups = await electivesModel.getDistinctGroups(deptid);
  const result = [];

  for (const g of groups) {
    const courses = await electivesModel.getCoursesByGroup(deptid, g);
    const coursecodes = courses.map((c) => c.coursecode);
    const prefRows = await electivesModel.getPreferenceCountsForCourses(coursecodes);

    const countsMap = {};
    for (const r of prefRows) {
      countsMap[r.coursecode] = countsMap[r.coursecode] || {};
      countsMap[r.coursecode][r.preference] = r.count;
    }

    const coursesWithPrefs = courses.map((c) => ({
      ...c,
      prefs: {
        1: countsMap[c.coursecode]?.[1] || 0,
        2: countsMap[c.coursecode]?.[2] || 0,
        3: countsMap[c.coursecode]?.[3] || 0,
        4: countsMap[c.coursecode]?.[4] || 0,
        5: countsMap[c.coursecode]?.[5] || 0
      }
    }));

    result.push({ electivegroup: g, courses: coursesWithPrefs });
  }

  return result;
}

async function updateMinMax(updates, deptid) {
  return electivesModel.updateMinMaxBatch(updates, deptid);
}

async function resetAllocations(deptid, instanceId = null) {
  return electivesModel.resetAllocationsByScope(deptid, instanceId);
}

async function runAllocations(deptid, instanceId) {
  return electivesModel.allocateByDeptAndInstance(deptid, instanceId);
}

async function listElectiveStudents(deptid, instanceId = null) {
  const groups = await electivesModel.getDistinctGroups(deptid, instanceId);
  const result = [];

  for (const g of groups) {
    const courses = await electivesModel.getCoursesByGroup(deptid, g, instanceId);
    const coursecodes = courses.map((c) => c.coursecode);
    const studentRows = instanceId == null
      ? await prefsService.studentListsForCoursecodes(coursecodes, deptid)
      : await prefsService.studentListsForCoursecodesByInstance(coursecodes, deptid, instanceId);

    const studentsMap = {};
    for (const r of studentRows) {
      studentsMap[r.coursecode] = studentsMap[r.coursecode] || [];
      studentsMap[r.coursecode].push({ usn: r.usn, name: r.name, preference: r.preference, status: r.status });
    }

    const coursesWithStudents = courses.map((c) => ({
      ...c,
      students: studentsMap[c.coursecode] || []
    }));

    result.push({ electivegroup: g, courses: coursesWithStudents });
  }

  const allocatedGroups = await electivesModel.getDistinctGroupsWithAllocations(deptid, instanceId);
  const unallocatedGroups = [];
  for (const g of allocatedGroups) {
    const students = instanceId == null
      ? await prefsService.unallocatedStudentsByGroup(deptid, g)
      : await prefsService.unallocatedStudentsByGroupAndInstance(deptid, g, instanceId);
    unallocatedGroups.push({ electivegroup: g, students });
  }

  const pendingStudents = instanceId == null
    ? await prefsService.pendingStudentsByDept(deptid)
    : await prefsService.pendingStudentsByDeptAndInstance(deptid, instanceId);

  return { groups: result, unallocatedGroups, pendingStudents };
}

module.exports = {
  listElectivesStats,
  updateMinMax,
  resetAllocations,
  runAllocations,
  listElectiveStudents
};
