import api from '../axios';

// List students for an instance
export const listStudents = (instanceId) =>
  api.get(`/hod/students?instanceId=${instanceId}`);

// Create a student for an instance
export const createStudent = (instanceId, data) =>
  api.post(`/hod/students?instanceId=${instanceId}`, data);

// Update a student for an instance
export const updateStudent = (instanceId, studentId, data) =>
  api.put(`/hod/students/${studentId}?instanceId=${instanceId}`, data);

// Delete a student for an instance
export const deleteStudent = (instanceId, studentId) =>
  api.delete(`/hod/students/${studentId}?instanceId=${instanceId}`);

export const uploadStudentsExcel = (instanceId, formData) =>
  api.post(`/hod/students/upload?instanceId=${instanceId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
