const electiveService = require('../../services/hod/elective.service');

exports.list = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const instanceId = req.query.instanceId || null;
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    const data = instanceId ? await electiveService.listByInstance(instanceId, deptid) : await electiveService.list(deptid);
    return res.json({ items: data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to fetch electives' });
  }
};

exports.create = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body.instanceId ?? req.body.instance_id ?? (req.user && (req.user.instanceId || req.user.instance_id));
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    console.log('[Elective Create] req.user:', req.user, 'rawInstance:', rawInstance);
    if (!deptid || instanceId == null) return res.status(400).json({ error: 'Missing department or instance id' });
    const created = await electiveService.create({
      ...req.body,
      deptid: deptid,
      instance_id: instanceId,
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create elective' });
  }
};

exports.update = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body.instanceId ?? req.body.instance_id ?? (req.user && (req.user.instanceId || req.user.instance_id));
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    const id = Number(req.params.id);
    console.log('[Elective Update] req.user:', req.user, 'rawInstance:', rawInstance, 'params.id:', req.params.id);
    if (!deptid || instanceId == null || !id) return res.status(400).json({ error: 'Missing required fields' });
    const updated = await electiveService.update({
      id: id,
      ...req.body,
      deptid: deptid,
      instance_id: instanceId,
    });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to update elective' });
  }
};

exports.remove = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body?.instanceId ?? req.body?.instance_id ?? (req.user && (req.user.instanceId || req.user.instance_id));
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    const id = Number(req.params.id);
    console.log('[Elective Remove] req.user:', req.user, 'rawInstance:', rawInstance, 'params.id:', req.params.id);
    if (!deptid || !id) return res.status(400).json({ error: 'Missing required fields' });
    await electiveService.remove(id, deptid, instanceId);
    return res.json({ success: true });
  } catch (error) {
    if (error && error.message === 'Elective not found') {
      return res.status(404).json({ error: 'Elective not found' });
    }
    return res.status(400).json({ error: error.message || 'Unable to delete elective' });
  }
};
