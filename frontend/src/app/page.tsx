"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Integrations } from "@/components/landing/Integrations";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#0a0a1a] dark:to-[#05050f] text-gray-900 dark:text-white">
      <Navbar />
      <Hero />
      <Integrations />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
