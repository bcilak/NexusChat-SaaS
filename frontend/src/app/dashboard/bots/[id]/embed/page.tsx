"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, API_BASE } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Code2, Copy, CheckCircle2, ChevronRight, Laptop } from "lucide-react";
import Link from "next/link";

export default function EmbedPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);
  const [botName, setBotName] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  useEffect(() => {
    botsApi.get(botId).then((b) => setBotName(b.name)).catch(() => {});
  }, [botId]);

  const embedCode = `<script src="${API_BASE}/static/widget.js" data-bot-id="${botId}"></script>`;

  const htmlPreview = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Chatbot Test</title>
</head>
<body>
  <h1>Web Sitem</h1>
  <p>Bu sayfada chatbot widget'ı test edebilirsiniz.</p>

  <!-- AI Chatbot Widget -->
  ${embedCode}
</body>
</html>`;

  const copyToClipboard = (text: string, isFullHtml: boolean) => {
    navigator.clipboard.writeText(text);
    if(isFullHtml) {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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
            <Code2 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{botName || "Yükleniyor..."}</h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="px-2.5 py-0.5 rounded-md bg-stone-500/10 text-stone-300 border border-stone-500/20 tracking-wider uppercase">
                Kurulum & Yayın
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-px">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/embed`;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Embed Input */}
        <div className="space-y-6">
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Entegre Etmeye Hazırsınız</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Platformunuza asistanınızı kurmak için aşağıdaki JavaScript kodunu sayfanızdaki <code className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">&lt;body&gt;</code> etiketinin en sonuna yapıştırın.
            </p>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500 -z-10" />
              <div className="relative bg-gray-100 dark:bg-[#0d0d14] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden z-10 p-1">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                  </div>
                  <button 
                    onClick={() => copyToClipboard(embedCode, false)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedCode ? "Kopyalandı" : "Kopyala"}
                  </button>
                </div>
                <div className="p-5 overflow-x-auto text-[13px] font-mono text-indigo-800 dark:text-indigo-200">
                  <pre className="whitespace-pre-wrap">{embedCode}</pre>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6">
            <h4 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2">
              <Laptop className="w-5 h-5" /> Adım Adım Kurulum
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Kodu Kopyalayın</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Yukarıdaki siyah alanda bulunan betiği cihazınıza kopyalayın.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Web Sitenize Ekleyin</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Shopify, Ticimax, WordPress veya özel yazılım panelinizdeki footer alanına (&lt;/body&gt;'den önce) yapıştırın.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"><CheckCircle2 className="w-3.5 h-3.5" /></div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Kullanıma Hazır</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Canlıya aldığınız anda widget sayfanızın köşesinde belirecek ve çalışmaya başlayacaktır.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Full HTML Preview */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
               <Code2 className="w-5 h-5 text-gray-600 dark:text-gray-400" /> Tam Sayfa Örneği
             </h3>
             <button 
                onClick={() => copyToClipboard(htmlPreview, true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-gray-900 dark:text-white transition-colors"
              >
                {copiedHtml ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Tümünü Kopyala
              </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Eğer bir CMS sistemi kullanmıyorsanız ve salt HTML üzerinden deneme yapmak istiyorsanız bu temel yapıyı baz alabilirsiniz.
          </p>

          <div className="bg-gray-100 dark:bg-[#0a0a0f] border border-gray-200 dark:border-white/5 rounded-2xl flex-grow overflow-hidden custom-scrollbar">
            <pre className="p-6 text-[12px] font-mono leading-relaxed overflow-x-auto h-full text-gray-700 dark:text-gray-300">
{`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Chatbot Entegrasyon Testi</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #fafafa; }
    .demo-content { max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
  </style>
</head>
<body>
  <div class="demo-content">
    <h1 style="color: #2563eb;">E-Ticaret Mağazanız</h1>
    <p style="color: #4b5563; line-height: 1.6;">
      Bu sayfa üzerinden chatbotunuzun nasıl göründüğünü 
      sayfanın sağ alt köşesinden test edebilirsiniz. 
      Eğitilen tüm özellikler bu arayüzde çalışacaktır.
    </p>
  </div>

  <!-- AI Chatbot Script (Bitiş) -->
  <span style="color: #6366f1;">${embedCode}</span>
</body>
</html>`}
            </pre>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
