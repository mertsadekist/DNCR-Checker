import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CallLogs from './components/CallLogs';
import Settings from './components/Settings';
import ApiLogs from './components/ApiLogs';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import { AppView, CheckRecord } from './types';
import { User, fetchCurrentUser, logout } from './services/authService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    fetchCurrentUser().then(u => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  // Shared State with LocalStorage Persistence for history
  const [history, setHistory] = useState<CheckRecord[]>(() => {
    try {
      const saved = localStorage.getItem('safecall_history');
      if (saved) {
        return JSON.parse(saved, (key, value) => {
          if (key === 'timestamp') return new Date(value);
          return value;
        });
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('safecall_history', JSON.stringify(history));
  }, [history]);

  const handleCheckComplete = (record: CheckRecord) => {
    setHistory(prev => [record, ...prev]);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleLogin = (u: User) => {
    setUser(u);
  };

  // Enforce role-based view access
  const handleNavigate = (view: AppView) => {
    if (user?.role === 'EMPLOYEE' && (view === 'api_logs' || view === 'settings' || view === 'users')) {
      return; // Block
    }
    setCurrentView(view);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard history={history} onCheckComplete={handleCheckComplete} userName={user.name} />;
      case 'logs':
        return <CallLogs history={history} userRole={user.role} />;
      case 'api_logs':
        return user.role === 'ADMIN' ? <ApiLogs /> : null;
      case 'settings':
        return user.role === 'ADMIN' ? <Settings /> : null;
      case 'users':
        return user.role === 'ADMIN' ? <UserManagement /> : null;
      default:
        return <Dashboard history={history} onCheckComplete={handleCheckComplete} userName={user.name} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} user={user} onLogout={handleLogout} />
      <main className="flex-1 ml-64 overflow-y-auto h-screen flex flex-col">
        <div className="flex-1">{renderContent()}</div>
        <footer className="py-6 text-center">
          <p className="text-gray-400 text-sm font-medium">Developed by mert sadek</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
