import api from '../axios';

const _q = (k, v) => (v !== undefined && v !== null ? `?${k}=${encodeURIComponent(v)}` : '');

// List students for an instance
export const listStudents = (instanceId) =>
  api.get(`/hod/students${_q('instanceId', instanceId)}`);

// Create a student for an instance
export const createStudent = (instanceId, data) =>
  api.post(`/hod/students${_q('instanceId', instanceId)}`, data);

// Update a student for an instance
export const updateStudent = (instanceId, studentId, data) =>
  api.put(`/hod/students/${studentId}${_q('instanceId', instanceId)}`, data);

// Delete a student for an instance
export const deleteStudent = (instanceId, studentId) =>
  api.delete(`/hod/students/${studentId}${_q('instanceId', instanceId)}`);

export const uploadStudentsExcel = (instanceId, formData) => {
  const qs = instanceId !== undefined && instanceId !== null ? `?instanceId=${encodeURIComponent(instanceId)}` : '';
  return api.post(`/hod/students/upload${qs}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const downloadStudentsTemplate = () =>
  api.get('/hod/students/template', { responseType: 'blob' });
