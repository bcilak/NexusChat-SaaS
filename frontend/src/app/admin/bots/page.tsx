"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Trash2, Bot, Cpu } from "lucide-react";

interface BotData {
  id: number;
  name: string;
  model: string;
  owner_id: number;
  created_at: string;
}

export default function BotsAdminPage() {
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBots();
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
                <th className="p-4 font-semibold text-gray-500">Sahip ID</th>
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
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">User #{bot.owner_id}</td>
                  <td className="p-4 text-sm text-gray-500">{new Date(bot.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(bot.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-red-500/5 hover:bg-red-500/10 rounded-lg" 
                      title="Kalıcı Olarak Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
    </div>
  );
}
