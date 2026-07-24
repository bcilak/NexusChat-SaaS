"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, ChevronRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-gray-200 dark:border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            ChatGenius
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
          <Link href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Özellikler</Link>
          <Link href="#integrations" className="hover:text-gray-900 dark:hover:text-white transition-colors">Entegrasyonlar</Link>
          <Link href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Fiyatlandırma</Link>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login" className="hidden md:block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            Giriş Yap
          </Link>
          <Link href="/login" className="hidden md:inline-flex btn btn-primary relative group overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              Hemen Başla <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobil açılır menü */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-white/10 glass-strong">
          <div className="px-6 py-4 flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Link href="#features" onClick={close} className="py-3 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">Özellikler</Link>
            <Link href="#integrations" onClick={close} className="py-3 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">Entegrasyonlar</Link>
            <Link href="#pricing" onClick={close} className="py-3 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">Fiyatlandırma</Link>
            <Link href="/login" onClick={close} className="py-3 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">Giriş Yap</Link>
            <Link href="/login" onClick={close} className="mt-2 btn btn-primary justify-center">
              <span className="flex items-center justify-center gap-2">
                Hemen Başla <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
