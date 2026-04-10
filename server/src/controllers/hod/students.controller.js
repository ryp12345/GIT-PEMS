const studentsService = require('../../services/hod/students.service');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

// Return an XLSX template with optional title row + headers
exports.template = async (req, res) => {
  try {
    const wb = xlsx.utils.book_new();
    const wsData = [
      ['Students Template'],
      ['Name', 'UID', 'USN', 'CGPA', 'sem']
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Students');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="students_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    console.error('[Student Template] Error:', err);
    return res.status(500).json({ error: 'Unable to generate template' });
  }
};

exports.list = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const instanceId = req.query.instanceId;
    if (!deptid) return res.status(401).json({ error: 'Missing department id' });
    const pendingOnly = String(req.query.pendingOnly || '').toLowerCase() === 'true';
    const rows = pendingOnly
      ? await studentsService.listPendingByInstance(instanceId, deptid)
      : await studentsService.listByInstance(instanceId, deptid);
    return res.json({ items: rows });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to fetch students' });
  }
};

// Create a new student
exports.create = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body.instanceId ?? req.body.instance_id ?? (req.user && (req.user.instanceId || req.user.instance_id));
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    if (!deptid || instanceId == null) return res.status(400).json({ error: 'Missing department or instance id' });
    const data = req.body;
    console.log('[Student Create] Data:', { ...data, DeptID: deptid, instance_id: instanceId });
    const student = await studentsService.create({ ...data, DeptID: deptid, instance_id: instanceId });
    return res.status(201).json(student);
  } catch (err) {
    console.error('[Student Create] Error:', err);
    return res.status(400).json({ error: err.message || 'Unable to create student' });
  }
};

// Update a student
exports.update = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body.instanceId ?? req.body.instance_id ?? (req.user && (req.user.instanceId || req.user.instance_id));
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    const studentId = req.params.id;
    if (!deptid || instanceId == null || !studentId) return res.status(400).json({ error: 'Missing required fields' });
    const data = req.body;
    const student = await studentsService.update(studentId, { ...data, DeptID: deptid, instance_id: instanceId });
    return res.json(student);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to update student' });
  }
};

// Delete a student
exports.remove = async (req, res) => {
  try {
    const deptid = req.user && req.user.deptid;
    const rawInstance = req.query.instanceId ?? req.body.instanceId ?? req.body.instance_id ?? (req.user && (req.user.instanceId || req.user.instance_id));
    const instanceId = rawInstance == null ? null : (Number.isInteger(Number(rawInstance)) ? Number(rawInstance) : null);
    const studentId = req.params.id;
    if (!deptid || instanceId == null || !studentId) return res.status(400).json({ error: 'Missing required fields' });
    await studentsService.remove(studentId, deptid, instanceId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to delete student' });
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

// Upload students via Excel/CSV
exports.upload = [
  upload.single('file'),
  async (req, res) => {
    try {
      const deptid = req.user && req.user.deptid;
      const instanceId = req.query.instanceId || req.body.instanceId;
      if (!deptid || !instanceId) return res.status(400).json({ error: 'Missing department or instance id' });
      if (!req.file) return res.status(400).json({ error: 'File is required' });

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Read as raw rows (arrays) so we can handle an optional title row above headers
      const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!raw || raw.length === 0) {
        return res.status(400).json({ error: 'File contains no rows' });
      }

      // Determine header row: either first row or second row (if first is a title)
      const headerCandidates = (idx) => (raw[idx] || []).map((v) => String(v || '').trim());
      const hasRequired = (arr) => {
        const keys = arr.join(' ');
        return /name|fullname/i.test(keys) && /uid/i.test(keys) && /usn/i.test(keys);
      };

      let headerRowIndex = -1;
      if (hasRequired(headerCandidates(0))) headerRowIndex = 0;
      else if (raw.length > 1 && hasRequired(headerCandidates(1))) headerRowIndex = 1;
      else return res.status(400).json({ error: 'Missing required columns: Name, UID, USN' });

      const headers = headerCandidates(headerRowIndex);
      const dataArrays = raw.slice(headerRowIndex + 1);
      const rows = dataArrays.map((arr) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = arr[i] !== undefined ? arr[i] : ''; });
        return obj;
      });

      const created = [];
      let invalidRows = 0;
      let duplicateRows = 0;
      for (const r of rows) {
        // Expect headers: Name, UID, USN, CGPA, sem (case-insensitive)
        const Name = r.Name || r.name || r.FullName || r.fullname || '';
        const UID = r.UID || r.uid || '';
        const USN = r.USN || r.usn || '';
        const CGPA = r.CGPA !== undefined ? Number(r.CGPA) : null;
        const sem = r.sem !== undefined ? Number(r.sem) : null;
        // diploma removed from student model
        if (!Name || !UID || !USN) {
          invalidRows++;
          continue; // skip invalid rows
        }

        // skip duplicates (same USN or UID in the same dept+instance)
        try {
          const exists = await studentsService.existsByUsnOrUid(USN, UID, deptid, instanceId);
          if (exists) {
            duplicateRows++;
            continue;
          }
        } catch (e) {
          console.error('[Student Upload] duplicate check failed:', e);
          // fallthrough to attempt insert
        }

        try {
          const student = await studentsService.create({
            Name,
            UID,
            USN,
            CGPA,
            sem,
            DeptID: deptid,
            instance_id: instanceId,
          });
          created.push(student);
        } catch (e) {
          console.error('[Student Upload] row insert failed:', e);
          invalidRows++;
        }
      }

      if (created.length === 0) {
        return res.status(400).json({ error: `No valid rows found in the file. ${invalidRows} invalid rows. ${duplicateRows} duplicate rows skipped.` });
      }

      return res.json({ success: true, count: created.length, items: created, invalid: invalidRows, duplicates: duplicateRows });
    } catch (err) {
      console.error('[Student Upload] Error:', err);
      return res.status(400).json({ error: err.message || 'Unable to upload students' });
    }
  }
];
