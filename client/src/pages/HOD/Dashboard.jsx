import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar, { menuLinks } from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import ElectiveInstancePage from './ElectiveInstancePage';
import ElectiveInstanceViewPage from './ElectiveInstanceViewPage';
import StatsPage from './StatsPage';
import { getElectiveStudents, getElectivesStats } from '../../api/hod/stats.api';
import { listAcademicYearInstances } from '../../api/hod/instance.api';

function DashboardPlaceholder({ title }) {
	return (
		<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 className="text-xl font-semibold text-slate-900">{title}</h2>
			<div className="mt-6 min-h-[420px] rounded-2xl border border-dashed border-slate-300 bg-slate-50" />
		</div>
	);
}

// Lightweight SVG Pie Chart for "Allocated Students by Course"
function AllocatedPie({ data }) {
	if (!Array.isArray(data) || data.length === 0) return null;
	const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
	if (!total) return null;

	const [hoverIndex, setHoverIndex] = useState(null);
	const radius = 90;
	const labelRadius = 54; // where to place the count labels inside slices
	let cumulative = 0; // cumulative fraction
	const colors = [
		'#6366F1', // indigo
		'#22C55E', // green
		'#F97316', // orange
		'#E11D48', // rose
		'#0EA5E9', // sky
		'#A855F7', // purple
		'#14B8A6', // teal
		'#FACC15', // amber
		'#EF4444', // red
		'#8B5CF6'  // violet
	];

	return (
		<div className="flex flex-col items-center justify-center">
			<svg width={260} height={260} viewBox="0 0 220 220">
				<g transform="translate(110,110)">
					{data.map((item, index) => {
						const value = Number(item.value) || 0;
						if (!value) return null;
						const fraction = value / total;
						const startAngle = cumulative * 2 * Math.PI - Math.PI / 2; // start from top
						const endAngle = (cumulative + fraction) * 2 * Math.PI - Math.PI / 2;
						const largeArc = fraction > 0.5 ? 1 : 0;
						const x1 = radius * Math.cos(startAngle);
						const y1 = radius * Math.sin(startAngle);
						const x2 = radius * Math.cos(endAngle);
						const y2 = radius * Math.sin(endAngle);
						const midAngle = (startAngle + endAngle) / 2;
						const lx = labelRadius * Math.cos(midAngle);
						const ly = labelRadius * Math.sin(midAngle);
						cumulative += fraction;

						const d = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
						const isHovered = hoverIndex === index;

						return (
							<g
								key={item.label || index}
								onMouseEnter={() => setHoverIndex(index)}
								onMouseLeave={() => setHoverIndex(null)}
								style={{ cursor: 'pointer' }}
							>
								<path
									d={d}
									fill={colors[index % colors.length]}
									opacity={hoverIndex == null || isHovered ? 1 : 0.35}
								/>
								<text
									x={lx}
									y={ly}
									textAnchor="middle"
									dominantBaseline="middle"
									fill="#0f172a"
									fontSize="10"
									fontWeight={isHovered ? '700' : '600'}
								>
									{value}
								</text>
							</g>
						);
					})}
				</g>
			</svg>
			<ul className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-700 sm:grid-cols-2">
				{data.map((item, index) => (
					<li key={item.label || index} className="flex items-center gap-2">
						<span
							className="inline-block h-3 w-3 rounded-sm"
							style={{ backgroundColor: colors[index % colors.length] }}
						/>
						<span className="truncate" title={`${item.label}: ${item.value}`}>
							{item.label} ({item.value})
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export default function HODDashboard() {
	const { user } = useAuth();
	const location = useLocation();
	const isInstanceViewPage = /^\/elective-instance\/\d+\/view$/.test(location.pathname);
	const isInstancePage = location.pathname.startsWith('/elective-instance');
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const activeLink = menuLinks.find((item) => item.path === location.pathname) || menuLinks[0];
	const activeLabel = activeLink?.name || 'Dashboard';
	// Elective Instance Dropdown State
	const [instances, setInstances] = useState([]);
	const [selectedInstance, setSelectedInstance] = useState('');
	const [loadingInstances, setLoadingInstances] = useState(true);
	useEffect(() => {
		let mounted = true;
		async function loadInstances() {
			setLoadingInstances(true);
			try {
				const res = await listAcademicYearInstances();
				if (!mounted) return;
				setInstances(res.data.items || []);
				// Default to first instance if available
				if ((res.data.items || []).length > 0 && !selectedInstance) {
					setSelectedInstance(res.data.items[0].id || res.data.items[0]._id);
				}
			} catch (err) {
				// Optionally handle error
			} finally {
				if (mounted) setLoadingInstances(false);
			}
		}
		loadInstances();
		return () => { mounted = false; };
		// eslint-disable-next-line
	}, []);

	function renderContent() {
		if (isInstanceViewPage) {
			return <ElectiveInstanceViewPage />;
		}
		if (isInstancePage) {
			return <ElectiveInstancePage />;
		}

		if (location.pathname === '/elective-stats') {
			return <StatsPage />;
		}

		if (location.pathname === '/' || location.pathname === '/dashboard') {
			return (
				<>
					{/* Elective Instance Dropdown */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-slate-700 mb-1">Elective Instance</label>
						<select
							className="w-full max-w-xs rounded border border-slate-300 p-2"
							value={selectedInstance}
							onChange={e => setSelectedInstance(e.target.value)}
							disabled={loadingInstances}
						>
							{loadingInstances ? <option>Loading...</option> : null}
							{!loadingInstances && instances.length === 0 ? <option>No instances</option> : null}
							{!loadingInstances && instances.map(inst => (
								<option key={inst.id || inst._id} value={inst.id || inst._id}>
									{inst.title || inst.name || inst.academicYear || inst.id || inst._id}
								</option>
							))}
						</select>
					</div>
					<OverviewCards instanceId={selectedInstance} />
					<div className="mt-6">
						<PendingStudentsCard instanceId={selectedInstance} />
					</div>
				</>
			);
		}
		return <DashboardPlaceholder title={activeLabel} />;
	}

	function PendingStudentsCard({ instanceId }) {
		const [pending, setPending] = useState([]);
		const [loading, setLoading] = useState(true);
		const [error, setError] = useState('');
		const [search, setSearch] = useState('');
		const [page, setPage] = useState(1);
		const PAGE_SIZE = 10;

		   useEffect(() => {
			   let mounted = true;
			   async function load() {
				   setLoading(true);
				   try {
					   const res = await getElectiveStudents(instanceId);
					   if (!mounted) return;
					   setPending(res.data.pendingStudents || []);
				   } catch (err) {
					   if (!mounted) return;
					   setError(err?.response?.data?.error || err.message || 'Failed to load');
				   } finally {
					   if (mounted) setLoading(false);
				   }
			   }
			   if (instanceId) load();
			   return () => { mounted = false; };
		   }, [instanceId]);

		   // Reset page when search or pending changes
		   useEffect(() => { setPage(1); }, [search, pending]);

		   const filtered = pending.filter(student => {
			   const q = search.trim().toLowerCase();
			   if (!q) return true;
			   return (
				   (student.name || '').toLowerCase().includes(q) ||
				   (student.uid || '').toLowerCase().includes(q) ||
				   (student.usn || '').toLowerCase().includes(q)
			   );
		   });
		   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
		   const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

		   return (
			   <div className="overflow-hidden rounded-xl bg-white shadow-xl">
				   <div className="px-6 pt-6 pb-2">
					   <h2 className="text-lg font-bold text-slate-900 mb-4 text-center">Pending/Unassigned Students</h2>
					   <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
						   <div className="relative w-full sm:w-80">
							   <input
								   value={search}
								   onChange={e => setSearch(e.target.value)}
								   placeholder="Search students..."
								   className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
							   />
							   <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ position: 'absolute', left: '0.75rem', top: '0.65rem' }}>
								   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							   </svg>
						   </div>
					   </div>
				   </div>
				   <div className="overflow-x-auto">
					   <table className="min-w-full divide-y divide-gray-200">
						   <thead className="bg-blue-600">
							   <tr>
								   <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">S.No</th>
								   <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">Name</th>
								   <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">UID</th>
								   <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">USN</th>
							   </tr>
						   </thead>
						   <tbody className="divide-y divide-gray-200 bg-white">
							   {loading ? (
								   <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
							   ) : error ? (
								   <tr><td colSpan="4" className="px-6 py-12 text-center text-red-600">{error}</td></tr>
							   ) : pending.length === 0 ? (
								   <tr><td colSpan="4" className="px-6 py-12 text-center text-green-700">All students have been allocated.</td></tr>
							   ) : paginated.length === 0 ? (
								   <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">No students found</td></tr>
							   ) : (
								   paginated.map((student, idx) => (
									   <tr key={student.id || student._id || idx} className={`transition-colors duration-150 hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
										   <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + idx + 1}</td>
										   <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{student.name || student.fullName || student.studentName || student.rollno || student.email}</td>
										   <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{student.uid || student._id || '-'}</td>
										   <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{student.usn || student.rollno || '-'}</td>
									   </tr>
								   ))
							   )}
						   </tbody>
					   </table>
				   </div>
				   {filtered.length > PAGE_SIZE && (
					   <div className="flex flex-col gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
						   <p className="text-sm text-gray-600">Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries</p>
						   <div className="flex items-center gap-2">
							   <button
								   className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 disabled:opacity-50"
								   onClick={() => setPage(p => Math.max(1, p - 1))}
								   disabled={page === 1}
							   >
								   Prev
							   </button>
							   <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
							   <button
								   className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 disabled:opacity-50"
								   onClick={() => setPage(p => Math.min(totalPages, p + 1))}
								   disabled={page === totalPages}
							   >
								   Next
							   </button>
						   </div>
					   </div>
				   )}
			   </div>
		   );
	}

	function OverviewCards({ instanceId }) {
		const [loading, setLoading] = useState(true);
		const [error, setError] = useState('');
		const [metrics, setMetrics] = useState({});
		const [allocatedPieData, setAllocatedPieData] = useState([]);

		   useEffect(() => {
			   let mounted = true;
			   async function load() {
				   setLoading(true);
				   try {
					   const [studentsRes, statsRes] = await Promise.all([
						   getElectiveStudents(instanceId),
						   getElectivesStats(instanceId)
					   ]);
					   if (!mounted) return;

					   // total allocated = sum of students in groups -> courses -> students
					   const groups = (studentsRes.data && studentsRes.data.groups) || [];
					   let totalAllocated = 0;
					   const pieData = [];
					   for (const g of groups) {
						   for (const c of (g.courses || [])) {
							   const count = (c.students || []).length;
							   totalAllocated += count;
							   if (count > 0) {
								   pieData.push({ label: c.courseName || c.coursename || c.coursecode, value: count });
							   }
						   }
					   }

					   const pendingCount = (studentsRes.data && studentsRes.data.pendingStudents && studentsRes.data.pendingStudents.length) || 0;

					   // compute capacity, oversubscription, preference demand and remaining seats from electives stats
					   const statGroups = (statsRes.data && statsRes.data.groups) || [];
					   let totalSeats = 0;
					   let totalAllocatedSeats = 0;
					   const oversubscribed = [];
					   const utilCourses = [];
					   const prefTotals = {};
					   const freeCourses = [];
					   for (const g of statGroups) {
						   for (const c of (g.courses || [])) {
							   const max = Number(c.max || 0);
							   const totalAlloc = Number(c.total_allocations || 0);
							   totalSeats += max;
							   totalAllocatedSeats += totalAlloc;
							   const firstPrefs = Number(c.prefs && c.prefs[1] ? c.prefs[1] : 0);
							   if (max > 0 && firstPrefs > max) {
								   oversubscribed.push({ coursecode: c.coursecode, courseName: c.courseName || c.coursename || c.coursecode, demand: firstPrefs, max });
							   }
							   if (max > 0) {
								   const courseUtil = max === 0 ? 0 : Math.round((totalAlloc / max) * 100);
								   utilCourses.push({
									   coursecode: c.coursecode,
									   courseName: c.courseName || c.coursename || c.coursecode,
									   max,
									   allocated: totalAlloc,
									   utilization: courseUtil
								   });
								   const freeSeats = Math.max(max - totalAlloc, 0);
								   if (freeSeats > 0) {
									   freeCourses.push({
										   coursecode: c.coursecode,
										   courseName: c.courseName || c.coursename || c.coursecode,
										   max,
										   freeSeats
									   });
								   }
							   }
							   if (c.prefs) {
								   Object.entries(c.prefs).forEach(([rankStr, cnt]) => {
									   const rank = Number(rankStr);
									   const value = Number(cnt || 0);
									   if (!Number.isFinite(rank) || !value) return;
									   prefTotals[rank] = (prefTotals[rank] || 0) + value;
								   });
							   }
						   }
					   }

					   const utilization = totalSeats === 0 ? 0 : Math.round((totalAllocatedSeats / totalSeats) * 100);
					   const topUtilized = utilCourses.sort((a, b) => b.utilization - a.utilization).slice(0, 3);
					   const prefRanks = Object.keys(prefTotals).map(Number).sort((a, b) => a - b);
					   const preferenceDemand = prefRanks.map(rank => ({ rank, count: prefTotals[rank] }));
					   const topFreeCourses = freeCourses.sort((a, b) => b.freeSeats - a.freeSeats).slice(0, 3);

					   setMetrics({
						   totalAllocated,
						   pendingCount,
						   oversubscribedCount: oversubscribed.length,
						   oversubscribedTop: oversubscribed.slice(0, 3),
						   utilization,
						   topUtilizedCourses: topUtilized,
						   preferenceDemand,
						   topFreeCourses
					   });
					   setAllocatedPieData(pieData);
				   } catch (err) {
					   if (!mounted) return;
					   setError(err?.response?.data?.error || err.message || 'Failed to load stats');
				   } finally {
					   if (mounted) setLoading(false);
				   }
			   }
			   if (instanceId) load();
			   return () => { mounted = false; };
		   }, [instanceId]);

		   return (
			   <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					   <div className="p-4 rounded-lg border border-indigo-100 bg-indigo-50">
						   <div className="text-sm text-indigo-600">Total Allocated</div>
						   <div className="mt-2 text-2xl font-semibold text-indigo-700">{loading ? '—' : metrics.totalAllocated ?? 0}</div>
						   <div className="text-xs text-indigo-600 mt-1">Students allocated to electives</div>
					   </div>
					   <div className="p-4 rounded-lg border border-amber-100 bg-amber-50">
						   <div className="text-sm text-amber-700">Pending / Unassigned</div>
						   <div className="mt-2 text-2xl font-semibold text-amber-800">{loading ? '—' : metrics.pendingCount ?? 0}</div>
						   <div className="text-xs text-amber-700 mt-1">Students without submitted or matched preferences</div>
					   </div>
					   <div className="p-4 rounded-lg border border-green-100 bg-green-50">
						   <div className="text-sm text-green-600">Capacity Utilization</div>
						   <div className="mt-2 text-2xl font-semibold text-green-700">{loading ? '—' : `${metrics.utilization ?? 0}%`}</div>
						   <div className="text-xs text-green-600 mt-1">Overall seats filled</div>
					   </div>
				   </div>
				   <div className="mt-8 grid gap-6 lg:grid-cols-2">
					   <div>
						   <h3 className="text-base font-bold text-slate-800 mb-2 text-center">Allocated Students by Course</h3>
						   {loading ? (
							   <div className="text-center text-gray-500 py-8">Loading chart...</div>
						   ) : allocatedPieData.length === 0 ? (
							   <div className="text-center text-gray-500 py-8">No allocation data available</div>
						   ) : (
							   <AllocatedPie data={allocatedPieData} />
						   )}
					   </div>
					   <div>
						   <h3 className="text-base font-bold text-slate-800 mb-2 text-center">Courses with Most Free Seats</h3>
						   {loading ? (
							   <div className="text-center text-gray-500 py-8">Loading data...</div>
						   ) : !metrics.topFreeCourses || metrics.topFreeCourses.length === 0 ? (
							   <div className="text-center text-gray-500 py-8">No free seats available</div>
						   ) : (
							   <div className="space-y-4 py-2">
								   {metrics.topFreeCourses.map((course, idx) => {
									   const ratio = course.max ? (course.freeSeats / course.max) * 100 : 0;
									   return (
										   <div key={course.coursecode || course.courseName || idx} className="space-y-1">
											   <div className="flex items-baseline justify-between gap-2 text-xs font-medium text-slate-700">
												   <span className="truncate" title={course.courseName || course.coursecode}>{course.courseName || course.coursecode}</span>
												   <span className="text-slate-500">{`${course.freeSeats} free / ${course.max} seats`}</span>
											   </div>
											   <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
												   <div
													   className="h-full rounded-full bg-sky-500"
													   style={{ width: `${Math.min(ratio, 100)}%` }}
												   />
											   </div>
										   </div>
									   );
								   })}
							   </div>
						   )}
					   </div>
				   </div>
				   {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}
			   </div>
		   );
	}
	
	// Removed QuickActionsCard and OverviewCard per request; dashboard shows only pending list for now.
		return (
		<div className="min-h-screen bg-slate-100 lg:flex">
			<Sidebar
				isOpen={isSidebarOpen}
				onClose={() => setIsSidebarOpen(false)}
				user={user}
			/>

			<div className="flex min-h-screen flex-1 flex-col lg:pl-0">
				<Header onMenuToggle={() => setIsSidebarOpen(true)} />
				<main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-7xl space-y-6">
						{renderContent()}
					</div>
				</main>
			</div>
		</div>
	);
}
