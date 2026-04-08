const studentsService = require('../../services/hod/students.service');

exports.list = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    const rows = await studentsService.listByDepartment(deptid);
    return res.json({ items: rows });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to fetch students' });
  }
};

exports.getByUsn = async (req, res) => {
  try {
    const usn = req.params.usn;
    if (!usn) return res.status(400).json({ error: 'USN required' });
    const student = await studentsService.getByUsn(usn);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    return res.json(student);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to fetch student' });
  }
};
