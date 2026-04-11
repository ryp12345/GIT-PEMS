const statsService = require('../../services/hod/stats.service');
const userModel = require('../../models/user.model');
const xlsx = require('xlsx');

const ALLOWED_ALLOCATION_METHODS = new Set([
  'existing',
  'fcfs',
  'cgpa',
  'preference_cgpa',
  'preference_fcfs'
]);

exports.listElectives = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    const data = await statsService.listElectivesStats(deptid);
    return res.json({ groups: data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch stats' });
  }
};

exports.updateMinMax = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
    const result = await statsService.updateMinMax(updates, deptid);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update min/max' });
  }
};

exports.listElectiveStudents = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body?.instanceId ?? req.body?.instance_id;
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    const data = await statsService.listElectiveStudents(deptid, instanceId);
    return res.json(data);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch elective students' });
  }
};

exports.allocateElectiveStudents = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body?.instanceId ?? req.body?.instance_id;
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    const method = String(req.body?.method ?? req.query?.method ?? 'preference_cgpa').toLowerCase();
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    if (instanceId == null) return res.status(400).json({ error: 'Missing instance id' });
    if (!ALLOWED_ALLOCATION_METHODS.has(method)) {
      return res.status(400).json({ error: 'Invalid allocation method' });
    }
    const data = await statsService.runAllocations(deptid, instanceId, method);
    return res.json(data);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to allocate electives' });
  }
};

exports.resetElectiveAllocations = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body?.instanceId ?? req.body?.instance_id;
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    await statsService.resetAllocations(deptid, instanceId);
    return res.json({ message: 'success' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to reset allocations' });
  }
};

exports.exportElectiveStudents = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body?.instanceId ?? req.body?.instance_id;
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });

    const [{ groups }, department] = await Promise.all([
      statsService.listElectiveStudents(deptid, instanceId),
      userModel.findById(deptid)
    ]);

    const deptName = department?.name || req.user?.username || 'Department';
    const rows = [];

    groups.forEach((group) => {
      (group.courses || []).forEach((course) => {
        (course.students || []).forEach((student, index) => {
          rows.push([
            index + 1,
            student.usn || '',
            student.name || '',
            course.coursecode || '',
            course.courseName || course.coursename || '',
            student.preference ?? ''
          ]);
        });
      });
    });

    const worksheetData = [
      [`${deptName} Students Elective Allocations`],
      [],
      ['Sl.No.', 'USN', 'Name', 'Course Code', 'Course Title', 'Preference'],
      ...rows
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(wb, ws, 'Students');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${String(deptName).replace(/[^a-zA-Z0-9_-]/g, '_')}_Students.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to export elective students' });
  }
};
