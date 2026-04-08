const pool = require('../config/db');

async function getDistinctGroups(deptid) {
  // Return elective groups ordered by the smallest semester they appear in.
  const res = await pool.query(
    `SELECT electivegroup, MIN(sem) AS min_sem
     FROM public.elective_list
     WHERE "DeptID" = $1
     GROUP BY electivegroup
     ORDER BY min_sem`,
    [deptid]
  );
  return res.rows.map((r) => r.electivegroup);
}

async function getCoursesByGroup(deptid, group) {
  const res = await pool.query(
    `SELECT coursecode, "courseName" AS coursename, allocation_status, cgpa_cutoff, min, max, total_allocations
     FROM public.elective_list
     WHERE electivegroup = $1 AND "DeptID" = $2
     ORDER BY coursecode`,
    [group, deptid]
  );
  return res.rows.map((r) => ({
    coursecode: r.coursecode,
    courseName: r.coursename,
    allocation_status: r.allocation_status,
    cgpa_cutoff: r.cgpa_cutoff,
    min: r.min,
    max: r.max,
    total_allocations: r.total_allocations
  }));
}

async function getPreferenceCountsForCourses(coursecodes) {
  if (!Array.isArray(coursecodes) || coursecodes.length === 0) return [];
  const res = await pool.query(
    `SELECT coursecode, preference, COUNT(*) AS cnt
     FROM public.elective_preferences
     WHERE status = 0 AND coursecode = ANY($1)
     GROUP BY coursecode, preference`,
    [coursecodes]
  );
  return res.rows.map((r) => ({ coursecode: r.coursecode, preference: Number(r.preference), count: Number(r.cnt) }));
}

async function updateMinMaxBatch(updates, deptid) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const u of updates) {
      await client.query(
        `UPDATE public.elective_list SET min = $1, max = $2 WHERE coursecode = $3 AND "DeptID" = $4`,
        [u.min, u.max, u.coursecode, deptid]
      );
    }
    await client.query('COMMIT');
    return { updated: updates.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getDistinctGroups,
  getCoursesByGroup,
  getPreferenceCountsForCourses,
  updateMinMaxBatch
};
