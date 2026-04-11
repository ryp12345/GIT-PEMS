import api from '../../api/axios';

const q = (instanceId) => (instanceId == null ? '' : `?instanceId=${encodeURIComponent(instanceId)}`);

export const getElectivesStats = () => api.get('/hod/stats/electives');
export const updateMinMax = (updates) => api.put('/hod/stats/electives/minmax', { updates });
export const getElectiveStudents = (instanceId) => api.get(`/hod/stats/elective-students${q(instanceId)}`);
export const allocateElectiveStudents = (instanceId) => api.post(`/hod/stats/elective-students/allocate${q(instanceId)}`);
export const resetElectiveAllocations = (instanceId) => api.post(`/hod/stats/elective-students/reset${q(instanceId)}`);
export const exportElectiveStudents = (instanceId) => api.get(`/hod/stats/elective-students/export${q(instanceId)}`, { responseType: 'blob' });
