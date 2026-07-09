"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, API_BASE } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, RefreshCcw, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";

export default function ChatTestPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);
  const [botName, setBotName] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    botsApi.get(botId).then((b) => setBotName(b.name)).catch(() => {});
  }, [botId]);

  // Widget'ın yükleneceği API origin'i — dev ortamında FastAPI 8000 portunda
  const apiBase = API_BASE || "http://127.0.0.1:8000";

  // Sahte müşteri sitesi + gerçek widget.js — birebir gömülü görünüm
  const srcDoc = useMemo(() => `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; }
  .navbar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; }
  .logo { font-weight: 800; font-size: 18px; color: #0f172a; }
  .logo span { color: #6366f1; }
  .nav-links { display: flex; gap: 24px; font-size: 14px; color: #64748b; }
  .hero { text-align: center; padding: 72px 24px 56px; }
  .hero h1 { font-size: 34px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
  .hero p { font-size: 16px; color: #64748b; max-width: 480px; margin: 0 auto 24px; line-height: 1.6; }
  .hero button { background: #6366f1; color: #fff; border: none; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; max-width: 900px; margin: 0 auto; padding: 0 24px 72px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
  .card .icon { width: 44px; height: 44px; border-radius: 12px; background: #eef2ff; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 14px; }
  .card h3 { font-size: 15px; margin-bottom: 6px; color: #0f172a; }
  .card p { font-size: 13px; color: #64748b; line-height: 1.5; }
  .footer { text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; background: #fff; }
</style>
</head>
<body>
  <nav class="navbar">
    <div class="logo">Demo<span>Site</span>.com</div>
    <div class="nav-links"><span>Ana Sayfa</span><span>Ürünler</span><span>Hakkımızda</span><span>İletişim</span></div>
  </nav>
  <section class="hero">
    <h1>Web Sitenize Hoş Geldiniz</h1>
    <p>Bu, chatbot widget'ınızın müşterilerinizin sitesinde nasıl görüneceğini gösteren bir demo sayfasıdır. Sağ (veya sol) alttaki sohbet butonuna tıklayın.</p>
    <button>Daha Fazla Bilgi</button>
  </section>
  <section class="cards">
    <div class="card"><div class="icon">🚀</div><h3>Hızlı Kurulum</h3><p>Tek satır kod ile sitenize ekleyin, dakikalar içinde yayında olun.</p></div>
    <div class="card"><div class="icon">🎨</div><h3>Tam Özelleştirme</h3><p>Renk, tema, konum ve davranışları markanıza göre ayarlayın.</p></div>
    <div class="card"><div class="icon">🤖</div><h3>Yapay Zeka Destekli</h3><p>Dokümanlarınızla eğitilmiş bot, müşterilere 7/24 yanıt verir.</p></div>
  </section>
  <div class="footer">© 2026 DemoSite — Widget canlı test ortamı</div>
  <script src="${apiBase}/static/widget.js" data-bot-id="${botId}"></script>
</body>
</html>`, [apiBase, botId, reloadKey]);

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
    <div className="pb-8 max-w-6xl mx-auto h-[calc(100vh-80px)] flex flex-col">
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
                  Gerçek Widget · Site Simülasyonu
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport toggle */}
            <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setViewport("desktop")}
                className={`p-2 rounded-lg transition-all ${viewport === "desktop" ? "bg-indigo-500/20 text-indigo-300" : "text-gray-500 hover:text-white"}`}
                title="Masaüstü görünümü"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewport("mobile")}
                className={`p-2 rounded-lg transition-all ${viewport === "mobile" ? "bg-indigo-500/20 text-indigo-300" : "text-gray-500 hover:text-white"}`}
                title="Mobil görünümü"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="p-2 text-gray-500 hover:bg-white/5 hover:text-white rounded-xl transition-all"
              title="Sayfayı Yenile (widget baştan yüklenir)"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
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

      {/* Browser frame + iframe */}
      <div className="flex-1 min-h-0 flex flex-col items-center">
        <div
          className={`flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 ${
            viewport === "mobile" ? "w-[390px] max-w-full" : "w-full"
          }`}
        >
          {/* Fake browser bar */}
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
          Bu, sitenize gömülen <code className="text-indigo-400">widget.js</code>&apos;in birebir kendisidir — ayarlarda yaptığınız değişiklikleri görmek için kaydedin ve yenile butonuna basın.
        </p>
      </div>
    </div>
  );
}
