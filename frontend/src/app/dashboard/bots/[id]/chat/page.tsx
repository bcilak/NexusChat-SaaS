"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, chatApi } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Send, Sparkles, User, RefreshCcw } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "bot";
  content: string;
  sources?: { file_name: string; snippet: string }[];
}

export default function ChatTestPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);
  const [botName, setBotName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    botsApi.get(botId).then((b) => setBotName(b.name)).catch(() => {});
  }, [botId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setSending(true);

    try {
      const data = await chatApi.send(botId, q, sessionId || undefined);
      setSessionId(data.session_id);
      setMessages((prev) => [...prev, { role: "bot", content: data.answer, sources: data.sources }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "bot", content: "Sistem hatası: " + err.message }]);
    } finally {
      setSending(false);
    }
  };

  const tabs = [
    { label: "⚙️ Ayarlar", path: `/dashboard/bots/${botId}` },
    { label: "📥 Gelen Kutusu", path: `/dashboard/bots/${botId}/inbox` },
    { label: "🔌 Entegrasyonlar", path: `/dashboard/bots/${botId}/integrations` },
    { label: "📈 Analitikler", path: `/dashboard/bots/${botId}/analytics` },
    { label: "📚 Eğitim", path: `/dashboard/bots/${botId}/training` },
    { label: "💬 Chat Test", path: `/dashboard/bots/${botId}/chat` },
    { label: "🔗 Embed", path: `/dashboard/bots/${botId}/embed` },
  ];

  return (
    <div className="pb-24 max-w-5xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex-none mb-6">
        <button 
          onClick={() => router.push("/dashboard/bots")} 
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Botlara Dön
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{botName || "Yükleniyor..."}</h1>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 tracking-wider uppercase">
                  Canlı Simülasyon
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => { setMessages([]); setSessionId(""); }}
            className="p-2 text-gray-500 hover:bg-white/5 hover:text-white rounded-xl transition-all"
            title="Sohbeti Temizle"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex-none flex overflow-x-auto hide-scrollbar gap-2 mb-6 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/chat`;
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

      {/* Chat Interface */}
      <div className="flex-1 min-h-0 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Bot className="w-16 h-16 text-indigo-400 mb-6 mx-auto" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Simülasyon Başladı</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                Botunuza eğittiğiniz dokümanlar dahilinde her türlü soruyu sorabilir ve nasıl tepki vereceğini uçtan uca test edebilirsiniz.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center ${
                msg.role === "user" ? "bg-white/10" : "bg-gradient-to-tr from-indigo-500 to-purple-500"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4 text-gray-900 dark:text-white" /> : <Bot className="w-4 h-4 text-gray-900 dark:text-white" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === "user" 
                  ? "bg-indigo-500 text-white rounded-tr-sm" 
                  : "bg-white/5 border border-white/5 text-gray-300 rounded-tl-sm backdrop-blur-md"
              }`}>
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Kaynakları Kullandı ({msg.sources.length})
                    </p>
                    <div className="flex flex-col gap-2">
                      {msg.sources.map((s, j) => (
                        <div key={j} className="text-xs bg-white/80 dark:bg-black/40 rounded-lg p-2 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 font-mono truncate">
                          📄 {s.file_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {sending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center animate-pulse">
               <Bot className="w-4 h-4 text-gray-900 dark:text-white" />
              </div>
              <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl rounded-tl-sm px-5 py-4 flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Bar */}
        <div className="flex-none p-4 bg-white dark:bg-black/20 border-t border-gray-200 dark:border-white/5 relative z-10 backdrop-blur-md">
          <div className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Yapay zeka asistanınıza test sorusu sorun..."
              disabled={sending}
              className="w-full pl-6 pr-14 py-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm shadow-inner"
            />
            <button 
              onClick={sendMessage} 
              disabled={sending || !input.trim()}
              className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-700 text-gray-900 dark:text-white rounded-xl transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-3">Simülasyondaki cevaplar AI modeline ve eğittiğiniz belgelere göre değişiklik gösterir.</p>
        </div>
      </div>
    </div>
  );
}
