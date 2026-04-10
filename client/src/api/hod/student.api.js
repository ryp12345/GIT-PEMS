import api from '../axios';

const _qs = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

// List students for an instance
export const listStudents = (instanceId, options = {}) =>
  api.get(`/hod/students${_qs({ instanceId, pendingOnly: options.pendingOnly })}`);

// Create a student for an instance
export const createStudent = (instanceId, data) =>
  api.post(`/hod/students${_qs({ instanceId })}`, data);

// Update a student for an instance
export const updateStudent = (instanceId, studentId, data) =>
  api.put(`/hod/students/${studentId}${_qs({ instanceId })}`, data);

// Delete a student for an instance
export const deleteStudent = (instanceId, studentId) =>
  api.delete(`/hod/students/${studentId}${_qs({ instanceId })}`);

export const uploadStudentsExcel = (instanceId, formData) => {
  const qs = instanceId !== undefined && instanceId !== null ? `?instanceId=${encodeURIComponent(instanceId)}` : '';
  return api.post(`/hod/students/upload${qs}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const downloadStudentsTemplate = () =>
  api.get('/hod/students/template', { responseType: 'blob' });
