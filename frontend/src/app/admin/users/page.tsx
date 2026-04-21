"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Trash2, Edit2, X, UserPlus, ShieldCheck, ShieldOff, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UserData {
  id: number;
  name: string;
  email: string;
  plan: string;
  role: string;
  credits: number;
  can_use_api_tools: boolean;
  can_remove_branding: boolean;
  can_create_users: boolean;
  parent_id: number | null;
  created_at: string;
}

const EMPTY_CREATE = {
  name: "",
  email: "",
  password: "",
  plan: "free",
  role: "user",
  credits: 500,
  can_use_api_tools: false,
  can_remove_branding: false,
  can_create_users: false,
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = () => {
    setLoading(true);
    adminApi.getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // ---------- Create ----------
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const newUser = await adminApi.createUser(createForm);
      setUsers(prev => [...prev, newUser]);
      setIsCreateOpen(false);
      setCreateForm({ ...EMPTY_CREATE });
    } catch (err: unknown) {
      setCreateError((err as Error).message || "Bir hata oluştu");
    } finally {
      setCreateLoading(false);
    }
  };

  // ---------- Edit ----------
  const openEdit = (user: UserData) => { setEditingUser({ ...user }); setIsEditOpen(true); };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      await adminApi.updateUser(editingUser.id, {
        role: editingUser.role,
        plan: editingUser.plan,
        credits: editingUser.credits,
        can_use_api_tools: editingUser.can_use_api_tools,
        can_remove_branding: editingUser.can_remove_branding,
        can_create_users: editingUser.can_create_users,
      });
      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
      setIsEditOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (userId: number) => {
    try {
      await adminApi.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const planColors: Record<string, string> = {
    free: "bg-gray-100 dark:bg-white/5 text-gray-500",
    pro: "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20",
    enterprise: "bg-purple-500/10 text-purple-500 border border-purple-500/20",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} kayıtlı kullanıcı</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="İsim veya e-posta ara..."
              className="pl-9 pr-4 py-2 text-sm rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500/50 w-64"
            />
          </div>
          {/* Create Button */}
          <button
            id="create-user-btn"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Kullanıcı Oluştur
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5">
                <th className="p-4 font-semibold text-gray-500">ID</th>
                <th className="p-4 font-semibold text-gray-500">Kullanıcı</th>
                <th className="p-4 font-semibold text-gray-500">Rol</th>
                <th className="p-4 font-semibold text-gray-500">Plan</th>
                <th className="p-4 font-semibold text-gray-500">Kredi</th>
                <th className="p-4 font-semibold text-gray-500">Alt Kullanıcı</th>
                <th className="p-4 font-semibold text-gray-500">Üst Kullanıcı</th>
                <th className="p-4 font-semibold text-gray-500 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-t border-gray-100 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <td className="p-4 text-gray-500">#{user.id}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {user.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-gray-100 dark:bg-white/5 text-gray-500"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${planColors[user.plan] || planColors.free}`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-indigo-500">{user.credits.toLocaleString()}</td>
                  <td className="p-4">
                    {user.can_create_users ? (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" /> Evet
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <ShieldOff className="w-3.5 h-3.5" /> Hayır
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-gray-400">
                    {user.parent_id ? `#${user.parent_id}` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user.role !== "admin" && (
                        <button
                          onClick={() => setDeletingId(user.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              Kullanıcı bulunamadı
            </div>
          )}
        </div>
      </div>

      {/* ====== CREATE MODAL ====== */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0d0d1f] rounded-2xl w-full max-w-lg border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3 className="font-semibold text-lg">Yeni Kullanıcı Oluştur</h3>
                </div>
                <button onClick={() => { setIsCreateOpen(false); setCreateError(""); }}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Ad Soyad</label>
                    <input required value={createForm.name}
                      onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/60 transition-colors"
                      placeholder="Ahmet Yılmaz" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">E-Posta</label>
                    <input required type="email" value={createForm.email}
                      onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/60 transition-colors"
                      placeholder="ornek@mail.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Şifre</label>
                  <input required type="password" value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/60 transition-colors"
                    placeholder="Güvenli şifre girin" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Rol</label>
                    <select value={createForm.role}
                      onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Plan</label>
                    <select value={createForm.plan}
                      onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Kredi</label>
                    <input type="number" value={createForm.credits}
                      onChange={e => setCreateForm(f => ({ ...f, credits: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500/60 transition-colors" />
                  </div>
                </div>

                {/* Permissions */}
                <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Yetkiler</p>
                  {[
                    { key: "can_use_api_tools", label: "API Araçlarını Kullanabilir" },
                    { key: "can_remove_branding", label: "Markayı Kaldırabilir" },
                    { key: "can_create_users", label: "Alt Kullanıcı Oluşturabilir" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      <button type="button"
                        onClick={() => setCreateForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          createForm[key as keyof typeof createForm]
                            ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                        }`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${
                          createForm[key as keyof typeof createForm] ? "translate-x-4" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                {createError && (
                  <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{createError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    İptal
                  </button>
                  <button type="submit" disabled={createLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
                    {createLoading ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== EDIT MODAL ====== */}
      <AnimatePresence>
        {isEditOpen && editingUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0d0d1f] rounded-2xl w-full max-w-md border border-gray-200 dark:border-white/10 shadow-2xl"
            >
              <div className="p-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {editingUser.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{editingUser.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{editingUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Rol</label>
                    <select value={editingUser.role}
                      onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 outline-none">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Plan</label>
                    <select value={editingUser.plan}
                      onChange={e => setEditingUser({ ...editingUser, plan: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 outline-none">
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Kredi</label>
                  <input type="number" value={editingUser.credits}
                    onChange={e => setEditingUser({ ...editingUser, credits: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/60 transition-colors" />
                </div>

                <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Yetkiler</p>
                  {[
                    { key: "can_use_api_tools" as const, label: "API Araçlarını Kullanabilir" },
                    { key: "can_remove_branding" as const, label: "Markayı Kaldırabilir" },
                    { key: "can_create_users" as const, label: "Alt Kullanıcı Oluşturabilir" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      <button type="button"
                        onClick={() => setEditingUser({ ...editingUser, [key]: !editingUser[key] })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          editingUser[key] ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                        }`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${
                          editingUser[key] ? "translate-x-4" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsEditOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    İptal
                  </button>
                  <button onClick={handleSaveEdit} disabled={editLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
                    {editLoading ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== DELETE CONFIRM ====== */}
      <AnimatePresence>
        {deletingId !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0d0d1f] rounded-2xl w-full max-w-sm border border-gray-200 dark:border-white/10 shadow-2xl p-6 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Kullanıcıyı Sil</h3>
              <p className="text-sm text-gray-500 mb-6">Bu kullanıcı ve tüm verileri kalıcı olarak silinecek. Emin misiniz?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  Vazgeç
                </button>
                <button onClick={() => handleDelete(deletingId)}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors">
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
