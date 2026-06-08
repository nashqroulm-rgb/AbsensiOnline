import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Clock, User } from 'lucide-react';
import { cn } from '../../utils/cn';

const tabs = [
  { path: '/app/home', id: 'home' as const, label: 'Beranda', icon: Home },
  { path: '/app/history', id: 'history' as const, label: 'Riwayat', icon: Clock },
  { path: '/app/profile', id: 'profile' as const, label: 'Profil', icon: User },
];

export default function PWALayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-[#F3F4F6] relative">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-30 safe-area-pb">
        <div className="flex">
          {tabs.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
            return (
              <NavLink
                key={path}
                to={path}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors',
                  isActive ? 'text-green-600' : 'text-gray-400',
                )}
              >
                <Icon size={22} className={isActive ? 'stroke-[2.5]' : ''} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
