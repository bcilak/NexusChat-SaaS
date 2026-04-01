"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi } from "@/lib/api";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Settings, Palette, BrainCircuit, Save, 
  CheckCircle2, AlertCircle, Bot, MessageSquare, Zap, Smartphone,
  Eye, X, Send, ChevronRight, Sparkles
} from "lucide-react";
import Link from "next/link";
import React from "react";

interface BotType {
  id: number;
  name: string;
  description: string;
  prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  language: string;
  show_sources: boolean;
  document_count: number;
  theme_color: string;
  text_color: string;
  logo_url: string | null;
  welcome_message: string;
  example_questions: string | null;
  whatsapp_phone_id: string | null;
  whatsapp_token: string | null;
  whatsapp_verify_token: string | null;
  whatsapp_welcome_message: string | null;
}

/* ── Renk yardımcı fonksiyonlar ── */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function hexToRgb(hex: string) {
  const num = parseInt(hex.replace("#", ""), 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex || "#6366f1");
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Canlı Widget Önizlemesi ── */
function WidgetPreview({ bot }: { bot: BotType }) {
  const accent = bot.theme_color || "#6366f1";
  const accentEnd = adjustColor(accent, -30);
  const textOnAccent = bot.text_color || "#ffffff";
  const [previewMsg, setPreviewMsg] = useState("");
  const [chatMsgs, setChatMsgs] = useState([
    { role: "bot", text: bot.welcome_message || "Merhaba! Size nasıl yardımcı olabilirim?" }
  ]);

  useEffect(() => {
    setChatMsgs([{ role: "bot", text: bot.welcome_message || "Merhaba! Size nasıl yardımcı olabilirim?" }]);
  }, [bot.welcome_message]);

  const chips = useMemo(() => {
    if (!bot.example_questions) return [];
    return bot.example_questions.split(",").map(q => q.trim()).filter(Boolean).slice(0, 3);
  }, [bot.example_questions]);

  const sendPreview = () => {
    if (!previewMsg.trim()) return;
    setChatMsgs(prev => [...prev, 
      { role: "user", text: previewMsg },
      { role: "bot", text: "Bu bir önizleme modudur. Gerçek bot bu cevabı üretecektir." }
    ]);
    setPreviewMsg("");
  };

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, background: "rgba(13,13,26,0.92)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}, ${accentEnd})` }}>
        <div className="absolute top-[-50%] right-[-8%] w-32 h-32 rounded-full opacity-20 pointer-events-none" style={{ background: "white" }} />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/30" style={{ background: "rgba(255,255,255,0.2)" }}>
            {bot.logo_url
              ? <img src={bot.logo_url} alt="logo" className="w-full h-full object-cover rounded-xl" />
              : <Bot size={18} color={textOnAccent} />}
          </div>
          <div>
            <div className="font-bold text-sm leading-tight" style={{ color: textOnAccent }}>{bot.name || "AI Asistan"}</div>
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: `${textOnAccent}b3` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" style={{ display: "inline-block" }} />
              Çevrimiçi
            </div>
          </div>
        </div>
        <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <X size={12} color={textOnAccent} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto" style={{ minHeight: 220, maxHeight: 220 }}>
        <div className="text-center text-[10px] text-white/30 font-medium">Bugün</div>
        {chatMsgs.map((msg, i) => (
          <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${msg.role === "bot" ? "self-start" : "self-end"}`}
            style={msg.role === "bot" 
              ? { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", color: "#e2e8f0", borderBottomLeftRadius: 4 }
              : { background: `linear-gradient(135deg, ${accent}, ${accentEnd})`, color: textOnAccent, borderBottomRightRadius: 4, boxShadow: rgba(accent, 0.3) + " 0 4px 14px" }
            }
          >
            {msg.text}
          </div>
        ))}
        {chips.length > 0 && chatMsgs.length === 1 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, i) => (
              <button key={i}
                onClick={() => setChatMsgs(prev => [...prev, { role: "user", text: chip }, { role: "bot", text: "Bu bir önizleme modudur." }])}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all hover:opacity-80"
                style={{ color: accent, background: rgba(accent, 0.1), border: `1px solid ${rgba(accent, 0.25)}` }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <input
          value={previewMsg}
          onChange={e => setPreviewMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendPreview()}
          placeholder="Mesajınızı yazın..."
          className="flex-1 bg-white/5 border border-white/08 rounded-xl px-3 py-2 text-[12px] text-white/80 outline-none placeholder-white/25"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <button
          onClick={sendPreview}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accentEnd})`, boxShadow: rgba(accent, 0.4) + " 0 3px 12px" }}
        >
          <Send size={14} color={textOnAccent} />
        </button>
      </div>
      <div className="text-center py-1.5 text-[9px]" style={{ color: "rgba(255,255,255,0.18)" }}>
        Powered by <span style={{ color: "rgba(255,255,255,0.35)" }}>ChatGenius</span>
      </div>
    </div>
  );
}

/* ── Preset renk paleti ── */
const COLOR_PRESETS = [
  { name: "İndigo", color: "#6366f1" },
  { name: "Mor", color: "#8b5cf6" },
  { name: "Pembe", color: "#ec4899" },
  { name: "Kırmızı", color: "#ef4444" },
  { name: "Turuncu", color: "#f97316" },
  { name: "Sarı", color: "#eab308" },
  { name: "Yeşil", color: "#22c55e" },
  { name: "Teal", color: "#14b8a6" },
  { name: "Cyan", color: "#06b6d4" },
  { name: "Lacivert", color: "#3b82f6" },
  { name: "Gece", color: "#1e293b" },
  { name: "Siyah", color: "#111111" },
];

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);
  const [bot, setBot] = useState<BotType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [activeSection, setActiveSection] = useState<"appearance" | "ai" | "whatsapp">("appearance");

  useEffect(() => {
    botsApi.get(botId).then(setBot).catch(console.error).finally(() => setLoading(false));
  }, [botId]);

  const handleSave = async () => {
    if (!bot) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await botsApi.update(botId, {
        name: bot.name,
        description: bot.description,
        prompt: bot.prompt,
        model: bot.model,
        temperature: bot.temperature,
        max_tokens: bot.max_tokens,
        language: bot.language,
        show_sources: bot.show_sources,
        theme_color: bot.theme_color,
        text_color: bot.text_color,
        logo_url: bot.logo_url,
        welcome_message: bot.welcome_message,
        example_questions: bot.example_questions,
        whatsapp_phone_id: bot.whatsapp_phone_id,
        whatsapp_token: bot.whatsapp_token,
        whatsapp_verify_token: bot.whatsapp_verify_token,
        whatsapp_welcome_message: bot.whatsapp_welcome_message,
      });
      setBot(updated);
      setMessage({ text: "Ayarlar başarıyla kaydedildi.", type: "success" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || "Kaydederken bir hata oluştu.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof BotType, value: any) => {
    if (bot) setBot({ ...bot, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="text-center py-20 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Bot bulunamadı veya silinmiş olabilir.</p>
        <button onClick={() => router.push("/dashboard/bots")} className="mt-4 text-indigo-400 hover:text-indigo-300">
          Botlara Dön
        </button>
      </div>
    );
  }

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
  ];

  const accent = bot.theme_color || "#6366f1";

  const sectionBtn = (key: typeof activeSection, icon: React.ReactNode, label: string, color: string) => (
    <button
      onClick={() => setActiveSection(key)}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        activeSection === key
          ? "border"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
      }`}
      style={activeSection === key ? {
        background: `${color}18`,
        borderColor: `${color}40`,
        color: color,
      } : {}}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard/bots")}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Botlara Dön
        </button>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent}40, ${adjustColor(accent, -30)}40)`, border: `1.5px solid ${accent}40` }}
          >
            <Bot className="w-7 h-7" style={{ color: accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{bot.name}</h1>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {bot.model}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Aktif
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto gap-1 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}`;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors relative ${
                isActive ? "text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
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

      {/* Notification Toast */}
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

      {/* Section Navigation */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl w-fit">
        {sectionBtn("appearance", <Palette className="w-4 h-4" />, "Görünüm & Arayüz", "#a78bfa")}
        {sectionBtn("ai", <BrainCircuit className="w-4 h-4" />, "Yapay Zeka", "#6366f1")}
        {sectionBtn("whatsapp", <Smartphone className="w-4 h-4" />, "WhatsApp", "#22c55e")}
      </div>

      {/* ── APPEARANCE SECTION ── */}
      {activeSection === "appearance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Settings */}
          <div className="space-y-6">
            {/* Bot Kimliği */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-gray-900 dark:text-white">
                <Settings className="w-4 h-4 text-indigo-400" /> Temel Bilgiler
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Bot Adı</label>
                  <input
                    type="text"
                    value={bot.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Açıklama</label>
                  <textarea
                    value={bot.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none text-sm"
                    placeholder="Bu bot ne işe yarar?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Logo URL</label>
                  <input
                    type="text"
                    value={bot.logo_url || ""}
                    onChange={(e) => update("logo_url", e.target.value)}
                    placeholder="https://site.com/logo.png"
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm font-mono"
                  />
                  <div className="mt-3">
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Hızlı Logo Seçimi</label>
                    <div className="flex flex-wrap gap-2">
                      {["bottts", "bottts-neutral", "fun-emoji", "shapes", "icons", "avataaars"].map((type, i) => {
                        const baseUrl = `https://api.dicebear.com/7.x/${type}/svg?seed=${botId * 10 + i}&backgroundColor=transparent`;
                        return (
                          <button
                            key={i}
                            onClick={() => update("logo_url", baseUrl)}
                            className="w-10 h-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-110"
                            style={{ borderColor: bot.logo_url === baseUrl ? "#6366f1" : "rgba(150,150,150,0.2)" }}
                            title={`${type} logo`}
                          >
                            <img src={baseUrl} alt="avatar" className="w-full h-full object-cover p-1 bg-gray-900/10 dark:bg-white/5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Karşılama Mesajı</label>
                  <input
                    type="text"
                    value={bot.welcome_message || ""}
                    onChange={(e) => update("welcome_message", e.target.value)}
                    placeholder="Merhaba, size nasıl yardımcı olabilirim?"
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                  />
                </div>
              </div>
            </motion.div>

            {/* Renk ve Tema */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-white">
                <Palette className="w-4 h-4 text-purple-400" /> Renk Teması
              </h3>

              {/* Preset Renkler */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Hazır Renkler</label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      onClick={() => update("theme_color", preset.color)}
                      title={preset.name}
                      className="w-full aspect-square rounded-xl border-2 transition-all hover:scale-110 hover:shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${preset.color}, ${adjustColor(preset.color, -30)})`,
                        borderColor: bot.theme_color === preset.color ? "white" : "transparent",
                        boxShadow: bot.theme_color === preset.color ? `0 0 12px ${rgba(preset.color, 0.6)}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Özel Tema Rengi</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-black/20 border border-white/10 rounded-xl">
                    <input
                      type="color"
                      value={bot.theme_color || "#6366f1"}
                      onChange={(e) => update("theme_color", e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
                    />
                    <span className="text-xs font-mono text-gray-300">{bot.theme_color || "#6366f1"}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Metin Rengi</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-black/20 border border-white/10 rounded-xl">
                    <input
                      type="color"
                      value={bot.text_color || "#ffffff"}
                      onChange={(e) => update("text_color", e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
                    />
                    <span className="text-xs font-mono text-gray-300">{bot.text_color || "#ffffff"}</span>
                  </div>
                </div>
              </div>

              {/* Metin rengi preset */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Metin Rengi Hızlı Seçim</label>
                <div className="flex gap-2">
                  {["#ffffff", "#000000", "#1e293b", "#f8fafc"].map(c => (
                    <button
                      key={c}
                      onClick={() => update("text_color", c)}
                      title={c}
                      className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                      style={{
                        background: c,
                        borderColor: bot.text_color === c ? "#6366f1" : "rgba(255,255,255,0.15)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Önerilen Sorular */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-yellow-400" /> Önerilen Sorular
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Virgülle ayırın. Widget açıldığında hızlı tıklanabilir butonlar olarak görünür.
              </p>
              <textarea
                value={bot.example_questions || ""}
                onChange={(e) => update("example_questions", e.target.value)}
                rows={3}
                placeholder="Fiyatlarınız nedir?, Nasıl kayıt olurum?, İletişim bilgileriniz?"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm resize-none"
              />
              {bot.example_questions && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {bot.example_questions.split(",").map((q, i) => q.trim() && (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: rgba(accent, 0.12), color: accent, border: `1px solid ${rgba(accent, 0.25)}` }}>
                      <ChevronRight size={10} className="mr-1" />
                      {q.trim()}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: Live Preview */}
          <div className="lg:sticky lg:top-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Canlı Önizleme</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">CANLI</span>
              </div>

              {/* Toggle Button Önizlemesi */}
              <div className="mb-4 p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">Sohbet Butonu</p>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${accent}, ${adjustColor(accent, -30)})`,
                      boxShadow: `0 8px 30px ${rgba(accent, 0.5)}`,
                    }}
                  >
                    <MessageSquare size={24} color={bot.text_color || "#ffffff"} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Widget Butonu</p>
                    <p className="text-xs text-gray-500">Sayfanın sağ alt köşesinde görünür</p>
                  </div>
                </div>
              </div>

              {/* Widget Önizlemesi */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-3xl opacity-20 blur-lg" style={{ background: `linear-gradient(135deg, ${accent}, ${adjustColor(accent, -30)})` }} />
                <div className="relative">
                  <WidgetPreview bot={bot} />
                </div>
              </div>

              <p className="text-xs text-gray-600 text-center mt-3">
                Değişiklikler otomatik olarak yansır. Kaydetmek için butona tıklayın.
              </p>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── AI SECTION ── */}
      {activeSection === "ai" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden max-w-3xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white relative z-10">
            <BrainCircuit className="w-5 h-5 text-indigo-400" /> Yapay Zeka (AI) Kimliği
          </h3>

          <div className="space-y-6 relative z-10">
            {/* Prompt */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Sistem Promptu (Davranış Kuralları)
              </label>
              <textarea
                value={bot.prompt}
                onChange={(e) => update("prompt", e.target.value)}
                className="w-full min-h-[180px] px-4 py-4 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y text-sm leading-relaxed"
                placeholder="Sen bir e-ticaret müşteri temsilcisisin. Sadece kibar ve kısa cevaplar ver..."
              />
            </div>

            {/* Advanced Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-200/60 dark:bg-black/20 p-5 rounded-xl border border-gray-300 dark:border-white/5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Dil Modeli (LLM)</label>
                <select
                  value={bot.model}
                  onChange={(e) => update("model", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm appearance-none"
                >
                  <optgroup label="Anthropic (Tavsiye Edilen)">
                    <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">GPT-4o (Gelişmiş)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Hızlı)</option>
                  </optgroup>
                  <optgroup label="Google">
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Yanıt Dili</label>
                <select
                  value={bot.language}
                  onChange={(e) => update("language", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm appearance-none"
                >
                  <option value="tr">Türkçe (Varsayılan)</option>
                  <option value="en">English (İngilizce)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Yaratıcılık (Sıcaklık)</label>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{bot.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0" max="1" step="0.1"
                  value={bot.temperature}
                  onChange={(e) => update("temperature", parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-300 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 font-medium">
                  <span>Kesin/Net</span>
                  <span>Yaratıcı</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Yanıt Uzunluğu (Maks. Token)</label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    value={bot.max_tokens}
                    onChange={(e) => update("max_tokens", parseInt(e.target.value))}
                    min={128} max={8192}
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Toggle: Show Sources */}
            <div className="bg-gray-200/60 dark:bg-black/20 border border-gray-300 dark:border-white/5 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={bot.show_sources}
                    onChange={(e) => update("show_sources", e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-5 bg-gray-300 dark:bg-white/10 rounded-full peer-checked:bg-indigo-500 transition-colors"></div>
                  <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                </div>
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-medium">Yanıtlarda Kaynak / Referans Göster</span>
                  <p className="text-xs text-gray-500 mt-0.5">Bot cevaplarında döküman kaynaklarını gösterir.</p>
                </div>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── WHATSAPP SECTION ── */}
      {activeSection === "whatsapp" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 relative overflow-hidden max-w-3xl"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold flex items-center gap-2 text-white">
              <Smartphone className="w-5 h-5 text-green-500" /> WhatsApp Entegrasyonu
            </h3>
            {bot.whatsapp_phone_id && bot.whatsapp_token ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Yapılandırıldı
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-500/10 px-2.5 py-1 rounded-lg border border-gray-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Bağlı Değil
              </span>
            )}
          </div>

          <div className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Telefon Numarası ID (Phone ID)</label>
              <input
                type="text"
                value={bot.whatsapp_phone_id || ""}
                onChange={(e) => update("whatsapp_phone_id", e.target.value)}
                placeholder="Örn: 104523959145922"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-all text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">WhatsApp Access Token</label>
              <input
                type="password"
                value={bot.whatsapp_token || ""}
                onChange={(e) => update("whatsapp_token", e.target.value)}
                placeholder="EAXXXX..."
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-all text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Doğrulama Jetonu (Verify Token)</label>
              <input
                type="text"
                value={bot.whatsapp_verify_token || ""}
                onChange={(e) => update("whatsapp_verify_token", e.target.value)}
                placeholder="my-secret-token"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-all text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">🎉 Otomatik Karşılama Mesajı</label>
              <textarea
                value={bot.whatsapp_welcome_message || ""}
                onChange={(e) => update("whatsapp_welcome_message", e.target.value)}
                rows={2}
                placeholder="Merhaba! Hoş geldiniz. Size nasıl yardımcı olabilirim?"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-all text-sm resize-none"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">Yeni bir müşteri ilk kez mesaj attığında bu karşılama mesajı otomatik gönderilir.</p>
            </div>

            <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
              <p className="text-xs font-medium text-gray-400">📌 Meta Webhook URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-black/30 text-emerald-400 px-3 py-2 rounded-lg border border-white/10 select-all break-all">
                  https://YOUR_DOMAIN/api/webhooks/whatsapp
                </code>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Meta Developer › WhatsApp › Configuration › Webhook alanına bu URL'yi girin. Subscribe: <strong>messages</strong> alanını işaretleyin.
              </p>
            </div>

            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              📖 Meta WhatsApp Cloud API Kurulum Rehberi →
            </a>
          </div>
        </motion.div>
      )}

      {/* Save Action Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 md:left-64 z-50 p-4 bg-black/40 backdrop-blur-xl border-t border-white/10 flex justify-between items-center"
      >
        <div className="text-xs text-gray-500 hidden md:block">
          Son değişiklikler kaydedilmedi · <span className="text-indigo-400">{bot.name}</span>
        </div>
        <div className="max-w-6xl w-full mx-auto flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-95"
            style={{ background: `linear-gradient(135deg, ${accent}, ${adjustColor(accent, -30)})`, boxShadow: `0 0 20px ${rgba(accent, 0.35)}` }}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
