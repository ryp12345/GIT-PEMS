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

function getCurrentAcademicYearLabel() {
	const now = new Date();
	const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
	return `${year}-${year + 1}`;
}

function formatDateOnly(value) {
	if (!value) return '';
	return String(value).slice(0, 10);
}

export default function AcademicYearInstances() {
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

	const sortedInstances = useMemo(() => {
		return [...instances].sort((a, b) => {
			if (a.isActive && !b.isActive) return -1;
			if (!a.isActive && b.isActive) return 1;
			return String(b.academicYear).localeCompare(String(a.academicYear));
		});
	}, [instances]);

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

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-xl font-semibold text-slate-900">Academic Year Instances</h2>
						<p className="mt-1 text-sm text-slate-600">
							Create one instance for each academic year and set one active for current allocation.
						</p>
					</div>
				</div>

				<form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">Academic Year</span>
						<input
							type="text"
							name="academicYear"
							placeholder="2026-2027"
							value={form.academicYear}
							onChange={onFieldChange}
							required
							className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-600"
						/>
					</label>

					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">Instance Title</span>
						<input
							type="text"
							name="title"
							placeholder="AY 2026-2027"
							value={form.title}
							onChange={onFieldChange}
							required
							className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-600"
						/>
					</label>

					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">Start Date</span>
						<input
							type="date"
							name="startDate"
							value={form.startDate}
							onChange={onFieldChange}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-600"
						/>
					</label>

					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">End Date</span>
						<input
							type="date"
							name="endDate"
							value={form.endDate}
							onChange={onFieldChange}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-600"
						/>
					</label>

					<label className="flex items-center gap-2 md:col-span-2">
						<input
							type="checkbox"
							name="isActive"
							checked={form.isActive}
							onChange={onFieldChange}
							className="h-4 w-4"
						/>
						<span className="text-sm text-slate-700">Set as active instance</span>
					</label>

					<div className="flex gap-3 md:col-span-2">
						<button
							type="submit"
							className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
						>
							{editingId ? 'Update Instance' : 'Create Instance'}
						</button>
						{editingId ? (
							<button
								type="button"
								onClick={resetForm}
								className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
							>
								Cancel Edit
							</button>
						) : null}
					</div>
				</form>

				{error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
				{success ? <p className="mt-4 text-sm text-green-700">{success}</p> : null}
			</section>

			{selectedInstance ? (
				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-lg font-semibold text-slate-900">Instance Details</h3>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => startEdit(selectedInstance)}
								className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
							>
								Edit This Instance
							</button>
							<button
								type="button"
								onClick={() => navigate('/elective-instance')}
								className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
							>
								Back to All Instances
							</button>
						</div>
					</div>
					<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div className="rounded-xl bg-slate-50 px-4 py-3">
							<p className="text-xs font-semibold uppercase text-slate-500">Academic Year</p>
							<p className="mt-1 text-sm font-semibold text-slate-800">{selectedInstance.academicYear}</p>
						</div>
						<div className="rounded-xl bg-slate-50 px-4 py-3">
							<p className="text-xs font-semibold uppercase text-slate-500">Title</p>
							<p className="mt-1 text-sm font-semibold text-slate-800">{selectedInstance.title}</p>
						</div>
						<div className="rounded-xl bg-slate-50 px-4 py-3">
							<p className="text-xs font-semibold uppercase text-slate-500">Start Date</p>
							<p className="mt-1 text-sm font-semibold text-slate-800">{formatDateOnly(selectedInstance.startDate) || '-'}</p>
						</div>
						<div className="rounded-xl bg-slate-50 px-4 py-3">
							<p className="text-xs font-semibold uppercase text-slate-500">End Date</p>
							<p className="mt-1 text-sm font-semibold text-slate-800">{formatDateOnly(selectedInstance.endDate) || '-'}</p>
						</div>
					</div>
					<div className="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
						Status: {selectedInstance.isActive ? 'Active' : 'Inactive'}
					</div>
				</section>
			) : null}

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
										<td className="px-4 py-3">
											{formatDateOnly(item.startDate) || '-'} to {formatDateOnly(item.endDate) || '-'}
										</td>
										<td className="px-4 py-3">
											<span
												className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
													item.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
												}`}
											>
												{item.isActive ? 'Active' : 'Inactive'}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex gap-2">
												<button
													type="button"
													onClick={() => viewInstance(item)}
													className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
												>
													View
												</button>
												<button
													type="button"
													onClick={() => startEdit(item)}
													className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
												>
													Edit
												</button>
												{!item.isActive ? (
													<button
														type="button"
														onClick={() => activateInstance(item.id)}
														className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
													>
														Set Active
													</button>
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
