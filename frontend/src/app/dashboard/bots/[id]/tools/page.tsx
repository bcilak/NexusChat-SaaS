"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, toolsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Bot, Plug, Plus, Trash2, Edit3, ToggleLeft, ToggleRight,
  FlaskConical, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Info, Zap, Globe, CloudSun, DollarSign, Package, Newspaper, MapPin,
  X, Play, Loader2, HelpCircle, Code2, ArrowRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

// ─────────────────────── Types ───────────────────────

interface BotTool {
  id: number;
  name: string;
  display_name: string;
  description: string;
  api_url: string;
  method: string;
  headers: string;
  query_params: string;
  body_template: string;
  response_path: string;
  response_template: string;
  is_active: boolean;
  created_at: string;
}

interface ToolForm {
  name: string;
  display_name: string;
  description: string;
  api_url: string;
  method: string;
  headers: string;
  query_params: string;
  body_template: string;
  response_path: string;
  response_template: string;
  is_active: boolean;
}

// ─────────────────────── Preset Templates ───────────────────────

const PRESETS = [
  {
    icon: <CloudSun className="w-6 h-6 text-sky-400" />,
    color: "sky",
    label: "🌤️ Hava Durumu",
    description: "Kullanıcı hava, sıcaklık veya hava tahmini sorduğunda şehrin anlık hava bilgisini çeker.",
    apiNote: "openweathermap.org adresinden ücretsiz API Key alın.",
    form: {
      name: "weather_api",
      display_name: "Hava Durumu",
      description: "Kullanıcı hava durumu, sıcaklık, yağmur, kar, rüzgar veya hava tahmini hakkında soru sorduğunda bu aracı kullan. Şehir adını query olarak gönder.",
      api_url: "https://api.openweathermap.org/data/2.5/weather",
      method: "GET",
      headers: "{}",
      query_params: JSON.stringify({ q: "{query}", appid: "BURAYA_API_KEY_GIRIN", units: "metric", lang: "tr" }, null, 2),
      body_template: "",
      response_path: "main.temp,main.feels_like,main.humidity,weather.0.description,wind.speed",
      response_template: "🌡️ Sıcaklık: {main.temp}°C (Hissedilen: {main.feels_like}°C) | ☁️ Durum: {weather.0.description} | 💧 Nem: {main.humidity}% | 💨 Rüzgar: {wind.speed} m/s",
      is_active: true,
    },
  },
  {
    icon: <DollarSign className="w-6 h-6 text-emerald-400" />,
    color: "emerald",
    label: "💱 Döviz Kuru",
    description: "Dolar, Euro, Sterlin gibi döviz kurlarını anlık olarak sorgular.",
    apiNote: "exchangerate-api.com adresinden ücretsiz API Key alın.",
    form: {
      name: "currency_api",
      display_name: "Döviz Kuru",
      description: "Kullanıcı dolar, euro, sterlin, TL kuru, döviz fiyatı veya para birimi dönüşümü hakkında soru sorduğunda bu aracı kullan. Para birimi kodunu (USD, EUR vb.) query olarak gönder.",
      api_url: "https://v6.exchangerate-api.com/v6/BURAYA_API_KEY_GIRIN/latest/{query}",
      method: "GET",
      headers: "{}",
      query_params: "{}",
      body_template: "",
      response_path: "conversion_rates.TRY,conversion_rates.USD,conversion_rates.EUR",
      response_template: "💱 1 {query} = {conversion_rates.TRY} TRY | USD: {conversion_rates.USD} | EUR: {conversion_rates.EUR}",
      is_active: true,
    },
  },
  {
    icon: <MapPin className="w-6 h-6 text-rose-400" />,
    color: "rose",
    label: "🗺️ Konum / Adres",
    description: "Adres veya yer ismi girilerek coğrafi bilgi (koordinat, bölge) döndürür. Ücretsizdir, API Key gerekmez.",
    apiNote: "Ücretsizdir, herhangi bir API Key gerekmez.",
    form: {
      name: "geocoding_api",
      display_name: "Konum Sorgulama",
      description: "Kullanıcı bir adres, ilçe, şehir veya yer ismi hakkında konum bilgisi, koordinat, bölge bilgisi sorduğunda bu aracı kullan.",
      api_url: "https://nominatim.openstreetmap.org/search",
      method: "GET",
      headers: JSON.stringify({ "User-Agent": "ChatGeniusBot/1.0" }, null, 2),
      query_params: JSON.stringify({ q: "{query}", format: "json", limit: "1", "accept-language": "tr" }, null, 2),
      body_template: "",
      response_path: "0.display_name,0.lat,0.lon",
      response_template: "📍 {0.display_name} | Koordinatlar: {0.lat}, {0.lon}",
      is_active: true,
    },
  },
  {
    icon: <Newspaper className="w-6 h-6 text-purple-400" />,
    color: "purple",
    label: "📰 Güncel Haberler",
    description: "Belirli bir konu hakkında güncel haberleri çeker.",
    apiNote: "newsapi.org adresinden ücretsiz API Key alın.",
    form: {
      name: "news_api",
      display_name: "Güncel Haberler",
      description: "Kullanıcı haber, güncel gelişme, son dakika, ekonomi haberleri veya belirli bir konudaki son haberler hakkında soru sorduğunda bu aracı kullan.",
      api_url: "https://newsapi.org/v2/everything",
      method: "GET",
      headers: "{}",
      query_params: JSON.stringify({ q: "{query}", apiKey: "BURAYA_API_KEY_GIRIN", language: "tr", pageSize: "3", sortBy: "publishedAt" }, null, 2),
      body_template: "",
      response_path: "articles.0.title,articles.0.description,articles.1.title,articles.1.description",
      response_template: "📰 Son Haberler:\n1. {articles.0.title}: {articles.0.description}\n2. {articles.1.title}: {articles.1.description}",
      is_active: true,
    },
  },
];

// ─────────────────────── Empty Form ───────────────────────

const EMPTY_FORM: ToolForm = {
  name: "",
  display_name: "",
  description: "",
  api_url: "",
  method: "GET",
  headers: "{}",
  query_params: "{}",
  body_template: "",
  response_path: "",
  response_template: "",
  is_active: true,
};

// ─────────────────────── Param Row Component ───────────────────────

function ParamRow({ keyVal, value, onChange, onDelete }: { keyVal: string; value: string; onChange: (k: string, v: string) => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input className="flex-1 px-3 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:border-indigo-500" placeholder="parametre_adı" value={keyVal} onChange={e => onChange(e.target.value, value)} />
      <input className="flex-[2] px-3 py-2 bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:border-indigo-500" placeholder="değer veya {query}" value={value} onChange={e => onChange(keyVal, e.target.value)} />
      <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─────────────────────── Main Page ───────────────────────

export default function ToolsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);

  const [botName, setBotName] = useState("");
  const [tools, setTools] = useState<BotTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ToolForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Params editor (parsed from JSON)
  const [paramRows, setParamRows] = useState<{ key: string; value: string }[]>([]);
  const [headerRows, setHeaderRows] = useState<{ key: string; value: string }[]>([]);

  // Test modal
  const [showTest, setShowTest] = useState(false);
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const loadTools = useCallback(() => {
    toolsApi.list(botId).then(setTools).catch(console.error).finally(() => setLoading(false));
  }, [botId]);

  useEffect(() => {
    botsApi.get(botId).then((b: any) => setBotName(b.name)).catch(() => { });
    loadTools();
  }, [botId, loadTools]);

  const showMsg = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Param rows helpers ──

  const parseJsonToRows = (jsonStr: string): { key: string; value: string }[] => {
    try {
      const obj = JSON.parse(jsonStr || "{}");
      return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }));
    } catch {
      return [];
    }
  };

  const rowsToJson = (rows: { key: string; value: string }[]): string => {
    const obj: Record<string, string> = {};
    rows.forEach(r => { if (r.key) obj[r.key] = r.value; });
    return JSON.stringify(obj, null, 2);
  };

  // ── Open form ──

  const openNew = () => {
    setForm(EMPTY_FORM);
    setParamRows([]);
    setHeaderRows([]);
    setEditingId(null);
    setShowAdvanced(false);
    setShowForm(true);
    setTimeout(() => document.getElementById("tool-form-top")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const openEdit = (tool: BotTool) => {
    setForm({
      name: tool.name,
      display_name: tool.display_name,
      description: tool.description,
      api_url: tool.api_url,
      method: tool.method,
      headers: tool.headers,
      query_params: tool.query_params,
      body_template: tool.body_template,
      response_path: tool.response_path,
      response_template: tool.response_template,
      is_active: tool.is_active,
    });
    setParamRows(parseJsonToRows(tool.query_params));
    setHeaderRows(parseJsonToRows(tool.headers));
    setEditingId(tool.id);
    setShowAdvanced(false);
    setShowForm(true);
    setTimeout(() => document.getElementById("tool-form-top")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setForm(preset.form);
    setParamRows(parseJsonToRows(preset.form.query_params));
    setHeaderRows(parseJsonToRows(preset.form.headers));
    setEditingId(null);
    setShowAdvanced(false);
    setShowForm(true);
    setTimeout(() => document.getElementById("tool-form-top")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // ── Save ──

  const handleSave = async () => {
    if (!form.display_name || !form.description || !form.api_url) {
      showMsg("Lütfen Araç Adı, Açıklama ve API Adresi alanlarını doldurun.", "error");
      return;
    }
    const autoName = form.name || form.display_name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const payload = {
      ...form,
      name: autoName,
      query_params: rowsToJson(paramRows),
      headers: rowsToJson(headerRows),
    };
    setSaving(true);
    try {
      if (editingId) {
        await toolsApi.update(botId, editingId, payload);
        showMsg("Araç güncellendi.", "success");
      } else {
        await toolsApi.create(botId, payload);
        showMsg("Araç başarıyla eklendi! Bot artık bu API'yi kullanabilir.", "success");
      }
      setShowForm(false);
      loadTools();
    } catch (err: any) {
      showMsg(err.message || "Kayıt sırasında hata oluştu.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete / Toggle ──

  const handleDelete = async (id: number) => {
    if (!confirm("Bu aracı silmek istediğinize emin misiniz?")) return;
    try {
      await toolsApi.delete(botId, id);
      showMsg("Araç silindi.", "success");
      loadTools();
    } catch {
      showMsg("Silme sırasında hata oluştu.", "error");
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toolsApi.toggle(botId, id);
      loadTools();
    } catch {
      showMsg("Durum güncellenemedi.", "error");
    }
  };

  // ── Test ──

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = {
        api_url: form.api_url,
        method: form.method,
        headers: rowsToJson(headerRows),
        query_params: rowsToJson(paramRows),
        body_template: form.body_template,
        response_path: form.response_path,
        query: testQuery || "test",
      };
      const result = await toolsApi.test(botId, payload);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  // ─────────────────────── JSX ───────────────────────

  return (
    <div className="pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.push("/dashboard/bots")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-4 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Botlara Dön
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
            <Plug className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{botName || "Yükleniyor..."}</h1>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
              API Araçları
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/tools`;
          return (
            <Link key={tab.path} href={tab.path} className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors relative ${isActive ? "text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}>
              {tab.label}
              {isActive && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />}
            </Link>
          );
        })}
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-3 p-4 rounded-xl mb-6 border ${message.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {user && !user.can_use_api_tools ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center flex flex-col items-center justify-center mt-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <Plug className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Erişim Engellendi / Access Denied</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">Mevcut planınızda API Araçları kullanımı desteklenmiyor. Bu özelliği kullanabilmek için lütfen planınızı yükseltin.</p>
        </div>
      ) : (
        <>
          {/* ── How it works banner ── */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">API Araçları Nasıl Çalışır?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Botunuza bir API aracı bağladığınızda, kullanıcı o konuda soru sorduğunda bot <strong className="text-indigo-400">otomatik olarak</strong> o API'yi çağırır ve gerçek zamanlı veriyi kullanarak cevap üretir.
                Örneğin hava durumu aracı bağlarsanız, biri "İstanbul'da hava nasıl?" diye sorduğunda bot anlık hava bilgisini çekip cevap verir.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-medium text-gray-500">
                <span className="bg-gray-200 dark:bg-white/10 px-2 py-1 rounded">1. API ekle</span>
                <ArrowRight className="w-3 h-3" />
                <span className="bg-gray-200 dark:bg-white/10 px-2 py-1 rounded">2. Kullanıcı soru sorar</span>
                <ArrowRight className="w-3 h-3" />
                <span className="bg-gray-200 dark:bg-white/10 px-2 py-1 rounded">3. Bot API'yi çağırır</span>
                <ArrowRight className="w-3 h-3" />
                <span className="bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded">4. Gerçek veriyle cevap verir</span>
              </div>
            </div>
          </div>

          {/* ── Preset Templates ── */}
          {!showForm && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" /> Hazır Şablonlar (1 Tıkla Kur)
              </h2>
              <p className="text-sm text-gray-500 mb-4">Aşağıdaki hazır şablonlardan birine tıklayın; form otomatik dolar, sadece API Key'inizi girin.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PRESETS.map((p, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => applyPreset(p)}
                    className="text-left p-5 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {p.icon}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{p.label}</span>
                        <span className="block text-[10px] text-gray-500 mt-0.5">{p.apiNote}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
                    <div className="flex items-center gap-1 mt-3 text-indigo-400 text-xs font-semibold">
                      <Plus className="w-3 h-3" /> Bu şablonu kullan
                    </div>
                  </motion.button>
                ))}

                {/* Custom */}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={openNew}
                  className="text-left p-5 bg-white dark:bg-white/[0.03] border border-dashed border-gray-300 dark:border-white/10 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition-all group sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <Code2 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">🔧 Özel API — Sıfırdan Ekle</span>
                      <span className="block text-xs text-gray-500 mt-0.5">Kendi API'nizi veya başka bir servisi manuel olarak tanımlayın.</span>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          )}

          {/* ── Tool Form ── */}
          <AnimatePresence>
            {showForm && (
              <motion.div id="tool-form-top" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-3xl p-6 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Plug className="w-5 h-5 text-indigo-400" />
                    {editingId ? "Aracı Düzenle" : "Yeni API Aracı Ekle"}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 relative z-10">

                  {/* 1. Display Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                      1. Araç Adı <span className="text-red-400">*</span>
                    </label>
                    <input type="text" placeholder="Örn: Hava Durumu, Döviz Kuru, Ürün Stok API..."
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm" />
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><Info className="w-3 h-3" /> Bu araç ne işe yarar? Dashboard'da görünen isim.</p>
                  </div>

                  {/* 2. Description (CRITICAL) */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                      2. Bot Bu Aracı Ne Zaman Kullansın? <span className="text-red-400">*</span>
                      <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">⭐ En Kritik Alan</span>
                    </label>
                    <textarea rows={3} placeholder={`Örn: Kullanıcı hava durumu, sıcaklık, yağmur, kar veya hava tahmini hakkında soru sorduğunda bu aracı kullan. Şehir veya bölge adını sorgu olarak gönder.`}
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm resize-none" />
                    <div className="mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-start gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Bot bu metni okuyarak hangi soruya hangi aracı kullanacağına karar verir. Ne kadar ayrıntılı olursa, bot o kadar doğru çağırır.
                          Örneğin sadece "hava" yazmak yerine "hava durumu, sıcaklık, nem, rüzgar, yağmur, kar, hava tahmini gibi konular sorulduğunda" yazın.</span>
                      </p>
                    </div>
                  </div>

                  {/* 3. API URL */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                      3. API Adresi (URL) <span className="text-red-400">*</span>
                    </label>
                    <input type="url" placeholder="https://api.example.com/v1/endpoint"
                      value={form.api_url}
                      onChange={e => setForm(f => ({ ...f, api_url: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm font-mono" />
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><Info className="w-3 h-3" /> Kullandığınız API servisinin belgelendirmesinden kopyalayın. URL içinde <code className="bg-gray-200 dark:bg-white/10 px-1 rounded">{"{query}"}</code> yazarsanız kullanıcı sorusundaki anahtar kelime oraya gelir.</p>
                  </div>

                  {/* 4. Method */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">4. İstek Yöntemi</label>
                    <div className="flex gap-3">
                      {["GET", "POST"].map(m => (
                        <button key={m} onClick={() => setForm(f => ({ ...f, method: m }))}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${form.method === m ? "bg-indigo-500 border-indigo-500 text-white" : "bg-gray-100 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-400"}`}>
                          {m === "GET" ? "GET — Veri Al (Çoğu API için)" : "POST — Veri Gönder"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><Info className="w-3 h-3" /> Emin değilseniz GET seçin. API belgesi POST diyorsa POST seçin.</p>
                  </div>

                  {/* 5. Query Parameters */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                      5. URL Parametreleri
                      <span className="ml-2 text-[10px] text-gray-400 font-normal normal-case">(?anahtar=değer)</span>
                    </label>
                    <div className="space-y-2 mb-2">
                      {paramRows.map((row, i) => (
                        <ParamRow key={i} keyVal={row.key} value={row.value}
                          onChange={(k, v) => setParamRows(rows => rows.map((r, ri) => ri === i ? { key: k, value: v } : r))}
                          onDelete={() => setParamRows(rows => rows.filter((_, ri) => ri !== i))} />
                      ))}
                    </div>
                    <button onClick={() => setParamRows(r => [...r, { key: "", value: "" }])}
                      className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors px-2 py-1">
                      <Plus className="w-4 h-4" /> Parametre Ekle
                    </button>
                    <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <p className="text-xs text-blue-500 dark:text-blue-400 font-medium flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          Değer alanına <code className="bg-blue-500/10 px-1 rounded">{"{query}"}</code> yazarsanız bot kullanıcının sorguladığı kelimeyi oraya koyar.
                          <br />API Key gereken alanlara servisin size verdiği kodu girin (örn: <em>appid → abc123apikey</em>).
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* 6. Response Path */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">6. API Yanıtından Okunacak Alanlar</label>
                    <input type="text" placeholder="main.temp,weather.0.description,main.humidity"
                      value={form.response_path}
                      onChange={e => setForm(f => ({ ...f, response_path: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm font-mono" />
                    <p className="text-xs text-gray-400 mt-1.5 flex items-start gap-1"><Info className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>API'nin döndürdüğü JSON'dan hangi alanları okuyacağınızı yazın. <strong>Nokta</strong> ile iç içe alanlara ulaşırsınız. Birden fazlaysa <strong>virgülle</strong> ayırın.
                        <br />Örn: OpenWeather için <code className="bg-gray-200 dark:bg-white/10 px-1 rounded">main.temp</code> = sıcaklık. Test butonu ile otomatik keşfedebilirsiniz.</span>
                    </p>
                  </div>

                  {/* 7. Response Template */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">7. Yanıt Şablonu</label>
                    <input type="text" placeholder="Sıcaklık: {main.temp}°C — Durum: {weather.0.description}"
                      value={form.response_template}
                      onChange={e => setForm(f => ({ ...f, response_template: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm font-mono" />
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><Info className="w-3 h-3" />
                      Süslü parantez içindeki alanlar gerçek değerlerle değiştirilir. Boş bırakırsanız ham değerler gösterilir.
                    </p>
                  </div>

                  {/* Advanced */}
                  <div>
                    <button onClick={() => setShowAdvanced(v => !v)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors">
                      {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Gelişmiş Ayarlar (Header, POST Body)
                    </button>
                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">HTTP Header'ları <span className="text-xs font-normal text-gray-400">(Authorization, Bearer Token gibi)</span></label>
                              <div className="space-y-2 mb-2">
                                {headerRows.map((row, i) => (
                                  <ParamRow key={i} keyVal={row.key} value={row.value}
                                    onChange={(k, v) => setHeaderRows(rows => rows.map((r, ri) => ri === i ? { key: k, value: v } : r))}
                                    onDelete={() => setHeaderRows(rows => rows.filter((_, ri) => ri !== i))} />
                                ))}
                              </div>
                              <button onClick={() => setHeaderRows(r => [...r, { key: "", value: "" }])} className="flex items-center gap-1.5 text-indigo-400 text-sm font-medium px-2 py-1">
                                <Plus className="w-4 h-4" /> Header Ekle
                              </button>
                            </div>
                            {form.method === "POST" && (
                              <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">POST Body Şablonu <span className="text-xs font-normal text-gray-400">({"{query}"} kullanabilirsiniz)</span></label>
                                <textarea rows={4} placeholder={'{"question": "{query}", "context": "bot sorgusu"}'} value={form.body_template} onChange={e => setForm(f => ({ ...f, body_template: e.target.value }))}
                                  className="w-full font-mono text-sm px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none" />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                    <button onClick={() => setShowTest(true)}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:border-indigo-500/50 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all">
                      <FlaskConical className="w-4 h-4 text-indigo-400" /> API'yi Test Et
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50">
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      {saving ? "Kaydediliyor..." : "Kaydet ve Aktif Et"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Test Modal ── */}
          <AnimatePresence>
            {showTest && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-indigo-400" /> API Canlı Testi
                    </h3>
                    <button onClick={() => { setShowTest(false); setTestResult(null); }} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mb-4">Bir sorgu değeri girin ve API'nin nasıl cevap verdiğini görün. Bu, botun gerçek bir kullanıcı sorusunu işleyişini simüle eder.</p>

                  <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Örn: İstanbul, USD, kargo takip no..."
                      value={testQuery} onChange={e => setTestQuery(e.target.value)}
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm" />
                    <button onClick={handleTest} disabled={testing}
                      className="flex items-center gap-2 px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold transition-all disabled:opacity-50">
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {testing ? "..." : "Test Et"}
                    </button>
                  </div>

                  <AnimatePresence>
                    {testResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {testResult.error ? (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm font-mono">{testResult.error}</div>
                        ) : (
                          <>
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${testResult.success ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                              HTTP {testResult.status_code} — {testResult.success ? "Başarılı!" : "Hata"}
                            </div>

                            {testResult.formatted && (
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">✅ Botun Ürettiği Cevap</p>
                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-700 dark:text-indigo-300 font-medium">{testResult.formatted}</div>
                              </div>
                            )}

                            {testResult.extracted && Object.keys(testResult.extracted).length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📦 Okunan Alanlar</p>
                                <div className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl p-4 space-y-1">
                                  {Object.entries(testResult.extracted).map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2 text-sm font-mono">
                                      <span className="text-gray-400">{k}:</span>
                                      <span className="text-emerald-500 font-bold">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🔍 Ham API Yanıtı (JSON)</p>
                              <pre className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 rounded-xl p-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto max-h-60 leading-relaxed">
                                {JSON.stringify(testResult.raw_response, null, 2)}
                              </pre>
                              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><Info className="w-3 h-3" /> Yukarıdaki JSON'dan hangi alanları okumak istediğinizi "Yanıt Alanları" bölümüne nokta notasyonuyla girin.</p>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Existing Tools List ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Kayıtlı Araçlar {tools.length > 0 && <span className="text-sm font-normal text-gray-500 ml-1">({tools.length})</span>}
              </h2>
              {!showForm && (
                <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  <Plus className="w-4 h-4" /> Yeni Araç Ekle
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>
            ) : tools.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                <Plug className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">Henüz API aracı eklenmedi</h3>
                <p className="text-sm text-gray-500">Yukarıdaki hazır şablonlardan birini seçin veya özel bir API ekleyin.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tools.map(tool => (
                  <motion.div key={tool.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`group bg-white dark:bg-white/[0.03] border rounded-2xl p-5 transition-all ${tool.is_active ? "border-gray-200 dark:border-white/10 hover:border-indigo-500/30" : "border-gray-200 dark:border-white/5 opacity-60"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${tool.is_active ? "bg-indigo-500/10 border-indigo-500/20" : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5"}`}>
                          <Globe className={`w-6 h-6 ${tool.is_active ? "text-indigo-400" : "text-gray-500"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 dark:text-white">{tool.display_name}</h4>
                            {tool.is_active
                              ? <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Aktif</span>
                              : <span className="text-[10px] bg-gray-500/10 text-gray-500 border border-gray-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pasif</span>
                            }
                          </div>
                          <p className="text-xs text-gray-500 mt-1 max-w-md line-clamp-1">{tool.description}</p>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate max-w-xs">{tool.api_url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleToggle(tool.id)} title={tool.is_active ? "Devre Dışı Bırak" : "Aktif Et"}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-indigo-400 transition-colors">
                          {tool.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => openEdit(tool)} title="Düzenle"
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-indigo-400 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(tool.id)} title="Sil"
                          className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
