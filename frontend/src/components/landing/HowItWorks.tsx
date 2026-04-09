import { Upload, Settings, Code } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: <Upload className="w-8 h-8 text-blue-500" />,
      title: "Adım 1: Verilerinizi Yükleyin",
      description: "Web sitenizi bağlayın, PDF veya metin dosyalarınızı yükleyin. Botunuz dakikalar içinde işinize özel bilgileri öğrensin."
    },
    {
      icon: <Settings className="w-8 h-8 text-indigo-500" />,
      title: "Adım 2: Özelleştirin",
      description: "Botunuzun adını, rengini, karşılama mesajını ve karakterini markanıza uygun olarak ayarlayın."
    },
    {
      icon: <Code className="w-8 h-8 text-purple-500" />,
      title: "Adım 3: Sitenize Ekleyin",
      description: "Size vereceğimiz tek satırlık kodu web sitenize ekleyerek botunuzu anında yayına alın."
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-[#0a0a1a]} relative overflow-hidden">
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Sadece 3 Adımda <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Yayında</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
            Teknik bilgiye ihtiyacınız olmadan, kendi verilerinizle eğitilmiş yapay zeka asistanınızı hemen kullanmaya başlayın.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-blue-100 via-indigo-200 to-purple-100 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 z-0"></div>
          
          {steps.map((step, index) => (
            <div key={index} className="relative z-10 flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-[#111122] rounded-2xl border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-[#1a1a2e] flex items-center justify-center mb-6 shadow-sm border border-gray-100 dark:border-gray-800">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
