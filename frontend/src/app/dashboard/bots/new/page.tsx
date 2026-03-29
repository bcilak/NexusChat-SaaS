"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { botsApi } from "@/lib/api";
import { Bot, Settings, Cpu, AlignLeft, Sparkles, Languages, Hash, Target, ChevronLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NewBotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    prompt: "Sen yardımcı bir asistansın. Sadece sana verilen bilgilere göre cevap ver. Eğer bilgi yoksa 'Bu konuda bilgim yok' de.",
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 1024,
    language: "tr",
    show_sources: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const bot = await botsApi.create(form);
      router.push(`/dashboard/bots/${bot.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: any) => setForm({ ...form, [key]: value });

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard/bots" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Botlara Dön
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Yeni Bot Oluştur
          </h1>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 mb-6 font-medium">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#16163a] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
            <Bot className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Temel Bilgiler</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-400" /> Bot Adı *
              </label>
              <input 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium" 
                value={form.name} 
                onChange={(e) => update("name", e.target.value)} 
                required 
                placeholder="Örn: Müşteri Destek Botu" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-gray-400" /> Açıklama
              </label>
              <textarea 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all min-h-[100px] resize-y" 
                value={form.description} 
                onChange={(e) => update("description", e.target.value)} 
                placeholder="Botun ne yaptığını kısaca açıklayın" 
              />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[#16163a] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yapay Zeka Ayarları</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sistem Promptu</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Botun nasıl davranacağını ve hangi kurallara uyacağını belirleyin.</p>
              <textarea 
                className="w-full px-4 py-3 bg-indigo-50/50 dark:bg-[#0a0a1a] border border-indigo-100 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all min-h-[120px] font-mono text-sm resize-y" 
                value={form.prompt} 
                onChange={(e) => update("prompt", e.target.value)} 
                placeholder="Botun nasıl davranacağını tanımlayın" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-gray-400" /> Model
                </label>
                <select 
                  required 
                  className="w-full px-4 py-3 bg-white dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer" 
                  value={form.model} 
                  onChange={e => update("model", e.target.value)}
                >
                  <optgroup label="OpenAI (ChatGPT)">
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </optgroup>
                  <optgroup label="Google (Gemini)">
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </optgroup>
                  <optgroup label="Anthropic (Claude)">
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                    <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                  </optgroup>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-gray-400" /> Dil
                </label>
                <select 
                  className="w-full px-4 py-3 bg-white dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer" 
                  value={form.language} 
                  onChange={(e) => update("language", e.target.value)}
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Target className="w-4 h-4 text-gray-400" /> Sıcaklık (Yaratıcılık)</span>
                  <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">{form.temperature}</span>
                </label>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  value={form.temperature} 
                  onChange={(e) => update("temperature", parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Kesin Yanıtlar</span>
                  <span>Daha Yaratıcı</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" /> Maksimum Token
                </label>
                <input 
                  className="w-full px-4 py-3 bg-white dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" 
                  type="number" 
                  value={form.max_tokens} 
                  onChange={(e) => update("max_tokens", parseInt(e.target.value))} 
                  min={128} max={4096} 
                />
              </div>
            </div>
            
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/5">
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={form.show_sources} 
                    onChange={(e) => update("show_sources", e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/30 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-500 transition-colors">
                  Referans Kaynakları Göster
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-14">
                Kullanıcılar botun verdiği cevapların hangi belgelerinizden alındığını görebilirler.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-4 pt-4">
          <button 
            type="submit" 
            disabled={loading} 
            className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Bot className="w-6 h-6" /> Botu Oluştur
              </>
            )}
          </button>
          <button 
            type="button" 
            onClick={() => router.back()} 
            className="px-8 py-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all"
          >
            İptal
          </button>
        </motion.div>
      </form>
    </div>
  );
}
