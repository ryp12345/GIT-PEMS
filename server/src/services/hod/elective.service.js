const pool = require('../../config/db');

exports.list = async (deptid) => {
  const { rows } = await pool.query('SELECT * FROM elective_list WHERE DeptID = $1', [deptid]);
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
    'INSERT INTO elective_list (coursecode, courseName, electivegroup, division, max, pre_req, compulsory_prereq, Dipelective, sem, DeptID) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
    [electiveCode, electiveName, groupId, division, max, preReq, compulsoryPrereq ? 1 : 0, diploma ? 1 : 0, sem, deptid]
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
    'UPDATE elective_list SET coursecode=$1, courseName=$2, electivegroup=$3, division=$4, max=$5, pre_req=$6, compulsory_prereq=$7, Dipelective=$8, sem=$9 WHERE id=$10 AND DeptID=$11',
    [electiveCode, electiveName, groupId, division, max, preReq, compulsoryPrereq ? 1 : 0, diploma ? 1 : 0, sem, id, deptid]
  );
  return { id };
};

exports.remove = async (id, deptid) => {
  await pool.query('DELETE FROM elective_list WHERE id=$1 AND DeptID=$2', [id, deptid]);
  return { id };
};
