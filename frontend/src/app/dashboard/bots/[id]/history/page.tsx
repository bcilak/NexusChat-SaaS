"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, analyticsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, MessageCircle, Download, Sparkles, X, Search, Calendar, ChevronRight, FileX } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface HistoryRecord {
  id: number;
  session_id: string;
  question: string;
  answer: string;
  is_fallback: boolean;
  created_at: string;
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);

  const [botName, setBotName] = useState("");
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeReport, setAnalyzeReport] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getHistory(botId, { 
        start_date: startDate || undefined, 
        end_date: endDate || undefined, 
        search: search || undefined
      });
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    botsApi.get(botId).then((b) => setBotName(b.name)).catch(() => {});
    fetchHistory();
  }, [botId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleDownloadCsv = () => {
    if (records.length === 0) return;
    const header = ["Tarih", "Oturum", "Müşteri (Soru)", "Bot (Cevap)", "Zorlandı"];
    const csvContent = records.map(r => 
      [
        new Date(r.created_at).toLocaleString('tr-TR'),
        r.session_id,
        "\"" + r.question.replace(/"/g, '""') + "\"",
        "\"" + r.answer.replace(/"/g, '""') + "\"",
        r.is_fallback ? "Evet" : "Hayır"
      ].join(",")
    );
    const csvStr = header.join(",") + "\n" + csvContent.join("\n");
    const blob = new Blob(["\uFEFF" + csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bot_${botId}_gecmis_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeReport(null);
    try {
      const data = await analyticsApi.analyzeHistory(botId, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search || undefined
      });
      setAnalyzeReport(data.report);
    } catch (err: any) {
      setAnalyzeReport(err.message || "Rapor oluşturulamadı.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tabs = [
    { label: "⚙️ Ayarlar", path: `/dashboard/bots/${botId}` },
    { label: "📥 Gelen Kutusu", path: `/dashboard/bots/${botId}/inbox` },
    { label: "💬 Geçmiş", path: `/dashboard/bots/${botId}/history` },
    { label: "🔌 Entegrasyonlar", path: `/dashboard/bots/${botId}/integrations` },
    { label: "📈 Analitikler", path: `/dashboard/bots/${botId}/analytics` },
    { label: "📚 Eğitim", path: `/dashboard/bots/${botId}/training` },
    { label: "💭 Chat Test", path: `/dashboard/bots/${botId}/chat` },
    { label: "🔗 Embed", path: `/dashboard/bots/${botId}/embed` },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="pb-24 max-w-6xl mx-auto">
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
              <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 tracking-wider uppercase">
                Geçmiş & Analiz
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/history`;
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

      {/* Filters & Actions */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-8 flex flex-col lg:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 flex-1">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12}/> Başlangıç</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12}/> Bitiş</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Search size={12}/> Metin Arama</label>
            <input 
              type="text" 
              placeholder="Sorularda veya cevaplarda ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium border border-white/10 transition-colors">
            Filtrele
          </button>
        </form>
        
        <div className="flex gap-3 items-end lg:border-l lg:border-white/10 lg:pl-4">
          <button 
            onClick={handleDownloadCsv}
            disabled={loading || records.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium border border-white/10 transition-colors disabled:opacity-50"
          >
            <Download size={16} /> CSV İndir
          </button>
          <button 
            onClick={handleAnalyze}
            disabled={loading || isAnalyzing || records.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:grayscale"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={16} />}
            AI Analiz Raporu
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
          <FileX className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-white mb-2">Sohbet Bulunamadı</h3>
          <p className="text-gray-400 text-sm">Belirttiğiniz filtrelere veya arama terimine uygun geçmiş kayıt yok.</p>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
          <div className="flex justify-between items-center px-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sonuçlar ({records.length})</span>
            {records.length === 1000 && <span className="text-[10px] text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">Maks. 1000 kayıt</span>}
          </div>
          {records.map((r) => (
            <motion.div key={r.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-indigo-500/30 transition-colors flex flex-col gap-3">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500">
                  <span className="bg-white/5 px-2 py-1 rounded-md">{new Date(r.created_at).toLocaleString('tr-TR')}</span>
                  <span className="bg-white/5 px-2 py-1 rounded-md truncate max-w-[120px]" title={r.session_id}>Sen: {r.session_id.substring(0,8)}</span>
                </div>
                {r.is_fallback && <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">Cevapsız Kaldı</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 relative">
                  <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <p className="text-sm text-gray-200 pl-6 pr-2 font-medium">{r.question}</p>
                </div>
                <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 relative">
                  <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <p className="text-sm text-gray-300 pl-6 pr-2 whitespace-pre-wrap">{r.answer}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {analyzeReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAnalyzeReport(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-indigo-500/30 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.2)] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-transparent">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="text-indigo-400 w-6 h-6" /> 
                  Yapay Zeka Geçmiş Analizi
                </h3>
                <button onClick={() => setAnalyzeReport(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                <div className="prose prose-invert prose-indigo max-w-none">
                  <ReactMarkdown>{analyzeReport}</ReactMarkdown>
                </div>
              </div>
              <div className="p-4 border-t border-white/10 text-center text-xs text-gray-500 bg-black/20">
                Bu rapor filtrelerinize uygun en son konuşmalar (maks 150) baz alınarak {botName} asistanının kullandığı yapay zeka modeliyle oluşturuldu.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
