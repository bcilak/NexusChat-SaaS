"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, trainingApi, webTrainApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, UploadCloud, FileText, FileSpreadsheet, FileIcon, Trash2, Globe, Server, CheckCircle2, AlertCircle, Play, RotateCw } from "lucide-react";
import Link from "next/link";

interface CrawledPage {
  id: number;
  url: string;
  title: string;
  last_crawled: string;
}

interface Doc {
  id: number;
  file_name: string;
  file_type: string;
  chunk_count: number;
  is_trained: boolean;
  created_at: string;
}

export default function TrainingPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);
  const [botName, setBotName] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Web Training States
  const [trainingMode, setTrainingMode] = useState<"file" | "web">("file");
  const [webUrl, setWebUrl] = useState("");
  const [maxPages, setMaxPages] = useState<number>(50);
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [webMode, setWebMode] = useState<"single" | "website">("single");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(() => {
    trainingApi.listDocuments(botId).then(setDocs).catch(console.error).finally(() => setLoading(false));
  }, [botId]);

  const loadWebPages = useCallback(() => {
    webTrainApi.listPages(botId).then(setCrawledPages).catch(console.error);
  }, [botId]);

  useEffect(() => {
    botsApi.get(botId).then((b) => setBotName(b.name)).catch(() => {});
    loadDocs();
    loadWebPages();
  }, [botId, loadDocs, loadWebPages]);

  // Canlı tarama takibi için her 5 saniyede bir sayfaları güncelle
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (trainingMode === "web") {
      interval = setInterval(() => {
        loadWebPages();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [trainingMode, loadWebPages]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        await trainingApi.upload(botId, file);
      }
      setMessage({ text: `${files.length} dosya başarıyla yüklendi. Eğitimi başlatabilirsiniz.`, type: "success" });
      loadDocs();
    } catch (err: any) {
      setMessage({ text: err.message || "Yükleme sırasında hata oluştu.", type: "error" });
    } finally {
      setUploading(false);
      setTimeout(() => setMessage(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTrain = async (retrain = false) => {
    setTraining(true);
    setMessage(null);
    try {
      const result = retrain
        ? await trainingApi.retrain(botId)
        : await trainingApi.train(botId);
      setMessage({ text: result.message || "Eğitim tamamlandı.", type: "success" });
      loadDocs();
    } catch (err: any) {
      setMessage({ text: err.message || "Eğitim hatası.", type: "error" });
    } finally {
      setTraining(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Bu dosyayı silmek istediğinize emin misiniz?")) return;
    try {
      await trainingApi.deleteDocument(botId, docId);
      setDocs(docs.filter((d) => d.id !== docId));
    } catch (err: any) {
      setMessage({ text: err.message || "Silme hatası.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleWebTrain = async () => {
    if (!webUrl) return;
    setTraining(true);
    setMessage(null);
    try {
      let res;
      if (webMode === "single") {
        res = await webTrainApi.trainUrl(botId, webUrl);
      } else {
        res = await webTrainApi.trainWebsite(botId, webUrl, maxPages);
      }
      setMessage({ text: res.message || "Web verileri çekildi.", type: "success" });
      setWebUrl("");
      setTimeout(loadWebPages, 2000);
    } catch (err: any) {
      setMessage({ text: err.message || "Web çekme hatası.", type: "error" });
    } finally {
      setTraining(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleWebDelete = async (pageId: number) => {
    if (!confirm("Bu web sayfasının verilerini silmek istediğinize emin misiniz?")) return;
    try {
      await webTrainApi.deletePage(botId, pageId);
      setCrawledPages(crawledPages.filter((p) => p.id !== pageId));
    } catch (err: any) {
      setMessage({ text: err.message || "Silme hatası.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

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

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
    if (t.includes('xls') || t.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    if (t.includes('doc')) return <FileText className="w-5 h-5 text-blue-400" />;
    return <FileIcon className="w-5 h-5 text-indigo-400" />;
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
            <Server className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{botName || "Yükleniyor..."}</h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 tracking-wider uppercase">
                Veri Eğitim Merkezi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/training`;
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

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-4 rounded-xl mb-8 border ${
            message.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </motion.div>
      )}

      {/* Mode Switcher */}
      <div className="flex items-center p-1 bg-white/80 dark:bg-black/40 rounded-xl w-fit mb-8 border border-gray-200 dark:border-white/5">
        <button 
          onClick={() => setTrainingMode("file")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            trainingMode === "file" 
              ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
          }`}
        >
          <FileText className="w-4 h-4" /> Dokümanlar
        </button>
        <button 
          onClick={() => setTrainingMode("web")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            trainingMode === "web" 
              ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
          }`}
        >
          <Globe className="w-4 h-4" /> Web Siteleri
        </button>
      </div>

      <AnimatePresence mode="wait">
        {trainingMode === "file" ? (
          <motion.div 
            key="file"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Upload Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative overflow-hidden group cursor-pointer border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
                dragOver 
                  ? "border-indigo-400 bg-indigo-500/10" 
                  : "border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-white/[0.07]"
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv" 
                className="hidden" 
                onChange={(e) => handleUpload(e.target.files)} 
              />
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:scale-150 transition-transform duration-700" />
              
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 transition-colors ${
                dragOver ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-gray-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10"
              }`}>
                {uploading ? (
                  <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className={`w-10 h-10 ${dragOver ? "animate-bounce" : ""}`} />
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {uploading ? "Dosyalar Sunucuya Yükleniyor..." : "Dosyalarınızı Sürükleyin veya Seçin"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                PDF, DOCX, TXT, Excel veya CSV formatındaki dökümanlarınızı buraya sürükleyerek asistanınıza öğretebilirsiniz.
              </p>
              <span className="inline-flex items-center px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-500">
                Maksimum 10MB P/File
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleTrain(false)} 
                disabled={training || docs.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-gray-900 dark:text-white px-8 py-4 rounded-2xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {training ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-5 h-5" />}
                {training ? "Eğitim Devam Ediyor..." : "Yeni Yüklenenleri Eğit"}
              </button>
              <button 
                onClick={() => handleTrain(true)} 
                disabled={training || docs.length === 0}
                className="sm:w-64 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-white/5 hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-8 py-4 rounded-2xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCw className={`w-5 h-5 ${training ? "animate-spin" : ""}`} />
                Tümünü Yeniden Eğit
              </button>
            </div>

            {/* Document List */}
            <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-3xl p-6 mt-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Eğitilen Dökümanlar ({docs.length})
              </h3>
              
              {loading ? (
                <div className="text-center py-10"><div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" /></div>
              ) : docs.length === 0 ? (
                <div className="text-center py-12 border border-gray-200 dark:border-white/5 border-dashed rounded-2xl">
                  <FileIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Asistanınıza henüz hiçbir doküman öğretilmedi.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      key={doc.id} 
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-white/80 dark:bg-black/40 flex items-center justify-center shrink-0">
                          {getFileIcon(doc.file_type)}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">{doc.file_name}</h4>
                          <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
                            <span className="text-gray-500 uppercase">{doc.file_type.replace(".", "")}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="text-gray-500">{doc.chunk_count} Vektör</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className={`inline-flex items-center gap-1 ${doc.is_trained ? "text-emerald-400" : "text-amber-400"}`}>
                              {doc.is_trained ? <><CheckCircle2 className="w-3 h-3" /> Eğitildi</> : <><AlertCircle className="w-3 h-3" /> Bekliyor</>}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="web"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
              
              <div className="mb-6 border-b border-gray-200 dark:border-white/10 pb-6 relative z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" /> Web Sitesinden Öğren
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Botunuzun web sitenizdeki sayfaları okuyup öğrenmesini sağlayın.</p>
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Eğitim Yöntemi (Kapsam)</label>
                  <select 
                    value={webMode} 
                    onChange={(e) => setWebMode(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="single">Sadece Belirtilen URL (Tek Sayfa)</option>
                    <option value="website">Tüm Web Sitesini Otomatik Tara (Recursive Crawl)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Web Adresi (URL)</label>
                  <input 
                    type="url" 
                    value={webUrl} 
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="https://site.com/hakkimizda"
                    className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                  />
                </div>

                {webMode === "website" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Maksimum Taranacak Sayfa</label>
                    <input 
                      type="number" 
                      value={maxPages} 
                      onChange={(e) => setMaxPages(Number(e.target.value))}
                      max={500} min={1}
                      className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                    />
                  </div>
                )}

                <button 
                  onClick={handleWebTrain} 
                  disabled={training || !webUrl.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-gray-900 dark:text-white px-8 py-3.5 rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50"
                >
                  {training ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Server className="w-5 h-5" />}
                  {training ? "Veriler Çekiliyor ve Öğreniliyor..." : "Veriyi Çek & Öğrenmeye Başla"}
                </button>
              </div>
            </div>

            {/* Web List */}
            <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-3xl p-6 mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" /> Taranan ve Eğitilen Sayfalar ({crawledPages.length})
                </h3>
                {trainingMode === "web" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Canlı Tarama Takibi Aktif
                  </div>
                )}
              </div>
              
              {crawledPages.length === 0 ? (
                <div className="text-center py-12 border border-gray-200 dark:border-white/5 border-dashed rounded-2xl">
                  <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Henüz web üzerinden veri çekilmedi.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {crawledPages.map((page) => (
                    <motion.div 
                      key={page.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Globe className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">{page.title || "İsimsiz Sayfa"}</h4>
                          <a href={page.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline truncate block mt-1">
                            {page.url}
                          </a>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleWebDelete(page.id)}
                        className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
