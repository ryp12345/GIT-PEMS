const pool = require('../config/db');

async function getStudentsByDept(deptid) {
  const res = await pool.query(
    `SELECT id, "Name" AS name, "USN" AS usn, "UID" AS uid, "DeptID" AS deptid, "CGPA" AS cgpa, aca_year AS acaYear, sem, diploma FROM public.students WHERE "DeptID" = $1 ORDER BY usn`,
    [deptid]
  );
  return res.rows;
}

async function findByUsn(usn) {
  const res = await pool.query(
    `SELECT id, "Name" AS name, "USN" AS usn, "UID" AS uid, "DeptID" AS deptid, "CGPA" AS cgpa, aca_year AS acaYear, sem, diploma FROM public.students WHERE "USN" = $1 LIMIT 1`,
    [usn]
  );
  return res.rows[0] || null;
}

module.exports = { getStudentsByDept, findByUsn };
