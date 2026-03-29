"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, setToken } from "@/lib/api";
import { Bot } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await authApi.login(email, password);
      } else {
        data = await authApi.register(name, email, password);
      }
      setToken(data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#0a0a1a] dark:to-[#05050f] text-gray-900 dark:text-white w-full">
      {/* Background decoration */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)] pointer-events-none" />

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[420px] p-10 glass-strong rounded-[24px] border border-gray-200 dark:border-white/10 relative z-10 animate-slide-up shadow-[0_0_50px_rgba(99,102,241,0.1)]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] mb-5">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-2">
            ChatGenius
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {isLogin ? "Hesabınıza giriş yapın" : "Sisteme katılın"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Ad Soyad</label>
              <input
                className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                type="text"
                placeholder="Adınızı girin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">E-posta</label>
            <input
              className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all auto-fill-dark"
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Şifre</label>
            <input
              className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          <button
            className="w-full py-4 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-gray-900 dark:text-white rounded-xl font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all flex justify-center mt-4"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              "Giriş Yap"
            ) : (
              "Kayıt Ol"
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-8 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {isLogin ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {isLogin ? "Kayıt Ol" : "Giriş Yap"}
          </button>
        </div>
      </div>
    </div>
  );
}
