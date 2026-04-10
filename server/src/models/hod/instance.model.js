const pool = require('../../config/db');

async function ensureTable() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS public.hod_academic_year_instances (
			id SERIAL PRIMARY KEY,
			deptid INTEGER NOT NULL,
			academic_year VARCHAR(20) NOT NULL,
			title VARCHAR(120) NOT NULL,
			start_date DATE,
			end_date DATE,
			is_active BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (deptid, academic_year)
		)
	`);
}

function toDateOnly(value) {
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

function mapRow(row) {
	return {
		id: row.id,
		deptid: row.deptid,
		academicYear: row.academic_year,
		title: row.title,
		startDate: toDateOnly(row.start_date),
		endDate: toDateOnly(row.end_date),
		isActive: row.is_active,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

async function listByDepartment(deptid) {
	const result = await pool.query(
		`SELECT id, deptid, academic_year, title, start_date, end_date, is_active, created_at, updated_at
		 FROM public.hod_academic_year_instances
		 WHERE deptid = $1
		 ORDER BY academic_year DESC, id DESC`,
		[deptid]
	);
	return result.rows.map(mapRow);
}

async function createInstance({ deptid, academicYear, title, startDate, endDate, isActive }) {
	const result = await pool.query(
		`INSERT INTO public.hod_academic_year_instances
			(deptid, academic_year, title, start_date, end_date, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, deptid, academic_year, title, start_date, end_date, is_active, created_at, updated_at`,
		[deptid, academicYear, title, startDate || null, endDate || null, Boolean(isActive)]
	);
	return mapRow(result.rows[0]);
}

async function updateInstance({ id, deptid, academicYear, title, startDate, endDate }) {
	const result = await pool.query(
		`UPDATE public.hod_academic_year_instances
		 SET academic_year = $1,
			title = $2,
			start_date = $3,
			end_date = $4,
			updated_at = NOW()
		 WHERE id = $5 AND deptid = $6
		 RETURNING id, deptid, academic_year, title, start_date, end_date, is_active, created_at, updated_at`,
		[academicYear, title, startDate || null, endDate || null, id, deptid]
	);
	return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function setActive({ id, deptid }) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		await client.query(
			`UPDATE public.hod_academic_year_instances
			 SET is_active = FALSE,
				 updated_at = NOW()
			 WHERE deptid = $1`,
			[deptid]
		);

		const activeResult = await client.query(
			`UPDATE public.hod_academic_year_instances
			 SET is_active = TRUE,
				 updated_at = NOW()
			 WHERE id = $1 AND deptid = $2
			 RETURNING id, deptid, academic_year, title, start_date, end_date, is_active, created_at, updated_at`,
			[id, deptid]
		);

		await client.query('COMMIT');
		return activeResult.rows[0] ? mapRow(activeResult.rows[0]) : null;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function deleteInstance({ id, deptid }) {
	const result = await pool.query(
		`DELETE FROM public.hod_academic_year_instances
		 WHERE id = $1 AND deptid = $2
		 RETURNING id, deptid, academic_year, title, start_date, end_date, is_active, created_at, updated_at`,
		[id, deptid]
	);
	return result.rows[0] ? mapRow(result.rows[0]) : null;
}

module.exports = {
	ensureTable,
	listByDepartment,
	createInstance,
	updateInstance,
	setActive,
	deleteInstance
};
