"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi } from "@/lib/api";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Settings, Palette, BrainCircuit, Save, 
  CheckCircle2, AlertCircle, Bot, Sliders, MessageSquare, Zap, Smartphone 
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

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);
  const [bot, setBot] = useState<BotType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
    { label: "🔌 Entegrasyonlar", path: `/dashboard/bots/${botId}/integrations` },
    { label: "📈 Analitikler", path: `/dashboard/bots/${botId}/analytics` },
    { label: "📚 Eğitim", path: `/dashboard/bots/${botId}/training` },
    { label: "💬 Chat Test", path: `/dashboard/bots/${botId}/chat` },
    { label: "🔗 Embed", path: `/dashboard/bots/${botId}/embed` },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{bot.name}</h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 tracking-wider">
                {bot.model}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}`;
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

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Basic & Appearance */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Basic Info */}
          <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
              <Settings className="w-5 h-5 text-indigo-400" /> Temel Bilgiler
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Bot Adı</label>
                <input 
                  type="text" 
                  value={bot.name} 
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Açıklama (Opsiyonel)</label>
                <textarea 
                  value={bot.description} 
                  onChange={(e) => update("description", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none text-sm"
                  placeholder="Bu bot ne işe yarar?"
                />
              </div>
            </div>
          </motion.div>

          {/* Appearance Settings */}
          <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
              <Palette className="w-5 h-5 text-purple-400" /> Görünüm & Arayüz
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Tema Rengi</label>
                  <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl">
                    <input 
                      type="color" 
                      value={bot.theme_color || "#000000"} 
                      onChange={(e) => update("theme_color", e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                    />
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{bot.theme_color || "#000000"}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Yazı Rengi</label>
                  <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl">
                    <input 
                      type="color" 
                      value={bot.text_color || "#ffffff"} 
                      onChange={(e) => update("text_color", e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                    />
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{bot.text_color || "#ffffff"}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Logo URL</label>
                <input 
                  type="text" 
                  value={bot.logo_url || ""} 
                  onChange={(e) => update("logo_url", e.target.value)}
                  placeholder="https://site.com/logo.png"
                  className="w-full px-4 py-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Karşılama Mesajı</label>
                <input 
                  type="text" 
                  value={bot.welcome_message || ""} 
                  onChange={(e) => update("welcome_message", e.target.value)}
                  placeholder="Merhaba, size nasıl yardımcı olabilirim?"
                  className="w-full px-4 py-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  💬 Önerilen Sorular (Hazır Butonlar)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Virgülle ayırın. Widget açıldığında hızlı tıklanabilir butonlar olarak görünür.
                </p>
                <textarea
                  value={bot.example_questions || ""}
                  onChange={(e) => update("example_questions", e.target.value)}
                  rows={3}
                  placeholder="Fiyatlarınız nedir?, Nasıl kayıt olurum?, İletişim bilgileriniz?"
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm resize-none"
                />
                {bot.example_questions && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {bot.example_questions.split(",").map((q, i) => q.trim() && (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {q.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* WhatsApp Settings */}
          <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
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

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Telefon Numarası ID (Phone ID)</label>
                <input 
                  type="text" 
                  value={bot.whatsapp_phone_id || ""} 
                  onChange={(e) => update("whatsapp_phone_id", e.target.value)}
                  placeholder="Örn: 104523959145922"
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">WhatsApp Access Token</label>
                <input 
                  type="password" 
                  value={bot.whatsapp_token || ""} 
                  onChange={(e) => update("whatsapp_token", e.target.value)}
                  placeholder="EAXXXX..."
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Doğrulama Jetonu (Verify Token)</label>
                <input 
                  type="text" 
                  value={bot.whatsapp_verify_token || ""} 
                  onChange={(e) => update("whatsapp_verify_token", e.target.value)}
                  placeholder="my-secret-token"
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm font-mono"
                />
              </div>

              {/* Auto-Welcome Message */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">🎉 Otomatik Karşılama Mesajı (İlk Mesaj)</label>
                <textarea 
                  value={bot.whatsapp_welcome_message || ""} 
                  onChange={(e) => update("whatsapp_welcome_message", e.target.value)}
                  rows={2}
                  placeholder="Merhaba! Hoş geldiniz. Size nasıl yardımcı olabilirim?"
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all text-sm resize-none"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">Yeni bir müşteri ilk kez mesaj attığında bu karşılama mesajı otomatik gönderilir. Boş bırakırsanız karşılama mesajı gönderilmez.</p>
              </div>

              {/* Webhook URL Info */}
              <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">📌 Meta Webhook URL (bunu Meta Developer paneline yapıştırın):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-gray-100 dark:bg-black/30 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 select-all break-all">
                    https://YOUR_DOMAIN/api/webhooks/whatsapp
                  </code>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Meta Developer {">"} WhatsApp {">"} Configuration {">"} Webhook alanına bu URL'yi girin. Verify Token olarak yukarıdaki alanı kullanın. Subscribe: <strong>messages</strong> alanını işaretleyin.
                </p>
              </div>

              <a 
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium text-indigo-500 hover:text-indigo-400 transition-colors"
              >
                📖 Meta WhatsApp Cloud API Kurulum Rehberi →
              </a>
            </div>
          </motion.div>
        </div>

        {/* Right Column: AI Settings */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white relative z-10">
              <BrainCircuit className="w-5 h-5 text-indigo-400" /> Yapay Zeka (AI) Kimliği
            </h3>
            
            <div className="space-y-6 relative z-10 flex flex-col h-[calc(100%-3rem)]">
              {/* Prompt */}
              <div className="flex-grow flex flex-col">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Sistem Promptu (Davranış Kuralları)
                </label>
                <textarea 
                  value={bot.prompt} 
                  onChange={(e) => update("prompt", e.target.value)}
                  className="w-full flex-grow min-h-[160px] px-4 py-4 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-y text-sm leading-relaxed"
                  placeholder="Sen bir e-ticaret müşteri temsilcisisin. Sadece kibar ve kısa cevaplar ver..."
                />
              </div>

              {/* Advanced Grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/5">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Dil Modeli (LLM)</label>
                  <select 
                    value={bot.model} 
                    onChange={(e) => update("model", e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm appearance-none"
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
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Yanıt Dili</label>
                  <select 
                    value={bot.language} 
                    onChange={(e) => update("language", e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm appearance-none"
                  >
                    <option value="tr">Türkçe (Varsayılan)</option>
                    <option value="en">English (İngilizce)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Yaratıcılık (Sıcaklık)</label>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{bot.temperature}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.1" 
                    value={bot.temperature} 
                    onChange={(e) => update("temperature", parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-medium">
                    <span>Kesin/Net</span>
                    <span>Yaratıcı</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Yanıt Uzunluğu (Maks. Token)</label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="number" 
                      value={bot.max_tokens} 
                      onChange={(e) => update("max_tokens", parseInt(e.target.value))} 
                      min={128} max={8192} 
                      className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Bağlantılı Özellikler</label>
                <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={bot.show_sources} 
                        onChange={(e) => update("show_sources", e.target.checked)} 
                        className="peer sr-only" 
                      />
                      <div className="w-10 h-5 bg-gray-200 dark:bg-white/10 rounded-full peer-checked:bg-indigo-500 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors">Yanıtlarda Kaynak / Referans Göster</span>
                  </label>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Save Action Bar (Sticky Bottom) */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 md:left-64 z-50 p-4 bg-white/80 dark:bg-black/40 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 flex justify-end"
      >
        <div className="max-w-5xl w-full mx-auto flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-gray-900 dark:text-white px-8 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? "Değişiklikler Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
