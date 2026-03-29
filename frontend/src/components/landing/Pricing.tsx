"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Şeffaf Fiyatlandırma</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-10">
            İhtiyacınıza uygun planı seçin, platformun tüm gücünü anında kullanmaya başlayın.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Hobby */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card bg-[#0f0f2a] border-white/5"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-300">Başlangıç</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">Ücretsiz</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">Sistemi denemek ve küçük projeler için ideal.</p>
            <Link href="/login" className="btn btn-secondary w-full mb-8">Ücretsiz Başla</Link>
            
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-500 shrink-0" />1 Chatbot</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-500 shrink-0" />Aylık 50 Mesaj</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-500 shrink-0" />Doküman Yükleme (Max 5MB)</li>
              <li className="flex gap-3 text-gray-600"><Check className="w-5 h-5 text-gray-600 shrink-0" />E-Ticaret Entegrasyonu Yok</li>
            </ul>
          </motion.div>

          {/* Pro */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="card relative border-indigo-500 bg-indigo-900/10 shadow-[0_0_40px_rgba(99,102,241,0.1)] scale-105 z-10"
          >
            <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl flex items-center justify-center min-w-10 z-20">
              POPÜLER
            </div>
            <h3 className="text-xl font-semibold mb-2 text-indigo-400">Pro</h3>
            <div className="mb-6 flex items-end gap-1">
              <span className="text-4xl font-bold">$49</span>
              <span className="text-gray-400 mb-1">/ay</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">Orta ölçekli e-ticaret siteleri ve profesyoneller için.</p>
            <Link href="/login" className="btn btn-primary w-full mb-8 py-3">14 Gün Ücretsiz Dene</Link>
            
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-400 shrink-0" />3 Chatbot</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-400 shrink-0" />Aylık Sınırsız Mesaj (Kendi API anahtarınızla)</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-400 shrink-0" />Gelişmiş Doküman RAG Modülü</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-400 shrink-0" />Tam E-Ticaret Entegrasyonu</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-400 shrink-0" />Gelişmiş Analitik Ekranı</li>
            </ul>
          </motion.div>

          {/* Enterprise */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="card bg-[#0f0f2a] border-white/5"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-300">Kurumsal</h3>
            <div className="mb-6">
              <span className="text-2xl font-bold">Özel Fiyat</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">Yüksek hacimli satış yapan devasa markalar için özel sunucu.</p>
            <Link href="#contact" className="btn btn-secondary w-full mb-8">Bize Ulaşın</Link>
            
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-500 shrink-0" />Sınırsız Chatbot</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-500 shrink-0" />Özel (Dedicated) Sunucu</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-500 shrink-0" />Aylık Yönetim ve Optimizasyon</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-500 shrink-0" />7/24 Teknik Destek</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
