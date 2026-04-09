import api from '../axios';

const q = (k, v) => (v !== undefined && v !== null ? `?${k}=${encodeURIComponent(v)}` : '');

export const listElectives = (instanceId) => api.get(`/hod/electives${q('instanceId', instanceId)}`);

export const createElective = (instanceId, data) => {
	const payload = { ...(data || {}), ...(instanceId !== undefined && instanceId !== null ? { instanceId } : {}) };
	return api.post(`/hod/electives${q('instanceId', instanceId)}`, payload);
};

export const updateElective = (instanceId, id, data) => {
	const payload = { ...(data || {}), ...(instanceId !== undefined && instanceId !== null ? { instanceId } : {}) };
	return api.put(`/hod/electives/${id}${q('instanceId', instanceId)}`, payload);
};

export const deleteElective = (instanceId, id) => {
	// axios.delete accepts config with `data` for request body
	const cfg = {};
	if (instanceId !== undefined && instanceId !== null) cfg.data = { instanceId };
	return api.delete(`/hod/electives/${id}${q('instanceId', instanceId)}`, cfg);
};
