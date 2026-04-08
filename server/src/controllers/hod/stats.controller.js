const statsService = require('../../services/hod/stats.service');

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
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    const data = await require('../../services/hod/stats.service').listElectiveStudents(deptid);
    return res.json({ groups: data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch elective students' });
  }
};
