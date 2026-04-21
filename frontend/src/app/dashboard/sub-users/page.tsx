"use client";

import { useEffect, useState } from "react";
import { subUsersApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserPlus, Users, Edit2, Trash2, X, ShieldCheck, ShieldOff,
  KeyRound, Eye, EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SubUser {
  id: number;
  name: string;
  email: string;
  plan: string;
  role: string;
  credits: number;
  can_use_api_tools: boolean;
  can_create_users: boolean;
  can_edit_bots: boolean;
  parent_id: number;
  created_at: string;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  plan: "free",
  credits: 100,
  can_use_api_tools: false,
  can_remove_branding: false,
  can_create_users: false,
  can_edit_bots: false,
};

export default function SubUsersPage() {
  const { user } = useAuth();
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPass, setShowPass] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<SubUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => { fetchSubUsers(); }, []);

  const fetchSubUsers = async () => {
    setLoading(true);
    try {
      const data = await subUsersApi.list();
      setSubUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Create ----------
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const newUser = await subUsersApi.create(form);
      setSubUsers(prev => [...prev, newUser]);
      setIsCreateOpen(false);
      setForm({ ...EMPTY_FORM });
    } catch (err: unknown) {
      setCreateError((err as Error).message || "Bir hata oluştu");
    } finally {
      setCreateLoading(false);
    }
  };

  // ---------- Edit ----------
  const openEdit = (u: SubUser) => { setEditUser({ ...u }); setIsEditOpen(true); };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      await subUsersApi.update(editUser.id, {
        name: editUser.name,
        plan: editUser.plan,
        credits: editUser.credits,
        can_use_api_tools: editUser.can_use_api_tools,
        can_remove_branding: editUser.can_remove_branding,
        can_create_users: editUser.can_create_users,
        can_edit_bots: editUser.can_edit_bots,
      });
      setSubUsers(prev => prev.map(u => u.id === editUser.id ? editUser : u));
      setIsEditOpen(false);
    } catch (e) { console.error(e); }
    finally { setEditLoading(false); }
  };

  // ---------- Delete ----------
  const handleDelete = async (id: number) => {
    try {
      await subUsersApi.delete(id);
      setSubUsers(prev => prev.filter(u => u.id !== id));
      setDeletingId(null);
    } catch (e) { console.error(e); }
  };

  // ---------- Helpers ----------
  const planBadge: Record<string, string> = {
    free: "bg-gray-100 dark:bg-white/5 text-gray-500",
    pro: "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20",
    enterprise: "bg-purple-500/10 text-purple-500 border border-purple-500/20",
  };

  // Üst kullanıcı sahip olmadığı izinleri sub-user'a veremez
  const parentCan = {
    api: user?.can_use_api_tools ?? false,
    branding: user?.can_remove_branding ?? false,
    create: user?.can_create_users ?? false,
    edit_bots: user?.can_edit_bots ?? true, // If admin or primary user, they can edit bots
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Alt Kullanıcı Yönetimi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Oluşturduğunuz alt kullanıcılar yalnızca sizin
            sahip olduğunuz izinleri alabilir.
          </p>
        </div>
        <button
          id="create-sub-user-btn"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Yeni Alt Kullanıcı
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 flex gap-3 items-start">
        <KeyRound className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-300">
          <strong className="text-indigo-400">Yetki Sınırlaması:</strong>{" "}
          Alt kullanıcılara yalnızca kendinizin sahip olduğu izinleri verebilirsiniz.
          API Araçları: <strong>{parentCan.api ? "✓" : "✗"}</strong> &nbsp;|&nbsp;
          Branding Kaldırma: <strong>{parentCan.branding ? "✓" : "✗"}</strong> &nbsp;|&nbsp;
          Alt Kullanıcı Oluşturma: <strong>{parentCan.create ? "✓" : "✗"}</strong> &nbsp;|&nbsp;
          Bot Düzenleme: <strong>{parentCan.edit_bots ? "✓" : "✗"}</strong>
        </div>
      </div>

      {/* Empty State */}
      {subUsers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-2xl"
        >
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Henüz alt kullanıcı yok</p>
          <p className="text-gray-400 text-sm mt-1">Yukarıdaki butona tıklayarak ilk alt kullanıcınızı oluşturun.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subUsers.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-4 hover:border-indigo-500/30 transition-colors"
            >
              {/* User header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(u)}
                    className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeletingId(u.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${planBadge[u.plan] || planBadge.free}`}>
                  {u.plan}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-500">
                  {u.credits.toLocaleString()} kredi
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(u.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>

              {/* Permissions */}
              <div className="space-y-1.5 border-t border-gray-100 dark:border-white/5 pt-3">
                <PermRow label="API Araçları" enabled={u.can_use_api_tools} />
                <PermRow label="Branding Kaldırma" enabled={u.can_remove_branding} />
                <PermRow label="Alt Kullanıcı Oluşturma" enabled={u.can_create_users} />
                <PermRow label="Botları Düzenleyebilir" enabled={u.can_edit_bots} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ====== CREATE MODAL ====== */}
      <AnimatePresence>
        {isCreateOpen && (
          <Modal onClose={() => { setIsCreateOpen(false); setCreateError(""); }}>
            <div className="p-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="font-semibold text-lg">Yeni Alt Kullanıcı</h3>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setCreateError(""); }}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Ad Soyad</label>
                  <input required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/60"
                    placeholder="Ahmet Yılmaz" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">E-Posta</label>
                  <input required type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/60"
                    placeholder="ornek@mail.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Şifre</label>
                <div className="relative">
                  <input required type={showPass ? "text" : "password"} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-indigo-500/60"
                    placeholder="Güvenli bir şifre" />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Plan</label>
                  <select value={form.plan}
                    onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Kredi</label>
                  <input type="number" value={form.credits}
                    onChange={e => setForm(f => ({ ...f, credits: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500/60" />
                </div>
              </div>

              {/* Permissions */}
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Yetkiler</p>
                <PermToggle
                  label="API Araçlarını Kullanabilir"
                  value={form.can_use_api_tools}
                  disabled={!parentCan.api}
                  onChange={v => setForm(f => ({ ...f, can_use_api_tools: v }))}
                />
                <PermToggle
                  label="Markayı Kaldırabilir"
                  value={form.can_remove_branding}
                  disabled={!parentCan.branding}
                  onChange={v => setForm(f => ({ ...f, can_remove_branding: v }))}
                />
                <PermToggle
                  label="Alt Kullanıcı Oluşturabilir"
                  value={form.can_create_users}
                  disabled={!parentCan.create}
                  onChange={v => setForm(f => ({ ...f, can_create_users: v }))}
                />
                <PermToggle
                  label="Botları Düzenleyebilir"
                  value={form.can_edit_bots}
                  disabled={!parentCan.edit_bots}
                  onChange={v => setForm(f => ({ ...f, can_edit_bots: v }))}
                />
              </div>

              {createError && (
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{createError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={createLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
                  {createLoading ? "Oluşturuluyor..." : "Oluştur"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* ====== EDIT MODAL ====== */}
      <AnimatePresence>
        {isEditOpen && editUser && (
          <Modal onClose={() => setIsEditOpen(false)}>
            <div className="p-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {editUser.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{editUser.name}</h3>
                  <p className="text-xs text-gray-400 truncate">{editUser.email}</p>
                </div>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Ad Soyad</label>
                <input value={editUser.name}
                  onChange={e => setEditUser({ ...editUser, name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/60" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Plan</label>
                  <select value={editUser.plan}
                    onChange={e => setEditUser({ ...editUser, plan: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 outline-none">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Kredi</label>
                  <input type="number" value={editUser.credits}
                    onChange={e => setEditUser({ ...editUser, credits: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/60" />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Yetkiler</p>
                <PermToggle
                  label="API Araçlarını Kullanabilir"
                  value={editUser.can_use_api_tools}
                  disabled={!parentCan.api}
                  onChange={v => setEditUser({ ...editUser, can_use_api_tools: v })}
                />
                <PermToggle
                  label="Markayı Kaldırabilir"
                  value={editUser.can_remove_branding}
                  disabled={!parentCan.branding}
                  onChange={v => setEditUser({ ...editUser, can_remove_branding: v })}
                />
                <PermToggle
                  label="Alt Kullanıcı Oluşturabilir"
                  value={editUser.can_create_users}
                  disabled={!parentCan.create}
                  onChange={v => setEditUser({ ...editUser, can_create_users: v })}
                />
                <PermToggle
                  label="Botları Düzenleyebilir"
                  value={editUser.can_edit_bots}
                  disabled={!parentCan.edit_bots}
                  onChange={v => setEditUser({ ...editUser, can_edit_bots: v })}
                />
              </div>

              <div className="flex gap-3 pt-1">
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
          </Modal>
        )}
      </AnimatePresence>

      {/* ====== DELETE CONFIRM ====== */}
      <AnimatePresence>
        {deletingId !== null && (
          <Modal onClose={() => setDeletingId(null)}>
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Alt Kullanıcıyı Sil</h3>
              <p className="text-sm text-gray-500 mb-6">Bu alt kullanıcı kalıcı olarak silinecek. Emin misiniz?</p>
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
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---- Shared UI Components ---- */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#0d0d1f] rounded-2xl w-full max-w-lg border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function PermRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      {enabled ? (
        <span className="flex items-center gap-1 text-emerald-500 font-medium">
          <ShieldCheck className="w-3 h-3" /> Aktif
        </span>
      ) : (
        <span className="flex items-center gap-1 text-gray-400">
          <ShieldOff className="w-3 h-3" /> Pasif
        </span>
      )}
    </div>
  );
}

function PermToggle({
  label, value, disabled, onChange
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`flex items-center justify-between ${disabled ? "opacity-40" : ""}`}>
      <div>
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        {disabled && <span className="text-xs text-red-400 ml-2">(yetkiniz yok)</span>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          value && !disabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${
          value && !disabled ? "translate-x-4" : "translate-x-0.5"
        }`} />
      </button>
    </div>
  );
}
