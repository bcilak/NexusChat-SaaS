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
      setRecords(Array.isArray(data) ? data : []);
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

  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Group records by session_id
  const groupedSessions = records.reduce((acc, curr) => {
    const sid = curr.session_id || "Bilinmeyen_Oturum_" + curr.id;
    if (!acc[sid]) acc[sid] = [];
    acc[sid].push(curr);
    return acc;
  }, {} as Record<string, HistoryRecord[]>);

  // Sort sessions by most recent interaction
  const sortedSessions = Object.entries(groupedSessions)
    .map(([sessionId, msgs]) => ({
      sessionId,
      lastActive: new Date(msgs[0].created_at).getTime(),
      // Sort messages chronologically (oldest first) for chat flow
      messages: msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }))
    .sort((a, b) => b.lastActive - a.lastActive);

  // Auto-select first session if none selected and records exist
  useEffect(() => {
    if (!selectedSession && sortedSessions.length > 0) {
      setSelectedSession(sortedSessions[0].sessionId);
    }
  }, [sortedSessions, selectedSession]);

  const activeSessionData = sortedSessions.find(s => s.sessionId === selectedSession);

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
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 mb-8 flex flex-col lg:flex-row gap-4 justify-between shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 flex-1">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12}/> Başlangıç</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12}/> Bitiş</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Search size={12}/> Metin Arama</label>
            <input 
              type="text" 
              placeholder="Sorularda veya cevaplarda ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50"
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
            <Download size={16} /> CSV
          </button>
          <button 
            onClick={handleAnalyze}
            disabled={loading || isAnalyzing || records.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:grayscale whitespace-nowrap"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={16} />}
            AI Analizi
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : sortedSessions.length === 0 ? (
        <div className="text-center py-20 bg-[#0a0a0a] rounded-3xl border border-white/5 border-dashed">
          <FileX className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-white mb-2">Sohbet Bulunamadı</h3>
          <p className="text-gray-400 text-sm">Belirttiğiniz filtrelere veya arama terimine uygun geçmiş kayıt yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
          
          {/* Left Sidebar: Session List */}
          <div className="lg:col-span-4 bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-lg">
            <div className="p-4 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-sm font-bold text-gray-200">Görüşmeler</h2>
              <p className="text-xs text-gray-500 mt-1">{sortedSessions.length} Oturum bulundu</p>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {sortedSessions.map((session) => {
                const isActive = session.sessionId === selectedSession;
                const hasFallback = session.messages.some(m => m.is_fallback);
                // Get snippet from latest message
                const latestMsg = session.messages[session.messages.length - 1];
                
                return (
                  <button
                    key={session.sessionId}
                    onClick={() => setSelectedSession(session.sessionId)}
                    className={`w-full text-left p-3 rounded-2xl transition-all ${
                      isActive 
                        ? 'bg-indigo-500/10 border border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' 
                        : 'hover:bg-white/[0.02] border border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className={`font-mono text-sm ${isActive ? 'text-indigo-400 font-bold' : 'text-gray-300'}`}>
                        {session.sessionId.substring(0, 8)}...
                      </span>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {new Date(session.lastActive).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className={`text-xs line-clamp-1 ${isActive ? 'text-indigo-200/70' : 'text-gray-500'}`}>
                      {latestMsg?.question}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400">
                        {session.messages.length} mesaj
                      </span>
                      {hasFallback && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                          Cevapsız
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Active Session Chat Flow */}
          <div className="lg:col-span-8 bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-lg relative">
            {activeSessionData ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex justify-between items-center backdrop-blur-md z-10 relative shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <MessageCircle size={16} className="text-indigo-400" />
                      Oturum Detayı
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">ID: {activeSessionData.sessionId}</p>
                  </div>
                  <div className="text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    {new Date(activeSessionData.lastActive).toLocaleString('tr-TR')}
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#050510]">
                  {activeSessionData.messages.map(r => (
                    <div key={r.id} className="flex flex-col gap-5">
                      
                      {/* User Message Bubble */}
                      <div className="flex flex-col items-end w-full pl-12 sm:pl-24">
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <span className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</span>
                          <span className="text-xs font-semibold text-gray-300">Ziyaretçi</span>
                        </div>
                        {/* Chatbase inspired User Bubble: usually colored or distinct */}
                        <div className="bg-indigo-600 text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md text-[15px] leading-relaxed max-w-full relative group prose prose-invert prose-p:my-0 prose-img:rounded-xl prose-img:my-2 prose-a:text-indigo-200">
                          <ReactMarkdown>{r.question}</ReactMarkdown>
                        </div>
                      </div>
                      
                      {/* Bot Answer Bubble */}
                      <div className="flex flex-col items-start w-full pr-12 sm:pr-24">
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Bot size={12} className="text-indigo-400" />
                          </div>
                          <span className="text-xs font-semibold text-white">{botName || "Bot"}</span>
                          <span className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</span>
                          {r.is_fallback && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-1 border border-amber-500/20">Cevapsız</span>}
                        </div>
                        
                        {/* Chatbase inspired Bot Bubble: White background, subtle shadow, dark text */}
                        <div className={`px-5 py-3.5 rounded-2xl rounded-tl-sm shadow-lg text-[15px] leading-relaxed max-w-full whitespace-pre-wrap relative prose md:prose-p:my-0
                          ${r.is_fallback ? 'bg-[#fff5f5] text-red-900 border border-red-200 prose-red' : 'bg-white text-gray-800 border border-gray-100 prose-a:text-indigo-600'}
                        `}>
                          <ReactMarkdown>{r.answer || ""}</ReactMarkdown>
                        </div>
                      </div>
                      
                    </div>
                  ))}
                  <div className="pt-2 pb-6 text-center text-[10px] text-gray-600 font-medium">Bu oturumun sonuna geldiniz.</div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Lütfen soldan bir görüşme seçin
              </div>
            )}
          </div>
        </div>
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
