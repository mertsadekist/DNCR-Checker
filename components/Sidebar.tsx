import React from 'react';
import { Shield, Home, Settings, HelpCircle, PhoneCall, Database, Users, LogOut } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  user: { name: string; email: string; role: string };
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, user, onLogout }) => {
  const isAdmin = user.role === 'ADMIN';

  const getLinkClass = (view: AppView) => {
    const isActive = currentView === view;
    return isActive
      ? "flex items-center gap-3 px-4 py-3 bg-slate-800 text-emerald-400 rounded-lg border-l-4 border-emerald-500 transition-all w-full text-left"
      : "flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all w-full text-left border-l-4 border-transparent";
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-10">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
             <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">DNCR Checker</h1>
            <p className="text-xs text-slate-400">Compliance Tool</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button onClick={() => onNavigate('dashboard')} className={getLinkClass('dashboard')}>
          <Home className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </button>

        <button onClick={() => onNavigate('logs')} className={getLinkClass('logs')}>
          <PhoneCall className="w-5 h-5" />
          <span className="font-medium">Call Logs</span>
        </button>

        {isAdmin && (
          <>
            <button onClick={() => onNavigate('api_logs')} className={getLinkClass('api_logs')}>
              <Database className="w-5 h-5" />
              <span className="font-medium">API Logs</span>
            </button>

            <button onClick={() => onNavigate('users')} className={getLinkClass('users')}>
              <Users className="w-5 h-5" />
              <span className="font-medium">User Management</span>
            </button>

            <button onClick={() => onNavigate('settings')} className={getLinkClass('settings')}>
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors w-full text-left">
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm">Help & Documentation</span>
        </button>
        <div className="mt-4 pt-4 border-t border-slate-700 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
              {initials}
            </div>
            <div className="text-sm flex-1">
              <p className="text-white">{user.name}</p>
              <p className="text-slate-500 text-xs">{user.role === 'ADMIN' ? 'Administrator' : 'Employee'}</p>
            </div>
            <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
