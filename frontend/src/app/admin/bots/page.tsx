"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Trash2, Bot, Cpu, ArrowRightLeft, X } from "lucide-react";

interface BotData {
  id: number;
  name: string;
  model: string;
  owner_id: number;
  owner_name?: string | null;
  owner_email?: string | null;
  created_at: string;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

export default function BotsAdminPage() {
  const [bots, setBots] = useState<BotData[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer modal
  const [transferBot, setTransferBot] = useState<BotData | null>(null);
  const [targetUserId, setTargetUserId] = useState<number | "">("");
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferMsg, setTransferMsg] = useState("");

  useEffect(() => {
    fetchBots();
    adminApi.getUsers().then(setUsers).catch(console.error);
  }, []);

  const fetchBots = () => {
    setLoading(true);
    adminApi.getBots()
      .then(setBots)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = async (botId: number) => {
    if (!confirm("Bu botu sistemden kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      await adminApi.deleteBot(botId);
      setBots(bots.filter(b => b.id !== botId));
    } catch (error) {
      console.error("Failed to delete bot", error);
      alert("Bot silinirken bir hata oluştu.");
    }
  };

  const openTransfer = (bot: BotData) => {
    setTransferBot(bot);
    setTargetUserId("");
    setTransferMsg("");
  };

  const handleTransfer = async () => {
    if (!transferBot || targetUserId === "") return;
    setTransferSaving(true);
    setTransferMsg("");
    try {
      await adminApi.transferBot(transferBot.id, Number(targetUserId));
      setTransferMsg("✅ Bot taşındı.");
      fetchBots();
      setTimeout(() => setTransferBot(null), 900);
    } catch (err) {
      setTransferMsg((err as Error).message || "Bot taşınamadı.");
    } finally {
      setTransferSaving(false);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sistem Botları</h1>
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 text-sm">
                <th className="p-4 font-semibold text-gray-500">ID</th>
                <th className="p-4 font-semibold text-gray-500">Bot Adı</th>
                <th className="p-4 font-semibold text-gray-500">Model</th>
                <th className="p-4 font-semibold text-gray-500">Sahip</th>
                <th className="p-4 font-semibold text-gray-500">Tarih</th>
                <th className="p-4 font-semibold text-gray-500 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {bots.map(bot => (
                <tr key={bot.id} className="border-t border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm">{bot.id}</td>
                  <td className="p-4 font-medium flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-400" />
                    {bot.name}
                  </td>
                  <td className="p-4">
                     <span className="flex items-center gap-1 text-xs bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-md w-fit">
                       <Cpu className="w-3 h-3" /> {bot.model}
                     </span>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="font-medium">{bot.owner_name || `User #${bot.owner_id}`}</div>
                    {bot.owner_email && <div className="text-xs text-gray-400">{bot.owner_email}</div>}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{new Date(bot.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openTransfer(bot)}
                        className="p-2 text-gray-400 hover:text-indigo-500 transition-colors bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg"
                        title="Başka Hesaba Taşı"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(bot.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-red-500/5 hover:bg-red-500/10 rounded-lg"
                        title="Kalıcı Olarak Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {bots.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-8 text-center text-gray-500">Sistemde henüz oluşturulmuş bot bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== TRANSFER MODAL ====== */}
      {transferBot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0d0d1f] rounded-2xl w-full max-w-md border border-gray-200 dark:border-white/10 shadow-2xl">
            <div className="p-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Botu Taşı</h3>
                  <p className="text-xs text-gray-400">{transferBot.name}</p>
                </div>
              </div>
              <button onClick={() => setTransferBot(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-gray-500">
                Mevcut sahip: <span className="font-medium text-gray-700 dark:text-gray-300">{transferBot.owner_name || `User #${transferBot.owner_id}`}</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Yeni Sahip (Hesap)</label>
                <select
                  value={targetUserId}
                  onChange={e => setTargetUserId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/60"
                >
                  <option value="">— Hesap seçin —</option>
                  {users
                    .filter(u => u.id !== transferBot.owner_id)
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                </select>
              </div>

              {transferMsg && (
                <p className={`text-xs ${transferMsg.startsWith("✅") ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{transferMsg}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setTransferBot(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  İptal
                </button>
                <button onClick={handleTransfer} disabled={transferSaving || targetUserId === ""}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
                  {transferSaving ? "Taşınıyor..." : "Taşı"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
