"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Trash2, Edit2, ShieldAlert } from "lucide-react";

interface UserData {
  id: number;
  name: string;
  email: string;
  plan: string;
  role: string;
  created_at: string;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

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
                    <button className="p-2 text-gray-400 hover:text-indigo-500 transition-colors" title="Düzenle">
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
    </div>
  );
}
