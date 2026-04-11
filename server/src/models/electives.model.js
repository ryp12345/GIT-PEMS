const pool = require('../config/db');

const ALLOCATION_METHODS = {
  PREFERENCE_CGPA: 'preference_cgpa',
  PREFERENCE_FCFS: 'preference_fcfs'
};

function normalizeAllocationMethod(method) {
  switch (method) {
    case 'existing':
    case 'cgpa':
    case ALLOCATION_METHODS.PREFERENCE_CGPA:
      return ALLOCATION_METHODS.PREFERENCE_CGPA;
    case 'fcfs':
    case ALLOCATION_METHODS.PREFERENCE_FCFS:
      return ALLOCATION_METHODS.PREFERENCE_FCFS;
    default:
      return ALLOCATION_METHODS.PREFERENCE_CGPA;
  }
}

function buildApplicantOrdering(method) {
  if (normalizeAllocationMethod(method) === ALLOCATION_METHODS.PREFERENCE_FCFS) {
    return 'ORDER BY ep.created_at ASC NULLS LAST, ep.id ASC';
  }

  return 'ORDER BY s."CGPA" DESC';
}

function buildScopedWhereClause(deptid, instanceId, startingIndex = 1) {
  const params = [deptid];
  let where = `WHERE "DeptID" = $${startingIndex}`;
  if (instanceId != null) {
    params.push(instanceId);
    where += ` AND instance_id = $${startingIndex + 1}`;
  }
  return { where, params };
}

async function getDistinctGroups(deptid, instanceId = null) {
  // Return elective groups ordered by the smallest semester they appear in.
  const { where, params } = buildScopedWhereClause(deptid, instanceId);
  const res = await pool.query(
    `SELECT electivegroup, MIN(sem) AS min_sem
     FROM public.elective_list
     ${where}
     GROUP BY electivegroup
     ORDER BY min_sem`,
    params
  );
  return res.rows.map((r) => r.electivegroup);
}

async function getDistinctGroupsWithAllocations(deptid, instanceId = null) {
  // Match PHP behavior: only groups where at least one course has non-zero total allocations.
  const { where, params } = buildScopedWhereClause(deptid, instanceId);
  const res = await pool.query(
    `SELECT electivegroup, MIN(sem) AS min_sem
     FROM public.elective_list
     ${where} AND total_allocations <> 0
     GROUP BY electivegroup
     ORDER BY min_sem`,
    params
  );
  return res.rows.map((r) => r.electivegroup);
}

async function getCoursesByGroup(deptid, group, instanceId = null) {
  const params = [group, deptid];
  let instanceFilter = '';
  if (instanceId != null) {
    params.push(instanceId);
    instanceFilter = ' AND instance_id = $3';
  }
  const res = await pool.query(
    `SELECT coursecode, "courseName" AS coursename, allocation_status, cgpa_cutoff, min, max, total_allocations
     FROM public.elective_list
     WHERE electivegroup = $1 AND "DeptID" = $2${instanceFilter}
     ORDER BY coursecode`,
    params
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

async function getAllocationMethodForInstance(deptid, instanceId) {
  if (instanceId == null) return null;
  const res = await pool.query(
    `SELECT allocation_method
     FROM public.hod_academic_year_instances
     WHERE id = $1 AND deptid = $2
     LIMIT 1`,
    [instanceId, deptid]
  );
  const storedMethod = res.rows[0]?.allocation_method || null;
  return storedMethod ? normalizeAllocationMethod(storedMethod) : null;
}

async function setAllocationMethodForInstance(client, deptid, instanceId, method) {
  if (instanceId == null) return;
  await client.query(
    `UPDATE public.hod_academic_year_instances
     SET allocation_method = $1,
         updated_at = NOW()
     WHERE id = $2 AND deptid = $3`,
    [method ? normalizeAllocationMethod(method) : null, instanceId, deptid]
  );
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

async function resetAllocationsByDept(deptid) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE public.elective_preferences ep
       SET status = 0
       FROM public.elective_list el
       WHERE el.coursecode = ep.coursecode
         AND el."DeptID" = $1`,
      [deptid]
    );
    await client.query(
      `UPDATE public.elective_list
       SET total_allocations = 0,
           allocation_status = 0,
           cgpa_cutoff = 0
       WHERE "DeptID" = $1`,
      [deptid]
    );
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function resetAllocationsByScope(deptid, instanceId = null) {
  if (instanceId == null) {
    return resetAllocationsByDept(deptid);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE public.elective_preferences ep
       SET status = 0
       WHERE EXISTS (
         SELECT 1
         FROM public.elective_list el
         JOIN public.students s
           ON s."USN" = ep."USN"
          AND s."DeptID" = $1
          AND s.instance_id = $2
         WHERE el.coursecode = ep.coursecode
           AND el."DeptID" = $1
           AND el.instance_id = $2
       )`,
      [deptid, instanceId]
    );
    await client.query(
      `UPDATE public.elective_list
       SET total_allocations = 0,
           allocation_status = 0,
           cgpa_cutoff = 0
       WHERE "DeptID" = $1 AND instance_id = $2`,
      [deptid, instanceId]
    );
    await setAllocationMethodForInstance(client, deptid, instanceId, null);
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function allocateByDeptAndInstance(deptid, instanceId, method = ALLOCATION_METHODS.PREFERENCE_CGPA) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const allocationMethod = normalizeAllocationMethod(method);
    const applicantOrderBy = buildApplicantOrdering(allocationMethod);

    const preferenceCountRes = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM public.elective_preferences ep
       JOIN public.elective_list el
         ON el.coursecode = ep.coursecode
       JOIN public.students s
         ON s."USN" = ep."USN"
       WHERE el."DeptID" = $1
         AND el.instance_id = $2
         AND s."DeptID" = $1
         AND s.instance_id = $2`,
      [deptid, instanceId]
    );
    const preferenceCount = preferenceCountRes.rows[0]?.count || 0;
    if (preferenceCount === 0) {
      throw new Error('No preferences available to allocate');
    }

    const allocationPendingRes = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM public.elective_list
       WHERE "DeptID" = $1
         AND instance_id = $2
         AND allocation_status = 0`,
      [deptid, instanceId]
    );
    const pendingCourses = allocationPendingRes.rows[0]?.count || 0;
    if (pendingCourses === 0) {
      throw new Error('Allocation is already done');
    }

    const rejectedCourses = [];
    const rejectionCandidates = await client.query(
      `SELECT el.coursecode, el."courseName" AS course_name, el.min,
              COUNT(s."USN")::int AS first_preference_count
       FROM public.elective_list el
       LEFT JOIN public.elective_preferences ep
         ON ep.coursecode = el.coursecode
        AND ep.preference = 1
        AND ep.status = 0
       LEFT JOIN public.students s
         ON s."USN" = ep."USN"
        AND s."DeptID" = el."DeptID"
        AND s.instance_id = el.instance_id
       WHERE el."DeptID" = $1
         AND el.instance_id = $2
       GROUP BY el.coursecode, el."courseName", el.min
       ORDER BY el.coursecode`,
      [deptid, instanceId]
    );

    for (const row of rejectionCandidates.rows) {
      if (Number(row.first_preference_count) < Number(row.min || 0)) {
        await client.query(
          `UPDATE public.elective_list
           SET allocation_status = -1
           WHERE coursecode = $1 AND "DeptID" = $2 AND instance_id = $3`,
          [row.coursecode, deptid, instanceId]
        );
        await client.query(
          `UPDATE public.elective_preferences ep
           SET status = -1
           WHERE ep.coursecode = $1
             AND EXISTS (
               SELECT 1
               FROM public.students s
               WHERE s."USN" = ep."USN"
                 AND s."DeptID" = $2
                 AND s.instance_id = $3
             )`,
          [row.coursecode, deptid, instanceId]
        );
        rejectedCourses.push({
          coursecode: row.coursecode,
          courseName: row.course_name,
          min: Number(row.min || 0),
          firstPreferenceCount: Number(row.first_preference_count || 0)
        });
      }
    }

    const groupsRes = await client.query(
      `SELECT DISTINCT electivegroup, MIN(sem) AS min_sem
       FROM public.elective_list
       WHERE "DeptID" = $1 AND instance_id = $2
       GROUP BY electivegroup
       ORDER BY min_sem`,
      [deptid, instanceId]
    );
    const groups = groupsRes.rows.map((row) => row.electivegroup);

    for (let preference = 1; preference <= 5; preference += 1) {
      for (const electivegroup of groups) {
        const coursesRes = await client.query(
          `SELECT coursecode, electivegroup, max, total_allocations
           FROM public.elective_list
           WHERE allocation_status != -1
             AND "DeptID" = $1
             AND instance_id = $2
             AND electivegroup = $3
           ORDER BY coursecode`,
          [deptid, instanceId, electivegroup]
        );

        for (const course of coursesRes.rows) {
          const totalAllocations = Number(course.total_allocations || 0);
          const max = Number(course.max || 0);
          const availability = max - totalAllocations;

          const prefCountRes = await client.query(
            `SELECT COUNT(*)::int AS count
             FROM public.elective_preferences ep
             JOIN public.students s
               ON s."USN" = ep."USN"
             JOIN public.elective_list el
               ON el.coursecode = ep.coursecode
             WHERE ep.status = 0
               AND ep.preference = $1
               AND ep.coursecode = $2
               AND s."DeptID" = $3
               AND s.instance_id = $4
               AND el."DeptID" = $3
               AND el.instance_id = $4`,
            [preference, course.coursecode, deptid, instanceId]
          );
          const noOfPreferences = prefCountRes.rows[0]?.count || 0;

          if (noOfPreferences === 0) {
            await client.query(
              `UPDATE public.elective_list
               SET allocation_status = $1
               WHERE coursecode = $2 AND "DeptID" = $3 AND instance_id = $4`,
              [preference, course.coursecode, deptid, instanceId]
            );
            continue;
          }

          const applicantParams = [deptid, instanceId, course.coursecode, preference];
          let applicantLimitClause = '';
          if (availability >= 0 && availability <= noOfPreferences) {
            applicantParams.push(availability);
            applicantLimitClause = ' LIMIT $5';
          }

          const applicantsRes = await client.query(
            `SELECT s."USN" AS usn, s."CGPA" AS cgpa
             FROM public.students s
             JOIN public.elective_preferences ep
               ON ep."USN" = s."USN"
             JOIN public.elective_list el
               ON el.coursecode = ep.coursecode
             WHERE s."DeptID" = $1
               AND s.instance_id = $2
               AND ep.coursecode = $3
               AND ep.status = 0
               AND ep.preference = $4
               AND el."DeptID" = $1
               AND el.instance_id = $2
             ${applicantOrderBy}${applicantLimitClause}`,
            applicantParams
          );

          let cgpaCutoff = 0;
          let allocatedCount = 0;
          for (const applicant of applicantsRes.rows) {
            await client.query(
              `UPDATE public.elective_preferences ep
               SET status = $1
               WHERE ep."USN" = $2
                 AND ep.coursecode IN (
                   SELECT el.coursecode
                   FROM public.elective_list el
                   WHERE el.electivegroup = $3
                     AND el."DeptID" = $4
                     AND el.instance_id = $5
                 )
                 AND EXISTS (
                   SELECT 1
                   FROM public.students s
                   WHERE s."USN" = ep."USN"
                     AND s."DeptID" = $4
                     AND s.instance_id = $5
                 )`,
              [preference, applicant.usn, electivegroup, deptid, instanceId]
            );
            cgpaCutoff = Number(applicant.cgpa || 0);
            allocatedCount += 1;
          }

          if (availability <= noOfPreferences) {
            await client.query(
              `UPDATE public.elective_list
               SET allocation_status = $1,
                   cgpa_cutoff = $2,
                   total_allocations = $3
               WHERE coursecode = $4 AND "DeptID" = $5 AND instance_id = $6`,
              [preference, cgpaCutoff, max, course.coursecode, deptid, instanceId]
            );
            await client.query(
              `UPDATE public.elective_preferences ep
               SET status = $1
               WHERE ep.coursecode = $2
                 AND ep.status = 0
                 AND EXISTS (
                   SELECT 1
                   FROM public.students s
                   WHERE s."USN" = ep."USN"
                     AND s."DeptID" = $3
                     AND s.instance_id = $4
                 )`,
              [-preference, course.coursecode, deptid, instanceId]
            );
          } else {
            await client.query(
              `UPDATE public.elective_list
               SET allocation_status = $1,
                   cgpa_cutoff = $2,
                   total_allocations = $3
               WHERE coursecode = $4 AND "DeptID" = $5 AND instance_id = $6`,
              [preference, cgpaCutoff, totalAllocations + allocatedCount, course.coursecode, deptid, instanceId]
            );
          }
        }
      }
    }

    await setAllocationMethodForInstance(client, deptid, instanceId, allocationMethod);
    await client.query('COMMIT');
    return {
      success: true,
      method: allocationMethod,
      rejectedCourses,
      message: rejectedCourses.length > 0
        ? `Allocation completed. ${rejectedCourses.length} elective(s) were rejected due to low first preference count.`
        : 'Allocation completed successfully.'
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  ALLOCATION_METHODS,
  normalizeAllocationMethod,
  getDistinctGroups,
  getDistinctGroupsWithAllocations,
  getCoursesByGroup,
  getPreferenceCountsForCourses,
  getAllocationMethodForInstance,
  updateMinMaxBatch,
  resetAllocationsByDept,
  resetAllocationsByScope,
  allocateByDeptAndInstance
};
