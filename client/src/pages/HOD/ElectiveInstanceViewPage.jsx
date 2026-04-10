import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listAcademicYearInstances } from '../../api/hod/instance.api';
import { listStudents, createStudent, updateStudent, deleteStudent, uploadStudentsExcel, downloadStudentsTemplate } from '../../api/hod/student.api';
import { listElectives, createElective, updateElective, deleteElective } from '../../api/hod/elective.api';

const TABS = [
	{ id: 'students', label: 'Students' },
	{ id: 'groups', label: 'Elective Groups' },
	{ id: 'allocation', label: 'Allocation' }
];

function formatDateOnly(value) {
	if (!value) return '-';
	return String(value).slice(0, 10);
}

// ─── Students ────────────────────────────────────────────────────────────────

function StudentsTab(props) {
	const [students, setStudents] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState(null);
	const fileInputRef = useRef();
	const [selectedFile, setSelectedFile] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [form, setForm] = useState({
		Name: '',
		UID: '',
		USN: '',
		CGPA: '',
		sem: '',
	});
	const [editId, setEditId] = useState(null);
	const [error, setError] = useState('');
	const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const PAGE_SIZE = 10;
	const { instanceId } = props;
	const params = useParams();
	const resolvedInstanceId = instanceId ?? (params.instanceId ? Number(params.instanceId) : null);

	async function refreshStudents() {
		if (resolvedInstanceId == null) {
			setStudents([]);
			return;
		}
		const res = await listStudents(resolvedInstanceId, { pendingOnly: true });
		setStudents((res.data.items || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0)));
	}

	useEffect(() => {
		if (resolvedInstanceId == null) return;
		(async () => {
			try {
				await refreshStudents();
			} catch {
				setStudents([]);
			}
		})();
	}, [resolvedInstanceId]);

	function openModal() {
	setForm({
		Name: '',
		UID: '',
		USN: '',
		CGPA: '',
			sem: '',
	});
	setEditId(null);
	setError('');
	setIsModalOpen(true);
}

function openEditModal(student) {
	setForm({
		Name: student.Name,
		UID: student.UID,
		USN: student.USN,
		CGPA: student.CGPA,
		sem: student.sem,
	});
	setEditId(student.id);
	setError('');
	setIsModalOpen(true);
	}

	async function handleDelete(id) {
        if (!window.confirm('Remove this student?')) return;
        try {
			await deleteStudent(resolvedInstanceId, id);
            showNotification('Student removed successfully');
			await refreshStudents();
        } catch (err) {
            showNotification(err?.response?.data?.error || 'Unable to delete student', 'error');
        }
    }
	function closeModal() { setIsModalOpen(false); setError(''); }

	function showNotification(message, type = 'success') {
		setNotification({ show: true, message, type });
		setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
	}

	function handleSubmit(e) {
	e.preventDefault();
	const isEmpty = (v) => String(v ?? '').trim() === '';
	if (isEmpty(form.Name)) { setError('Student name is required'); return; }
	if (isEmpty(form.UID)) { setError('UID is required'); return; }
	if (isEmpty(form.USN)) { setError('USN is required'); return; }
	if (isEmpty(form.CGPA)) { setError('CGPA is required'); return; }
	if (isEmpty(form.sem)) { setError('Semester is required'); return; }

			(async () => {
				try {
					if (editId) {
						await updateStudent(resolvedInstanceId, editId, {
							...form,
							CGPA: Number(form.CGPA),
							sem: Number(form.sem),
							// diploma removed
						});
							showNotification('Student information updated successfully');
					} else {
						await createStudent(resolvedInstanceId, {
							...form,
							CGPA: Number(form.CGPA),
							sem: Number(form.sem),
							// diploma removed
						});
							showNotification('Student added successfully');
					}
						await refreshStudents();
			closeModal();
		} catch (err) {
			setError(err?.response?.data?.error || 'Operation failed');
		}
	})();
	}

	function handleFileSelect(e) {
		const file = e.target.files[0];
		setSelectedFile(file || null);
		setUploadResult(null);
		if (file) {
			// automatically upload the chosen file when using the single Upload button
			performUpload(file);
		}
	}

	async function performUpload(fileArg) {
		const fileToUpload = fileArg || selectedFile;
		if (!fileToUpload) return;
		setUploading(true);
		setUploadResult(null);
		try {
			const formData = new FormData();
			formData.append('file', fileToUpload);
			const res = await uploadStudentsExcel(resolvedInstanceId, formData);
			const uploadedCount = res.data?.count || (res.data?.items || []).length || 0;
			const invalidCount = res.data?.invalid || 0;
			if (uploadedCount > 0) {
				setUploadResult({ success: true, message: `Upload successful: ${uploadedCount} students${invalidCount ? `; ${invalidCount} invalid rows skipped` : ''}`, data: res.data });
				await refreshStudents();
				showNotification(`Uploaded ${uploadedCount} students${invalidCount ? `, ${invalidCount} invalid rows skipped` : ''}`);
				setSelectedFile(null);
				if (fileInputRef.current) fileInputRef.current.value = '';
				// show success message briefly, then refresh the page to reflect uploaded changes
				setTimeout(() => window.location.reload(), 2000);
			} else {
				// Server returned success-like response but no valid rows were stored
				const serverMsg = err?.response?.data?.error; // placeholder
				setUploadResult({ success: false, message: serverMsg || 'No valid rows found in the file. Nothing was uploaded.' });
				showNotification(serverMsg || 'No valid rows found in the file', 'error');
			}
		} catch (err) {
			setUploadResult({ success: false, message: err?.response?.data?.error || 'Upload failed' });
			showNotification(err?.response?.data?.error || 'Upload failed', 'error');
		} finally {
			setUploading(false);
		}
	}
		const filtered = useMemo(() => {
			const q = search.trim().toLowerCase();
			if (!q) return students;
			return students.filter((s) =>
				s.Name.toLowerCase().includes(q) ||
				s.UID.toLowerCase().includes(q) ||
				s.USN.toLowerCase().includes(q) ||
				String(s.CGPA).toLowerCase().includes(q) ||
				String(s.sem).toLowerCase().includes(q) ||
								false
			);
		}, [students, search]);

		const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
		const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

		// Bulk upload handler is defined above (no duplicates)

	return (
		<>
			{notification.show ? (
				<div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
					<span>{notification.message}</span>
					<button type="button" onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="ml-2 text-white/80 hover:text-white">✕</button>
				</div>
			) : null}
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative w-full sm:w-72">
					<input
						value={search}
						onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						placeholder="Search students..."
						className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</div>
				<div className="flex gap-2 flex-wrap">
					<button
						type="button"
						onClick={async () => {
							try {
								const res = await downloadStudentsTemplate();
								const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
								const url = window.URL.createObjectURL(blob);
								const a = document.createElement('a');
								a.href = url;
								// try to derive filename from content-disposition
								const cd = res.headers['content-disposition'] || '';
								const match = cd.match(/filename="?([^";]+)"?/);
								a.download = match ? match[1] : 'students_template.xlsx';
								document.body.appendChild(a);
								a.click();
								a.remove();
								window.URL.revokeObjectURL(url);
							} catch (err) {
								showNotification(err?.response?.data?.error || 'Unable to download template', 'error');
							}
						}}
						className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
						title="Download Template"
					>
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4m-8 8h8" /></svg>
						Download Template
					</button>

					<div className="flex items-center gap-2">
						<input
							type="file"
							accept=".xlsx,.xls,.csv"
							ref={fileInputRef}
							onChange={handleFileSelect}
							className="hidden"
							disabled={uploading}
						/>

						<button
							type="button"
							onClick={() => fileInputRef.current && fileInputRef.current.click()}
							className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
						>
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16M4 4l16 16" /></svg>
							Upload
						</button>
					</div>

					<button
						onClick={openModal}
						className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
						</svg>
						Add Student
					</button>
				</div>
				{uploading && <div className="mt-2 text-blue-600">Uploading...</div>}
				{uploadResult && (
					<div className={`mt-2 rounded p-2 text-sm ${uploadResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
						{uploadResult.message}
					</div>
				)}
			</div>
			<div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
				{students.length === 0
					? 'All students have registered their elective choice. You are ready to do the allocations.'
					: 'List of students who have not registered their elective preferences'}
			</div>

			<div className="overflow-x-auto rounded-xl border border-gray-200">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-blue-600">
						<tr>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">S.No</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Name</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">UID</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">USN</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">DeptID</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">CGPA</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Semester</th>

							  {/* Timestamp column removed */}
							<th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-white">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{paginated.length === 0 ? (
							<tr><td colSpan="9" className="py-10 text-center text-sm text-gray-500">{students.length === 0 ? 'No pending students found' : 'No students match your search'}</td></tr>
						) : (
							paginated.map((s, i) => (
								<tr key={s.id} className={`transition-colors hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{(page - 1) * PAGE_SIZE + i + 1}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900">{s.Name}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{s.UID}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{s.USN}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{s.DeptID}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{s.CGPA}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{s.sem}</td>

									  {/* Timestamp cell removed */}
									 <td className="whitespace-nowrap px-3 py-3 text-center flex gap-2 justify-center">
										 <button onClick={() => openEditModal(s)} className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700" title="Edit">
											 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											 </svg>
										 </button>
										 <button onClick={() => handleDelete(s.id)} className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700" title="Remove">
											 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											 </svg>
										 </button>
									 </td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination controls (Prev / Next) */}
			{filtered.length > PAGE_SIZE && (
				<div className="flex justify-end items-center gap-2 mt-4">
					<button
						className="px-3 py-1 rounded border text-sm disabled:opacity-50"
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page === 1}
					>
						Prev
					</button>
					<span className="text-sm">Page {page} of {totalPages}</span>
					<button
						className="px-3 py-1 rounded border text-sm disabled:opacity-50"
						onClick={() => setPage(p => Math.min(totalPages, p + 1))}
						disabled={page === totalPages}
					>
						Next
					</button>
				</div>
			)}

			{isModalOpen ? (
				<Modal title={editId ? 'Edit Student' : 'Add Student'} onClose={closeModal}>
					{error ? <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
					<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field label="Name *">
							<input type="text" value={form.Name} onChange={(e) => setForm((p) => ({ ...p, Name: e.target.value }))} className={inputCls} placeholder="Full name" required />
						</Field>
						<Field label="UID *">
							<input type="text" value={form.UID} onChange={(e) => setForm((p) => ({ ...p, UID: e.target.value }))} className={inputCls} placeholder="e.g. 1234567890" required />
						</Field>
						<Field label="USN *">
							<input type="text" value={form.USN} onChange={(e) => setForm((p) => ({ ...p, USN: e.target.value }))} className={inputCls} placeholder="e.g. 1RV21CS001" required />
						</Field>
						       {/* DeptID field removed */}
						<Field label="CGPA *">
							<input type="number" step="0.01" value={form.CGPA} onChange={(e) => setForm((p) => ({ ...p, CGPA: e.target.value }))} className={inputCls} placeholder="e.g. 9.25" required />
						</Field>
						       {/* Academic Year field removed */}
						       <Field label="Semester *">
							       <select value={form.sem} onChange={(e) => setForm((p) => ({ ...p, sem: e.target.value }))} className={inputCls} required>
								       <option value="">Select</option>
								       <option value="1">1</option>
								       <option value="2">2</option>
								       <option value="3">3</option>
								       <option value="4">4</option>
								       <option value="5">5</option>
								       <option value="6">6</option>
								       <option value="7">7</option>
								       <option value="8">8</option>
							       </select>
						       </Field>

						{/* Timestamp field removed */}
						<div className="sm:col-span-2"><ModalFooter onCancel={closeModal} submitLabel={editId ? 'Update Student' : 'Add Student'} /></div>
					</form>
				</Modal>
			) : null}
		</>
	);
}

// ─── Elective Groups ─────────────────────────────────────────────────────────

function GroupsTab({ openElectives, instanceId }) {
	const [groups, setGroups] = useState([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [form, setForm] = useState({ groupName: '', semester: '' });
	const [error, setError] = useState('');

	function openModal() { setForm({ groupName: '', semester: '' }); setError(''); setIsModalOpen(true); }
	function closeModal() { setIsModalOpen(false); setError(''); }

	function handleSubmit(e) {
		e.preventDefault();
		if (!form.groupName.trim()) { setError('Group name is required'); return; }
		if (!form.semester) { setError('Semester is required'); return; }
		setGroups((prev) => [...prev, { id: Date.now(), ...form }]);
		closeModal();
	}

	function handleDelete(id) {
		if (!window.confirm('Remove this group?')) return;
		setGroups((prev) => prev.filter((g) => g.id !== id));
	}

	// Show the ElectivesTab content in the Elective Groups tab
	return <ElectivesTab instanceId={instanceId} />;
}

// ─── Electives ───────────────────────────────────────────────────────────────


function ElectivesTab({ instanceId }) {
	const params = useParams();
	const resolvedInstanceId = instanceId ?? (params.instanceId ? Number(params.instanceId) : null);
	const [groups, setGroups] = useState([]);
	const [electives, setElectives] = useState([]);
	const [deletingId, setDeletingId] = useState(null);
	const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editId, setEditId] = useState(null);
	const [form, setForm] = useState({
		electiveCode: '',
		electiveName: '',
		groupId: '',
		division: '',
		max: '',
		preReq: '',
		compulsoryPrereq: false,
		sem: '',
	});
	const [error, setError] = useState('');

	function showNotification(message, type = 'success') {
		setNotification({ show: true, message, type });
		setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
	}

		const normalizeElectives = (rows) => (Array.isArray(rows) ? rows.map((r) => ({
			id: r.id ?? r.ID ?? r.Id ?? null,
			electiveCode: r.coursecode || r.course_code || r.courseCode || '',
			electiveName: r.courseName || r.coursename || r.courseName || r.course_name || '',
			groupId: r.electivegroup || r.elective_group || '',
			division: r.division || r.div || '',
			max: r.max || r.max_capacity || r.max || 0,
			preReq: r.pre_req || r.preReq || r.pre || '',
			compulsoryPrereq: Number(r.compulsory_prereq || r.compulsoryPrereq || 0) === 1,
			sem: r.sem || r.semester || '',
		})) : []);

		useEffect(() => {
			if (resolvedInstanceId == null) return;
			(async () => {
				try {
					const res = await listElectives(resolvedInstanceId);
					const rows = res.data.items || res.data || [];
					setElectives(normalizeElectives(rows));
				} catch (err) {
					setElectives([]);
				}
			})();
		}, [resolvedInstanceId]);

		function openModal(elective) {
		if (elective) {
			setForm({
				electiveCode: elective.electiveCode || '',
				electiveName: elective.electiveName || '',
				groupId: elective.groupId?.toString() || '',
				division: elective.division?.toString() || '',
				max: elective.max?.toString() || '',
				preReq: elective.preReq || '',
				compulsoryPrereq: !!elective.compulsoryPrereq,
				// diploma removed
				sem: elective.sem?.toString() || '',
			});
			setEditId(elective.id);
		} else {
			setForm({
				electiveCode: '',
				electiveName: '',
				groupId: '',
				division: '',
				max: '',
				preReq: '',
				compulsoryPrereq: false,
				// diploma removed
				sem: '',
			});
			setEditId(null);
		}
		setError('');
		setIsModalOpen(true);
	}

	function closeModal() {
		setIsModalOpen(false);
		setError('');
		setEditId(null);
	}

		async function handleSubmit(e) {
		e.preventDefault();
		if (!form.electiveCode.trim()) { setError('Elective code is required'); return; }
		if (!form.electiveName.trim()) { setError('Elective name is required'); return; }
		if (!form.groupId) { setError('Please select a group'); return; }
		if (!form.division) { setError('Division is required'); return; }
		if (!form.max) { setError('Max strength is required'); return; }
		if (!form.sem) { setError('Semester is required'); return; }
		setError('');
				try {
					const payload = {
						// send both naming styles to be compatible with backend expectations
						electiveCode: form.electiveCode,
						coursecode: form.electiveCode,
						electiveName: form.electiveName,
						courseName: form.electiveName,
						groupId: form.groupId,
						electivegroup: form.groupId,
						division: form.division,
						max: form.max,
						preReq: form.preReq,
						pre_req: form.preReq,
						compulsoryPrereq: form.compulsoryPrereq ? 1 : 0,
						compulsory_prereq: form.compulsoryPrereq ? 1 : 0,
						sem: form.sem,
					};
					if (editId) {
						await updateElective(resolvedInstanceId, editId, payload);
						const res = await listElectives(resolvedInstanceId);
						setElectives(normalizeElectives(res.data.items || res.data || []));
						showNotification('Elective updated successfully');
					} else {
						await createElective(resolvedInstanceId, payload);
						const res = await listElectives(resolvedInstanceId);
						setElectives(normalizeElectives(res.data.items || res.data || []));
						showNotification('Elective added successfully');
					}
					closeModal();
				} catch (err) {
					const message = err?.response?.data?.error || 'Operation failed';
					setError(message);
					showNotification(message, 'error');
				}
	}

		async function handleDelete(id) {
				const normalizedId = Number(id);
				if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
					showNotification('Unable to delete: invalid elective id', 'error');
					return;
				}
				if (!window.confirm('Remove this elective?')) return;
				try {
					setDeletingId(normalizedId);
					await deleteElective(resolvedInstanceId, normalizedId);
					setElectives((prev) => prev.filter((el) => Number(el.id) !== normalizedId));
					const res = await listElectives(resolvedInstanceId);
					setElectives(normalizeElectives(res.data.items || res.data || []));
					showNotification('Elective deleted successfully');
				} catch (err) {
					const message = err?.response?.data?.error || err?.message || 'Unable to delete elective';
					showNotification(message, 'error');
				} finally {
					setDeletingId(null);
				}
		}

	const getGroupName = (groupId) => {
		if (!groupId && groupId !== 0) return '-';
		const matched = groups.find((g) => String(g.id) === String(groupId));
		if (matched) return matched.groupName;
		return String(groupId);
	};

	function triggerDelete(id, event) {
		event.preventDefault();
		event.stopPropagation();
		handleDelete(id);
	}

	return (
		<>
			{notification.show ? (
				<div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
					<span>{notification.message}</span>
					<button type="button" onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="ml-2 text-white/80 hover:text-white">✕</button>
				</div>
			) : null}
			<div className="mb-4 flex justify-end">
				<button onClick={() => openModal()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
					<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
					</svg>
					Add Elective
				</button>
			</div>

			<div className="overflow-x-auto rounded-xl border border-gray-200">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-blue-600">
						<tr>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">S.No</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Code</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Elective Name</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Group</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Division</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Max</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Pre-Req</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Comp. Prereq</th>
							<th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Sem</th>
							<th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-white">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{electives.length === 0 ? (
							<tr><td colSpan="10" className="py-10 text-center text-sm text-gray-500">No electives added yet</td></tr>
						) : (
							electives.map((el, i) => (
								<tr key={el.id ?? `${el.electiveCode}-${i}`} className={`transition-colors hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{i + 1}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900">{el.electiveCode}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{el.electiveName}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{getGroupName(el.groupId)}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{el.division}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{el.max}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{el.preReq}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{el.compulsoryPrereq ? 'Yes' : 'No'}</td>
									<td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">{el.sem}</td>
									<td className="whitespace-nowrap px-3 py-3 text-center flex gap-2 justify-center">
										<button type="button" onClick={() => openModal(el)} className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700" title="Edit">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											type="button"
											onClick={(e) => triggerDelete(el.id, e)}
											disabled={deletingId != null && String(deletingId) === String(el.id)}
											className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
											title="Remove"
										>
											<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{isModalOpen ? (
				<Modal title={editId ? 'Edit Elective' : 'Add Elective'} onClose={closeModal}>
					{error ? <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
					<form onSubmit={handleSubmit} className="space-y-4">
						<Field label="Elective Code *">
							<input type="text" value={form.electiveCode} onChange={(e) => setForm((p) => ({ ...p, electiveCode: e.target.value }))} className={inputCls} placeholder="e.g. CS601" required />
						</Field>
						<Field label="Elective Name *">
							<input type="text" value={form.electiveName} onChange={(e) => setForm((p) => ({ ...p, electiveName: e.target.value }))} className={inputCls} placeholder="e.g. Machine Learning" required />
						</Field>
						{/* <Field label="Elective Group *">
							<select value={form.groupId} onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))} className={inputCls} required>
								<option value="">Select group</option>
								{groups.map((g) => <option key={g.id} value={g.id}>{g.groupName}</option>)}
							</select>
						</Field> */}

						<Field label="Elective Group *">
							<select
								value={form.groupId}
								onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))}
								className={inputCls}
								required
							>
								<option value="">Select Elective Group</option>
								<option value="Elective-I">Elective-I</option>
								<option value="Elective-II">Elective-II</option>
								<option value="Elective-III">Elective-III</option>
								<option value="Elective-IV">Elective-IV</option>
								<option value="Elective-V">Elective-V</option>
								<option value="Elective-VI">Elective-VI</option>
								<option value="Elective-VII">Elective-VII</option>
								<option value="Elective-VIII">Elective-VIII</option>
							</select>
						</Field>

						<Field label="Division *">
							<input type="text" value={form.division} onChange={(e) => setForm((p) => ({ ...p, division: e.target.value }))} className={inputCls} placeholder="e.g. 1" required />
						</Field>
						<Field label="Max Strength *">
							<input type="number" value={form.max} onChange={(e) => setForm((p) => ({ ...p, max: e.target.value }))} className={inputCls} placeholder="e.g. 60" required min={1} />
						</Field>
						<Field label="Pre-requisite">
							<input type="text" value={form.preReq} onChange={(e) => setForm((p) => ({ ...p, preReq: e.target.value }))} className={inputCls} placeholder="e.g. None or course code" />
						</Field>
						<div className="flex gap-4">
							<label className="flex items-center gap-2">
								<input type="checkbox" checked={form.compulsoryPrereq} onChange={e => setForm(p => ({ ...p, compulsoryPrereq: e.target.checked }))} />
								Compulsory Prerequisite
							</label>
						</div>
						<Field label="Semester *">
							<select value={form.sem} onChange={(e) => setForm((p) => ({ ...p, sem: e.target.value }))} className={inputCls} required>
								<option value="">Select</option>
								<option value="1">1</option>
								<option value="2">2</option>
								<option value="3">3</option>
								<option value="4">4</option>
								<option value="5">5</option>
								<option value="6">6</option>
								<option value="7">7</option>
								<option value="8">8</option>
							</select>
						</Field>
						<ModalFooter onCancel={closeModal} submitLabel={editId ? 'Update Elective' : 'Add Elective'} />
					</form>
				</Modal>
			) : null}
		</>
	);
}

// ─── Allocation ──────────────────────────────────────────────────────────────

function AllocationTab() {
	const [students] = useState([]);
	const [electives] = useState([]);
	const [allocations, setAllocations] = useState([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
	const [form, setForm] = useState({ studentId: '', electiveId: '' });
	const [error, setError] = useState('');

	function openModal() { setForm({ studentId: '', electiveId: '' }); setError(''); setIsModalOpen(true); }
	function openSuccessModal() { setIsSuccessModalOpen(true); }
	function closeSuccessModal() { setIsSuccessModalOpen(false); }
	function closeModal() { setIsModalOpen(false); setError(''); }

	function handleSubmit(e) {
		e.preventDefault();
		if (!form.studentId) { setError('Please select a student'); return; }
		if (!form.electiveId) { setError('Please select an elective'); return; }
		const student = students.find((s) => s.id === Number(form.studentId));
		const elective = electives.find((el) => el.id === Number(form.electiveId));
		if (!student || !elective) { setError('Invalid selection'); return; }
		setAllocations((prev) => [...prev, { id: Date.now(), studentName: student.name, regNo: student.regNo, electiveName: `${elective.electiveCode} - ${elective.electiveName}` }]);
		closeModal();
	}

	function handleDelete(id) {
		if (!window.confirm('Remove this allocation?')) return;
		setAllocations((prev) => prev.filter((a) => a.id !== id));
	}

	return (
		<>
			<div className="mb-4 flex justify-end">
						<button onClick={openSuccessModal} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
					<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
					</svg>
					Allocate
				</button>
			</div>

			<div className="overflow-hidden rounded-xl border border-gray-200">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-blue-600">
						<tr>
							<th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">S.No</th>
							<th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Reg No</th>
							<th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Student Name</th>
							<th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Allocated Elective</th>
							<th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-white">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{allocations.length === 0 ? (
							<tr><td colSpan="5" className="py-10 text-center text-sm text-gray-500">No allocations done yet</td></tr>
						) : (
							allocations.map((a, i) => (
								<tr key={a.id} className={`transition-colors hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
									<td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700">{i + 1}</td>
									<td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-900">{a.regNo}</td>
									<td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700">{a.studentName}</td>
									<td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700">{a.electiveName}</td>
									<td className="whitespace-nowrap px-5 py-3 text-center">
										<button onClick={() => handleDelete(a.id)} className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700" title="Remove">
											<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{isModalOpen ? (
				<Modal title="Allocate Elective" onClose={closeModal}>
					{error ? <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
					<form onSubmit={handleSubmit} className="space-y-4">
						<Field label="Student *">
							<select value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))} className={inputCls} required>
								<option value="">Select student</option>
								{students.map((s) => <option key={s.id} value={s.id}>{s.regNo} — {s.name}</option>)}
							</select>
						</Field>
						<Field label="Elective *">
							<select value={form.electiveId} onChange={(e) => setForm((p) => ({ ...p, electiveId: e.target.value }))} className={inputCls} required>
								<option value="">Select elective</option>
								{electives.map((el) => <option key={el.id} value={el.id}>{el.electiveCode} — {el.electiveName}</option>)}
							</select>
						</Field>
						<ModalFooter onCancel={closeModal} submitLabel="Allocate" />
					</form>
				</Modal>
			) : null}

			{isSuccessModalOpen ? (
				<Modal title="Allocation" onClose={closeSuccessModal}>
					<div className="mb-4 text-sm text-gray-700">Allocation executed successfully.</div>
					<div className="flex justify-end pt-2">
						<button type="button" onClick={closeSuccessModal} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">OK</button>
					</div>
				</Modal>
			) : null}
		</>
	);
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputCls = 'block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, children }) {
	return (
		<div>
			<label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
			{children}
		</div>
	);
}

function ModalFooter({ onCancel, submitLabel }) {
	return (
		<div className="flex justify-end gap-3 pt-2">
			<button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
				Cancel
			</button>
			<button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
				{submitLabel}
			</button>
		</div>
	);
}

function Modal({ title, onClose, children }) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
			<div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
			<div className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
				<div className="flex items-center justify-between bg-blue-600 px-5 py-4">
					<h3 className="text-base font-medium text-white">{title}</h3>
					<button type="button" onClick={onClose} className="text-white hover:text-gray-200">
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div className="px-5 py-5">{children}</div>
			</div>
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ElectiveInstanceViewPage() {
	const navigate = useNavigate();
	const { instanceId } = useParams();
	const [instance, setInstance] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('students');

	useEffect(() => {
		async function load() {
			try {
				const response = await listAcademicYearInstances();
				const items = response.data.items || [];
				const found = items.find((item) => String(item.id) === String(instanceId));
				setInstance(found || null);
			} catch {
				setInstance(null);
			} finally {
				setIsLoading(false);
			}
		}
		load();
	}, [instanceId]);

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<p className="text-gray-500">Loading instance...</p>
			</div>
		);
	}

	if (!instance) {
		return (
			<div className="flex h-64 flex-col items-center justify-center gap-4">
				<p className="text-gray-500">Instance not found.</p>
				<button onClick={() => navigate('/elective-instance')} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
					Back to Instances
				</button>
			</div>
		);
	}

	const tabContent = {
		students: <StudentsTab instanceId={instanceId} />,
		groups: <GroupsTab instanceId={instanceId} openElectives={() => setActiveTab('electives')} />,
		electives: <ElectivesTab instanceId={instanceId} />,
		allocation: <AllocationTab />
	};

	return (
		<div className="space-y-6">
			{/* Breadcrumb / back */}
			<div className="flex items-center gap-2 text-sm text-gray-500">
				<button onClick={() => navigate('/elective-instance')} className="flex items-center gap-1 hover:text-blue-600">
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Elective Instances
				</button>
				<span>/</span>
				<span className="font-medium text-gray-800">{instance.title}</span>
			</div>

			{/* Instance info card */}
			<div className="overflow-hidden rounded-xl bg-white shadow-md">
				<div className="bg-blue-600 px-6 py-4">
					<h1 className="text-xl font-bold text-white">{instance.title}</h1>
					<p className="mt-0.5 text-sm text-blue-100">{instance.academicYear}</p>
				</div>
				<div className="grid grid-cols-2 gap-4 px-6 py-4 sm:grid-cols-4">
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-gray-400">Academic Year</p>
						<p className="mt-1 text-sm font-semibold text-gray-800">{instance.academicYear}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-gray-400">Start Date</p>
						<p className="mt-1 text-sm font-semibold text-gray-800">{formatDateOnly(instance.startDate)}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-gray-400">End Date</p>
						<p className="mt-1 text-sm font-semibold text-gray-800">{formatDateOnly(instance.endDate)}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-gray-400">Status</p>
						<span className={`mt-1 inline-flex rounded-full px-3 py-0.5 text-xs font-semibold ${instance.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
							{instance.isActive ? 'Active' : 'Inactive'}
						</span>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="overflow-hidden rounded-xl bg-white shadow-md">
				<div className="border-b border-gray-200">
					<nav className="flex overflow-x-auto">
						{TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`whitespace-nowrap border-b-2 px-6 py-3.5 text-lg font-bold transition-colors ${
									activeTab === tab.id
										? 'border-blue-600 text-blue-600'
										: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
								}`}
							>
								{tab.label}
							</button>
						))}
					</nav>
				</div>
				<div className="p-6">
					{tabContent[activeTab]}
				</div>
			</div>
		</div>
	);
}
