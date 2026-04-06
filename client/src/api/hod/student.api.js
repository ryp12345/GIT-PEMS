import api from '../axios';

export const uploadStudentsExcel = (formData) =>
  api.post('/hod/students/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
