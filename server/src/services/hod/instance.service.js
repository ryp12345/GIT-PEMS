const instanceModel = require('../../models/hod/instance.model');

const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;

function validateAcademicYear(value) {
	if (!ACADEMIC_YEAR_PATTERN.test(value || '')) {
		throw new Error('Academic year format must be YYYY-YYYY');
	}

	const [fromYear, toYear] = value.split('-').map(Number);
	if (toYear !== fromYear + 1) {
		throw new Error('Academic year must have consecutive years (example: 2025-2026)');
	}
}

function validateDates(startDate, endDate) {
	if (startDate && Number.isNaN(Date.parse(startDate))) {
		throw new Error('Start date is invalid');
	}

	if (endDate && Number.isNaN(Date.parse(endDate))) {
		throw new Error('End date is invalid');
	}

	if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
		throw new Error('Start date must be before or equal to end date');
	}
}

function normalizeDateOnly(value) {
	if (!value) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		const year = value.getFullYear();
		const month = String(value.getMonth() + 1).padStart(2, '0');
		const day = String(value.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	const raw = String(value);
	const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}/);
	return isoMatch ? isoMatch[0] : raw.slice(0, 10);
}

async function listByDepartment(deptid) {
	await instanceModel.ensureTable();
	return instanceModel.listByDepartment(deptid);
}

async function create({ deptid, academicYear, title, startDate, endDate, isActive }) {
	validateAcademicYear(academicYear);
	if (!title || !String(title).trim()) {
		throw new Error('Instance title is required');
	}
	validateDates(startDate, endDate);

	await instanceModel.ensureTable();
	const created = await instanceModel.createInstance({
		deptid,
		academicYear,
		title: String(title).trim(),
		startDate: normalizeDateOnly(startDate),
		endDate: normalizeDateOnly(endDate),
		isActive
	});

	if (created.isActive) {
		return instanceModel.setActive({ id: created.id, deptid });
	}

	return created;
}

async function update({ id, deptid, academicYear, title, startDate, endDate }) {
	validateAcademicYear(academicYear);
	if (!title || !String(title).trim()) {
		throw new Error('Instance title is required');
	}
	validateDates(startDate, endDate);

	await instanceModel.ensureTable();
	const updated = await instanceModel.updateInstance({
		id,
		deptid,
		academicYear,
		title: String(title).trim(),
		startDate: normalizeDateOnly(startDate),
		endDate: normalizeDateOnly(endDate)
	});

	if (!updated) {
		throw new Error('Instance not found');
	}

	return updated;
}

async function activate({ id, deptid }) {
	await instanceModel.ensureTable();
	const updated = await instanceModel.setActive({ id, deptid });
	if (!updated) {
		throw new Error('Instance not found');
	}
	return updated;
}

async function remove({ id, deptid }) {
	await instanceModel.ensureTable();
	const deleted = await instanceModel.deleteInstance({ id, deptid });
	if (!deleted) {
		throw new Error('Instance not found');
	}
	return deleted;
}

module.exports = {
	listByDepartment,
	create,
	update,
	activate,
	remove
};
