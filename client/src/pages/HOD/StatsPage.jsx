import React, { useEffect, useState } from 'react';
import { getElectivesStats, updateMinMax } from '../../api/hod/stats.api';
import { useAuth } from '../../context/AuthContext';

export default function StatsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getElectivesStats();
      setGroups(res.data.groups || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(coursecode, field, value) {
    setEdits((prev) => ({
      ...prev,
      [coursecode]: {
        ...prev[coursecode],
        [field]: value
      }
    }));
  }

  async function handleSave() {
    const updates = Object.keys(edits).map((coursecode) => ({
      coursecode,
      min: Number(edits[coursecode]?.min ?? groups.flatMap(g => g.courses).find(c => c.coursecode === coursecode)?.min ?? 0),
      max: Number(edits[coursecode]?.max ?? groups.flatMap(g => g.courses).find(c => c.coursecode === coursecode)?.max ?? 0)
    }));
    if (updates.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await updateMinMax(updates);
      setEdits({});
      await load();
      setNotification({ show: true, message: 'Update successful', type: 'success' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Save failed';
      setError(msg);
      setNotification({ show: true, message: msg, type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {notification.show ? (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="ml-2 text-white/80 hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ) : null}
      <div className="flex flex-col">
        <div className="text-lg font-semibold text-slate-900 text-left">{`Welcome ${user?.name || ''}`}</div>
        <h2 className="text-xl font-semibold text-slate-900 text-center mt-2">{user?.name ? `${user.name} Students Elective List` : 'Students Elective List'}</h2>
      </div>

      {loading ? <div className="mt-4 text-sm text-gray-600">Loading...</div> : null}
      {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {groups.map((g) => (
        <div key={g.electivegroup} className="mt-6">
          <h3 className="text-lg font-semibold">{g.electivegroup}</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 mt-3">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Course Code</th>
                  <th className="px-3 py-2 text-left">Course Name</th>
                  <th className="px-3 py-2 text-center">Pref 1</th>
                  <th className="px-3 py-2 text-center">Pref 2</th>
                  <th className="px-3 py-2 text-center">Pref 3</th>
                  <th className="px-3 py-2 text-center">Pref 4</th>
                  <th className="px-3 py-2 text-center">Pref 5</th>
                  <th className="px-3 py-2 text-center">Allocated</th>
                  <th className="px-3 py-2 text-center">CGPA Cutoff</th>
                  <th className="px-3 py-2 text-center">Total Alloc</th>
                  <th className="px-3 py-2 text-center">Min</th>
                  <th className="px-3 py-2 text-center">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {g.courses.map((c) => (
                  <tr key={c.coursecode}>
                    <td className="px-3 py-2">{c.coursecode}</td>
                    <td className="px-3 py-2">{c.courseName}</td>
                    <td className="px-3 py-2 text-center">{c.prefs?.[1] ?? 0}</td>
                    <td className="px-3 py-2 text-center">{c.prefs?.[2] ?? 0}</td>
                    <td className="px-3 py-2 text-center">{c.prefs?.[3] ?? 0}</td>
                    <td className="px-3 py-2 text-center">{c.prefs?.[4] ?? 0}</td>
                    <td className="px-3 py-2 text-center">{c.prefs?.[5] ?? 0}</td>
                    <td className="px-3 py-2 text-center">{c.allocation_status}</td>
                    <td className="px-3 py-2 text-center">{c.cgpa_cutoff}</td>
                    <td className="px-3 py-2 text-center">{c.total_allocations}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" value={edits[c.coursecode]?.min ?? c.min} onChange={(e)=>handleChange(c.coursecode,'min',e.target.value)} className="w-20 rounded border px-2 py-1 text-sm" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" value={edits[c.coursecode]?.max ?? c.max} onChange={(e)=>handleChange(c.coursecode,'max',e.target.value)} className="w-20 rounded border px-2 py-1 text-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="mt-6 flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">Update</button>
        {saving && <span className="text-sm text-gray-600">Saving...</span>}
      </div>
    </div>
  );
}
