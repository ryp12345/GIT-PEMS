import api from '../../api/axios';

export const getElectivesStats = () => api.get('/hod/stats/electives');
export const updateMinMax = (updates) => api.put('/hod/stats/electives/minmax', { updates });
export const getElectiveStudents = () => api.get('/hod/stats/elective-students');
export const resetElectiveAllocations = () => api.post('/hod/stats/elective-students/reset');
export const exportElectiveStudents = () => api.get('/hod/stats/elective-students/export', { responseType: 'blob' });
