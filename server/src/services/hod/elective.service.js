const pool = require('../../config/db');

exports.list = async (deptid) => {
  const { rows } = await pool.query('SELECT * FROM elective_list WHERE "DeptID" = $1', [deptid]);
  return rows;
};

exports.listByInstance = async (instanceId, deptid) => {
  const { rows } = await pool.query('SELECT * FROM elective_list WHERE instance_id = $1 AND "DeptID" = $2', [instanceId, deptid]);
  return rows;
};

exports.create = async (data) => {
  const {
    electiveCode,
    electiveName,
    groupId,
    division,
    max,
    preReq,
    compulsoryPrereq,
    diploma,
    sem,
    deptid,
  } = data;
  const result = await pool.query(
    'INSERT INTO elective_list (coursecode, "courseName", electivegroup, division, max, pre_req, compulsory_prereq, sem, "DeptID", instance_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING "ID" AS id',
    [electiveCode, electiveName, groupId, division, max, preReq, compulsoryPrereq ? 1 : 0, sem, deptid, data.instance_id || data.instanceId || null]
  );
  return { id: result.rows[0].id };
};

exports.update = async (data) => {
  const {
    id,
    electiveCode,
    electiveName,
    groupId,
    division,
    max,
    preReq,
    compulsoryPrereq,
    diploma,
    sem,
    deptid,
  } = data;
  await pool.query(
    'UPDATE elective_list SET coursecode=$1, "courseName"=$2, electivegroup=$3, division=$4, max=$5, pre_req=$6, compulsory_prereq=$7, sem=$8 WHERE "ID"=$9 AND "DeptID"=$10 AND (instance_id = $11 OR $11 IS NULL)',
    [electiveCode, electiveName, groupId, division, max, preReq, compulsoryPrereq ? 1 : 0, sem, id, deptid, data.instance_id || data.instanceId || null]
  );
  return { id };
};

exports.remove = async (id, deptid) => {
  // optional instance scoping: if third arg provided, expect caller to pass instance_id as third param
  const instanceArg = arguments.length >= 3 ? arguments[2] : null;
  if (instanceArg) {
    await pool.query('DELETE FROM elective_list WHERE "ID"=$1 AND "DeptID"=$2 AND instance_id=$3', [id, deptid, instanceArg]);
  } else {
    await pool.query('DELETE FROM elective_list WHERE "ID"=$1 AND "DeptID"=$2', [id, deptid]);
  }
  return { id };
};
