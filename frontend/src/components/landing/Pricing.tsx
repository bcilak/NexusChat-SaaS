"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";

function ContactDialog({ children, defaultPlan = "Başlangıç" }: { children: React.ReactNode, defaultPlan?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    request_type: defaultPlan,
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setFormData(prev => ({ ...prev, name: "", email: "", phone: "", company: "", message: "" }));
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>İletişim & Demo</DialogTitle>
          <DialogDescription>
            Talebinizi iletin, ekibimiz en kısa sürede sizinle iletişime geçsin.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-6 text-center text-green-500 font-medium">
            Talebiniz başarıyla alındı. Teşekkür ederiz!
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 text-sm whitespace-pre-wrap">{error}</div>}

            <div className="space-y-1">
              <label className="text-sm font-medium">Ad Soyad</label>
              <input required name="name" value={formData.name} onChange={handleChange} className="w-full flex h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500" placeholder="Adınız Soyadınız" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">E-posta</label>
              <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full flex h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500" placeholder="ornek@sirket.com" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Telefon</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full flex h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500" placeholder="05XX XXX XX XX" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Firma / Kurum</label>
              <input name="company" value={formData.company} onChange={handleChange} className="w-full flex h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500" placeholder="Firma Adı" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Talep Türü / İlgilenilen Paket</label>
              <select name="request_type" value={formData.request_type} onChange={handleChange} className="w-full flex h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
                <option value="Başlangıç" className="bg-gray-900">Başlangıç Paketi</option>
                <option value="Pro" className="bg-gray-900">Pro Paket</option>
                <option value="Kurumsal" className="bg-gray-900">Kurumsal Paket</option>
                <option value="Destek" className="bg-gray-900">Müşteri Desteği</option>
                <option value="Diğer" className="bg-gray-900">Diğer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Mesaj</label>
              <textarea name="message" value={formData.message} onChange={handleChange} rows={3} className="w-full flex min-h-[80px] rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500" placeholder="Mesajınız..." />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-2 flex items-center justify-center disabled:opacity-50">
              {loading ? "Gönderiliyor..." : "Gönder"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">Paket İçeriklerimiz</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-10">
            İhtiyacınıza uygun paketleri inceleyin ve projenize en uygun çözümleri değerlendirmek için bizimle iletişime geçin.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Hobby */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-[#0f0f2a] border border-gray-200 dark:border-white/5 rounded-2xl p-8 flex flex-col shadow-sm"
          >
            <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-300">Başlangıç</h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 md:h-10">Sistemi denemek ve küçük projelerinizin potansiyelini görmek için ideal.</p>
            <ContactDialog defaultPlan="Başlangıç">
              <button className="w-full mb-8 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white font-medium">Demo İste</button>
            </ContactDialog>

            <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-400 flex-1">
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-500 shrink-0" />1 Chatbot</li>
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-500 shrink-0" />500 Kredi (Deneme)</li>
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-500 shrink-0" />GPT-4o-mini & Hafif Modeller</li>
              <li className="flex gap-3 text-gray-400 dark:text-gray-600"><Check className="w-5 h-5 text-gray-300 dark:text-gray-700 shrink-0 mt-0.5" /><span>API Araçları Kullanımı Yok</span></li>
              <li className="flex gap-3 text-gray-400 dark:text-gray-600"><Check className="w-5 h-5 text-gray-300 dark:text-gray-700 shrink-0 mt-0.5" /><span>Markasız Kullanım (White-label) Yok</span></li>
            </ul>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative border border-indigo-200 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 shadow-[0_0_40px_rgba(99,102,241,0.1)] rounded-2xl p-8 md:scale-105 z-10 flex flex-col mt-4 md:mt-0"
          >
            <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-2xl flex items-center justify-center min-w-[80px] shadow-sm tracking-wider uppercase z-20">
              POPÜLER
            </div>
            <h3 className="text-2xl font-semibold mb-2 text-indigo-600 dark:text-indigo-400">Pro</h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 md:h-10">Tüm güçlü yapay zeka modellerine ihtiyaç duyan profesyoneller için.</p>
            <ContactDialog defaultPlan="Pro">
              <button className="w-full mb-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors font-medium shadow-md">Demo İste</button>
            </ContactDialog>

            <ul className="space-y-4 text-sm text-gray-800 dark:text-gray-300 flex-1">
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />3 Chatbot</li>
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />5.000 Kredi / ay</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" /><span>Limit aşımında ek kredi paketi satın alma</span></li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" /><span>GPT-4o, Claude 3.5 & Tüm Modeller</span></li>
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />Canlı API Araçları Kullanımı</li>
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />Markasız Kullanım (White-label)</li>
            </ul>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-[#0f0f2a] border border-gray-200 dark:border-white/5 rounded-2xl p-8 flex flex-col shadow-sm mt-4 md:mt-0"
          >
            <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-300">Kurumsal</h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 md:h-10">Özel fiyat teklifi almak ve projenize uygun çözümleri değerlendirmek için bizimle iletişime geçin.</p>
            <ContactDialog defaultPlan="Kurumsal">
              <button className="w-full mb-8 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white font-medium">Bize Ulaşın</button>
            </ContactDialog>

            <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-400 flex-1">
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-500 shrink-0" />Sınırsız Chatbot</li>
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-500 shrink-0" />20.000+ Kredi / ay</li>
              <li className="flex gap-3 text-gray-600 dark:text-gray-400"><Check className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" /><span>İhtiyaca göre özel ek kredi paketleri</span></li>
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-500 shrink-0" />Size Özel API Geliştirmeleri</li>
              <li className="flex gap-3 text-gray-600 dark:text-gray-400"><Check className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" /><span>Özel (Dedicated) Sunucu Seçeneği</span></li>
              <li className="flex gap-3 items-center"><Check className="w-5 h-5 text-indigo-500 shrink-0" />7/24 Teknik Destek & SLA</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
