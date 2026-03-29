"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Bot, BarChart3, MessageSquarePlus, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const links = [
    { label: "Dashboard", path: "/dashboard", icon: <BarChart3 className="w-5 h-5" /> },
    { label: "Botlarım", path: "/dashboard/bots", icon: <Bot className="w-5 h-5" /> },
    { label: "Yeni Bot Ekle", path: "/dashboard/bots/new", icon: <MessageSquarePlus className="w-5 h-5" /> },
  ];

  if (user?.role === "admin") {
    links.push({ label: "Admin Paneli", path: "/admin", icon: <Shield className="w-5 h-5" /> });
  }

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-64 bg-white/95 dark:bg-[#080814]/95 backdrop-blur-xl border-r border-gray-200 dark:border-white/5 flex flex-col z-[100] shadow-2xl">
      <Link href="/" className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-white/5 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:scale-110 transition-transform">
          <Bot className="w-5 h-5 text-gray-900 dark:text-white" />
        </div>
        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          ChatGenius
        </span>
      </Link>
      
      <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.path || pathname.startsWith(link.path + "/");
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-gray-900 dark:text-white font-semibold shadow-inner">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-200">{user?.name}</div>
              <div className="text-xs text-indigo-400 uppercase tracking-wider">{user?.plan || "free"} plan</div>
            </div>
          </div>
          <div className="flex gap-1">
            <ThemeToggle />
            <button 
              onClick={logout} 
              className="text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-400/10 border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#05050f]">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#05050f] text-gray-900 dark:text-white">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen relative overflow-x-hidden">
        {/* Subtle background glow for main content area */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardGuard>{children}</DashboardGuard>
    </AuthProvider>
  );
}
