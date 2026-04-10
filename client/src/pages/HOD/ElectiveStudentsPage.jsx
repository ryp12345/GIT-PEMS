import React, { useEffect, useState } from 'react';
import { getElectiveStudents } from '../../api/hod/stats.api';
import { useAuth } from '../../context/AuthContext';

export default function ElectiveStudentsPage() {
  const { user } = useAuth();
  const [unallocatedGroups, setUnallocatedGroups] = useState([]);
  const [rows, setRows] = useState([]);
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
      const unallocatedData = res.data.unallocatedGroups || [];
      setUnallocatedGroups(unallocatedData);
      const flat = [];
      groupsData.forEach((g) => {
        (g.courses || []).forEach((c) => {
          (c.students || []).forEach((s, index) => {
            flat.push({
              serialNumber: index + 1,
              coursecode: c.coursecode,
              courseName: c.courseName || c.coursename || '',
              usn: s.usn,
              name: s.name,
              preference: s.preference,
              status: s.status
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
  const startEntry = filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = filteredRows.length === 0 ? 0 : Math.min(page * pageSize, filteredRows.length);
  const visiblePages = (() => {
    const start = Math.max(1, Math.min(page - 1, totalPages - 2));
    const end = Math.min(totalPages, start + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  function handleSearchChange(value) {
    setSearchText(value);
    setPage(1);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col">
        {/* <div className="text-lg font-semibold text-slate-900 text-left">{`Welcome ${user?.name || ''}`}</div> */}
        <h2 className="text-xl font-semibold text-slate-900 text-center mt-2">{user?.name ? `${user.name} Students Elective List` : 'Students Elective List'}</h2>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold text-slate-900">Students with unallocated elective</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 mt-2">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left">S.No</th>
                <th className="px-3 py-2 text-left">USN</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Elective Group</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {unallocatedGroups.length === 0 ? (
                <tr><td colSpan="4" className="py-6 text-center text-sm text-gray-500">No allocated elective groups found yet.</td></tr>
              ) : (
                unallocatedGroups.map((g) => {
                  if (!g.students || g.students.length === 0) {
                    return (
                      <tr key={`msg-${g.electivegroup}`}>
                        <td colSpan="4" className="px-3 py-3 text-center text-sm text-gray-700">
                          <b>All students who registered their preferences for the elective group {g.electivegroup} are allocated.</b>
                        </td>
                      </tr>
                    );
                  }

                  return g.students.map((s, i) => (
                    <tr key={`${g.electivegroup}-${s.usn}-${i}`} className={`transition-colors hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{s.usn}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">{s.name}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">{g.electivegroup}</td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {loading ? <div className="mt-4 text-sm text-gray-600">Loading...</div> : null}
      {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchText}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search course, USN, name, preference, status..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="mt-2 overflow-hidden rounded-xl bg-white shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">S.No</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">Course Code</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">Course Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">USN</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">Name</th>
                  <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider text-white">Preference</th>
                  <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      {rows.length === 0 ? 'No allocations done' : 'No students match your search'}
                    </td>
                  </tr>
                ) : (
                  paginated.map((r, i) => (
                    <tr key={`${r.usn}-${i}`} className={`transition-colors duration-150 hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{r.serialNumber}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{r.coursecode}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{r.courseName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{r.usn}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{r.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-700">{r.preference}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-700">{r.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 ? (
            <div className="flex flex-col gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">Showing {startEntry} to {endEntry} of {filteredRows.length} entries</p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`rounded border px-3 py-1 ${page === pageNumber ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700'}`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <span className="text-sm text-gray-700">of {totalPages}</span>
                <button
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
