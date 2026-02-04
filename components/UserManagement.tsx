import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, KeyRound, Loader2, X } from 'lucide-react';
import { getAuthHeaders } from '../services/authService';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' as const });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/users', { headers: getAuthHeaders() });
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'EMPLOYEE' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: UserRecord) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ name: formData.name, email: formData.email, role: formData.role }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      } else {
        if (!formData.password) { setError('Password is required'); setSaving(false); return; }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(formData),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      }
      setShowModal(false);
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    await fetch(`/api/users/${user.id}/toggle-active`, { method: 'PATCH', headers: getAuthHeaders() });
    fetchUsers();
  };

  const handleDelete = async (user: UserRecord) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;
    await fetch(`/api/users/${user.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    fetchUsers();
  };

  const handleResetPassword = async () => {
    if (!newPassword || !showResetModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${showResetModal}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setShowResetModal(null);
      setNewPassword('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-gray-500 mt-2">Manage system users and their access levels.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditModal(user)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Edit">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowResetModal(user.id); setNewPassword(''); setError(''); }} className="p-2 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50" title="Reset Password">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleActive(user)} className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50" title={user.isActive ? 'Disable' : 'Enable'}>
                        {user.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value as any }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900">
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
              <button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Reset Password</h3>
              <button onClick={() => setShowResetModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-900" />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
              <button onClick={handleResetPassword} disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
