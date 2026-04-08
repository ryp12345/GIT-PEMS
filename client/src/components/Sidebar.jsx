import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const menuLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Elective Instance', path: '/elective-instance', icon: '🗂️' },
  { name: 'Statistics', path: '/elective-stats', icon: '📈' },
  { name: 'Elective Students', path: '/elective-students', icon: '👥' }
];

export { menuLinks };

export default function Sidebar({ isOpen, onClose, user }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarWidth = isExpanded ? 'lg:w-64' : 'lg:w-20';
  const drawerClasses = isOpen ? 'translate-x-0' : '-translate-x-full';

  const handleNavigate = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex min-h-full w-64 transform flex-col bg-slate-800 text-white shadow-lg transition-all duration-300 ${drawerClasses} ${sidebarWidth} lg:static lg:translate-x-0`}
        style={{ backgroundColor: '#001f3f' }}
      >
        <div className="flex flex-col items-center justify-center border-b border-white/10 px-4 pt-6 pb-3">
          <img src="/git_logo.jpg" alt="Git logo" className="mb-2 h-16 w-16 rounded-md bg-white object-contain ring-1 ring-slate-200" />
          {isExpanded && <span className="text-xl font-bold tracking-wide">PEMS</span>}
        </div>

        <div className="flex items-center justify-between px-4 pt-4 pb-2 lg:justify-end">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="hidden text-slate-300 transition hover:text-white focus:outline-none lg:block"
            aria-label="Toggle sidebar"
          >
            <span className="text-xl select-none">• • •</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3 pb-4">
          {menuLinks.map((link) => {
            const isActive = link.path === '/elective-instance'
    				? location.pathname.startsWith('/elective-instance')
    				: location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                title={!isExpanded ? link.name : ''}
                onClick={handleNavigate}
                className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-semibold transition duration-200 ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-200 hover:bg-slate-700/70'
                } ${isExpanded ? '' : 'lg:justify-center lg:px-2'}`}
              >
                <span className="text-xl">{link.icon}</span>
                {isExpanded && (
                  <span className="flex-1 overflow-hidden">
                    <span className="block truncate">{link.name.toUpperCase()}</span>
                    <span className={`mt-1 block truncate text-[11px] font-medium ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                      {link.description}
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

      </aside>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
      )}
    </>
  );
}