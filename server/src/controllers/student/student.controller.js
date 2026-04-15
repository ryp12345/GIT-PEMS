const studentsModel = require('../../models/students.model');
const electivesModel = require('../../models/electives.model');
const pool = require('../../config/db');

// Return structured JSON with student info, elective groups and courses
exports.checkName = async (req, res) => {
  try {
    const { usn1, name1, uid } = req.body;
    if (!usn1 || !name1 || !uid) {
      return res.status(400).json({ error: 'USN, Name, and UID are required.' });
    }

    const student = await studentsModel.findByUsnAndUid(usn1.trim(), uid.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const studentName = (student.Name || '').toLowerCase().replace(/\s+/g, '');
    const inputName = (name1 || '').toLowerCase().replace(/\s+/g, '');
    if (!studentName.startsWith(inputName)) {
      return res.status(401).json({ error: 'Name does not match our records.' });
    }

    const deptid = student.DeptID;
    const instanceId = student.instance_id || null;
    const semester = student.sem || null;

    // Pass semester to filter groups as in PHP
    const groups = await electivesModel.getDistinctGroups(deptid, instanceId, semester);
    const groupsWithCourses = [];
    for (const g of groups) {
      const courses = await electivesModel.getCoursesByGroup(deptid, g, instanceId, semester);
      const existingPreferencesResult = await pool.query(
        `SELECT ep.coursecode, ep.preference, el."courseName" AS course_name
         FROM public.elective_preferences ep
         LEFT JOIN public.elective_list el
           ON el.coursecode = ep.coursecode
          AND el."DeptID" = $3
          AND ($4::int IS NULL OR el.instance_id = $4)
         WHERE ep."USN" = $1
           AND ep.electivegroup = $2
           AND ($4::int IS NULL OR ep.instance_id = $4)
         ORDER BY ep.preference`,
        [student.USN, g, deptid, instanceId]
      );
      const existingPreferences = existingPreferencesResult.rows.map((row) => ({
        coursecode: row.coursecode,
        courseName: row.course_name,
        preference: Number(row.preference)
      }));
      groupsWithCourses.push({ group: g, courses, existingPreferences });
    }

    return res.json({ student: { name: student.Name, usn: student.USN, deptid, instanceId }, groups: groupsWithCourses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
};

// Accept student preference submissions and insert into elective_preferences
exports.submitPreferences = async (req, res) => {
  try {
    const { usn, electivegroup, preferences } = req.body; // preferences: [{ coursecode, preference }]
    if (!usn || !electivegroup || !Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({ error: 'Invalid submission.' });
    }

    // Fetch student to get instance_id
    const student = await studentsModel.findByUsn(usn.trim());
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    const instanceId = student.instance_id || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Remove any existing preferences for this student & group for this instance
      await client.query(
        `DELETE FROM public.elective_preferences WHERE "USN" = $1 AND electivegroup = $2 AND instance_id = $3`,
        [usn, electivegroup, instanceId]
      );

      const insertText = `INSERT INTO public.elective_preferences ("USN", coursecode, preference, status, electivegroup, instance_id, created_at, updated_at) VALUES ($1, $2, $3, 0, $4, $5, NOW(), NOW())`;
      for (const p of preferences) {
        await client.query(insertText, [usn, p.coursecode, p.preference, electivegroup, instanceId]);
      }
      await client.query('COMMIT');
      return res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', details: err.message, stack: err.stack });
  }
};