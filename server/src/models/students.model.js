const pool = require('../config/db');

async function getStudentsByDept(deptid) {
  const res = await pool.query(
    `SELECT id, "Name", "USN", "UID", "DeptID", "CGPA", sem, instance_id FROM public.students WHERE "DeptID" = $1 ORDER BY "USN"`,
    [deptid]
  );
  return res.rows;
}

async function getStudentsByInstance(instanceId, deptid) {
  const res = await pool.query(
    `SELECT id, "Name", "USN", "UID", "DeptID", "CGPA", sem, instance_id FROM public.students WHERE instance_id = $1 AND "DeptID" = $2 ORDER BY "USN"`,
    [instanceId, deptid]
  );
  return res.rows;
}

async function findByUsn(usn) {
  const res = await pool.query(
    `SELECT id, "Name", "USN", "UID", "DeptID", "CGPA", sem FROM public.students WHERE "USN" = $1 LIMIT 1`,
    [usn]
  );
  return res.rows[0] || null;
}

async function findByUsnAndInstance(usn, deptid, instanceId) {
  const res = await pool.query(
    `SELECT id, "Name", "USN", "UID", "DeptID", "CGPA", sem, instance_id
     FROM public.students
     WHERE LOWER(TRIM("USN")) = LOWER(TRIM($1)) AND "DeptID" = $2 AND instance_id = $3 LIMIT 1`,
    [usn, deptid, instanceId]
  );
  return res.rows[0] || null;
}

async function findByUidAndInstance(uid, deptid, instanceId) {
  const res = await pool.query(
    `SELECT id, "Name", "USN", "UID", "DeptID", "CGPA", sem, instance_id
     FROM public.students
     WHERE LOWER(TRIM("UID")) = LOWER(TRIM($1)) AND "DeptID" = $2 AND instance_id = $3 LIMIT 1`,
    [uid, deptid, instanceId]
  );
  return res.rows[0] || null;
}

async function create(data) {
  const res = await pool.query(
    `INSERT INTO public.students ("Name", "UID", "USN", "DeptID", "CGPA", "Timestamp", sem, instance_id)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
     RETURNING id, "Name", "USN", "UID", "DeptID", "CGPA", sem, instance_id`,
    [data.Name, data.UID, data.USN, data.DeptID, data.CGPA, data.sem, data.instance_id]
  );
  return res.rows[0];
}

async function update(id, data) {
  const res = await pool.query(
    `UPDATE public.students SET "Name"=$1, "UID"=$2, "USN"=$3, "CGPA"=$4, sem=$5
     WHERE id=$6 AND "DeptID"=$7 AND instance_id=$8
     RETURNING id, "Name", "USN", "UID", "DeptID", "CGPA", sem, instance_id`,
    [data.Name, data.UID, data.USN, data.CGPA, data.sem, id, data.DeptID, data.instance_id]
  );
  return res.rows[0];
}

async function remove(id, deptid, instanceId) {
  await pool.query(
    `DELETE FROM public.students WHERE id=$1 AND "DeptID"=$2 AND instance_id=$3`,
    [id, deptid, instanceId]
  );
  return true;
}

module.exports = { getStudentsByDept, getStudentsByInstance, findByUsn, findByUsnAndInstance, findByUidAndInstance, create, update, remove };
