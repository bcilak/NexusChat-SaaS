"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, MessageSquare, Database, Zap } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-indigo-500/30 text-indigo-300 text-sm font-medium mb-6 animate-pulse-glow">
            <Sparkles className="w-4 h-4" />
            <span>Yeni Nesil RAG & Agent Mimarisi</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
            Müşterileriniz İçin <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">
              Akıllı Asistan
            </span>
          </h1>
          
          <p className="text-lg text-gray-400 mb-8 max-w-xl leading-relaxed">
            Kendi veri tabanınızla eğitebileceğiniz, e-ticaret sitenizle anında konuşabilen ve geçmiş diyalogları hatırlayan yapay zeka chatbot platformu.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/login" className="btn btn-primary text-base px-8 py-4 !rounded-xl">
              Ücretsiz Denemeye Başla <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="#demo" className="btn btn-secondary text-base px-8 py-4 !rounded-xl !bg-white/5 hover:!bg-white/10">
              Canlı Demo İncele
            </Link>
          </div>
          
          <div className="mt-12 flex items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Kurulum Gerektirmez</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Multi-LLM Desteği</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="relative rounded-2xl border border-white/10 bg-[#0a0a1a]/80 backdrop-blur-2xl shadow-2xl p-6 overflow-hidden">
            {/* Mockup Top Bar */}
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="ml-4 text-xs text-gray-500 font-mono">chat-genius-preview.app</div>
            </div>

            {/* Mock Chat View */}
            <div className="space-y-4 font-sans max-h-[400px] overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/5 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-300 border border-white/5">
                  Merhaba! Size nasıl yardımcı olabilirim? Ticimax veya IdeaSoft mağazanızdaki siparişleri mi kontrol edelim, yoksa belgelerinizden mi arama yapalım?
                </div>
              </div>

              <div className="flex items-start gap-4 flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0" />
                <div className="bg-indigo-600/20 text-indigo-100 rounded-2xl rounded-tr-sm p-4 text-sm border border-indigo-500/20">
                  Stokta mavi tişört var mı? Fiyatı nedir?
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/5 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-300 border border-white/5 mt-2">
                  <span className="flex items-center gap-2 text-indigo-400 mb-2 font-medium">
                    <Zap className="w-3 h-3" /> Agent e-ticaret altyapısını tarıyor...
                  </span>
                  Evet, "Basic Mavi Tişört" modelimizden L ve XL bedenlerinde stoklarımızda mevcuttur. Güncel fiyatı <strong>349.90 TL</strong>'dir. Sepetinize eklemek ister misiniz?
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a1a] to-transparent pointer-events-none" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
