"use client";

import { motion } from "framer-motion";
import { BrainCircuit, PlugZap, Coins, MessageSquare, Palette, BarChart3 } from "lucide-react";

const features = [
  {
    icon: <Coins className="w-6 h-6 text-indigo-400" />,
    title: "Kredi ile Esnek Kullanım",
    description: "Kullandıkça ödeyin. Adil faturalandırma sayesinde yalnızca seçtiğiniz modele göre (GPT-4o-mini: 1 Kredi, Claude-3.5: 3 Kredi vb.) harcama yaparsınız."
  },
  {
    icon: <BrainCircuit className="w-6 h-6 text-purple-400" />,
    title: "Güncel Yapay Zeka Modelleri",
    description: "Projenizin ihtiyacına göre GPT-4o, Claude 3.5 Sonnet veya o1-mini gibi sektörün en güçlü LLM'leri arasında anında geçiş yapın."
  },
  {
    icon: <PlugZap className="w-6 h-6 text-emerald-400" />,
    title: "Canlı API Entegrasyonu",
    description: "Kendi veritabanınızı veya dış servisleri (hava durumu, canlı kargo takibi, CRM vb.) API araçlarıyla botunuza kolayca bağlayın."
  },
  {
    icon: <Palette className="w-6 h-6 text-pink-400" />,
    title: "White-Label (MarkasızKullanım)",
    description: "Sanki kendi yazılım ekibiniz geliştirmiş gibi, kendi markanız, firmanızın logosu ve renkleriyle tamamen size ait bir chatbot deneyimi sunun."
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
    title: "Detaylı Analitik ve Loglar",
    description: "Müşterilerinizin neleri sorduğunu, hangi sorularda cevap bulunamadığını analiz edin ve sisteminizi sürekli geliştirin."
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-yellow-400" />,
    title: "Gelişmiş RAG Teknolojisi",
    description: "Vektörel arama ile pdf, web sitesi veya metin dokümanlarınızı saniyeler içinde tarayıp, müşteriye en doğru cevabı anında iletin."
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold mb-4"
          >
            Neden <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">ChatGenius?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 w-full max-w-2xl mx-auto"
          >
            Sıradan SSS botlarını unutun. Platformumuz mağazanızın veya şirketinizin zeki, öğrenen ve satışa dönüşen bir asistanıdır.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="card glass hover:glass-strong group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center mb-6 shadow-inner relative z-10 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 relative z-10">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed relative z-10">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
