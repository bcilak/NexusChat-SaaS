"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { botsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Bot, FileText, MessageSquare, Package, Plus, TrendingUp, Sparkles, Activity, Clock, MoreVertical } from "lucide-react";
import Link from "next/link";

interface BotType {
  id: number;
  name: string;
  description: string;
  model: string;
  document_count: number;
  created_at: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    botsApi
      .list()
      .then(setBots)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalDocuments = bots.reduce((sum, b) => sum + (b.document_count || 0), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="pb-12">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-[#0a0a1a] border border-gray-200 dark:border-white/10 p-8 sm:p-10 mb-10 shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-12 opacity-20 pointer-events-none">
          <Bot className="w-64 h-64 text-indigo-400 rotate-12 transform" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-indigo-700 dark:text-indigo-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Platforma Hoş Geldiniz
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Merhaba, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{user?.name || "Kullanıcı"}</span> 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl text-sm sm:text-base leading-relaxed mb-8">
            AI asistanlarınızın durumunu takip edin, yeni veri kaynakları ekleyin veya mağazanız için yeni bir akıllı bot inşa edin.
          </p>
          <button
            onClick={() => router.push("/dashboard/bots/new")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all"
          >
            <Plus className="w-5 h-5" /> Yeni Bot Oluştur
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
      >
        {/* Stat 1 */}
        <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3 mr-1" /> Aktif
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{bots.length}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Toplam Bot</p>
          </div>
        </motion.div>

        {/* Stat 2 */}
        <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{totalDocuments}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">İşlenen Döküman</p>
          </div>
        </motion.div>

        {/* Stat 3 */}
        <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg">
              Bu Ay
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">—</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Toplam Sohbet</p>
          </div>
        </motion.div>

        {/* Stat 4 */}
        <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 capitalize">{user?.plan || "Free"}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Mevcut Plan</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Recent Bots Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" /> Son Asistanlar
        </h2>
        {bots.length > 0 && (
          <Link href="/dashboard/bots" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Tümünü Gör &rarr;
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : bots.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 border-dashed rounded-3xl p-12 text-center"
        >
          <div className="w-20 h-20 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
            <Bot className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Henüz Bir Asistanınız Yok</h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
            İşletmeniz veya belgeleriniz için özel olarak tasarlanmış ilk yapay zeka asistanınızı saniyeler içinde oluşturun.
          </p>
          <button
            onClick={() => router.push("/dashboard/bots/new")}
            className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" /> İlk Botunuzu Oluşturun
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.slice(0, 6).map((bot, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={bot.id}
              onClick={() => router.push(`/dashboard/bots/${bot.id}`)}
              className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-white/10 hover:border-indigo-500/50 transition-all group"
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Bot className="w-6 h-6 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 group-hover:text-indigo-400 transition-colors">{bot.name}</h3>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                        {bot.model}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 h-10 mb-6">
                {bot.description || "Bu asistan için henüz bir açıklama girilmemiş."}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span>{bot.document_count} Döküman</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(bot.created_at || Date.now()).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
