import React, { useEffect, useState } from 'react';
import { getElectiveStudents } from '../../api/hod/stats.api';
import { useAuth } from '../../context/AuthContext';

export default function ElectiveStudentsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [rows, setRows] = useState([]); // flattened rows
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Unified search & pagination
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await getElectiveStudents();
      const groupsData = res.data.groups || [];
      setGroups(groupsData);
      // Flatten: iterate groups -> courses -> students to preserve ordering
      const flat = [];
      groupsData.forEach((g) => {
        (g.courses || []).forEach((c) => {
          (c.students || []).forEach((s) => {
            flat.push({
              electivegroup: g.electivegroup,
              coursecode: c.coursecode,
              courseName: c.courseName || c.coursename || '',
              usn: s.usn,
              name: s.name,
              preference: s.preference,
              status: s.status,
            });
          });
        });
      });
      setRows(flat);
      setPage(1);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load');
    } finally { setLoading(false); }
  }

  // Filter rows by unified search across multiple fields
  const normalizedSearch = (searchText || '').toLowerCase().trim();
  const filteredRows = !normalizedSearch ? rows : rows.filter((r) => (
    String(r.coursecode || '').toLowerCase().includes(normalizedSearch) ||
    String(r.courseName || '').toLowerCase().includes(normalizedSearch) ||
    String(r.usn || '').toLowerCase().includes(normalizedSearch) ||
    String(r.name || '').toLowerCase().includes(normalizedSearch) ||
    String(r.preference || '').toLowerCase().includes(normalizedSearch) ||
    String(r.status || '').toLowerCase().includes(normalizedSearch)
  ));

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginated = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  function handleSearchChange(value) {
    setSearchText(value);
    setPage(1);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col">
        <div className="text-lg font-semibold text-slate-900 text-left">{`Welcome ${user?.name || ''}`}</div>
        <h2 className="text-xl font-semibold text-slate-900 text-center mt-2">{user?.name ? `${user.name} Students Elective List` : 'Students Elective List'}</h2>
      </div>

      {loading ? <div className="mt-4 text-sm text-gray-600">Loading...</div> : null}
      {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Total rows: {rows.length}</div>
          <div className="my-2 flex items-center">
            <input
              type="text"
              value={searchText}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search course, USN, name, preference, status..."
              className="w-full max-w-md rounded border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 mt-2">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left">S.No</th>
                <th className="px-3 py-2 text-left">Elective Group</th>
                <th className="px-3 py-2 text-left">Course Code</th>
                <th className="px-3 py-2 text-left">Course Name</th>
                <th className="px-3 py-2 text-left">USN</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-center">Preference</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredRows.length === 0 ? (
                <tr><td colSpan="8" className="py-6 text-center text-sm text-gray-500">No students</td></tr>
              ) : (
                paginated.map((r, i) => (
                  <tr key={`${r.usn}-${i}`} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{(page - 1) * pageSize + i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{r.electivegroup}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{r.coursecode}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{r.courseName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{r.usn}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">{r.name}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-center">{r.preference}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-center">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {filteredRows.length > pageSize && (
          <div className="flex justify-end items-center gap-2 mt-2">
            <button
              className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >Prev</button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <button
              className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
