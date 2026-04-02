const instanceService = require('../../services/hod/instance.service');

exports.list = async (req, res) => {
	try {
		const data = await instanceService.listByDepartment(req.user.deptid);
		return res.json({ items: data });
	} catch (error) {
		return res.status(400).json({ error: error.message || 'Unable to fetch instances' });
	}
};

exports.create = async (req, res) => {
	try {
		const created = await instanceService.create({
			deptid: req.user.deptid,
			academicYear: req.body.academicYear,
			title: req.body.title,
			startDate: req.body.startDate,
			endDate: req.body.endDate,
			isActive: req.body.isActive
		});
		return res.status(201).json(created);
	} catch (error) {
		return res.status(400).json({ error: error.message || 'Unable to create instance' });
	}
};

exports.update = async (req, res) => {
	try {
		const updated = await instanceService.update({
			id: Number(req.params.id),
			deptid: req.user.deptid,
			academicYear: req.body.academicYear,
			title: req.body.title,
			startDate: req.body.startDate,
			endDate: req.body.endDate
		});
		return res.json(updated);
	} catch (error) {
		return res.status(400).json({ error: error.message || 'Unable to update instance' });
	}
};

exports.activate = async (req, res) => {
	try {
		const updated = await instanceService.activate({
			id: Number(req.params.id),
			deptid: req.user.deptid
		});
		return res.json(updated);
	} catch (error) {
		return res.status(400).json({ error: error.message || 'Unable to activate instance' });
	}
};
