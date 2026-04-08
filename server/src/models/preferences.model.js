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
     WHERE ep.coursecode = ANY($1) AND s."DeptID" = $2
     ORDER BY ep.coursecode, ep.preference, s."USN"`,
    [coursecodes, deptid]
  );
  return res.rows.map(r => ({ coursecode: r.coursecode, preference: Number(r.preference), status: Number(r.status), usn: r.usn, name: r.name }));
}

module.exports = {
  getPreferencesByCoursecode,
  getPreferencesByCoursecodes,
  countPreferencesByCoursecodes,
  getStudentListsForCoursecodes
};
