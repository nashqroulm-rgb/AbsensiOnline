import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, MapPin, Calendar, FileBarChart, Menu, X, MapPinned, LogOut, ChevronDown, Bell, Smartphone, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';

const navItems: { path: string; label: string; icon: React.ElementType }[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/workers', label: 'Pekerja', icon: Users },
  { path: '/admin/shifts', label: 'Shift', icon: Clock },
  { path: '/admin/zones', label: 'Zona', icon: MapPin },
  { path: '/admin/attendance', label: 'Kehadiran', icon: Calendar },
  { path: '/admin/reports', label: 'Laporan', icon: FileBarChart },
  { path: '/admin/settings', label: 'Pengaturan', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const notifCount = 0;

  const activeLabel = navItems.find((n) => location.pathname.startsWith(n.path))?.label ?? 'Admin';

  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">
      <aside className={cn(
        'flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-40 flex-shrink-0',
        sidebarOpen ? 'w-[178px]' : 'w-16',
        'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:shadow-xl',
        !sidebarOpen && 'max-md:hidden'
      )}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 min-h-[60px]">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <MapPinned size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-gray-900 text-sm leading-none">AbsensiOnline</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Admin Panel</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
              className={({ isActive }) => cn(
                'w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg transition-colors mb-0.5',
                sidebarOpen ? 'w-[calc(100%-8px)]' : 'w-10 justify-center',
                isActive
                  ? 'bg-[#F0FDF4] text-green-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span className="text-sm truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50">
              <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.nama?.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{user?.nama}</p>
                <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
              </div>
              <button onClick={() => { logout(); navigate('/login', { replace: true }); }} title="Logout" className="text-gray-400 hover:text-red-500 transition-colors">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">{activeLabel}</h1>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/home')}
              title="Lihat tampilan pekerja"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Smartphone size={13} /> PWA View
            </button>
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.nama?.slice(0, 1)}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-gray-900">{user?.nama}</p>
                <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
