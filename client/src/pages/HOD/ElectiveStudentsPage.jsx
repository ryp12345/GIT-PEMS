import React, { useEffect, useState } from 'react';
import { getElectiveStudents } from '../../api/hod/stats.api';
import { useAuth } from '../../context/AuthContext';

export default function ElectiveStudentsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await getElectiveStudents();
      setGroups(res.data.groups || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load');
    } finally { setLoading(false); }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col">
        <div className="text-lg font-semibold text-slate-900 text-left">{`Welcome ${user?.name || ''}`}</div>
        <h2 className="text-xl font-semibold text-slate-900 text-center mt-2">{user?.name ? `${user.name} Students Elective List` : 'Students Elective List'}</h2>
      </div>

      {loading ? <div className="mt-4 text-sm text-gray-600">Loading...</div> : null}
      {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {groups.map((g) => (
        <div key={g.electivegroup} className="mt-6">
          <h3 className="text-lg font-semibold">{g.electivegroup}</h3>
          {g.courses.map((c) => (
            <div key={c.coursecode} className="mt-3">
              <div className="font-medium">{c.coursecode} - {c.courseName}</div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 mt-2">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left">S.No</th>
                      <th className="px-3 py-2 text-left">USN</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-center">Preference</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(!c.students || c.students.length === 0) ? (
                      <tr><td colSpan="5" className="py-6 text-center text-sm text-gray-500">No students</td></tr>
                    ) : (
                      c.students.map((s, i) => (
                        <tr key={s.usn} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{i + 1}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{s.usn}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">{s.name}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-center">{s.preference}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-center">{s.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
