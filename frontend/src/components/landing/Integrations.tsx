"use client";

import { motion } from "framer-motion";

const logos = [
  { name: "WooCommerce", color: "text-purple-500" },
  { name: "Shopify", color: "text-green-500" },
  { name: "Ticimax", color: "text-blue-500" },
  { name: "IdeaSoft", color: "text-orange-500" },
  { name: "OpenAI", color: "text-white" },
  { name: "Gemini", color: "text-blue-400" },
  { name: "Claude 3.5", color: "text-amber-600" }
];

export function Integrations() {
  // Duplicate logos for smooth infinite scrolling
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <section id="integrations" className="py-16 border-y border-white/5 bg-white/[0.02] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 text-center mb-10">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">
          TÜM FAVORİ ALTYAPILARINIZLA TAM UYUMLU
        </p>
      </div>
      
      <div className="relative w-full overflow-hidden flex whitespace-nowrap">
        {/* Left Gradient Fade */}
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#0a0a1a] to-transparent z-10" />
        
        <motion.div 
          className="flex whitespace-nowrap gap-16 md:gap-32 w-max items-center opacity-70 grayscale hover:grayscale-0 transition-all duration-500"
          animate={{ x: ["0%", "-33.33%"] }}
          transition={{ ease: "linear", duration: 25, repeat: Infinity }}
        >
          {duplicatedLogos.map((logo, idx) => (
            <div 
              key={idx}
              className={`text-2xl md:text-3xl font-bold font-serif ${logo.color} drop-shadow-lg inline-block`}
            >
              {logo.name}
            </div>
          ))}
        </motion.div>

        {/* Right Gradient Fade */}
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#0a0a1a] to-transparent z-10" />
      </div>
    </section>
  );
}
