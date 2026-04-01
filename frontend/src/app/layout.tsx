import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexusChat - Premium AI Chatbot Platform",
  description: "Kendi verilerinizle desteklenen, e-ticaret entegrasyonlu ve yapay zeka hafızasına sahip akıllı asistanınızı dakikalar içinde oluşturun.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-900 dark:bg-[#0a0a1a] dark:text-white transition-colors duration-300 min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
