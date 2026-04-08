"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { integrationsApi, botsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Bot, CheckCircle2, AlertCircle, Plug, Link as LinkIcon,
  ShoppingBag, ShoppingCart, Info, Trash2, Plus, Smartphone,
  ExternalLink, MessageCircle, FlaskConical, Loader2, Store, Package,
} from "lucide-react";
import Link from "next/link";

interface BotInfo {
  id: number;
  name: string;
  whatsapp_phone_id?: string | null;
  whatsapp_token?: string | null;
  whatsapp_verify_token?: string | null;
}

// Sağlayıcıya göre alan adları
const PROVIDER_LABELS: Record<string, { key: string; secret: string; secretRequired: boolean; hint: string }> = {
  woocommerce: {
    key: "Consumer Key",
    secret: "Consumer Secret",
    secretRequired: true,
    hint: "WooCommerce Ayarlar → Advanced → REST API bölümünden alabilirsiniz.",
  },
  shopify: {
    key: "Access Token",
    secret: "API Secret (Opsiyonel)",
    secretRequired: false,
    hint: "Shopify Admin → Apps → Private Apps → Access Token alanından alabilirsiniz.",
  },
  ticimax: {
    key: "Client ID",
    secret: "Client Secret (Opsiyonel)",
    secretRequired: false,
    hint: "Ticimax Entegrasyonlar → API Panelinden alabilirsiniz.",
  },
  ideasoft: {
    key: "Client ID",
    secret: "Client Secret",
    secretRequired: true,
    hint: "IdeaSoft Paneli → Entegrasyonlar → API → API Ekle adımlarını izleyin. Mağaza URL'niz olarak kendi sitenizin adresini girin.",
  },
};

export default function IntegrationsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);

  const [botName, setBotName] = useState("");
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState("ideasoft");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    store_name?: string;
    product_count?: number;
  } | null>(null);

  const whatsappConfigured = !!(botInfo?.whatsapp_phone_id && botInfo?.whatsapp_token);
  const providerConfig = PROVIDER_LABELS[provider] || PROVIDER_LABELS["woocommerce"];

  useEffect(() => {
    botsApi.get(botId).then((b: BotInfo) => { setBotName(b.name); setBotInfo(b); }).catch(() => { });
    fetchIntegrations();
  }, [botId]);

  // Provider değişince test sonucunu temizle
  useEffect(() => {
    setTestResult(null);
  }, [provider]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Check for Ideasoft OAuth callback
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state && Number(state) === botId) {
      // Reconstitute from localStorage
      const tempConfigStr = localStorage.getItem("ideasoft_temp_config");
      if (tempConfigStr) {
        setConnecting(true);
        setMessage({ text: "IdeaSoft yetkilendirmesi tamamlanıyor...", type: "success" });
        const cfg = JSON.parse(tempConfigStr);

        integrationsApi.exchangeIdeasoft({
          bot_id: botId,
          code,
          state,
          api_url: cfg.apiUrl,
          client_id: cfg.apiKey,
          client_secret: cfg.apiSecret,
          redirect_uri: window.location.href.split('?')[0]
        }).then(() => {
          setMessage({ text: `IDEASOFT entegrasyonu başarıyla eklendi!`, type: "success" });
          fetchIntegrations();
          localStorage.removeItem("ideasoft_temp_config");
          router.replace(`/dashboard/bots/${botId}/integrations`);
        }).catch((err: any) => {
          setMessage({ text: err.message || "Yetkilendirme değiş-tokuşu başarısız oldu.", type: "error" });
          localStorage.removeItem("ideasoft_temp_config");
        }).finally(() => {
          setConnecting(false);
        });
      }
    }
  }, [botId, router]);

  const fetchIntegrations = async () => {
    try {
      const data = await integrationsApi.list(botId);
      setIntegrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Bağlantı testi
  const handleTestConnection = async () => {
    setTestResult(null);
    if (!apiUrl || !apiKey) {
      setTestResult({ success: false, message: "Lütfen en azından Mağaza URL ve API Key alanlarını doldurun." });
      return;
    }
    setTesting(true);
    try {
      const data = await integrationsApi.testConnection({
        provider,
        api_url: apiUrl,
        api_key: apiKey,
        api_secret: apiSecret || undefined,
      });
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Test sırasında hata oluştu." });
    } finally {
      setTesting(false);
    }
  };

  const handleConnectIntegration = async () => {
    setMessage(null);
    const cfg = PROVIDER_LABELS[provider];
    if (!apiUrl || !apiKey || (cfg?.secretRequired && !apiSecret)) {
      setMessage({ text: "Lütfen zorunlu tüm alanları doldurun.", type: "error" });
      return;
    }

    if (provider === "ideasoft") {
      localStorage.setItem("ideasoft_temp_config", JSON.stringify({ apiUrl, apiKey, apiSecret }));
      const shopUrl = apiUrl.replace(/\/$/, "");
      const redirectUri = typeof window !== 'undefined' ? window.location.href.split('?')[0] : "";
      const state = String(botId);
      const authUrl = `${shopUrl}/panel/auth?client_id=${encodeURIComponent(apiKey)}&response_type=code&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      window.location.href = authUrl;
      return;
    }

    setConnecting(true);
    try {
      await integrationsApi.create({
        bot_id: botId,
        provider,
        api_url: apiUrl,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      setMessage({ text: `${provider.toUpperCase()} entegrasyonu başarıyla eklendi!`, type: "success" });
      setApiUrl(""); setApiKey(""); setApiSecret(""); setTestResult(null);
      fetchIntegrations();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || "Bağlanırken bir hata oluştu.", type: "error" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm("Bu entegrasyonu kaldırmak istediğinize emin misiniz?")) return;
    try {
      await integrationsApi.delete(id);
      fetchIntegrations();
      setMessage({ text: "Entegrasyon başarıyla kaldırıldı.", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || "Silinirken hata oluştu.", type: "error" });
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

  const getProviderIcon = (prov: string) => {
    if (prov === "woocommerce") return <ShoppingCart className="w-6 h-6 text-purple-400" />;
    if (prov === "shopify") return <ShoppingBag className="w-6 h-6 text-emerald-400" />;
    if (prov === "ideasoft") return <Store className="w-6 h-6 text-orange-400" />;
    return <Plug className="w-6 h-6 text-indigo-400" />;
  };

  const getProviderBadgeColor = (prov: string) => {
    if (prov === "woocommerce") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (prov === "shopify") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (prov === "ideasoft") return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    if (prov === "ticimax") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{botName || "Yükleniyor..."}</h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 tracking-wider uppercase">
                Entegrasyonlar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/integrations`;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors relative ${isActive ? "text-indigo-400" : "text-gray-400 hover:text-gray-200"
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

      {/* Global Mesaj */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-3 p-4 rounded-xl mb-6 border ${message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
          >
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">

        {/* Aktif Entegrasyonlar */}
        <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
            <LinkIcon className="w-5 h-5 text-indigo-400" /> Aktif E-Ticaret Entegrasyonları
          </h3>

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-black/20 rounded-2xl border border-dashed border-gray-200 dark:border-white/5">
              <Plug className="w-10 h-10 text-gray-500 mx-auto mb-3 opacity-50" />
              <p className="text-gray-600 dark:text-gray-400">Henüz hiçbir mağaza altyapısına bağlanmadınız.</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Aşağıdan yeni entegrasyon ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((intg) => (
                <div
                  key={intg.id}
                  className="bg-gradient-to-br from-white/5 to-transparent border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:border-indigo-500/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                      {getProviderIcon(intg.provider)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white capitalize">{intg.provider}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getProviderBadgeColor(intg.provider)}`}>
                          Aktif
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-0.5 w-40 sm:w-64 truncate">
                        {intg.api_url}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(intg.id)}
                    className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                    title="Entegrasyonu Kaldır"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* WhatsApp Kartı */}
        <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp Cloud API
            </h3>
            {whatsappConfigured ? (
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Yapılandırıldı
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-500/10 px-3 py-1.5 rounded-lg border border-gray-500/20">
                <span className="w-2 h-2 rounded-full bg-gray-500" /> Bağlı Değil
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-green-500/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">WhatsApp Business</h4>
                {whatsappConfigured ? (
                  <div className="space-y-1 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      Phone ID: {botInfo?.whatsapp_phone_id?.slice(0, 8)}...{botInfo?.whatsapp_phone_id?.slice(-4)}
                    </p>
                    <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Webhook alımına hazır
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Meta Developer panelinden aldığınız bilgileri girerek bağlantıyı kurun.
                  </p>
                )}
              </div>
            </div>
            <Link
              href={`/dashboard/bots/${botId}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20 hover:border-green-500/40 shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              {whatsappConfigured ? "Ayarları Düzenle" : "Yapılandır"}
            </Link>
          </div>

          <p className="text-[11px] text-gray-500 mt-4 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-green-500/60" />
            WhatsApp bilgileri Bot Ayarları sayfasından yönetilir. Gelen mesajlar otomatik olarak Gelen Kutusu&apos;nda görünür.
          </p>
        </motion.div>

        {/* Yeni Entegrasyon Ekle Formu */}
        <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <div className="mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
              <Plus className="w-5 h-5 text-purple-400" /> Yeni E-Ticaret Entegrasyonu Ekle
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              Asistanınızın mağazanızdaki ürün, stok, fiyat ve sipariş bilgilerini anlık sorgulayabilmesi için gereklidir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">

            {/* Sağlayıcı Seçimi */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Altyapı Sağlayıcısı
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["ideasoft", "woocommerce", "ticimax", "shopify"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-bold ${provider === p
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-500 hover:border-indigo-500/40 hover:text-gray-300"
                      }`}
                  >
                    {getProviderIcon(p)}
                    <span className="capitalize">{p}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* İpucu Kutusu */}
            {providerConfig.hint && (
              <div className="md:col-span-2 flex items-start gap-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-300/80">{providerConfig.hint}</p>
              </div>
            )}

            {/* IdeaSoft İpucu */}
            {provider === "ideasoft" && (
              <div className="md:col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-blue-400">
                  <strong>Önemli Not:</strong> IdeaSoft entegrasyonu için Mağaza URL'si alanına ana alan adınızı (<code className="text-blue-300">siteniz.com.tr</code>) <strong>değil</strong>, IdeaSoft yönetim paneli alan adınızı (<code className="text-blue-300">siteniz.myideasoft.com</code>) yazmalısınız. Aksi halde onay ekranında yetki parametreleri kaybolur.
                </p>
              </div>
            )}

            {/* Mağaza URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Mağaza URL Adresi <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={
                  provider === "ideasoft"
                    ? "https://maganizin-adi.com"
                    : provider === "shopify"
                      ? "https://magazaadi.myshopify.com"
                      : "https://siteniz.com"
                }
                className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
              />
            </div>

            {/* API Key / Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {providerConfig.key} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={providerConfig.key}
                className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
              />
            </div>

            {/* API Secret / Client Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {providerConfig.secret}{" "}
                {providerConfig.secretRequired ? (
                  <span className="text-red-400">*</span>
                ) : (
                  <span className="text-gray-500 text-xs">(Opsiyonel)</span>
                )}
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={providerConfig.secret}
                className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm tracking-widest"
              />
            </div>

            {/* Test Sonucu */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`md:col-span-2 flex items-start gap-3 p-4 rounded-xl border ${testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-bold">{testResult.message}</p>
                    {testResult.success && testResult.store_name && (
                      <p className="text-xs mt-1 opacity-80">
                        🏪 Mağaza: <strong>{testResult.store_name}</strong>
                        {testResult.product_count !== undefined && testResult.product_count > 0 && (
                          <> &nbsp;·&nbsp; <Package className="w-3 h-3 inline" /> {testResult.product_count} ürün bulundu</>
                        )}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Butonlar */}
            <div className="md:col-span-2 pt-2 flex flex-wrap items-center gap-3">
              {/* Bağlantı Test Et */}
              <button
                onClick={handleTestConnection}
                disabled={testing || connecting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FlaskConical className="w-4 h-4" />
                )}
                {testing ? "Test Ediliyor..." : "Bağlantıyı Test Et"}
              </button>

              {/* Entegrasyonu Kaydet */}
              <button
                onClick={handleConnectIntegration}
                disabled={connecting || testing}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white px-8 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all disabled:opacity-50"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {connecting ? "Kaydediliyor..." : "Entegrasyonu Kaydet"}
              </button>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
