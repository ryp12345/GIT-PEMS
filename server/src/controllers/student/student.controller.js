const studentsModel = require('../../models/students.model');

// Simulate the PHP checkname.php logic
exports.checkName = async (req, res) => {
  try {
    const { usn1, name1, uid } = req.body;
    if (!usn1 || !name1 || !uid) {
      return res.status(400).json({ error: 'USN, Name, and UID are required.' });
    }

    // Find student by USN and UID (case-insensitive, trimmed)
    const student = await studentsModel.findByUsnAndUid(usn1.trim(), uid.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Check if first 4 chars of name match (case-insensitive)
    const studentName = (student.Name || '').toLowerCase().replace(/\s+/g, '');
    const inputName = (name1 || '').toLowerCase().replace(/\s+/g, '');
    if (!studentName.startsWith(inputName)) {
      return res.status(401).json({ error: 'Name does not match our records.' });
    }

    // TODO: Fetch and render preferences HTML for this student
    // For now, just return a placeholder
    const html = `<div>Welcome, ${student.Name}! (USN: ${student.USN})<br/>[Elective preferences form goes here]</div>`;
    return res.send(html);
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
};