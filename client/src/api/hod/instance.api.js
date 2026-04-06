import api from '../axios';

export const listAcademicYearInstances = () => api.get('/hod/instances');

export const createAcademicYearInstance = (payload) => api.post('/hod/instances', payload);

export const updateAcademicYearInstance = (id, payload) => api.put(`/hod/instances/${id}`, payload);

export const activateAcademicYearInstance = (id) => api.patch(`/hod/instances/${id}/activate`);

export const deleteAcademicYearInstance = (id) => api.delete(`/hod/instances/${id}`);
