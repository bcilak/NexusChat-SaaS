import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function FAQ() {
  const faqs = [
    {
      question: "Verilerim güvende mi?",
      answer: "Tüm verileriniz yüksek güvenlikli sunucularda şifrelenmiş olarak tutulmaktadır. Kimsenin verilerinize izinsiz erişimi söz konusu değildir ve bot sadece sizin yüklediğiniz sınırlandırılmış veriler ile yanıt verecek şekilde yapılandırılmıştır."
    },
    {
      question: "Kendi dilimde kullanabilir miyim?",
      answer: "Evet! Yapay zeka altyapımız 50'den fazla dili desteklemektedir. Müşterileriniz hangi dilde sorarsa sorsun, yüklediğiniz verileri o dilde anlayıp yanıtlayabilir."
    },
    {
      question: "Hangi platformlarla entegre çalışır?",
      answer: "Platformumuz bağımsız bir widget olarak tüm web sitelerine 1 satırlık kod ile eklenebilir. Ayrıca WhatsApp Business API ve IdeaSoft e-ticaret altyapısı ile de özel, yerleşik entegrasyonlar sunuyoruz."
    },
    {
      question: "Nasıl eğitebilirim?",
      answer: "Admin paneli üzerinden sadece site adresinizi (URL), PDF veya Excel dosyalarınızı sisteme yükleyerek botunuzu anında eğitebilirsiniz. Ek teknik bilgi gerektirmez."
    }
  ];

  return (
    <section className="py-24 bg-gray-50 dark:bg-[#111122]">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Sıkça Sorulan Sorular</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">Aklınıza takılan tüm soruların cevapları burada.</p>
        </div>
        
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-[#0a0a1a]">
      <button 
        className="w-full flex justify-between items-center p-5 text-left font-semibold text-lg hover:bg-gray-50 dark:hover:bg-[#1a1a2e] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="p-5 pt-0 text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800">
          <p className="mt-2 text-[15px] leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
