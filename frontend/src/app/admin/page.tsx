"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Users, Bot, FileText, Activity, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({ users: 0, bots: 0, documents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
     return <div className="animate-pulse flex space-x-4">Yükleniyor...</div>;
  }

  if (error) {
    return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" /> {error}
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Sistem İstatistikleri</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.1}} className="card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform"/>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center mb-4">
               <Users className="w-6 h-6" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Toplam Kullanıcı</p>
            <h2 className="text-4xl font-bold mt-1 text-gray-900 dark:text-white">{stats.users}</h2>
        </motion.div>

        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.2}} className="card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform"/>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center mb-4">
               <Bot className="w-6 h-6" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Toplam Bot</p>
            <h2 className="text-4xl font-bold mt-1 text-gray-900 dark:text-white">{stats.bots}</h2>
        </motion.div>

        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.3}} className="card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform"/>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
               <FileText className="w-6 h-6" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Yüklenen Dökümanlar</p>
            <h2 className="text-4xl font-bold mt-1 text-gray-900 dark:text-white">{stats.documents}</h2>
        </motion.div>
      </div>

      <div className="mt-12 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center text-gray-500">
         <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
         <p>Daha fazla sistem izleme metrikleri ilerleyen sürümlerde buraya eklenecektir.</p>
      </div>
    </div>
  );
}
