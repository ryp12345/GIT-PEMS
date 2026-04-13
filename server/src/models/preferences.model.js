const pool = require('../config/db');

async function getPreferencesByCoursecode(coursecode) {
  const res = await pool.query(
    `SELECT id, "USN" AS usn, coursecode, preference, status, electivegroup FROM public.elective_preferences WHERE coursecode = $1 ORDER BY preference, id`,
    [coursecode]
  );
  return res.rows;
}

async function getPreferencesByCoursecodes(coursecodes) {
  if (!Array.isArray(coursecodes) || coursecodes.length === 0) return [];
  const res = await pool.query(
    `SELECT id, "USN" AS usn, coursecode, preference, status, electivegroup FROM public.elective_preferences WHERE coursecode = ANY($1) ORDER BY coursecode, preference, id`,
    [coursecodes]
  );
  return res.rows;
}

async function countPreferencesByCoursecodes(coursecodes) {
  if (!Array.isArray(coursecodes) || coursecodes.length === 0) return [];
  const res = await pool.query(
    `SELECT coursecode, preference, COUNT(*) AS cnt FROM public.elective_preferences WHERE status = 0 AND coursecode = ANY($1) GROUP BY coursecode, preference`,
    [coursecodes]
  );
  return res.rows.map(r => ({ coursecode: r.coursecode, preference: Number(r.preference), count: Number(r.cnt) }));
}

async function getStudentListsForCoursecodes(coursecodes, deptid) {
  if (!Array.isArray(coursecodes) || coursecodes.length === 0) return [];
  const res = await pool.query(
    `SELECT ep.coursecode, ep.preference, ep.status, ep."USN" AS usn, s."Name" AS name
     FROM public.elective_preferences ep
     JOIN public.students s ON s."USN" = ep."USN"
     WHERE ep.coursecode = ANY($1)
       AND s."DeptID" = $2
       AND ep.preference = ep.status
     ORDER BY ep.coursecode, s."USN"`,
    [coursecodes, deptid]
  );
  return res.rows.map(r => ({ coursecode: r.coursecode, preference: Number(r.preference), status: Number(r.status), usn: r.usn, name: r.name }));
}

async function getStudentListsForCoursecodesByInstance(coursecodes, deptid, instanceId) {
  if (!Array.isArray(coursecodes) || coursecodes.length === 0) return [];
  const res = await pool.query(
    `SELECT ep.coursecode, ep.preference, ep.status, ep."USN" AS usn, s."Name" AS name
     FROM public.elective_preferences ep
     JOIN public.students s
       ON s."USN" = ep."USN"
     JOIN public.elective_list el
       ON el.coursecode = ep.coursecode
     WHERE ep.coursecode = ANY($1)
       AND s."DeptID" = $2
       AND s.instance_id = $3
       AND el."DeptID" = $2
       AND el.instance_id = $3
       AND ep.preference = ep.status
     ORDER BY ep.coursecode, s."USN"`,
    [coursecodes, deptid, instanceId]
  );
  return res.rows.map(r => ({ coursecode: r.coursecode, preference: Number(r.preference), status: Number(r.status), usn: r.usn, name: r.name }));
}

async function getUnallocatedStudentsByGroup(deptid, electivegroup) {
  const res = await pool.query(
    `SELECT s."USN" AS usn, s."Name" AS name
     FROM public.students s
     WHERE s."DeptID" = $1
       AND s."USN" IN (
         SELECT ep."USN"
         FROM public.elective_preferences ep
         WHERE ep.status < 0 AND ep.electivegroup = $2
       )
     ORDER BY s."USN"`,
    [deptid, electivegroup]
  );
  return res.rows.map((r) => ({ usn: r.usn, name: r.name }));
}

async function getUnallocatedStudentsByGroupAndInstance(deptid, electivegroup, instanceId) {
  const res = await pool.query(
    `SELECT DISTINCT s."USN" AS usn, s."Name" AS name, s."UID" AS uid
     FROM public.students s
     WHERE s."DeptID" = $1
       AND s.instance_id = $3
       AND s."USN" IN (
         SELECT ep."USN"
         FROM public.elective_preferences ep
         WHERE ep.status < 0
           AND ep.electivegroup = $2
           AND EXISTS (
             SELECT 1
             FROM public.elective_list el
             WHERE el.coursecode = ep.coursecode
               AND el."DeptID" = $1
               AND el.instance_id = $3
               AND el.electivegroup = $2
           )
       )
     ORDER BY s."USN"`,
    [deptid, electivegroup, instanceId]
  );
  return res.rows.map((r) => ({ usn: r.usn, name: r.name, uid: r.uid }));
}

async function getPendingStudentsByDept(deptid) {
  // Students in the department who have not submitted any elective_preferences
  const res = await pool.query(
    `SELECT s."USN" AS usn, s."Name" AS name, s."UID" AS uid
     FROM public.students s
     WHERE s."DeptID" = $1
       AND s."USN" NOT IN (SELECT ep."USN" FROM public.elective_preferences ep)
     ORDER BY s."USN"`,
    [deptid]
  );
  return res.rows.map((r) => ({ usn: r.usn, name: r.name, uid: r.uid }));
}

async function getPendingStudentsByDeptAndInstance(deptid, instanceId) {
  const res = await pool.query(
    `SELECT s."USN" AS usn, s."Name" AS name, s."UID" AS uid
     FROM public.students s
     WHERE s."DeptID" = $1
       AND s.instance_id = $2
       AND NOT EXISTS (
         SELECT 1
         FROM public.elective_preferences ep
         JOIN public.elective_list el
           ON el.coursecode = ep.coursecode
         WHERE ep."USN" = s."USN"
           AND el."DeptID" = $1
           AND el.instance_id = $2
       )
     ORDER BY s."USN"`,
    [deptid, instanceId]
  );
  return res.rows.map((r) => ({ usn: r.usn, name: r.name, uid: r.uid }));
}

module.exports = {
  getPreferencesByCoursecode,
  getPreferencesByCoursecodes,
  countPreferencesByCoursecodes,
  getStudentListsForCoursecodes,
  getStudentListsForCoursecodesByInstance,
  getUnallocatedStudentsByGroup,
  getUnallocatedStudentsByGroupAndInstance,
  getPendingStudentsByDept,
  getPendingStudentsByDeptAndInstance
};
