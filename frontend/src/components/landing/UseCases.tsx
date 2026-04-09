import { ShoppingCart, HeadphonesIcon, UsersRound } from "lucide-react";

export function UseCases() {
  const cases = [
    {
      icon: <ShoppingCart className="w-6 h-6 text-emerald-500" />,
      title: "E-Ticaret",
      description: "Müşterilerinize ürün önerilerinde bulunun, sipariş durumlarını anında yanıtlayarak iade ve kargo süreçlerinde destek verin. Satışlarınızı otomatikleştirin.",
      image: "bg-emerald-500/10"
    },
    {
      icon: <HeadphonesIcon className="w-6 h-6 text-blue-500" />,
      title: "Müşteri Destek",
      description: "7/24 SSS (Sıkça Sorulan Sorular) yanıtlayın. Botunuz cevap veremediğinde otomatik destek talebi / ticket açsın, müşterilerinizi bekletmeyin.",
      image: "bg-blue-500/10"
    },
    {
      icon: <UsersRound className="w-6 h-6 text-purple-500" />,
      title: "Lead Generation",
      description: "Ziyaretçilerinizden isim, e-posta, iletişim ve teklif talebi toplar. İsterseniz müşterinizi doğrudan WhatsApp satış hattınıza yönlendirir.",
      image: "bg-purple-500/10"
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-[#0a0a1a]">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Her Sektöre Uyumlu <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Esnek Çözümler</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Sadece basit bir Soru & Cevap botu değil, işinize değer katan tam kapsamlı satış ve operasyon destekçiniz.
            </p>
            
            <div className="space-y-6 mt-8">
              {cases.map((item, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111122] hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 rounded-full ${item.image} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:w-1/2 w-full mt-8 md:mt-0 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-[#111122] border border-gray-200 dark:border-gray-800 p-8 flex flex-col items-center justify-center text-center aspect-square md:aspect-auto md:h-[600px]">
              <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 p-1">
                <div className="w-full h-full bg-white dark:bg-[#1a1a2e] rounded-[22px] flex items-center justify-center">
                  <HeadphonesIcon className="w-10 h-10 text-indigo-500" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Şirketinizin Dijital Çalışanı</h3>
              <p className="text-gray-500 dark:text-gray-400">Tüm iş süreçlerinizi otomatize edecek o yeni ekip arkadaşına hoş geldin deyin.</p>
              
              <div className="mt-8 text-sm px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                %100 Entegre | %100 Otonom
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
