"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { botsApi, inboxApi, API_BASE } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, MessageSquare, User, Bot as BotIcon, Zap, Send, Ban, CheckCircle2, AlertCircle, Phone, Globe
} from "lucide-react";
import Link from "next/link";
import React from "react";

interface Conversation {
  id: number;
  platform: string;
  contact_id: string;
  is_ai_active: boolean;
  last_message_at: string;
  created_at: string;
  last_message_preview?: string;
  last_message_sender?: string;
  unread_count?: number;
}

interface Message {
  id: number;
  sender_type: "user" | "ai" | "human";
  content: string;
  created_at: string;
}

/** Format a raw phone number into a readable form: +90 5XX XXX XX XX */
function formatPhoneNumber(raw: string): string {
  if (!raw) return raw;
  // Strip all non-digit characters
  const digits = raw.replace(/\D/g, "");
  
  // Turkish number: 905XXXXXXXXX (12 digits)
  if (digits.length === 12 && digits.startsWith("90")) {
    return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  // International number with country code
  if (digits.length >= 10 && digits.length <= 15) {
    // Generic: +CC XXX XXX XX XX
    return `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10, -7)} ${digits.slice(-7, -4)} ${digits.slice(-4, -2)} ${digits.slice(-2)}`;
  }
  return raw;
}

/** Return a display-friendly contact name */
function displayContact(contactId: string, platform: string): string {
  if (platform === "whatsapp") {
    return formatPhoneNumber(contactId);
  }
  // Web sessions — truncate if long session ID
  if (contactId.length > 20) {
    return contactId.slice(0, 8) + "…" + contactId.slice(-6);
  }
  return contactId;
}

/** Return a prefix icon character for sender type */
function senderPrefix(sender: string): string {
  if (sender === "ai") return "🤖 ";
  if (sender === "human") return "👤 ";
  return "";
}

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);
  const [botName, setBotName] = useState("");
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvIdRef = useRef<number | null>(null);

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  // Load bot details
  useEffect(() => {
    botsApi.get(botId).then(b => setBotName(b.name)).catch(() => {});
  }, [botId]);

  // Poll conversations every 5 seconds for status updates
  useEffect(() => {
    const fetchConvs = () => {
      inboxApi.getConversations(botId).then(setConversations).catch(() => {});
    };
    fetchConvs();
    const interval = setInterval(fetchConvs, 5000);
    return () => clearInterval(interval);
  }, [botId]);

  // Load messages initially when active conv changes
  useEffect(() => {
    if (!activeConvId) return;
    inboxApi.getMessages(botId, activeConvId).then(setMessages).catch(() => {});
  }, [botId, activeConvId]);

  // WebSocket Connection for Real-Time Messages
  useEffect(() => {
    if (!botId) return;
    
    // Convert API_BASE http:// to ws://
    const wsBaseUrl = API_BASE.startsWith("http") 
      ? API_BASE.replace(/^http/, "ws") 
      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
      
    const ws = new WebSocket(`${wsBaseUrl}/api/bots/${botId}/inbox/ws`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "new_message") {
          // Bump conversation last_message_at and update preview
          setConversations(prev => 
            prev.map(c => c.id === data.conversation_id 
              ? { 
                  ...c, 
                  last_message_at: data.message.created_at,
                  last_message_preview: data.message.content?.slice(0, 80) || "",
                  last_message_sender: data.message.sender_type,
                  unread_count: data.message.sender_type === "user" && activeConvIdRef.current !== data.conversation_id
                    ? (c.unread_count || 0) + 1
                    : c.unread_count
                } 
              : c
            )
          );
          
          // Append message if looking at the same conversation
          if (activeConvIdRef.current === data.conversation_id) {
            setMessages(prev => {
              // Prevent duplicates if optimistic UI already added it
              if (prev.some(m => m.id === data.message.id || (m.sender_type === "human" && m.content === data.message.content && new Date(m.created_at).getTime() > Date.now() - 5000))) {
                return prev;
              }
              return [...prev, data.message];
            });
          }
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };
    
    return () => ws.close();
  }, [botId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvId) return;
    
    const text = replyText;
    setReplyText("");
    setSending(true);
    
    // Optimistic UI
    const tempMsg: Message = {
      id: Date.now(),
      sender_type: "human",
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    
    try {
      await inboxApi.sendMessage(botId, activeConvId, text);
    } catch (err) {
      console.error(err);
      // Revert if failed (simplistic approach: just refetch)
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  const handleToggleAi = async () => {
    if (!activeConv) return;
    setToggling(true);
    try {
      const resp = await inboxApi.toggleAi(botId, activeConv.id, !activeConv.is_ai_active);
      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, is_ai_active: resp.is_ai_active } : c));
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
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

  return (
    <div className="pb-24 max-w-7xl mx-auto flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="mb-6 shrink-0">
        <button 
          onClick={() => router.push("/dashboard/bots")} 
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Botlara Dön
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{botName || "Yükleniyor..."}</h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
                OMNICHANNEL INBOX
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 border-b border-gray-200 dark:border-white/10 pb-px shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.path === `/dashboard/bots/${botId}/inbox`;
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

      {/* Main Inbox Application Area */}
      <div className="flex-1 min-h-0 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden flex shadow-sm">
        
        {/* Left: Conversation List */}
        <div className="w-1/3 min-w-[300px] max-w-[400px] border-r border-gray-200 dark:border-white/5 flex flex-col bg-gray-50 dark:bg-black/10">
          <div className="p-4 border-b border-gray-200 dark:border-white/5 shrink-0 bg-white/50 dark:bg-white/5">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" /> Aktif Sohbetler
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <MessageSquare className="w-8 h-8 opacity-20 mx-auto mb-2" />
                <p className="text-sm">Henüz bir sohbet yok.</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border ${
                    activeConvId === conv.id 
                      ? "bg-indigo-500/10 border-indigo-500/30" 
                      : "bg-white dark:bg-white/5 border-transparent hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {conv.platform === 'whatsapp' ? (
                        <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                      <span className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                        {displayContact(conv.contact_id, conv.platform)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(conv.unread_count ?? 0) > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                          {conv.unread_count}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500 font-mono">
                        {new Date(conv.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                  
                  {/* Message Preview */}
                  {conv.last_message_preview && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2 pl-6">
                      {senderPrefix(conv.last_message_sender || "")}{conv.last_message_preview}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium pl-6">
                      {conv.platform === "whatsapp" ? "WhatsApp" : "Web Chat"}
                    </span>
                    {conv.is_ai_active ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> AI Devrede
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        <User className="w-3 h-3" /> İnsan Devrede
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-transparent">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-white/5 shrink-0 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeConv.platform === 'whatsapp' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                    {activeConv.platform === 'whatsapp' ? <Phone className="w-5 h-5 text-emerald-500" /> : <Globe className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{displayContact(activeConv.contact_id, activeConv.platform)}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">{activeConv.platform === "whatsapp" ? "WhatsApp" : "Web"} Sohbeti</p>
                  </div>
                </div>
                
                <button
                  onClick={handleToggleAi}
                  disabled={toggling}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    activeConv.is_ai_active 
                      ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" 
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                  }`}
                >
                  {toggling ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : activeConv.is_ai_active ? (
                    <><Ban className="w-4 h-4" /> AI&apos;yi Durdur (Devral)</>
                  ) : (
                    <><BotIcon className="w-4 h-4" /> AI&apos;ye Devret</>
                  )}
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-gray-500">
                    <p>Konuşma geçmişi yok.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isUser = msg.sender_type === "user";
                    const isAdmin = msg.sender_type === "human";
                    const isAi = msg.sender_type === "ai";
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        key={msg.id} 
                        className={`flex flex-col max-w-[80%] ${isUser ? "ml-0" : "ml-auto items-end"}`}
                      >
                        <div className="flex items-end gap-2 mb-1">
                          {isUser && <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs text-gray-500 shrink-0"><User className="w-3 h-3" /></div>}
                          
                          <div className={`px-4 py-3 rounded-2xl ${
                            isUser 
                              ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-bl-sm" 
                              : isAdmin
                                ? "bg-purple-500 text-white rounded-br-sm shadow-md shadow-purple-500/20"
                                : "bg-indigo-500 text-white rounded-br-sm shadow-md shadow-indigo-500/20"
                          }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          
                          {!isUser && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${isAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                              {isAdmin ? <User className="w-3 h-3" /> : <BotIcon className="w-3 h-3" />}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono px-8">
                          {isAi && "Yapay Zeka • "}
                          {isAdmin && "Yönetici • "}
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-white/5 shrink-0">
                {activeConv.is_ai_active ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-3 flex items-center gap-3 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>Yönetici olarak cevap yazabilmek için önce &quot;AI&apos;yi Durdur (Devral)&quot; butonuna basmalısınız.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="relative flex items-center">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Müşteriye manuel cevap yazın..."
                      className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl py-3.5 pl-4 pr-14 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-purple-500 hover:bg-purple-400 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <MessageSquare className="w-16 h-16 opacity-10 mb-4" />
              <p className="font-medium text-lg">Bir sohbet seçin</p>
              <p className="text-sm opacity-60 mt-1">Gelen kutusundaki detayları görmek için soldan seçim yapın.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
