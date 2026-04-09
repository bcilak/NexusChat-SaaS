"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { DemoChat } from "@/components/landing/DemoChat";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { UseCases } from "@/components/landing/UseCases";
import { Features } from "@/components/landing/Features";
import { Integrations } from "@/components/landing/Integrations";
import { FAQ } from "@/components/landing/FAQ";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#0a0a1a] dark:to-[#05050f] text-gray-900 dark:text-white">
      <Navbar />
      <Hero />
      <DemoChat />
      <HowItWorks />
      <UseCases />
      <Features />
      <Integrations />
      <FAQ />
      <Pricing />
      <Footer />
    </main>
  );
}
