"use client";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Bot, Users, LayoutDashboard, LogOut, ArrowLeft, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a1a]">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Genel Bakış" },
    { href: "/admin/users", icon: Users, label: "Kullanıcılar" },
    { href: "/admin/bots", icon: Bot, label: "Sistem Botları" },
    { href: "/admin/requests", icon: MessageSquare, label: "Talepler" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] text-gray-900 dark:text-white flex">
      {/* Sidebar */}
      <aside className="w-64 glass-strong border-r border-gray-200 dark:border-white/10 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">SuperAdmin</h1>
            <p className="text-xs text-gray-500">Platform Yönetimi</p>
          </div>
        </div>

        <div className="p-4 flex-1 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                    ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Kullanıcı Paneline Dön
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header (Mobil & Theme Toggle) */}
        <header className="h-16 glass-strong border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="font-medium text-gray-600 dark:text-gray-300">
            Hoş geldin, <span className="text-gray-900 dark:text-white font-bold">{user.name}</span>
          </div>
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          {/* Background elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-500/5 dark:bg-red-500/10 rounded-full blur-[100px] pointer-events-none -mr-40 -mt-40" />
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
