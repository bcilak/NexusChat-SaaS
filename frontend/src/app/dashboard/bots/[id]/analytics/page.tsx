"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { analyticsApi, botsApi } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, MessageCircle, ThumbsUp, ThumbsDown, HelpCircle, Activity, Lightbulb, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);

  const [botName, setBotName] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [fallbacks, setFallbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    botsApi.get(botId).then((b) => setBotName(b.name)).catch(() => {});
    
    const fetchAnalytics = async () => {
      try {
        const [statsData, fallbacksData] = await Promise.all([
          analyticsApi.getStats(botId),
          analyticsApi.getFallbacks(botId)
        ]);
        setStats(statsData);
        setFallbacks(fallbacksData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [botId]);

  const tabs = [
    { label: "⚙️ Ayarlar", path: `/dashboard/bots/${botId}` },
    { label: "📥 Gelen Kutusu", path: `/dashboard/bots/${botId}/inbox` },
    { label: "💬 Geçmiş", path: `/dashboard/bots/${botId}/history` },
    { label: "🔌 Entegrasyonlar", path: `/dashboard/bots/${botId}/integrations` },
    { label: "📈 Analitikler", path: `/dashboard/bots/${botId}/analytics` },
    { label: "📚 Eğitim", path: `/dashboard/bots/${botId}/training` },
    { label: "🛠️ API Araçları", path: `/dashboard/bots/${botId}/tools` },
    { label: "💬 Chat Test", path: `/dashboard/bots/${botId}/chat` },
    { label: "🔗 Embed", path: `/dashboard/bots/${botId}/embed` },
    { label: "🎟️ Destek Talepleri", path: `/dashboard/bots/${botId}/tickets` },

  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => router.push("/dashboard/bots")} 
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Botlara Dön
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
            <Bot className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{botName || "Yükleniyor..."}</h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 tracking-wider uppercase">
                Performans
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/analytics`;
          return (
            <Link 
              key={tab.path} 
              href={tab.path}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors relative ${
                isActive ? "text-indigo-400" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" 
                />
              )}
            </Link>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
          
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/[0.07] transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Soru</h3>
              </div>
              <p className="text-4xl font-bold text-gray-900 dark:text-white relative z-10">{stats?.total_messages || 0}</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/[0.07] transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Beğeniler</h3>
              </div>
              <p className="text-4xl font-bold text-gray-900 dark:text-white relative z-10">{stats?.likes || 0}</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/[0.07] transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                  <ThumbsDown className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Beğenmeme</h3>
              </div>
              <p className="text-4xl font-bold text-gray-900 dark:text-white relative z-10">{stats?.dislikes || 0}</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/[0.07] transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Bilinmeyenler</h3>
              </div>
              <p className="text-4xl font-bold text-amber-400 relative z-10">{stats?.fallbacks || 0}</p>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 relative overflow-hidden mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-indigo-400" /> Cevaplanamayan Sorular (Fallbacks)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                  Müşterilerinizin sorduğu ancak botunuzun kendi veri tabanında (veya ürünlerinizde) bulamadığı için cevap veremediği sorular. Eğitim dosyalarınızı geliştirmek için bu listeyi kullanabilirsiniz.
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                <Lightbulb className="w-6 h-6" />
              </div>
            </div>

            {fallbacks.length === 0 ? (
               <div className="text-center py-16 bg-white dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/5 border-dashed">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Botunuz Mükemmel Çalışıyor!</h4>
                  <p className="text-gray-600 dark:text-gray-400">Şu ana kadar tüm müşteri soruları başarılı bir şekilde cevaplanmış.</p>
               </div>
            ) : (
              <div className="space-y-4">
                {fallbacks.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-grow">
                      <MessageCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">"{item.question}"</p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center shrink-0">
                      <span suppressHydrationWarning className="text-xs font-mono px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5">
                        {new Date(item.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
