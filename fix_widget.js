
const fs = require("fs");
const file = "c:/Users/Baris/Desktop/Dosyalar/Newbot/static/widget.js";
let content = fs.readFileSync(file, "utf8");

const replacements = [
  ["⬝", "-"],
  ["ââ", "---"],
  ["koyula&Ÿt&±r / aÒ§&±kla&Ÿt&±r", "koyulaştır / açıklaştır"],
  ["olu&Ÿtur", "oluştur"],
  ["Sohbeti aÒ§/kapat", "Sohbeti aç/kapat"],
  ["Ò⬡evrimiÒ§i, an&±nda yan&±tl&±yor", "Çevrimiçi, anında yanıtlıyor"],
  ["BugÒ¼n", "Bugün"],
  ["nas&±l yard&±mc&± olabilirim?", "nasıl yardımcı olabilirim?"],
  ["Resim yÒ¼kle", "Resim yükle"],
  ["xŸS", "📎"],
  ["Mesaj&±n&±z&± yaz&±n...", "Mesajınızı yazın..."],
  ["GÒ¶nder", "Gönder"],
  ["biraz farkl&±la&Ÿt&±r", "biraz farklılaştır"],
  ["biraz koyula&Ÿt&±r", "biraz koyulaştır"],
  ["de&Ÿi&Ÿkenlerini", "değişkenlerini"],
  ["gÒ¼ncelle", "güncelle"],
  ["tÒ¼m dinamik stilleri", "tüm dinamik stilleri"],
  ["Badge\"i kald&±r", "Badge\"i kaldır"],
  ["Badge\x27i kald&±r", "Badge\x27i kaldır"],
  ["â⬺", "⏳"],
  ["â,,", "🗑️"],
  ["Kald&±r", "Kaldır"],
  ["Dosya yÒ¼klenemedi.", "Dosya yüklenemedi."],
  ["Bu gÒ¶rseli aÒ§&±kla.", "Bu görseli açıkla."],
  ["Yan&±t al&±namad&±.", "Yanıt alınamadı."],
  ["${apiBase}}/api/widget", "${apiBase}/api/widget"],
  ["Siparix No (İstexe baxlı)", "Sipariş No (İsteğe bağlı)"],
  ["Hangi Srün?", "Hangi Ürün?"],
  ["Hata oluxtu!", "Hata oluştu!"],
  ["Numaran1z1 ve sorununuzu ald1k.", "Numaranızı ve sorununuzu aldık."],
  ["gÒ¶ster</summary>", "göster</summary>"],
  ["xŸS⬞", "📚"],
  ["¢", "•"],
  ["Pencere kapal&±ysa badge gÒ¶ster", "Pencere kapalıysa badge göster"],
  ["Ba&Ÿlant&± hatas&±. LÒ¼tfen tekrar deneyin.", "Bağlantı hatası. Lütfen tekrar deneyin."],
  ["yÒ¼kle", "yükle"],
  ["Ò¼st", "üst"],
  ["Ò¶zellik", "özellik"],
  ["Ò¼", "ü"],
  ["Ò¶", "ö"],
  ["Ò§", "ç"],
  ["&±", "ı"],
  ["&Ÿ", "ş"],
  ["&Ÿ", "ğ"],
  ["Ò⬡", "Ç"],
  ["xŸS", "📎"],
  ["x", "ş"],
  ["S", "ü"],
  ["x", "ş"],
  ["xŸS⬞", "📚"],
  ["⬝", "-"],
  ["â", "="]
];

for (const [o, n] of replacements) {
    content = content.replace(new RegExp(o.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"), n);
}

// Check other weird combinations
content = content.replace(/aÃ§\/kapat/g, "aç/kapat");
content = content.replace(/\u00E7/g, "ç");
content = content.replace(/Siparix/g, "Sipariş");
content = content.replace(/İstexe baxlı/g, "İsteğe bağlı");
content = content.replace(/Srün/g, "Ürün");
content = content.replace(/oluxtu/g, "oluştu");

fs.writeFileSync(file, content, "utf8");
console.log("Fixed widget.js");

