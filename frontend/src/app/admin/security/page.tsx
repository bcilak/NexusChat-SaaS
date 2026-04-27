"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { ShieldAlert, ShieldBan, ShieldCheck, Search, Trash2, Ban } from "lucide-react";

interface ChatLog {
  id: number;
  bot_id: number;
  bot_name: string;
  ip_address: string | null;
  question: string;
  answer: string;
  is_spam: boolean;
  created_at: string;
}

interface BannedIP {
  id: number;
  ip_address: string;
  reason: string;
  created_at: string;
}

export default function SecurityAdminPage() {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [bannedIps, setBannedIps] = useState<BannedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "spam" | "banned">("all");
  const [error, setError] = useState<string | null>(null);

  const [banInput, setBanInput] = useState("");
  const [banReason, setBanReason] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logsData, bannedData] = await Promise.all([
        adminApi.getChatLogs(activeTab === "spam" ? "spam" : "all"),
        adminApi.getBannedIps(),
      ]);
      setChatLogs(logsData);
      setBannedIps(bannedData);
    } catch (err: any) {
      setError(err.message || "Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleBanIp = async (ip: string, reason: string = "Bot/Spam Saldırısı") => {
    if (!ip) return;
    try {
      await adminApi.banIp(ip, reason);
      setBanInput("");
      setBanReason("");
      fetchData(); // Listeleri güncelle
    } catch (err: any) {
      alert(err.message || "Ban atılırken bir hata oluştu.");
    }
  };

  const handleUnbanIp = async (id: number) => {
    if (!confirm("Bu IP'nin yasağını kaldırmak istediğinize emin misiniz?")) return;
    try {
      await adminApi.unbanIp(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Ban kaldırılırken bir hata oluştu.");
    }
  };

  if (loading && chatLogs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Güvenlik ve Ban Yönetimi
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Platforma yapılan bot saldırılarını ve spam mesajları buradan takip edip engelleyebilirsiniz.
          </p>
        </div>

        <div className="flex bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "all"
                ? "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Tüm Mesajlar
          </button>
          <button
            onClick={() => setActiveTab("spam")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "spam"
                ? "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Spam Logları
          </button>
          <button
            onClick={() => setActiveTab("banned")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "banned"
                ? "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Banlı IP Listesi
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {activeTab === "all" || activeTab === "spam" ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" /> {activeTab === "all" ? "Gelen Tüm İstekler" : "Son Engellenen Spam İstekler (Kredi Tüketmeyen)"}
              </h2>
            </div>
            {chatLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Hiç mesaj bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-4">Durum</th>
                      <th className="px-6 py-4">Tarih</th>
                      <th className="px-6 py-4">Bot</th>
                      <th className="px-6 py-4">IP Adresi</th>
                      <th className="px-6 py-4">Gönderilen Mesaj</th>
                      <th className="px-6 py-4">Cevap</th>
                      <th className="px-6 py-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {chatLogs.map((log) => {
                      const isBanned = bannedIps.some((b) => b.ip_address === log.ip_address);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-4">
                            {log.is_spam ? (
                              <span className="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 px-2 py-1 rounded text-xs font-semibold">SPAM</span>
                            ) : (
                              <span className="bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 px-2 py-1 rounded text-xs font-semibold">TEMİZ</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {new Date(log.created_at).toLocaleString("tr-TR", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {log.bot_name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md font-mono text-xs">
                              {log.ip_address || "Bilinmiyor"}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-xs truncate text-gray-600 dark:text-gray-400" title={log.question}>
                            {log.question}
                          </td>
                          <td className="px-6 py-4 max-w-xs truncate text-gray-600 dark:text-gray-400" title={log.answer}>
                            {log.answer}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isBanned ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                                <ShieldBan className="w-3 h-3" /> Banlandı
                              </span>
                            ) : log.ip_address ? (
                              <button
                                onClick={() => handleBanIp(log.ip_address!, "Panel Üzerinden Ban")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-lg font-medium transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" /> Banla
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">İşlem yapılamaz</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                <Ban className="w-5 h-5 text-red-500" /> Manuel IP Banla
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Saldırı tespit ettiğiniz bir IP adresini buradan manuel olarak ekleyebilirsiniz. Bu IP widget üzerinden botlarla konuşamaz.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IP Adresi
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 192.168.1.100"
                    value={banInput}
                    onChange={(e) => setBanInput(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sebep (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Saldırı, Spam vs."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none transition-all text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={() => handleBanIp(banInput, banReason || "Manuel Ban")}
                  disabled={!banInput}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  <ShieldBan className="w-4 h-4" /> Yasakla
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-gray-500" /> Yasaklanmış IP Listesi
                </h2>
              </div>
              
              {bannedIps.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Şu an için yasaklı hiçbir IP adresi bulunmuyor.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-white/5">
                      <tr>
                        <th className="px-6 py-4">IP Adresi</th>
                        <th className="px-6 py-4">Sebep</th>
                        <th className="px-6 py-4">Tarih</th>
                        <th className="px-6 py-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                      {bannedIps.map((ip) => (
                        <tr key={ip.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-red-600 dark:text-red-400 font-medium">
                              {ip.ip_address}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {ip.reason || "-"}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(ip.created_at).toLocaleString("tr-TR", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleUnbanIp(ip.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-green-500 hover:bg-green-500/10 transition-colors"
                              title="Banı Kaldır"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
