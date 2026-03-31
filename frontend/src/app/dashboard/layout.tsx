"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Bot, BarChart3, MessageSquarePlus, LogOut, Shield, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const links = [
    { label: "Dashboard", path: "/dashboard", icon: <BarChart3 className="w-4 h-4" />, exact: true },
    { label: "Botlarım", path: "/dashboard/bots", icon: <Bot className="w-4 h-4" />, exact: false },
    { label: "Yeni Bot Ekle", path: "/dashboard/bots/new", icon: <MessageSquarePlus className="w-4 h-4" />, exact: true },
  ];

  if (user?.role === "admin") {
    links.push({ label: "Admin Paneli", path: "/admin", icon: <Shield className="w-4 h-4" />, exact: false });
  }

  const planColors: Record<string, string> = {
    free: "text-gray-400",
    pro: "text-indigo-400",
    enterprise: "text-purple-400",
  };
  const planBadgeColors: Record<string, string> = {
    free: "bg-gray-500/10 border-gray-500/20 text-gray-400",
    pro: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    enterprise: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  };

  const plan = user?.plan || "free";

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-64 flex flex-col z-[100]"
      style={{
        background: "rgba(6, 6, 18, 0.97)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 p-5 group" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.45)] group-hover:shadow-[0_0_28px_rgba(99,102,241,0.65)] transition-shadow">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base text-white tracking-tight">NexusChat</span>
          <div className="text-[10px] text-gray-500 font-medium">AI Platform</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 py-2 mt-1">Ana Menü</div>
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.path
            : pathname === link.path || pathname.startsWith(link.path + "/");
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-indigo-500/12 text-indigo-300 border border-indigo-500/20"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-400"}>{link.icon}</span>
                {link.label}
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 opacity-60" />}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="h-px bg-white/[0.06] my-3 mx-1" />

        {/* Quick Actions */}
        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 py-2">Hızlı Erişim</div>
        <div className="px-3 py-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/05 border border-indigo-500/15">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">İpucu</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Bot'a döküman ekleyerek bilgi tabanını genişletin.
          </p>
        </div>
      </nav>

      {/* User Info */}
      <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Plan Badge */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">Mevcut Plan</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${planBadgeColors[plan] || planBadgeColors.free}`}>
            {plan}
          </span>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-inner">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-200 truncate">{user?.name}</div>
              <div className={`text-[10px] font-medium truncate ${planColors[plan] || planColors.free}`}>{user?.email}</div>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <ThemeToggle />
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
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
      <div className="min-h-screen flex items-center justify-center bg-[#05050f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen text-white" style={{ background: "#05050f" }}>
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen relative overflow-x-hidden">
        {/* Ambient background glows */}
        <div className="fixed top-0 right-0 w-[700px] h-[700px] bg-indigo-500/[0.04] rounded-full blur-[140px] pointer-events-none" />
        <div className="fixed bottom-0 left-64 w-[500px] h-[500px] bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 p-8 max-w-7xl mx-auto">
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
