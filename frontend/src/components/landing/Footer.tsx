"use client";

import Link from "next/link";
import { Bot, Globe, Mail, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#05050f] border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <Bot className="w-8 h-8 text-indigo-500" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                NexusChat
              </span>
            </Link>
            <p className="text-gray-400 max-w-sm mb-6">
              E-ticaret ve işletmeniz için gelişmiş, öğrenen ve dönüşüm oranlarınızı artıran yeni nesil yapay zeka asistanı.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Ürün</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link href="#features" className="hover:text-indigo-400 transition-colors">Özellikler</Link></li>
              <li><Link href="#integrations" className="hover:text-indigo-400 transition-colors">Entegrasyonlar</Link></li>
              <li><Link href="#pricing" className="hover:text-indigo-400 transition-colors">Fiyatlandırma</Link></li>
              <li><Link href="#" className="hover:text-indigo-400 transition-colors">Sürüm Notları</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Yasal</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-indigo-400 transition-colors">Gizlilik Politikası</Link></li>
              <li><Link href="#" className="hover:text-indigo-400 transition-colors">Kullanım Şartları</Link></li>
              <li><Link href="#" className="hover:text-indigo-400 transition-colors">Çerez Politikası</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} NexusChat AI. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
