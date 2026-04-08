import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar, { menuLinks } from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import ElectiveInstancePage from './ElectiveInstancePage';
import ElectiveInstanceViewPage from './ElectiveInstanceViewPage';
import StatsPage from './StatsPage';
import ElectiveStudentsPage from './ElectiveStudentsPage';

function DashboardPlaceholder({ title }) {
	return (
		<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 className="text-xl font-semibold text-slate-900">{title}</h2>
			<div className="mt-6 min-h-[420px] rounded-2xl border border-dashed border-slate-300 bg-slate-50" />
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

		if (location.pathname === '/elective-students') {
			return <ElectiveStudentsPage />;
		}

		return <DashboardPlaceholder title={activeLabel} />;
	}

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
