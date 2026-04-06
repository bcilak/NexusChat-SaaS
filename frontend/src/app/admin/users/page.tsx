"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Trash2, Edit2, ShieldAlert, X } from "lucide-react";

interface UserData {
  id: number;
  name: string;
  email: string;
  plan: string;
  role: string;
  credits: number;
  can_use_api_tools: boolean;
  can_remove_branding: boolean;
  created_at: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    adminApi.getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handlePlanChange = async (userId: number, newPlan: string) => {
    try {
      await adminApi.updateUserPlan(userId, newPlan);
      setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
    } catch (error) {
      console.error("Failed to update plan", error);
    }
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const payload = {
        role: editingUser.role,
        plan: editingUser.plan,
        credits: editingUser.credits,
        can_use_api_tools: editingUser.can_use_api_tools,
        can_remove_branding: editingUser.can_remove_branding,
      };
      await adminApi.updateUser(editingUser.id, payload);
      setUsers(users.map(u => (u.id === editingUser.id ? editingUser : u)));
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kullanıcı Yönetimi</h1>
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-sm">
                <th className="p-4 font-semibold text-gray-500">ID</th>
                <th className="p-4 font-semibold text-gray-500">Ad Soyad</th>
                <th className="p-4 font-semibold text-gray-500">E-Posta</th>
                <th className="p-4 font-semibold text-gray-500">Kredi</th>
                <th className="p-4 font-semibold text-gray-500">Rol</th>
                <th className="p-4 font-semibold text-gray-500">Plan</th>
                <th className="p-4 font-semibold text-gray-500">Tarih</th>
                <th className="p-4 font-semibold text-gray-500 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm">{user.id}</td>
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4 text-sm">{user.email}</td>
                  <td className="p-4 text-sm font-semibold">{user.credits}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${user.role === 'admin' ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-gray-200 dark:bg-white/10'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={user.plan}
                      onChange={(e) => handlePlanChange(user.id, e.target.value)}
                      className="bg-gray-100 dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 text-sm rounded-lg px-2 py-1 outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {user.role !== 'admin' && (
                      <button className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Yasakla/Sil">
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0a0a1a] rounded-2xl w-full max-w-md border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
              <h3 className="font-semibold text-lg max-w-[80%] truncate">Kullanıcı Düzenle: {editingUser.name}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-gray-500 mb-1">Rol</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Plan</label>
                <select
                  value={editingUser.plan}
                  onChange={e => setEditingUser({ ...editingUser, plan: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 outline-none"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Kredi</label>
                <input
                  type="number"
                  value={editingUser.credits}
                  onChange={e => setEditingUser({ ...editingUser, credits: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 outline-none"
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-gray-700 dark:text-gray-200 font-medium">API Araçlarını Kullanabilir</span>
                <button
                  type="button"
                  onClick={() => setEditingUser({ ...editingUser, can_use_api_tools: !editingUser.can_use_api_tools })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingUser.can_use_api_tools ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingUser.can_use_api_tools ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-gray-700 dark:text-gray-200 font-medium">Markalamayı Kaldırabilir</span>
                <button
                  type="button"
                  onClick={() => setEditingUser({ ...editingUser, can_remove_branding: !editingUser.can_remove_branding })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingUser.can_remove_branding ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingUser.can_remove_branding ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <button
                onClick={handleSaveUser}
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
