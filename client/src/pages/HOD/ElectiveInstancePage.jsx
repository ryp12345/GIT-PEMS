import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	activateAcademicYearInstance,
	createAcademicYearInstance,
	deleteAcademicYearInstance,
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

export default function ElectiveInstancePage() {
	const navigate = useNavigate();
	const [instances, setInstances] = useState([]);
	const [search, setSearch] = useState('');
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [form, setForm] = useState({ ...initialForm, academicYear: getCurrentAcademicYearLabel() });
	const [editingId, setEditingId] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
	const [page, setPage] = useState(1);
	const PAGE_SIZE = 10;

	useEffect(() => {
		loadInstances();
	}, []);

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

	function showNotification(message, type = 'success') {
		setNotification({ show: true, message, type });
		setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3500);
	}

	function onFieldChange(event) {
		const { name, value, type, checked } = event.target;
		setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
		if (error) setError('');
	}

	function closeModal() {
		setIsModalOpen(false);
		setEditingId(null);
		setForm({ ...initialForm, academicYear: getCurrentAcademicYearLabel() });
		setError('');
	}

	function openCreateModal() {
		closeModal();
		setIsModalOpen(true);
	}

	function openEditModal(instance) {
		setEditingId(instance.id);
		setForm({
			academicYear: instance.academicYear,
			title: instance.title,
			startDate: formatDateOnly(instance.startDate),
			endDate: formatDateOnly(instance.endDate),
			isActive: instance.isActive
		});
		setError('');
		setIsModalOpen(true);
	}

	async function onSubmit(event) {
		event.preventDefault();
		if (!form.academicYear.trim()) { setError('Academic year is required'); return; }
		if (!form.title.trim()) { setError('Instance title is required'); return; }

		setIsSubmitting(true);
		setError('');
		try {
			if (editingId) {
				await updateAcademicYearInstance(editingId, {
					academicYear: form.academicYear,
					title: form.title,
					startDate: formatDateOnly(form.startDate) || null,
					endDate: formatDateOnly(form.endDate) || null
				});
				if (form.isActive) await activateAcademicYearInstance(editingId);
				showNotification('Academic year instance updated successfully');
			} else {
				await createAcademicYearInstance({
					academicYear: form.academicYear,
					title: form.title,
					startDate: formatDateOnly(form.startDate) || null,
					endDate: formatDateOnly(form.endDate) || null,
					isActive: form.isActive
				});
				showNotification('Academic year instance created successfully');
			}
			closeModal();
			await loadInstances();
		} catch (requestError) {
			const message = requestError?.response?.data?.error || 'Unable to save instance';
			setError(message);
			showNotification(message, 'error');
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleActivate(id) {
		try {
			await activateAcademicYearInstance(id);
			showNotification('Active instance updated');
			await loadInstances();
		} catch (requestError) {
			showNotification(requestError?.response?.data?.error || 'Unable to activate instance', 'error');
		}
	}

	async function handleDelete(id) {
		if (!window.confirm('Delete this elective instance?')) return;
		try {
			await deleteAcademicYearInstance(id);
			showNotification('Elective instance deleted successfully');
			await loadInstances();
		} catch (requestError) {
			showNotification(requestError?.response?.data?.error || 'Unable to delete instance', 'error');
		}
	}

	const filtered = useMemo(() => {
		const sorted = [...instances].sort((a, b) => {
			if (a.isActive && !b.isActive) return -1;
			if (!a.isActive && b.isActive) return 1;
			return String(b.academicYear).localeCompare(String(a.academicYear));
		});
		const query = search.trim().toLowerCase();
		if (!query) return sorted;
		return sorted.filter((item) =>
			item.title?.toLowerCase().includes(query) ||
			item.academicYear?.toLowerCase().includes(query) ||
			(item.isActive ? 'active' : 'inactive').includes(query)
		);
	}, [instances, search]);

	const paginated = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;
		return filtered.slice(start, start + PAGE_SIZE);
	}, [filtered, page]);

	const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered]);
	const startEntry = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const endEntry = filtered.length === 0 ? 0 : Math.min(page * PAGE_SIZE, filtered.length);

	const visiblePages = useMemo(() => {
		const start = Math.max(1, Math.min(page - 1, totalPages - 2));
		const end = Math.min(totalPages, start + 2);
		return Array.from({ length: end - start + 1 }, (_, i) => start + i);
	}, [page, totalPages]);

	useEffect(() => { setPage(1); }, [search, instances]);

	return (
		<div className="space-y-6">
			{notification.show ? (
				<div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-all ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
					<span>{notification.message}</span>
					<button type="button" onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="ml-2 text-white/80 hover:text-white">
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				</div>
			) : null}

			<div className="mb-8 text-center">
				<h1 className="mb-2 text-3xl font-extrabold text-gray-900">Elective Instance</h1>
				<p className="text-base text-gray-600">Create, update and manage academic year elective instances</p>
			</div>

			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div className="relative w-full sm:w-80">
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search instances..."
						className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</div>
				<button
					onClick={openCreateModal}
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg sm:w-auto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
					</svg>
					Add Elective Instance
				</button>
			</div>

			<div className="overflow-hidden rounded-xl bg-white shadow-xl">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-blue-600">
							<tr>
								<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">S.No</th>
								<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">Title</th>
								<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">Academic Year</th>
								<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">Duration</th>
								<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-white">Status</th>
								<th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider text-white">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{isLoading ? (
								<tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
							) : filtered.length === 0 ? (
								<tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No elective instances found</td></tr>
							) : (
								paginated.map((item, index) => (
									<tr key={item.id} className={`transition-colors duration-150 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
										<td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{(page - 1) * PAGE_SIZE + index + 1}</td>
										<td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{item.title}</td>
										<td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{item.academicYear}</td>
										<td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
											{formatDateOnly(item.startDate) || '-'} to {formatDateOnly(item.endDate) || '-'}
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-sm">
											<span className={`rounded-full px-3 py-1 text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
												{item.isActive ? 'Active' : 'Inactive'}
											</span>
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
											<div className="flex items-center justify-center gap-2">
												<button
													type="button"
														onClick={() => navigate(`/elective-instance/${item.id}/view`)}
													className="rounded-lg bg-emerald-600 p-2 text-white transition-colors duration-200 hover:bg-emerald-700"
													title="View Instance"
												>
													<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
												</button>
												<button
													type="button"
													onClick={() => openEditModal(item)}
													className="rounded-lg bg-blue-600 p-2 text-white transition-colors duration-200 hover:bg-blue-700"
													title="Edit Instance"
												>
													<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
													</svg>
												</button>
												{!item.isActive ? (
													<button
														type="button"
														onClick={() => handleActivate(item.id)}
														className="rounded-lg bg-green-600 p-2 text-white transition-colors duration-200 hover:bg-green-700"
														title="Set as Active"
													>
														<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
														</svg>
													</button>
												) : null}
												<button
													type="button"
													onClick={() => handleDelete(item.id)}
													className="rounded-lg bg-red-600 p-2 text-white transition-colors duration-200 hover:bg-red-700"
													title="Delete Instance"
												>
													<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{filtered.length > 0 ? (
					<div className="flex flex-col gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-gray-600">Showing {startEntry} to {endEntry} of {filtered.length} entries</p>
						<div className="flex items-center gap-2">
							<button
								className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 disabled:opacity-50"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
							>
								Prev
							</button>
							{visiblePages.map((p) => (
								<button
									key={p}
									onClick={() => setPage(p)}
									className={`rounded border px-3 py-1 ${page === p ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700'}`}
								>
									{p}
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

			{isModalOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
					<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />
					<div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-lg bg-white text-left shadow-xl">
							<div className="bg-blue-600 px-6 py-4">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-medium leading-6 text-white">
										{editingId ? 'Edit Elective Instance' : 'Add Elective Instance'}
									</h3>
									<button type="button" className="text-white hover:text-gray-200" onClick={closeModal}>
										<svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							</div>

							<div className="bg-white px-6 py-5">
								{error ? (
									<div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
								) : null}

								<form className="space-y-5" onSubmit={onSubmit}>
									<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
										<div className="md:col-span-2">
											<label className="mb-2 block text-sm font-medium text-gray-700">Instance Title *</label>
											<input
												type="text"
												name="title"
												value={form.title}
												onChange={onFieldChange}
												placeholder="e.g. AY 2026-2027 Sem 5"
												className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
												required
											/>
										</div>

										<div>
											<label className="mb-2 block text-sm font-medium text-gray-700">Academic Year *</label>
											<input
												type="text"
												name="academicYear"
												value={form.academicYear}
												onChange={onFieldChange}
												placeholder="2026-2027"
												className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
												required
											/>
										</div>

										<div>
											<label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
											<input
												type="date"
												name="startDate"
												value={form.startDate}
												onChange={onFieldChange}
												className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>

										<div>
											<label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
											<input
												type="date"
												name="endDate"
												value={form.endDate}
												onChange={onFieldChange}
												className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>

										<div className="flex items-center gap-3 md:col-span-2">
											<input
												type="checkbox"
												name="isActive"
												id="isActive"
												checked={form.isActive}
												onChange={onFieldChange}
												className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<label htmlFor="isActive" className="text-sm font-medium text-gray-700">Set as active instance</label>
										</div>
									</div>

									<div className="flex justify-end gap-3 pt-2">
										<button
											type="button"
											onClick={closeModal}
											className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
										>
											Cancel
										</button>
										<button
											type="submit"
											disabled={isSubmitting}
											className="rounded-lg border border-transparent bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
										>
											{isSubmitting ? 'Saving...' : editingId ? 'Update Instance' : 'Create Instance'}
										</button>
									</div>
								</form>
							</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
