"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, API_BASE } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, RefreshCcw, MessageSquare, Globe, Send } from "lucide-react";
import Link from "next/link";

type Msg = { role: "user" | "bot"; text: string };

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ChatTestPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);
  const [botName, setBotName] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode] = useState<"chat" | "sim">("chat");

  // Doğrudan sohbet durumu
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<string>(uuid());
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiBase = API_BASE || "http://127.0.0.1:8000";

  useEffect(() => {
    botsApi.get(botId).then((b) => {
      setBotName(b.name);
      setMessages([{ role: "bot", text: b.welcome_message || "Merhaba! Size nasıl yardımcı olabilirim?" }]);
    }).catch(() => {});
  }, [botId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/widget/${botId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, session_id: sessionRef.current }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.answer || "(boş yanıt)" }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "⚠️ Yanıt alınamadı. Backend çalışıyor mu?" }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    sessionRef.current = uuid();
    setMessages([{ role: "bot", text: "Yeni sohbet başlatıldı. Size nasıl yardımcı olabilirim?" }]);
  };

  // Sahte müşteri sitesi + gerçek widget.js (simülasyon modu)
  const srcDoc = useMemo(() => `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;color:#1e293b;min-height:100vh}
  .navbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
  .logo{font-weight:800;font-size:18px;color:#0f172a}.logo span{color:#6366f1}
  .hero{text-align:center;padding:72px 24px 56px}
  .hero h1{font-size:34px;font-weight:800;color:#0f172a;margin-bottom:12px}
  .hero p{font-size:16px;color:#64748b;max-width:480px;margin:0 auto 24px;line-height:1.6}
</style></head><body>
  <nav class="navbar"><div class="logo">Demo<span>Site</span>.com</div></nav>
  <section class="hero"><h1>Web Sitenize Hoş Geldiniz</h1>
  <p>Widget'ın müşteri sitesinde nasıl görüneceğini gösteren demo. Sağ alttaki sohbet butonuna tıklayın.</p></section>
  <script src="${apiBase}/static/widget.js?v=${Date.now()}" data-bot-id="${botId}" data-api-base="${apiBase}"></script>
</body></html>`, [apiBase, botId, reloadKey]);

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

  return (
    <div className="pb-8 max-w-5xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex-none mb-4">
        <button
          onClick={() => router.push("/dashboard/bots")}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Botlara Dön
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{botName || "Yükleniyor..."}</h1>
          </div>

          {/* Mod seçici: Kolay Sohbet | Site Simülasyonu */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setMode("chat")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "chat" ? "bg-indigo-500/20 text-indigo-300" : "text-gray-500 hover:text-white"}`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Kolay Sohbet
              </button>
              <button
                onClick={() => setMode("sim")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "sim" ? "bg-indigo-500/20 text-indigo-300" : "text-gray-500 hover:text-white"}`}
              >
                <Globe className="w-3.5 h-3.5" /> Site Simülasyonu
              </button>
            </div>
            <button
              onClick={() => (mode === "chat" ? resetChat() : setReloadKey((k) => k + 1))}
              className="p-2 text-gray-500 hover:bg-white/5 hover:text-white rounded-xl transition-all"
              title={mode === "chat" ? "Sohbeti sıfırla" : "Sayfayı yenile"}
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex-none flex overflow-x-auto hide-scrollbar gap-2 mb-4 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/chat`;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors relative ${isActive ? "text-indigo-400" : "text-gray-400 hover:text-gray-200"}`}
            >
              {tab.label}
              {isActive && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* İçerik */}
      {mode === "chat" ? (
        <div className="flex-1 min-h-0 flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          {/* Mesajlar */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "self-end bg-indigo-600 text-white rounded-br-sm"
                    : "self-start bg-white/8 text-gray-100 border border-white/10 rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="self-start bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            )}
          </div>
          {/* Giriş */}
          <div className="flex-none p-3 border-t border-white/10 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Mesajınızı yazın… (Örn: Ankara hava durumu)"
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/60"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 transition-all"
              aria-label="Gönder"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex-none flex items-center gap-2 px-4 py-2.5 bg-gray-200 border-b border-gray-300">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-3 px-3 py-1 bg-white rounded-md text-[11px] text-gray-500 font-mono truncate">
                https://demosite.com — bot #{botId} gömülü
              </div>
            </div>
            <iframe
              key={reloadKey}
              srcDoc={srcDoc}
              title="Widget canlı test"
              className="flex-1 w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
          <p className="flex-none text-xs text-gray-600 text-center mt-3">
            Sağ alttaki sohbet butonuna tıklayın. Ayar değişikliklerini görmek için kaydedip yenileyin.
          </p>
        </div>
      )}
    </div>
  );
}
