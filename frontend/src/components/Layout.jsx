import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, LayoutDashboard, Search, Building2, GraduationCap,
  FileCheck, AlertTriangle, Users, LogOut, Menu, X, ChevronRight, Bell
} from 'lucide-react';

const NAV_ITEMS = {
  admin: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/verify', label: 'Verify Certificate', icon: Search },
    { path: '/verifications', label: 'Verification History', icon: FileCheck },
    { path: '/institutions', label: 'Institutions', icon: Building2 },
    { path: '/certificates', label: 'Certificates', icon: GraduationCap },
    { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  ],
  verifier: [
    { path: '/verify', label: 'Verify Certificate', icon: Search },
    { path: '/verifications', label: 'My Verifications', icon: FileCheck },
    { path: '/institutions', label: 'Institutions', icon: Building2 },
  ],
  institution: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/certificates', label: 'My Certificates', icon: GraduationCap },
    { path: '/verify', label: 'Verify Certificate', icon: Search },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.verifier;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-sm tracking-wide">DegreeGuard</span>
              <span className="block text-[10px] text-slate-500 tracking-widest uppercase">Document Authenticator</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={18} className={active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-400'} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto text-brand-500/50" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/20 rounded-full flex items-center justify-center text-brand-400 text-xs font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user?.full_name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 px-4 lg:px-6 h-14 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            System Online
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
