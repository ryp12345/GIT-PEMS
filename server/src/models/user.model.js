const pool = require('../config/db');

module.exports = {
  findByUsername: async (username) => {
    const res = await pool.query(
      `SELECT
        "DeptID" AS deptid,
        "Name" AS name,
        "UserName" AS username,
        "Password" AS password,
        "DateStmp" AS datestmp
      FROM public.departments
      WHERE "UserName" = $1
      LIMIT 1`,
      [username]
    );
    return res.rows[0] || null;
  },
  findById: async (deptid) => {
    const res = await pool.query(
      `SELECT
        "DeptID" AS deptid,
        "Name" AS name,
        "UserName" AS username,
        "Password" AS password,
        "DateStmp" AS datestmp
      FROM public.departments
      WHERE "DeptID" = $1
      LIMIT 1`,
      [deptid]
    );
    return res.rows[0] || null;
  },
  updatePasswordById: async (deptid, passwordHash) => {
    const res = await pool.query(
      `UPDATE public.departments
      SET "Password" = $1, "DateStmp" = CURRENT_TIMESTAMP
      WHERE "DeptID" = $2
      RETURNING "DeptID" AS deptid`,
      [passwordHash, deptid]
    );
    return res.rows[0] || null;
  }
};
