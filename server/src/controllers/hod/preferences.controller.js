const prefsService = require('../../services/hod/preferences.service');

exports.list = async (req, res) => {
  try {
    const coursecodesParam = req.query.coursecodes || '';
    const coursecodes = coursecodesParam ? coursecodesParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (coursecodes.length === 0) return res.status(400).json({ error: 'coursecodes query parameter required' });
    const rows = await prefsService.listByCoursecodes(coursecodes);
    return res.json({ items: rows });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to fetch preferences' });
  }
};

exports.counts = async (req, res) => {
  try {
    const coursecodesParam = req.query.coursecodes || '';
    const coursecodes = coursecodesParam ? coursecodesParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (coursecodes.length === 0) return res.status(400).json({ error: 'coursecodes query parameter required' });
    const rows = await prefsService.countsForCoursecodes(coursecodes);
    return res.json({ counts: rows });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to fetch preference counts' });
  }
};
