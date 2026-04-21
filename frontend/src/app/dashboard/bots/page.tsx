"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { botsApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Bot, Plus, Trash2, FileText, Clock, Component, Search, AlertCircle } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";

interface Bot {
  id: number;
  name: string;
  description: string;
  model: string;
  document_count: number;
  created_at: string;
}

export default function BotListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const isSubUser = user?.parent_id !== null;

  useEffect(() => {
    botsApi.list()
      .then(setBots)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!confirm(`"${name}" botunu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      await botsApi.delete(id);
      setBots(bots.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredBots = bots.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Component className="w-8 h-8 text-indigo-400" /> Asistanlarım
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Eğittiğiniz ve bağladığınız tüm yapay zeka asistanlarını buradan yönetebilirsiniz.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Asistan ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
          {!isSubUser && (
            <button 
              onClick={() => router.push("/dashboard/bots/new")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-gray-900 dark:text-white px-5 py-2.5 rounded-xl font-medium shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Yeni Ekle
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center items-center py-32">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : bots.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 border-dashed rounded-3xl p-12 text-center max-w-2xl mx-auto mt-10"
        >
          <div className="w-24 h-24 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping opacity-20" />
            <Bot className="w-12 h-12 text-indigo-400 relative z-10" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Hiç Asistanınız Yok</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            Müşterilerinizle etkileşime geçecek, dokümanlarınızı okuyacak ve e-ticaret sitenizde satışları artıracak ilk yapay zeka asistanınızı hemen şimdi tasarlayın.
          </p>
          {!isSubUser ? (
            <button
              onClick={() => router.push("/dashboard/bots/new")}
              className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-8 py-3.5 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" /> Hemen Başla
            </button>
          ) : (
            <p className="text-gray-500 text-sm">Üst kullanıcınızın henüz asistanı bulunmuyor.</p>
          )}
        </motion.div>
      ) : filteredBots.length === 0 ? (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Sonuç Bulunamadı</h3>
          <p className="text-gray-500 text-sm mt-1">"{searchQuery}" aramasıyla eşleşen bir asistan yok.</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredBots.map((bot) => (
            <motion.div
              variants={itemVariants}
              key={bot.id}
              onClick={() => router.push(`/dashboard/bots/${bot.id}`)}
              className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-white/[0.08] hover:border-indigo-500/40 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] transition-all group flex flex-col h-full relative overflow-hidden"
            >
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150" />
              
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/30 transition-colors">
                    <Bot className="w-7 h-7 text-indigo-400 group-hover:text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1.5 group-hover:text-indigo-300 transition-colors line-clamp-1">{bot.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-medium uppercase tracking-wider">
                      {bot.model}
                    </span>
                  </div>
                </div>
                
                {(!isSubUser || user?.can_edit_bots) && (
                  <button 
                    onClick={(e) => handleDelete(e, bot.id, bot.name)}
                    className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-all"
                    title="Asistanı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 flex-grow mb-6 relative z-10 leading-relaxed">
                {bot.description || "Bu asistan için henüz bir açıklama girilmemiş. Ayarlardan asistanınızın görev tanımını yazabilirsiniz."}
              </p>
              
              <div className="flex items-center justify-between pt-5 border-t border-gray-200 dark:border-white/10 relative z-10">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 py-1.5 px-3 rounded-lg">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>{bot.document_count} Döküman</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(bot.created_at || Date.now()).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
