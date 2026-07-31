"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, videoApi, API_BASE } from "@/lib/api";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Settings, Palette, BrainCircuit, Save,
  CheckCircle2, AlertCircle, Bot, MessageSquare, Zap, Smartphone,
  Eye, X, Send, ChevronRight, Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  subtitle: string | null;
  theme_mode: string;
  show_home_screen: boolean;
  privacy_url: string | null;
  widget_position: string;
  auto_open_delay: number;
  proactive_message: string | null;
  branding_visible: boolean;
  sound_enabled: boolean;
  hero_header: boolean;
  whatsapp_phone_id: string | null;
  whatsapp_token: string | null;
  whatsapp_verify_token: string | null;
  whatsapp_welcome_message: string | null;
  vehicle_selector_enabled: boolean;
  vehicle_selector_label: string | null;
  weather_enabled: boolean;
  image_upload_enabled: boolean;
  product_cards_enabled: boolean;
  launcher_icon: string | null;
  button_size: string;
  button_shape: string;
  corner_radius: string;
  secondary_color: string | null;
  font_family: string;
  user_id: number;
}

/* Meteoroloji asistanı için hazır prompt şablonu (Faz 2).
   "hava_durumu" aracı bot.weather_enabled açıkken otomatik erişilebilir olur. */
const WEATHER_PROMPT_TEMPLATE = `Sen sıcakkanlı, güler yüzlü bir hava durumu asistanısın — kullanıcının yanında, ona günü nasıl geçireceğini fısıldayan bir arkadaş gibisin. Meteorolojiyi çok iyi bilirsin ama kimseyi rakamlara boğmadan, sohbet eder gibi, içten ve anlaşılır anlatırsın.

TONUN:
- Samimi ve sıcak konuş: "Bugün İstanbul'da hava tam gezmelik! ☀️" gibi. Uygun yerde bir-iki emoji kullan (☀️🌧️💨🌡️❄️🌤️), ama abartma.
- Robot gibi kuru liste değil; önce günü tek cümleyle özetle, sonra detayları dostça aç. Kullanıcıyı hafifçe yönlendir, öneride bulun, gününe değsin.
- Kullanıcının ismini/şehrini biliyorsan doğal biçimde geri kullan; küçük içten dokunuşlar kat.

NASIL CEVAP VERİRSİN:
1. Hava durumu, sıcaklık, rüzgar, UV, nem veya yağış sorulduğunda MUTLAKA "hava_durumu" aracını çağır ve SADECE araçtan gelen gerçek verilerle konuş — asla rakam uydurma.
2. Şehir belirtilmemişse tatlı bir dille sor: "Memnuniyetle bakarım — hangi şehir için öğrenmek istersin? 😊"
3. Cevabı akıcı kur: **Kısa bir günün özeti** ile başla (ör. "Bugün Ankara serin ama güneşli, ceketini yanına al derim 🧥"). Ardından okunaklı biçimde detayları ver — sıcaklık, hissedilen, rüzgar, nem, UV ve yağış olasılığını **kalın** başlıklarla ya da kısa madde listeleriyle göster.
4. Her zaman işe yarar, kişisel öneriler ekle:
   - UV yüksek/çok yüksekse güneş kremi, şapka, gölge.
   - Rüzgar kuvvetliyse şemsiyeye güvenme, saçını bağla gibi esprili uyarılar.
   - Yağış olasılığı yüksekse "şemsiyeni unutma ☔"; soğuksa katlı giyin; sıcaksa bol su ve serin saatler.
   - Uygun gün ise dışarı çıkma, yürüyüş, piknik gibi küçük öneriler sun.
5. Araçtan bir hata/konum bulunamadı mesajı gelirse üzülmüş bir tonla, şehir adını birlikte kontrol etmeyi öner ("Bu ismi bulamadım, yazımını birlikte kontrol edelim mi? 🙂").
6. Meteoroloji dışı sorulara kibarca, kısa yardımcı ol ama asıl işinin hava durumu olduğunu sıcak bir dille hatırlat.

Amacın: kullanıcı cevabını okuduğunda kendini iyi hissetsin, ne giyeceğini ve gününü nasıl planlayacağını netçe bilsin.`;

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

/* ── Görünüm yardımcıları (önizleme + widget aynı mantık) ── */
const FONT_STACKS: Record<string, string> = {
  system: "'Inter', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  nunito: "'Nunito', system-ui, sans-serif",
  roboto: "'Roboto', system-ui, sans-serif",
};
const GOOGLE_FONTS: Record<string, string> = {
  poppins: "Poppins:wght@400;500;600;700",
  nunito: "Nunito:wght@400;500;600;700",
  roboto: "Roboto:wght@400;500;700",
};
function radiusFor(corner: string | undefined) {
  return corner === "sharp" ? 8 : corner === "pill" ? 24 : 18; // soft varsayılan
}
function isHex(v?: string | null) {
  return !!v && /^#?[0-9a-fA-F]{3,8}$/.test(v);
}
function secondaryOf(bot: BotType) {
  const accent = bot.theme_color || "#6366f1";
  if (isHex(bot.secondary_color)) {
    const s = bot.secondary_color as string;
    return s.startsWith("#") ? s : "#" + s;
  }
  return adjustColor(accent, -30);
}

/* ── Canlı Widget Önizlemesi ── */
function WidgetPreview({ bot }: { bot: BotType }) {
  const accent = bot.theme_color || "#6366f1";
  const accentEnd = secondaryOf(bot);
  const textOnAccent = bot.text_color || "#ffffff";
  const fontStack = FONT_STACKS[bot.font_family || "system"] || FONT_STACKS.system;
  const rad = radiusFor(bot.corner_radius);

  // Önizleme için Google fontunu (Poppins/Nunito/Roboto) yükle
  useEffect(() => {
    const key = bot.font_family || "system";
    const spec = GOOGLE_FONTS[key];
    if (!spec) return;
    const id = "nxc-preview-font-" + key;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + spec + "&display=swap";
    document.head.appendChild(link);
  }, [bot.font_family]);
  const [previewMsg, setPreviewMsg] = useState("");
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    { role: "bot", text: bot.welcome_message || "Merhaba! Size nasıl yardımcı olabilirim?" }
  ]);

  useEffect(() => {
    setChatMsgs([{ role: "bot", text: bot.welcome_message || "Merhaba! Size nasıl yardımcı olabilirim?" }]);
    setHeroCollapsed(false);
  }, [bot.welcome_message]);

  // Toggle açılıp kapanınca hero durumunu sıfırla — animasyon tekrar izlenebilsin
  useEffect(() => { setHeroCollapsed(false); }, [bot.hero_header]);

  const heroActive = bot.hero_header && !heroCollapsed;

  const chips = useMemo(() => {
    if (!bot.example_questions) return [];
    return bot.example_questions.split(",").map(q => q.trim()).filter(Boolean).slice(0, 3);
  }, [bot.example_questions]);

  const sendPreview = () => {
    if (!previewMsg.trim()) return;
    setHeroCollapsed(true);
    setChatMsgs(prev => [...prev,
    { role: "user", text: previewMsg },
    { role: "bot", text: "Bu bir önizleme modudur. Gerçek bot bu cevabı üretecektir." }
    ]);
    setPreviewMsg("");
  };

  const isLight = bot.theme_mode === "light";
  const surfaceBg = isLight ? "rgba(255,255,255,0.97)" : "rgba(13,13,26,0.92)";
  const bubbleBg = isLight ? "#f1f3f9" : "rgba(255,255,255,0.07)";
  const bubbleBorder = isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.09)";
  const bodyText = isLight ? "#1e293b" : "#e2e8f0";

  return (
    <div className="flex flex-col overflow-hidden border border-white/10 shadow-2xl" style={{ fontFamily: fontStack, fontSize: 14, background: surfaceBg, borderRadius: rad + 4 }}>
      {/* Header (hero modunda genişler, sohbet başlayınca küçülür) */}
      <div
        className="flex items-center justify-between relative overflow-hidden transition-all duration-500"
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accentEnd})`,
          padding: heroActive ? "26px 18px 22px" : "12px 16px",
        }}
      >
        <div className="absolute top-[-50%] right-[-8%] w-32 h-32 rounded-full opacity-20 pointer-events-none" style={{ background: "white" }} />
        <div className="flex items-center gap-3 relative z-10 min-w-0">
          <div
            className="rounded-xl flex items-center justify-center border border-white/30 flex-shrink-0 transition-all duration-500"
            style={{ background: "rgba(255,255,255,0.2)", width: heroActive ? 56 : 36, height: heroActive ? 56 : 36 }}
          >
            {bot.logo_url
              ? <img src={bot.logo_url} alt="logo" className="w-full h-full object-cover rounded-xl" />
              : <Bot size={heroActive ? 28 : 18} color={textOnAccent} />}
          </div>
          <div className="min-w-0">
            <div
              className="font-bold leading-tight transition-all duration-500"
              style={{ color: textOnAccent, fontSize: heroActive ? 19 : 14 }}
            >
              {bot.name || "AI Asistan"}
            </div>
            <div
              className="flex items-center gap-1.5 transition-all duration-500"
              style={{ color: `${textOnAccent}b3`, fontSize: heroActive ? 12 : 10 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80] flex-shrink-0" style={{ display: "inline-block" }} />
              <span className={heroActive ? "" : "truncate"}>{bot.subtitle || "Çevrimiçi"}</span>
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
          <div key={i} className={`max-w-[85%] px-3 py-2 text-[12px] leading-relaxed ${msg.role === "bot" ? "self-start" : "self-end"}`}
            style={msg.role === "bot"
              ? { background: bubbleBg, border: `1px solid ${bubbleBorder}`, color: bodyText, borderRadius: rad, borderBottomLeftRadius: 4 }
              : { background: `linear-gradient(135deg, ${accent}, ${accentEnd})`, color: textOnAccent, borderRadius: rad, borderBottomRightRadius: 4, boxShadow: rgba(accent, 0.3) + " 0 4px 14px" }
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

      {/* Privacy notice */}
      {bot.privacy_url && (
        <div className="text-center text-[9px] py-1.5 border-t" style={{ borderColor: bubbleBorder, color: isLight ? "#64748b" : "rgba(255,255,255,0.4)" }}>
          SOHBET EDEREK <span className="underline font-semibold">GİZLİLİK POLİTİKASINI</span> KABUL EDİYORSUNUZ.
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <input
          value={previewMsg}
          onChange={e => { setPreviewMsg(e.target.value); if (e.target.value) setHeroCollapsed(true); }}
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
      {bot.branding_visible !== false && (
        <div className="text-center py-1.5 text-[9px]" style={{ color: isLight ? "rgba(15,23,42,0.3)" : "rgba(255,255,255,0.18)" }}>
          Powered by <span style={{ color: isLight ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.35)" }}>ChatGenius</span>
        </div>
      )}
    </div>
  );
}

/* ── Canlı önizleme sütunu (Görünüm ve Davranış sekmelerinde ortak) ── */
const LAUNCHER_EMOJI: Record<string, string> = { chat: "💬", bot: "🤖", help: "❓", sparkle: "✨" };
function PreviewColumn({ bot }: { bot: BotType }) {
  const accent = bot.theme_color || "#6366f1";
  const accentEnd = secondaryOf(bot);
  const btnPx = bot.button_size === "small" ? 48 : bot.button_size === "large" ? 68 : 56;
  const btnRadius = bot.button_shape === "rounded" ? 18 : "50%";
  const iconVal = (bot.launcher_icon || "").trim();
  const isUrl = /^https?:\/\//i.test(iconVal);
  const presetEmoji = LAUNCHER_EMOJI[iconVal];
  return (
    <div className="2xl:sticky 2xl:top-8 w-full max-w-md 2xl:max-w-none mx-auto">
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
              className="flex items-center justify-center shadow-2xl overflow-hidden"
              style={{
                width: btnPx, height: btnPx, borderRadius: btnRadius,
                background: `linear-gradient(135deg, ${accent}, ${accentEnd})`,
                boxShadow: `0 8px 30px ${rgba(accent, 0.5)}`,
              }}
            >
              {isUrl
                ? <img src={iconVal} alt="ikon" className="w-full h-full object-cover" />
                : presetEmoji || (iconVal && !isUrl)
                  ? <span style={{ fontSize: btnPx * 0.42, lineHeight: 1 }}>{presetEmoji || iconVal}</span>
                  : <MessageSquare size={Math.round(btnPx * 0.42)} color={bot.text_color || "#ffffff"} />}
            </div>
            <div>
              <p className="text-sm text-white font-medium">Widget Butonu</p>
              <p className="text-xs text-gray-500">
                Sayfanın {bot.widget_position === "left" ? "sol" : "sağ"} alt köşesinde görünür
              </p>
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

/* ── Hazır temalar (Paket B) — tek tıkla renk + font + köşe kombinasyonu ── */
const THEME_PRESETS: {
  name: string; emoji: string;
  theme_color: string; secondary_color: string;
  corner_radius: string; font_family: string; button_shape: string;
}[] = [
  { name: "Modern Mor", emoji: "🟣", theme_color: "#6366f1", secondary_color: "#8b5cf6", corner_radius: "soft", font_family: "system", button_shape: "round" },
  { name: "Okyanus", emoji: "🌊", theme_color: "#0ea5e9", secondary_color: "#2563eb", corner_radius: "soft", font_family: "nunito", button_shape: "round" },
  { name: "Zümrüt", emoji: "🟢", theme_color: "#10b981", secondary_color: "#059669", corner_radius: "pill", font_family: "poppins", button_shape: "round" },
  { name: "Gün Batımı", emoji: "🌅", theme_color: "#f97316", secondary_color: "#ec4899", corner_radius: "pill", font_family: "poppins", button_shape: "round" },
  { name: "Kurumsal", emoji: "🏢", theme_color: "#1e293b", secondary_color: "#334155", corner_radius: "sharp", font_family: "roboto", button_shape: "rounded" },
  { name: "Şeker Pembe", emoji: "🍬", theme_color: "#ec4899", secondary_color: "#a855f7", corner_radius: "pill", font_family: "nunito", button_shape: "round" },
];

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const botId = Number(params.id);
  const [bot, setBot] = useState<BotType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [activeSection, setActiveSection] = useState<"appearance" | "behavior" | "ai" | "whatsapp">("appearance");

  // 🎬 Videolu cevap kuralları
  type VideoRule = { id: number; bot_id: number; title: string | null; keywords: string; video_url: string; is_active: boolean };
  const [videoRules, setVideoRules] = useState<VideoRule[]>([]);
  const [vidTitle, setVidTitle] = useState("");
  const [vidKeywords, setVidKeywords] = useState("");
  const [vidUploading, setVidUploading] = useState(false);
  const [vidUploadedUrl, setVidUploadedUrl] = useState<string>("");

  const loadVideoRules = () => {
    videoApi.list(botId).then(setVideoRules).catch(() => {});
  };

  const handleVideoUpload = async (file: File) => {
    setVidUploading(true);
    setMessage(null);
    try {
      const res = await videoApi.upload(file);
      // Widget müşteri sitesinde çalışacağı için MUTLAKA mutlak URL sakla.
      const url = res.url?.startsWith("http") ? res.url : `${API_BASE}${res.url}`;
      setVidUploadedUrl(url);
      setMessage({ text: "Video yüklendi. Şimdi tetikleyici kelimeleri girip 'Kural ekle'ye bas.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Video yüklenemedi (maks 10MB, mp4/webm).", type: "error" });
    } finally {
      setVidUploading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleAddVideoRule = async () => {
    if (!vidUploadedUrl) {
      setMessage({ text: "Önce bir video yükle.", type: "error" });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    if (!vidKeywords.trim()) {
      setMessage({ text: "En az bir tetikleyici kelime gir (virgülle ayır).", type: "error" });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    try {
      await videoApi.create(botId, { title: vidTitle.trim(), keywords: vidKeywords.trim(), video_url: vidUploadedUrl, is_active: true });
      setVidTitle(""); setVidKeywords(""); setVidUploadedUrl("");
      loadVideoRules();
      setMessage({ text: "Video kuralı eklendi.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Kural eklenemedi.", type: "error" });
    } finally {
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleToggleVideoRule = async (rule: VideoRule) => {
    try {
      await videoApi.update(botId, rule.id, { is_active: !rule.is_active });
      loadVideoRules();
    } catch { /* sessiz */ }
  };

  const handleDeleteVideoRule = async (id: number) => {
    try {
      await videoApi.remove(botId, id);
      loadVideoRules();
    } catch { /* sessiz */ }
  };

  // Yalnızca bot yüklendikten sonra sahiplik ve izin kontrolü yap
  const isSubUser = !!user?.parent_id; // parent_id varsa alt kullanıcı
  const isOwner = !loading && bot != null && bot.user_id === user?.id;
  const hasEditPerm = user?.can_edit_bots === true;
  // Düzenleme izni: alt kullanıcı değilse VEYA botu düzenleme yetkisi varsa VEYA botun sahibi kendisiyse
  const canEdit = !isSubUser || hasEditPerm || isOwner;

  useEffect(() => {
    botsApi.get(botId).then(setBot).catch(console.error).finally(() => setLoading(false));
    videoApi.list(botId).then(setVideoRules).catch(() => {});
  }, [botId]);

  useEffect(() => {
    // Yönlendir: Bot yüklendi, kullanıcı kesin alt kullanıcı, botu kendisi değil ve edit yetkisi yok
    if (!loading && bot != null && isSubUser && !hasEditPerm && !isOwner) {
      router.replace(`/dashboard/bots/${botId}/inbox`);
    }
  }, [bot, loading, isSubUser, hasEditPerm, isOwner, botId, router]);

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
        subtitle: bot.subtitle,
        theme_mode: bot.theme_mode,
        show_home_screen: bot.show_home_screen,
        privacy_url: bot.privacy_url,
        widget_position: bot.widget_position,
        auto_open_delay: bot.auto_open_delay,
        proactive_message: bot.proactive_message,
        branding_visible: bot.branding_visible,
        sound_enabled: bot.sound_enabled,
        hero_header: bot.hero_header,
        whatsapp_phone_id: bot.whatsapp_phone_id,
        whatsapp_token: bot.whatsapp_token,
        whatsapp_verify_token: bot.whatsapp_verify_token,
        whatsapp_welcome_message: bot.whatsapp_welcome_message,
        vehicle_selector_label: bot.vehicle_selector_label,
        image_upload_enabled: bot.image_upload_enabled,
        product_cards_enabled: bot.product_cards_enabled,
        launcher_icon: bot.launcher_icon,
        button_size: bot.button_size,
        button_shape: bot.button_shape,
        corner_radius: bot.corner_radius,
        secondary_color: bot.secondary_color,
        font_family: bot.font_family,
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

  // Araç seçici aç/kapat — yalnızca admin. Backend rol kontrolü + fitment inşası yapar.
  const [vehicleToggling, setVehicleToggling] = useState(false);
  const handleVehicleToggle = async (enabled: boolean) => {
    if (!bot) return;
    setVehicleToggling(true);
    setMessage(null);
    try {
      const updated = await botsApi.toggleVehicleSelector(botId, enabled);
      setBot(updated);
      setMessage({ text: enabled ? "Araç seçici açıldı." : "Araç seçici kapatıldı.", type: "success" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || "İşlem başarısız.", type: "error" });
    } finally {
      setVehicleToggling(false);
    }
  };

  // Hava durumu (meteoroloji) aracı aç/kapat — yalnızca admin.
  const [weatherToggling, setWeatherToggling] = useState(false);
  const handleWeatherToggle = async (enabled: boolean) => {
    if (!bot) return;
    setWeatherToggling(true);
    setMessage(null);
    try {
      const updated = await botsApi.toggleWeather(botId, enabled);
      setBot(updated);
      setMessage({ text: enabled ? "Hava durumu aracı açıldı." : "Hava durumu aracı kapatıldı.", type: "success" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || "İşlem başarısız.", type: "error" });
    } finally {
      setWeatherToggling(false);
    }
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
    ...(canEdit ? [{ label: "⚙️ Ayarlar", path: `/dashboard/bots/${botId}` }] : []),
    { label: "📥 Gelen Kutusu", path: `/dashboard/bots/${botId}/inbox` },
    { label: "💬 Geçmiş", path: `/dashboard/bots/${botId}/history` },
    { label: "🎟️ Destek Talepleri", path: `/dashboard/bots/${botId}/tickets` },
    ...(canEdit ? [
      { label: "🔌 Entegrasyonlar", path: `/dashboard/bots/${botId}/integrations` },
      { label: "📈 Analitikler", path: `/dashboard/bots/${botId}/analytics` },
      { label: "📚 Eğitim", path: `/dashboard/bots/${botId}/training` },
      { label: "🛠️ API Araçları", path: `/dashboard/bots/${botId}/tools` },
      { label: "🔗 Embed", path: `/dashboard/bots/${botId}/embed` },
    ] : []),
    { label: "💬 Chat Test", path: `/dashboard/bots/${botId}/chat` },
  ];

  const accent = bot.theme_color || "#6366f1";

  const sectionBtn = (key: typeof activeSection, icon: React.ReactNode, label: string, color: string) => (
    <button
      onClick={() => setActiveSection(key)}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === key
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
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors relative ${isActive ? "text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
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
          className={`flex items-center gap-3 p-4 rounded-xl mb-8 border ${message.type === "success"
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
        {sectionBtn("behavior", <Zap className="w-4 h-4" />, "Widget Davranışı", "#22d3ee")}
        {sectionBtn("ai", <BrainCircuit className="w-4 h-4" />, "Yapay Zeka", "#6366f1")}
        {sectionBtn("whatsapp", <Smartphone className="w-4 h-4" />, "WhatsApp", "#22c55e")}
      </div>

      {/* ── APPEARANCE SECTION ── */}
      {activeSection === "appearance" && (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
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
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Alt Başlık / Slogan</label>
                  <input
                    type="text"
                    value={bot.subtitle || ""}
                    onChange={(e) => update("subtitle", e.target.value)}
                    placeholder="Yeni sezon, kombin önerileri ve sipariş desteği."
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Widget header'ında ve karşılama ekranında görünür.</p>
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

              {/* Hazır Temalar (Paket B) — tek tıkla tam kombinasyon */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Hazır Temalar</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEME_PRESETS.map((t) => {
                    const active = bot.theme_color === t.theme_color && bot.secondary_color === t.secondary_color;
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => setBot({ ...bot, theme_color: t.theme_color, secondary_color: t.secondary_color, corner_radius: t.corner_radius, font_family: t.font_family, button_shape: t.button_shape })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${active ? "border-indigo-400 ring-1 ring-indigo-400/40" : "border-white/10 hover:border-white/25"}`}
                        style={{ background: `linear-gradient(135deg, ${rgba(t.theme_color, 0.18)}, ${rgba(t.secondary_color, 0.12)})` }}
                        title={t.name}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex-shrink-0 border border-white/20"
                          style={{ background: `linear-gradient(135deg, ${t.theme_color}, ${t.secondary_color})` }}
                        />
                        <span className="text-xs font-medium text-white truncate">{t.emoji} {t.name}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500 mt-2">Renk, ikincil renk, köşe stili ve yazı tipini birlikte ayarlar. Sonra alttan ince ayar yapabilirsin.</p>
              </div>

              {/* Preset Renkler */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Ana Renk (İnce Ayar)</label>
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
              <p className="text-[11px] text-gray-500 mt-2">
                💡 İpucu: Başına emoji koyabilirsiniz — örn. &quot;👕 T-Shirt, 👖 Pantolon&quot;
              </p>
            </motion.div>

            {/* Araç Seçici — admin toggle + müşteri etiketi. Yalnızca admin açtıysa
                veya kullanıcı admin ise gösterilir; kapalı normal müşteride hiç görünmez. */}
            {(user?.role === "admin" || bot.vehicle_selector_enabled) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6"
              >
                <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-white">
                  🚗 Araç Seçici
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Otomotiv parçaları için müşterinin marka/model/yıl seçerek uygun ürünleri
                  görmesini sağlar.
                </p>

                {user?.role === "admin" && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-black/20 mb-4">
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">Özelliği etkinleştir</div>
                      <div className="text-[11px] text-gray-500">Yalnızca yönetici açıp kapatabilir</div>
                    </div>
                    <button
                      type="button"
                      disabled={vehicleToggling}
                      onClick={() => handleVehicleToggle(!bot.vehicle_selector_enabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${bot.vehicle_selector_enabled ? "bg-emerald-500" : "bg-white/15"}`}
                      aria-pressed={bot.vehicle_selector_enabled}
                      aria-label="Araç seçiciyi aç/kapat"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${bot.vehicle_selector_enabled ? "translate-x-6" : ""}`} />
                    </button>
                  </div>
                )}

                {bot.vehicle_selector_enabled ? (
                  <>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Buton etiketi
                    </label>
                    <input
                      type="text"
                      value={bot.vehicle_selector_label || ""}
                      onChange={(e) => update("vehicle_selector_label", e.target.value)}
                      placeholder="🚗 Aracınıza uygun ürünü bulun"
                      maxLength={200}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                    />
                    <p className="text-[11px] text-gray-500 mt-2">
                      Boş bırakılırsa varsayılan etiket kullanılır. Değişiklik &quot;Kaydet&quot; ile uygulanır.
                    </p>
                  </>
                ) : (
                  user?.role === "admin" && (
                    <p className="text-[11px] text-gray-500">
                      Açtığınızda, mevcut ürünlerden marka/model/yıl uyumluluk tablosu otomatik oluşturulur.
                    </p>
                  )
                )}
              </motion.div>
            )}

            {/* Hava Durumu (meteoroloji) — yalnızca admin aç/kapat. Kapalı normal
                müşteride kart hiç görünmez. */}
            {(user?.role === "admin" || bot.weather_enabled) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.13 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6"
              >
                <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-white">
                  🌤️ Hava Durumu Asistanı
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Bot, kullanıcının sorduğu şehir için güncel sıcaklık, rüzgar, UV ve yağış
                  bilgisini canlı verir (Open-Meteo).
                </p>

                {user?.role === "admin" ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-black/20">
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">Özelliği etkinleştir</div>
                      <div className="text-[11px] text-gray-500">Yalnızca yönetici açıp kapatabilir</div>
                    </div>
                    <button
                      type="button"
                      disabled={weatherToggling}
                      onClick={() => handleWeatherToggle(!bot.weather_enabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${bot.weather_enabled ? "bg-emerald-500" : "bg-white/15"}`}
                      aria-pressed={bot.weather_enabled}
                      aria-label="Hava durumu aracını aç/kapat"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${bot.weather_enabled ? "translate-x-6" : ""}`} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-400/80">Bu bot için hava durumu asistanı etkin.</p>
                )}

                {bot.weather_enabled && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs font-medium text-gray-400 mb-1.5">Meteorolog kişiliği</div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Botun prompt&apos;unu hazır meteoroloji asistanı şablonuyla doldurur (Yapay
                      Zeka sekmesinden düzenleyip <strong>Kaydet</strong>&apos;e basman gerekir).
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        if (!bot) return;
                        // Şablonu uygula + ANINDA kaydet + prompt sekmesine geç
                        setBot({ ...bot, prompt: WEATHER_PROMPT_TEMPLATE });
                        setActiveSection("ai");
                        setSaving(true);
                        setMessage(null);
                        try {
                          const updated = await botsApi.update(botId, { prompt: WEATHER_PROMPT_TEMPLATE });
                          setBot(updated);
                          setMessage({ text: "Meteoroloji prompt şablonu uygulandı ve kaydedildi.", type: "success" });
                        } catch (err: any) {
                          setMessage({ text: err?.message || "Şablon kaydedilemedi.", type: "error" });
                        } finally {
                          setSaving(false);
                          setTimeout(() => setMessage(null), 5000);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                    >
                      🌤️ {saving ? "Uygulanıyor…" : "Prompt şablonunu uygula ve kaydet"}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Küçük özellik anahtarları yan yana (alt alta yığılmasın) */}
            <div className="grid sm:grid-cols-2 gap-6">
            {/* 📎 Görsel yükleme — müşteri kendi tercihine göre açar/kapatır */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="p-5 rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                📎 Görsel Yükleme
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Kullanıcıların sohbette bota resim/dosya gönderebilmesi. Kapatırsan
                widget&apos;taki ataç (📎) butonu hiç görünmez.
              </p>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-black/20">
                <div className="text-left">
                  <div className="text-sm font-medium text-white">Görsel göndermeye izin ver</div>
                  <div className="text-[11px] text-gray-500">
                    {bot.image_upload_enabled ? "Şu an açık — kullanıcılar resim atabilir" : "Şu an kapalı — resim atılamaz"}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    if (!bot) return;
                    const next = !bot.image_upload_enabled;
                    setBot({ ...bot, image_upload_enabled: next });
                    setSaving(true);
                    setMessage(null);
                    try {
                      const updated = await botsApi.update(botId, { image_upload_enabled: next });
                      setBot(updated);
                      setMessage({ text: next ? "Görsel yükleme açıldı." : "Görsel yükleme kapatıldı.", type: "success" });
                    } catch (err: any) {
                      setBot({ ...bot, image_upload_enabled: !next }); // geri al
                      setMessage({ text: err?.message || "İşlem başarısız.", type: "error" });
                    } finally {
                      setSaving(false);
                      setTimeout(() => setMessage(null), 4000);
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${bot.image_upload_enabled ? "bg-emerald-500" : "bg-white/15"}`}
                  aria-pressed={bot.image_upload_enabled}
                  aria-label="Görsel yüklemeyi aç/kapat"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${bot.image_upload_enabled ? "translate-x-6" : ""}`} />
                </button>
              </div>
            </motion.div>

            {/* 🛍️ Ürün öneri kartları — aç/kapat */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.125 }}
              className="p-5 rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                🛍️ Ürün Öneri Kartları
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Ürün feed&apos;i bağlı botlarda, kullanıcının sorusunda ürün/fiyat/stok niyeti
                algılandığında cevabın altında ürün kartı gösterilir. İstemezsen tamamen kapat.
              </p>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-black/20">
                <div className="text-left">
                  <div className="text-sm font-medium text-white">Ürün kartlarını göster</div>
                  <div className="text-[11px] text-gray-500">
                    {bot.product_cards_enabled ? "Şu an açık — uygun sorularda kart çıkar" : "Şu an kapalı — hiçbir soruda kart çıkmaz"}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    if (!bot) return;
                    const next = !bot.product_cards_enabled;
                    setBot({ ...bot, product_cards_enabled: next });
                    setSaving(true);
                    setMessage(null);
                    try {
                      const updated = await botsApi.update(botId, { product_cards_enabled: next });
                      setBot(updated);
                      setMessage({ text: next ? "Ürün kartları açıldı." : "Ürün kartları kapatıldı.", type: "success" });
                    } catch (err: any) {
                      setBot({ ...bot, product_cards_enabled: !next });
                      setMessage({ text: err?.message || "İşlem başarısız.", type: "error" });
                    } finally {
                      setSaving(false);
                      setTimeout(() => setMessage(null), 4000);
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${bot.product_cards_enabled ? "bg-emerald-500" : "bg-white/15"}`}
                  aria-pressed={bot.product_cards_enabled}
                  aria-label="Ürün kartlarını aç/kapat"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${bot.product_cards_enabled ? "translate-x-6" : ""}`} />
                </button>
              </div>
            </motion.div>

            </div>{/* /grid: küçük özellik anahtarları */}

            {/* 🎨 Marka Kimliği (Paket A) — buton, köşe, font, ikon */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.128 }}
              className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-5"
            >
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                  🎨 Marka Kimliği
                </h3>
                <p className="text-xs text-gray-500">
                  Widget&apos;ın baloncuk butonunu, köşe stilini, yazı tipini ve vurgu rengini özelleştir.
                </p>
              </div>

              {/* Launcher ikonu */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Baloncuk (launcher) ikonu</label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "chat", label: "💬 Sohbet" },
                    { key: "bot", label: "🤖 Bot" },
                    { key: "help", label: "❓ Yardım" },
                    { key: "sparkle", label: "✨ Yıldız" },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setBot({ ...bot, launcher_icon: opt.key })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${bot.launcher_icon === opt.key ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" : "border-white/10 bg-black/20 text-gray-400 hover:border-white/20"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBot({ ...bot, launcher_icon: "" })}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${!bot.launcher_icon ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" : "border-white/10 bg-black/20 text-gray-400 hover:border-white/20"}`}
                  >
                    Varsayılan
                  </button>
                </div>
                <input
                  value={bot.launcher_icon ?? ""}
                  onChange={e => setBot({ ...bot, launcher_icon: e.target.value })}
                  placeholder="veya emoji yaz (örn. 🛒) ya da görsel URL yapıştır"
                  className="mt-2 w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/60"
                />
              </div>

              {/* Buton boyutu & şekli */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Buton boyutu</label>
                  <select
                    value={bot.button_size}
                    onChange={e => setBot({ ...bot, button_size: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/60"
                  >
                    <option value="small" className="text-gray-900 bg-white">Küçük</option>
                    <option value="medium" className="text-gray-900 bg-white">Orta</option>
                    <option value="large" className="text-gray-900 bg-white">Büyük</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Buton şekli</label>
                  <select
                    value={bot.button_shape}
                    onChange={e => setBot({ ...bot, button_shape: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/60"
                  >
                    <option value="round" className="text-gray-900 bg-white">Yuvarlak</option>
                    <option value="rounded" className="text-gray-900 bg-white">Yumuşak kare</option>
                  </select>
                </div>
              </div>

              {/* Köşe yuvarlaklığı & Font */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Köşe yuvarlaklığı</label>
                  <select
                    value={bot.corner_radius}
                    onChange={e => setBot({ ...bot, corner_radius: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/60"
                  >
                    <option value="sharp" className="text-gray-900 bg-white">Keskin</option>
                    <option value="soft" className="text-gray-900 bg-white">Yumuşak</option>
                    <option value="pill" className="text-gray-900 bg-white">Hap (çok yuvarlak)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Yazı tipi</label>
                  <select
                    value={bot.font_family}
                    onChange={e => setBot({ ...bot, font_family: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/60"
                  >
                    <option value="system" className="text-gray-900 bg-white">Sistem (Inter)</option>
                    <option value="poppins" className="text-gray-900 bg-white">Poppins</option>
                    <option value="nunito" className="text-gray-900 bg-white">Nunito</option>
                    <option value="roboto" className="text-gray-900 bg-white">Roboto</option>
                  </select>
                </div>
              </div>

              {/* İkincil (vurgu) rengi */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">İkincil (vurgu) renk — buton gradyanının bitişi</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={bot.secondary_color || "#8b5cf6"}
                    onChange={e => setBot({ ...bot, secondary_color: e.target.value })}
                    className="w-12 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                  />
                  <input
                    value={bot.secondary_color ?? ""}
                    onChange={e => setBot({ ...bot, secondary_color: e.target.value })}
                    placeholder="#8b5cf6 (boşsa ana renkten türetilir)"
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/60"
                  />
                  {bot.secondary_color && (
                    <button
                      type="button"
                      onClick={() => setBot({ ...bot, secondary_color: null })}
                      className="text-xs text-gray-400 hover:text-white px-2 py-1"
                    >
                      Temizle
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-gray-500">
                Değişiklikler sayfanın altındaki <strong>Kaydet</strong> ile uygulanır.
              </p>
            </motion.div>

            {/* 🎬 Videolu cevap kuralları — anahtar kelimeyle tetiklenir */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              className="p-5 rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                🎬 Videolu Cevaplar
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Kullanıcının sorusu, tanımladığın <strong>tetikleyici kelimelerden</strong> birini
                içerirse bot cevabına kısa videoyu ekler. Örn. kelimeler: <em>kurulum, nasıl takılır, montaj</em>.
              </p>

              {/* Mevcut kurallar */}
              {videoRules.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {videoRules.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20">
                      <video src={r.video_url} className="w-16 h-12 rounded-md object-cover bg-black flex-shrink-0" muted />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{r.title || "(başlıksız)"}</div>
                        <div className="text-[11px] text-gray-500 truncate">🔑 {r.keywords || "—"}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleVideoRule(r)}
                        className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${r.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-gray-400"}`}
                      >
                        {r.is_active ? "Aktif" : "Pasif"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVideoRule(r.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        aria-label="Kuralı sil"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Yeni kural ekle */}
              <div className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-white/15 bg-black/10">
                <div className="text-xs font-medium text-gray-400">Yeni kural</div>
                <input
                  value={vidTitle}
                  onChange={(e) => setVidTitle(e.target.value)}
                  placeholder="Başlık (opsiyonel — ör: Ürün kurulumu)"
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/60"
                />
                <input
                  value={vidKeywords}
                  onChange={(e) => setVidKeywords(e.target.value)}
                  placeholder="Tetikleyici kelimeler (virgülle ayır): kurulum, montaj, nasıl takılır"
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/60"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="px-3 py-2 rounded-lg text-xs font-semibold border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10 cursor-pointer transition-all">
                    {vidUploading ? "Yükleniyor…" : vidUploadedUrl ? "✅ Video seçildi — değiştir" : "🎬 Video seç (mp4/webm, maks 10MB)"}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      disabled={vidUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ""; }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVideoRule}
                    disabled={vidUploading || !vidUploadedUrl}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-all"
                  >
                    Kural ekle
                  </button>
                </div>
                {vidUploadedUrl && (
                  <video src={vidUploadedUrl} controls className="w-full max-w-xs mt-1 rounded-lg" />
                )}
              </div>
            </motion.div>

            {/* Widget Davranışı sekmesine yönlendirme */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <button
                onClick={() => setActiveSection("behavior")}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] hover:bg-cyan-500/10 transition-all group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      Widget Davranışı
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">YENİ</span>
                    </p>
                    <p className="text-[11px] text-gray-500">Tema modu, konum, karşılama ekranı, proaktif mesaj, ses ve daha fazlası</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>
            </motion.div>
          </div>

          {/* Right: Live Preview */}
          <PreviewColumn bot={bot} />
        </div>
      )}

      {/* ── BEHAVIOR SECTION ── */}
      {activeSection === "behavior" && (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
          {/* Left: Settings */}
          <div className="space-y-6">
            {/* Widget Davranışı */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-white">
                <Zap className="w-4 h-4 text-cyan-400" /> Widget Davranışı
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">YENİ</span>
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Widget&apos;ın sitede nasıl görüneceğini ve davranacağını ayarlayın.
              </p>

              <div className="space-y-4">
                {/* Tema modu + pozisyon */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Tema Modu</label>
                    <div className="flex gap-2">
                      {[
                        { value: "dark", label: "🌙 Koyu" },
                        { value: "light", label: "☀️ Açık" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update("theme_mode", opt.value)}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            (bot.theme_mode || "dark") === opt.value
                              ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300"
                              : "bg-black/20 border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Konum</label>
                    <div className="flex gap-2">
                      {[
                        { value: "right", label: "Sağ Alt" },
                        { value: "left", label: "Sol Alt" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update("widget_position", opt.value)}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            (bot.widget_position || "right") === opt.value
                              ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300"
                              : "bg-black/20 border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Toggle satırları */}
                {[
                  { key: "hero_header" as const, label: "Büyük Marka Başlığı", desc: "Sohbet açılınca büyük logo/başlık; yazmaya başlayınca küçülür" },
                  { key: "show_home_screen" as const, label: "Karşılama Ekranı", desc: "Sohbet öncesi logo, başlık ve soru butonları göster" },
                  { key: "branding_visible" as const, label: "\"Powered by\" Görünür", desc: "Widget altındaki marka yazısı" },
                  { key: "sound_enabled" as const, label: "Ses Bildirimi", desc: "Yeni bot yanıtında kısa bildirim sesi çal" },
                ].map((row) => (
                  <div key={row.key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm text-white font-medium">{row.label}</p>
                      <p className="text-[11px] text-gray-500">{row.desc}</p>
                    </div>
                    <button
                      onClick={() => update(row.key, !bot[row.key])}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                        bot[row.key] ? "bg-indigo-500" : "bg-white/10"
                      }`}
                      aria-label={row.label}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          bot[row.key] ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}

                {/* Gizlilik URL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Gizlilik Politikası URL</label>
                  <input
                    type="text"
                    value={bot.privacy_url || ""}
                    onChange={(e) => update("privacy_url", e.target.value)}
                    placeholder="https://siteniz.com/gizlilik-politikasi"
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Doluysa input üstünde &quot;Sohbet ederek gizlilik politikasını kabul ediyorsunuz&quot; notu görünür.</p>
                </div>

                {/* Proaktif mesaj */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Proaktif Balon Mesajı</label>
                  <input
                    type="text"
                    value={bot.proactive_message || ""}
                    onChange={(e) => update("proactive_message", e.target.value)}
                    placeholder="Merhaba! Size nasıl yardımcı olabilirim? 👋"
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Sohbet butonu yanında görünen davet balonu. Boş bırakılırsa gösterilmez.</p>
                </div>

                {/* Otomatik açılma */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Otomatik Açılma (saniye)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={bot.auto_open_delay ?? 0}
                    onChange={(e) => update("auto_open_delay", Math.max(0, Number(e.target.value)))}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Ziyaretçi sayfaya girdikten X saniye sonra widget kendiliğinden açılır. 0 = kapalı.</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Live Preview */}
          <PreviewColumn bot={bot} />
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
                    <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (En Yeni)</option>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Gelişmiş)</option>
                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Hızlı)</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4.5-preview">GPT-4.5 Preview (En Yeni)</option>
                    <option value="gpt-4o">GPT-4o (Gelişmiş)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Hızlı, Ekonomik)</option>
                    <option value="o3-mini">o3-mini (Akıl Yürütme)</option>
                    <option value="o1">o1 (Derin Düşünme)</option>
                  </optgroup>
                  <optgroup label="Google">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (En Yeni, Hızlı)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Gelişmiş)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
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
      {canEdit && (
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
      )}
    </div>
  );
}
