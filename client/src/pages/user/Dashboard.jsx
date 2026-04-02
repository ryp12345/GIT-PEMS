import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar, { menuLinks } from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function UserDashboard() {
	const { user } = useAuth();
	const location = useLocation();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const activeLink = menuLinks.find((item) => item.path === location.pathname) || menuLinks[0];
	const activeLabel = activeLink?.name || 'Dashboard';

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
						<section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
							<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
								<h2 className="text-xl font-semibold text-slate-900">{activeLabel}</h2>
								<div className="mt-6 min-h-[420px] rounded-2xl border border-dashed border-slate-300 bg-slate-50" />
							</div>
							<aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
								<h2 className="text-xl font-semibold text-slate-900">Quick Access</h2>
								<div className="mt-5 space-y-3">
									{menuLinks.map((item, index) => (
										<div
											key={item.path}
											className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
												item.path === location.pathname
													? 'border-slate-900 bg-slate-900 text-white'
													: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
											}`}
										>
											<span>
												<span className="block text-sm font-semibold">{index + 1}. {item.name}</span>
											</span>
											<span className="text-lg">›</span>
										</div>
									))}
								</div>
							</aside>
						</section>
					</div>
				</main>
			</div>
		</div>
	);
}
