const electiveService = require('../../services/hod/elective.service');

exports.list = async (req, res) => {
  try {
    const data = await electiveService.list(req.user.deptid);
    return res.json({ items: data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch electives' });
  }
};

exports.create = async (req, res) => {
  try {
    const created = await electiveService.create({
      ...req.body,
      deptid: req.user.deptid,
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create elective' });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await electiveService.update({
      id: Number(req.params.id),
      ...req.body,
      deptid: req.user.deptid,
    });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update elective' });
  }
};

exports.remove = async (req, res) => {
  try {
    await electiveService.remove(Number(req.params.id), req.user.deptid);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to delete elective' });
  }
};
