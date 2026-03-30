"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { integrationsApi, botsApi } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, CheckCircle2, AlertCircle, Plug, Link as LinkIcon, ShoppingBag, ShoppingCart, Info, Trash2, Plus, Smartphone, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";

interface BotInfo {
  id: number;
  name: string;
  whatsapp_phone_id?: string | null;
  whatsapp_token?: string | null;
  whatsapp_verify_token?: string | null;
}

export default function IntegrationsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);

  const [botName, setBotName] = useState("");
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [provider, setProvider] = useState("woocommerce");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [connecting, setConnecting] = useState(false);

  const whatsappConfigured = !!(botInfo?.whatsapp_phone_id && botInfo?.whatsapp_token);

  useEffect(() => {
    botsApi.get(botId).then((b: BotInfo) => { setBotName(b.name); setBotInfo(b); }).catch(() => {});
    fetchIntegrations();
  }, [botId]);

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

  const handleConnectIntegration = async () => {
    setMessage(null);
    if (!apiUrl || !apiKey || (!apiSecret && provider !== "ticimax")) {
      setMessage({ text: "Lütfen gerekli tüm alanları doldurun.", type: "error" });
      return;
    }

    setConnecting(true);
    try {
      await integrationsApi.create({
        bot_id: botId,
        provider: provider,
        api_url: apiUrl,
        api_key: apiKey,
        api_secret: apiSecret
      });

      setMessage({ text: `${provider.toUpperCase()} entegrasyonu başarıyla sağlandı!`, type: "success" });
      setApiUrl(""); setApiKey(""); setApiSecret("");
      fetchIntegrations();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || "Bağlanırken bir hata oluştu.", type: "error" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: number) => {
    if(!confirm("Bu entegrasyonu tamamen kaldırmak istediğinize emin misiniz?")) return;
    try {
      await integrationsApi.delete(id);
      fetchIntegrations();
      setMessage({ text: "Entegrasyon başarıyla kaldırıldı.", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch(err: any) {
      setMessage({ text: err.message || "Silinirken hata oluştu.", type: "error" });
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

  const getProviderIcon = (prov: string) => {
    if (prov === "woocommerce") return <ShoppingCart className="w-6 h-6 text-purple-400" />;
    if (prov === "shopify") return <ShoppingBag className="w-6 h-6 text-emerald-400" />;
    return <Plug className="w-6 h-6 text-indigo-400" />;
  };

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{botName || "Yükleniyor..."}</h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 tracking-wider uppercase">
                Entegrasyonlar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/integrations`;
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

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
        
        <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
            <LinkIcon className="w-5 h-5 text-indigo-400" /> Aktif E-Ticaret Entegrasyonları
          </h3>
          
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/5 border-dashed">
              <Plug className="w-10 h-10 text-gray-500 mx-auto mb-3 opacity-50" />
              <p className="text-gray-600 dark:text-gray-400">Henüz hiçbir mağaza altyapısına bağlanmadınız.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map(intg => (
                <div key={intg.id} className="bg-gradient-to-br from-white/5 to-transparent border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                      {getProviderIcon(intg.provider)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white capitalize">{intg.provider}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-1 w-40 sm:w-64 truncate">{intg.api_url}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDisconnect(intg.id)} 
                    className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                    title="Bağlantıyı Kes"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* WhatsApp Cloud API Integration Card */}
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

        {integrations.length === 0 && (
          <motion.div variants={itemVariants} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            
            <div className="mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                <Plus className="w-5 h-5 text-purple-400" /> Yeni Entegrasyon Ekle
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                Asistanınızın mağazanızdaki ürünleri, stok ve fiyat bilgisini anlık çekebilmesi için gereklidir.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Altyapı Sağlayıcısı</label>
                <select 
                  value={provider} 
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm appearance-none"
                >
                  <option value="woocommerce">WooCommerce</option>
                  <option value="shopify">Shopify</option>
                  <option value="ticimax">Ticimax</option>
                  <option value="ideasoft">IdeaSoft</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Mağaza URL Adresi</label>
                <input 
                  type="url" 
                  value={apiUrl} 
                  onChange={e => setApiUrl(e.target.value)} 
                  placeholder="https://siteniz.com"
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {provider === "ticimax" ? "Client ID (Key)" : "API Anahtarı (Key)"}
                </label>
                <input 
                  type="text" 
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)} 
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {provider === "ticimax" ? "Client Secret (Opsiyonel)" : "API Sırrı (Secret)"}
                </label>
                <input 
                  type="password" 
                  value={apiSecret} 
                  onChange={e => setApiSecret(e.target.value)} 
                  className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm tracking-widest"
                />
              </div>
              
              <div className="md:col-span-2 pt-4">
                <button 
                  onClick={handleConnectIntegration}
                  disabled={connecting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-gray-900 dark:text-white px-8 py-3.5 rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all disabled:opacity-50"
                >
                  {connecting ? "Bağlanıyor..." : "Entegrasyonu Başlat"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
