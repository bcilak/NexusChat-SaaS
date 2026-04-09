import { useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

export function DemoChat() {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Merhaba! 👋 Ben bu sitenin yapay zeka asistanıyım. Sana nasıl yardımcı olabilirim?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const demoResponses: Record<string, string> = {
    "fiyat": "Sistemimiz kurumsal özel fiyatlandırma ile çalışmaktadır. İhtiyacınıza en uygun paketi belirlemek için sayfa sonundaki formu doldurabilirsiniz.",
    "özellik": "50+ dil desteği, WhatsApp entegrasyonu, IdeaSoft E-ticaret senkronizasyonu ve 7/24 kesintisiz müşteri desteği özelliklerimizden sadece bazılarıdır.",
    "neler": "Müşteri desteği sağlayabilir, sipariş durumu sorgulayabilir, lead toplayabilir ve web sitenizdeki ziyaretçilere 7/24 rehberlik yapabilirim.",
    "default": "Bu bir demo ortamıdır! Gerçek bir entegrasyonda sitenize yüklediğiniz verilere göre size en uygun ve akıllı cevapları veriyor olacağım. 😊 Detaylı bilgi için talebinizi iletebilirsiniz."
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const lowercaseInput = userMessage.content.toLowerCase();
      let matchedKey = "default";
      
      for (const key of Object.keys(demoResponses)) {
        if (lowercaseInput.includes(key)) {
          matchedKey = key;
          break;
        }
      }

      setMessages(prev => [...prev, { role: "bot", content: demoResponses[matchedKey] }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-[#0a0a1a] dark:to-[#05050f] overflow-hidden">
      <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="md:w-1/2 text-left mb-8 md:mb-0 relative">
          <div className="absolute top-1/2 -left-12 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full"></div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight relative z-10">
            Sistemi Hemen Şimdi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Test Edin</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg relative z-10 mb-8">
            Kendi verilerinizle eğitildikten sonra botunuzun ziyaretçilerinizle nasıl iletişim kuracağını deneyimleyin.
          </p>
          <ul className="space-y-3 relative z-10">
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> 'Fiyat' kelimesini sorun</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> 'Özellik' kelimesini sorun</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> 'Neler yapabilirsin' diyin</li>
          </ul>
        </div>

        <div className="md:w-1/2 w-full relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-[32px] blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
          <div className="relative bg-white dark:bg-[#111122] rounded-[24px] border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
            
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a2e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Demo Bot AI</h3>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Çevrimiçi
                  </p>
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>

            {/* Chat area */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-gray-50/50 dark:bg-[#0a0a1a]/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`p-4 rounded-2xl shadow-sm text-[15px] ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white rounded-br-sm" 
                        : "bg-white dark:bg-[#1a1a2e] border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm"
                    }`}>
                      <p className="leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex w-full justify-start">
                  <div className="flex flex-row gap-2 max-w-[80%]">
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#1a1a2e] border border-gray-100 dark:border-gray-800 rounded-bl-sm flex gap-1 items-center h-12 shadow-sm">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white dark:bg-[#111122] border-t border-gray-100 dark:border-gray-800">
              <form onSubmit={handleSend} className="flex items-center gap-2 bg-gray-50 dark:bg-[#0a0a1a] rounded-full p-1 pl-4 border border-gray-200 dark:border-gray-800 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm py-2 dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <Send className="w-4 h-4 ml-1" />
                </button>
              </form>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
}