import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
	activateAcademicYearInstance,
	createAcademicYearInstance,
	listAcademicYearInstances,
	updateAcademicYearInstance
} from '../../api/hod/instance.api';

const initialForm = {
	academicYear: '',
	title: '',
	startDate: '',
	endDate: '',
	isActive: false
};

const moduleTabs = [
	{ id: 'students', label: 'Students' },
	{ id: 'groups', label: 'Elective Groups' },
	{ id: 'electives', label: 'Electives' },
	{ id: 'allocation', label: 'Allocation' }
];

function getCurrentAcademicYearLabel() {
	const now = new Date();
	const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
	return `${year}-${year + 1}`;
}

function formatDateOnly(value) {
	if (!value) return '';
	return String(value).slice(0, 10);
}

export default function ElectiveInstancePage() {
	const navigate = useNavigate();
	const { instanceId } = useParams();
	const [form, setForm] = useState({
		...initialForm,
		academicYear: getCurrentAcademicYearLabel()
	});
	const [instances, setInstances] = useState([]);
	const [selectedInstance, setSelectedInstance] = useState(null);
	const [editingId, setEditingId] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [activeTab, setActiveTab] = useState('students');

	const [studentForm, setStudentForm] = useState({ regNo: '', name: '', email: '' });
	const [groupForm, setGroupForm] = useState({ groupName: '', semester: '' });
	const [electiveForm, setElectiveForm] = useState({ electiveCode: '', electiveName: '', groupId: '' });
	const [allocationForm, setAllocationForm] = useState({ studentId: '', electiveId: '' });

	const [studentsByInstance, setStudentsByInstance] = useState({});
	const [groupsByInstance, setGroupsByInstance] = useState({});
	const [electivesByInstance, setElectivesByInstance] = useState({});
	const [allocationsByInstance, setAllocationsByInstance] = useState({});

	const sortedInstances = useMemo(() => {
		return [...instances].sort((a, b) => {
			if (a.isActive && !b.isActive) return -1;
			if (!a.isActive && b.isActive) return 1;
			return String(b.academicYear).localeCompare(String(a.academicYear));
		});
	}, [instances]);

	const instanceKey = selectedInstance ? String(selectedInstance.id) : '';
	const students = instanceKey ? studentsByInstance[instanceKey] || [] : [];
	const groups = instanceKey ? groupsByInstance[instanceKey] || [] : [];
	const electives = instanceKey ? electivesByInstance[instanceKey] || [] : [];
	const allocations = instanceKey ? allocationsByInstance[instanceKey] || [] : [];

	async function loadInstances() {
		setIsLoading(true);
		setError('');
		try {
			const response = await listAcademicYearInstances();
			setInstances(response.data.items || []);
		} catch (requestError) {
			setError(requestError?.response?.data?.error || 'Failed to load instances');
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		loadInstances();
	}, []);

	useEffect(() => {
		if (!instanceId) {
			setSelectedInstance(null);
			return;
		}

		const match = instances.find((item) => String(item.id) === String(instanceId));
		if (match) {
			setSelectedInstance(match);
			setError('');
		} else if (!isLoading) {
			setSelectedInstance(null);
			setError('Requested instance was not found for your department');
		}
	}, [instanceId, instances, isLoading]);

	function onFieldChange(event) {
		const { name, value, type, checked } = event.target;
		setForm((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value
		}));
	}

	function startEdit(instance) {
		setEditingId(instance.id);
		setForm({
			academicYear: instance.academicYear,
			title: instance.title,
			startDate: formatDateOnly(instance.startDate),
			endDate: formatDateOnly(instance.endDate),
			isActive: instance.isActive
		});
		setError('');
		setSuccess('');
	}

	function resetForm() {
		setEditingId(null);
		setForm({
			...initialForm,
			academicYear: getCurrentAcademicYearLabel()
		});
	}

	async function onSubmit(event) {
		event.preventDefault();
		setError('');
		setSuccess('');

		try {
			if (editingId) {
				await updateAcademicYearInstance(editingId, {
					academicYear: form.academicYear,
					title: form.title,
					startDate: formatDateOnly(form.startDate) || null,
					endDate: formatDateOnly(form.endDate) || null
				});
				if (form.isActive) {
					await activateAcademicYearInstance(editingId);
				}
				setSuccess('Academic year instance updated');
			} else {
				await createAcademicYearInstance({
					academicYear: form.academicYear,
					title: form.title,
					startDate: formatDateOnly(form.startDate) || null,
					endDate: formatDateOnly(form.endDate) || null,
					isActive: form.isActive
				});
				setSuccess('Academic year instance created');
			}

			resetForm();
			await loadInstances();
		} catch (requestError) {
			setError(requestError?.response?.data?.error || 'Unable to save instance');
		}
	}

	async function activateInstance(id) {
		setError('');
		setSuccess('');
		try {
			await activateAcademicYearInstance(id);
			setSuccess('Active instance updated');
			await loadInstances();
		} catch (requestError) {
			setError(requestError?.response?.data?.error || 'Unable to activate instance');
		}
	}

	function viewInstance(instance) {
		navigate(`/elective-instance/${instance.id}`);
		setError('');
		setSuccess('');
	}

	function addStudent(event) {
		event.preventDefault();
		if (!instanceKey) return;
		const nextStudent = {
			id: Date.now(),
			regNo: studentForm.regNo.trim(),
			name: studentForm.name.trim(),
			email: studentForm.email.trim()
		};
		if (!nextStudent.regNo || !nextStudent.name) {
			setError('Registration number and student name are required');
			return;
		}
		setStudentsByInstance((prev) => ({
			...prev,
			[instanceKey]: [...(prev[instanceKey] || []), nextStudent]
		}));
		setStudentForm({ regNo: '', name: '', email: '' });
		setSuccess('Student added for this instance');
		setError('');
	}

	function addGroup(event) {
		event.preventDefault();
		if (!instanceKey) return;
		const nextGroup = {
			id: Date.now(),
			groupName: groupForm.groupName.trim(),
			semester: groupForm.semester.trim()
		};
		if (!nextGroup.groupName || !nextGroup.semester) {
			setError('Group name and semester are required');
			return;
		}
		setGroupsByInstance((prev) => ({
			...prev,
			[instanceKey]: [...(prev[instanceKey] || []), nextGroup]
		}));
		setGroupForm({ groupName: '', semester: '' });
		setSuccess('Elective group added');
		setError('');
	}

	function addElective(event) {
		event.preventDefault();
		if (!instanceKey) return;
		const nextElective = {
			id: Date.now(),
			electiveCode: electiveForm.electiveCode.trim(),
			electiveName: electiveForm.electiveName.trim(),
			groupId: Number(electiveForm.groupId)
		};
		if (!nextElective.electiveCode || !nextElective.electiveName || !nextElective.groupId) {
			setError('Elective code, elective name and group are required');
			return;
		}
		setElectivesByInstance((prev) => ({
			...prev,
			[instanceKey]: [...(prev[instanceKey] || []), nextElective]
		}));
		setElectiveForm({ electiveCode: '', electiveName: '', groupId: '' });
		setSuccess('Elective added to group');
		setError('');
	}

	function allocateElective(event) {
		event.preventDefault();
		if (!instanceKey) return;
		const studentId = Number(allocationForm.studentId);
		const electiveId = Number(allocationForm.electiveId);
		if (!studentId || !electiveId) {
			setError('Select both student and elective for allocation');
			return;
		}
		const student = students.find((item) => item.id === studentId);
		const elective = electives.find((item) => item.id === electiveId);
		if (!student || !elective) {
			setError('Invalid allocation data');
			return;
		}
		const nextAllocation = {
			id: Date.now(),
			studentId,
			electiveId,
			studentName: student.name,
			electiveName: `${elective.electiveCode} - ${elective.electiveName}`
		};
		setAllocationsByInstance((prev) => ({
			...prev,
			[instanceKey]: [...(prev[instanceKey] || []), nextAllocation]
		}));
		setAllocationForm({ studentId: '', electiveId: '' });
		setSuccess('Elective allocated to student');
		setError('');
	}

	function renderInstanceWorkArea() {
		if (!selectedInstance) return null;

		return (
			<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="text-lg font-semibold text-slate-900">Manage Instance: {selectedInstance.title}</h3>
						<p className="mt-1 text-sm text-slate-600">{selectedInstance.academicYear} | {formatDateOnly(selectedInstance.startDate) || '-'} to {formatDateOnly(selectedInstance.endDate) || '-'}</p>
					</div>
					<button
						type="button"
						onClick={() => navigate('/elective-instance')}
						className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
					>
						Change Instance
					</button>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					{moduleTabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
								activeTab === tab.id
									? 'bg-slate-900 text-white'
									: 'border border-slate-300 text-slate-700 hover:bg-slate-50'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{activeTab === 'students' ? (
					<div className="mt-6 grid gap-6 lg:grid-cols-2">
						<form className="space-y-3" onSubmit={addStudent}>
							<h4 className="text-sm font-semibold text-slate-800">Add Student</h4>
							<input type="text" placeholder="Registration No" value={studentForm.regNo} onChange={(e) => setStudentForm((prev) => ({ ...prev, regNo: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
							<input type="text" placeholder="Student Name" value={studentForm.name} onChange={(e) => setStudentForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
							<input type="email" placeholder="Email" value={studentForm.email} onChange={(e) => setStudentForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
							<button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Add Student</button>
						</form>
						<div>
							<h4 className="text-sm font-semibold text-slate-800">Students ({students.length})</h4>
							<div className="mt-3 max-h-56 space-y-2 overflow-auto rounded-lg border border-slate-200 p-3">
								{students.length === 0 ? <p className="text-xs text-slate-500">No students added yet.</p> : students.map((student) => (
									<div key={student.id} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
										{student.regNo} | {student.name}
									</div>
								))}
							</div>
						</div>
					</div>
				) : null}

				{activeTab === 'groups' ? (
					<div className="mt-6 grid gap-6 lg:grid-cols-2">
						<form className="space-y-3" onSubmit={addGroup}>
							<h4 className="text-sm font-semibold text-slate-800">Create Elective Group</h4>
							<input type="text" placeholder="Group Name" value={groupForm.groupName} onChange={(e) => setGroupForm((prev) => ({ ...prev, groupName: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
							<input type="text" placeholder="Semester (e.g. 5)" value={groupForm.semester} onChange={(e) => setGroupForm((prev) => ({ ...prev, semester: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
							<button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Add Group</button>
						</form>
						<div>
							<h4 className="text-sm font-semibold text-slate-800">Groups ({groups.length})</h4>
							<div className="mt-3 max-h-56 space-y-2 overflow-auto rounded-lg border border-slate-200 p-3">
								{groups.length === 0 ? <p className="text-xs text-slate-500">No groups added yet.</p> : groups.map((group) => (
									<div key={group.id} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
										{group.groupName} | Semester {group.semester}
									</div>
								))}
							</div>
						</div>
					</div>
				) : null}

				{activeTab === 'electives' ? (
					<div className="mt-6 grid gap-6 lg:grid-cols-2">
						<form className="space-y-3" onSubmit={addElective}>
							<h4 className="text-sm font-semibold text-slate-800">Add Elective to Group</h4>
							<input type="text" placeholder="Elective Code" value={electiveForm.electiveCode} onChange={(e) => setElectiveForm((prev) => ({ ...prev, electiveCode: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
							<input type="text" placeholder="Elective Name" value={electiveForm.electiveName} onChange={(e) => setElectiveForm((prev) => ({ ...prev, electiveName: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
							<select value={electiveForm.groupId} onChange={(e) => setElectiveForm((prev) => ({ ...prev, groupId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
								<option value="">Select Group</option>
								{groups.map((group) => (
									<option key={group.id} value={group.id}>{group.groupName} (Sem {group.semester})</option>
								))}
							</select>
							<button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Add Elective</button>
						</form>
						<div>
							<h4 className="text-sm font-semibold text-slate-800">Electives ({electives.length})</h4>
							<div className="mt-3 max-h-56 space-y-2 overflow-auto rounded-lg border border-slate-200 p-3">
								{electives.length === 0 ? <p className="text-xs text-slate-500">No electives added yet.</p> : electives.map((elective) => {
									const group = groups.find((item) => item.id === elective.groupId);
									return (
										<div key={elective.id} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
											{elective.electiveCode} | {elective.electiveName} | {group ? group.groupName : 'Group not found'}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				) : null}

				{activeTab === 'allocation' ? (
					<div className="mt-6 grid gap-6 lg:grid-cols-2">
						<form className="space-y-3" onSubmit={allocateElective}>
							<h4 className="text-sm font-semibold text-slate-800">Allocate Elective</h4>
							<select value={allocationForm.studentId} onChange={(e) => setAllocationForm((prev) => ({ ...prev, studentId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
								<option value="">Select Student</option>
								{students.map((student) => (
									<option key={student.id} value={student.id}>{student.regNo} - {student.name}</option>
								))}
							</select>
							<select value={allocationForm.electiveId} onChange={(e) => setAllocationForm((prev) => ({ ...prev, electiveId: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
								<option value="">Select Elective</option>
								{electives.map((elective) => (
									<option key={elective.id} value={elective.id}>{elective.electiveCode} - {elective.electiveName}</option>
								))}
							</select>
							<button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Allocate</button>
						</form>
						<div>
							<h4 className="text-sm font-semibold text-slate-800">Allocations ({allocations.length})</h4>
							<div className="mt-3 max-h-56 space-y-2 overflow-auto rounded-lg border border-slate-200 p-3">
								{allocations.length === 0 ? <p className="text-xs text-slate-500">No allocations done yet.</p> : allocations.map((allocation) => (
									<div key={allocation.id} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
										{allocation.studentName} {'->'} {allocation.electiveName}
									</div>
								))}
							</div>
						</div>
					</div>
				) : null}
			</section>
		);
	}

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-xl font-semibold text-slate-900">Elective Instance</h2>
						<p className="mt-1 text-sm text-slate-600">
							Manage academic year instances and run all elective operations from each selected instance.
						</p>
					</div>
				</div>

				<form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">Academic Year</span>
						<input type="text" name="academicYear" placeholder="2026-2027" value={form.academicYear} onChange={onFieldChange} required className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-600" />
					</label>

					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">Instance Title</span>
						<input type="text" name="title" placeholder="AY 2026-2027" value={form.title} onChange={onFieldChange} required className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-600" />
					</label>

					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">Start Date</span>
						<input type="date" name="startDate" value={form.startDate} onChange={onFieldChange} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-600" />
					</label>

					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">End Date</span>
						<input type="date" name="endDate" value={form.endDate} onChange={onFieldChange} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-600" />
					</label>

					<label className="flex items-center gap-2 md:col-span-2">
						<input type="checkbox" name="isActive" checked={form.isActive} onChange={onFieldChange} className="h-4 w-4" />
						<span className="text-sm text-slate-700">Set as active instance</span>
					</label>

					<div className="flex gap-3 md:col-span-2">
						<button type="submit" className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
							{editingId ? 'Update Instance' : 'Create Instance'}
						</button>
						{editingId ? (
							<button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
								Cancel Edit
							</button>
						) : null}
					</div>
				</form>

				{error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
				{success ? <p className="mt-4 text-sm text-green-700">{success}</p> : null}
			</section>

			{renderInstanceWorkArea()}

			<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 className="text-lg font-semibold text-slate-900">Existing Instances</h3>
				{isLoading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

				{!isLoading && sortedInstances.length === 0 ? (
					<p className="mt-4 text-sm text-slate-600">No academic year instances found.</p>
				) : null}

				{sortedInstances.length > 0 ? (
					<div className="mt-4 overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200 text-left text-sm">
							<thead className="bg-slate-50 text-slate-700">
								<tr>
									<th className="px-4 py-3 font-semibold">Academic Year</th>
									<th className="px-4 py-3 font-semibold">Title</th>
									<th className="px-4 py-3 font-semibold">Duration</th>
									<th className="px-4 py-3 font-semibold">Status</th>
									<th className="px-4 py-3 font-semibold">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 text-slate-700">
								{sortedInstances.map((item) => (
									<tr key={item.id}>
										<td className="px-4 py-3 font-medium">{item.academicYear}</td>
										<td className="px-4 py-3">{item.title}</td>
										<td className="px-4 py-3">{formatDateOnly(item.startDate) || '-'} to {formatDateOnly(item.endDate) || '-'}</td>
										<td className="px-4 py-3">
											<span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
												{item.isActive ? 'Active' : 'Inactive'}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex gap-2">
												<button type="button" onClick={() => viewInstance(item)} className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">View</button>
												<button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
												{!item.isActive ? (
													<button type="button" onClick={() => activateInstance(item.id)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">Set Active</button>
												) : null}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</section>
		</div>
	);
}
