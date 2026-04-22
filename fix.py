import sys
import re

file_path = 'static/widget.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'Sohbeti aÒ§/kapat': 'Sohbeti aç/kapat',
    'Ò\u2b21evrimiÒ§i, an\x1e±nda yan\x1e±tl\x1e±yor': 'Çevrimiçi, anında yanıtlıyor',
    'BugÒ¼n': 'Bugün',
    'Merhaba! Size nas\x1e±l yard\x1e±mc\x1e± olabilirim?': 'Merhaba! Size nasıl yardımcı olabilirim?',
    'Resim yÒ¼kle': 'Resim yükle',
    '\x8f\x78\u0178\x8f\x53\x8e': '📎',
    'Mesaj\x1e±n\x1e±z\x1e± yaz\x1e±n...': 'Mesajınızı yazın...',
    'GÒ¶nder': 'Gönder',
    'koyula&Ÿt\x1e±r / aÒ§\x1e±kla&Ÿt\x1e±r': 'koyulaştır / açıklaştır',
    'olu&Ÿtur': 'oluştur',
    'farkl\x1e±la&Ÿt\x1e±r': 'farklılaştır',
    'koyula&Ÿt\x1e±r': 'koyulaştır',
    'de\x1eŸi&Ÿkenlerini': 'değişkenlerini',
    'gÒ¼ncelle': 'güncelle',
    'tÒ¼m dinamik stilleri': 'tüm dinamik stilleri',
    \"Badge'i kald\x1e±r\": \"Badge'i kaldır\",
    'Kald\x1e±r': 'Kaldır',
    'Dosya yÒ¼klenemedi.': 'Dosya yüklenemedi.',
    'yÒ¼kle': 'yükle',
    'Bu gÒ¶rseli aÒ§\x1e±kla.': 'Bu görseli açıkla.',
    'Yan\x1e±t al\x1e±namad\x1e±.': 'Yanıt alınamadı.',
    '}/api/widget': '/api/widget',
    'Sipari\x8fx No (İste\x8fxe ba\x8fxl\x8fı)': 'Sipariş No (İsteğe bağlı)',
    'Hangi \x8fSrün?': 'Hangi Ürün?',
    'Hata olu\x8fxtu!': 'Hata oluştu!',
    'Numaran1z1 ve sorununuzu ald1k.': 'Numaranızı ve sorununuzu aldık.',
    'gÒ¶ster</summary>': 'göster</summary>',
    'Pencere kapal\x1e±ysa badge gÒ¶ster': 'Pencere kapalıysa badge göster',
    'Ba\x1eŸlant\x1e± hatas\x1e±. LÒ¼tfen tekrar deneyin.': 'Bağlantı hatası. Lütfen tekrar deneyin.',
    'Ò¼st': 'üst',
    'Ò¶zellik': 'özellik'
}

for old, new in replacements.items():
    content = content.replace(old, new)

# Targeted character replacements for leftovers inside strings avoiding code breaks:
content = content.replace('Ò¼', 'ü')
content = content.replace('Ò¶', 'ö')
content = content.replace('Ò§', 'ç')
content = content.replace('\x1e±', 'ı')
content = content.replace('\x1eŸ', 'ğ')
content = content.replace('&Ÿ', 'ş')

# Special strings that are malformed UTF8 combos (these can be safely blanket replaced)
content = content.replace('â\x8d\x1a\u25aa', '— ')
content = content.replace('â\u25aa\x1a\x8fâ\u25aa\x1a\x8f ', '---')
content = content.replace('â\u25aa\x1a\x8fâ\u25aa\x1a\x8f', '---')
content = content.replace('Ò\u2b21', 'Ç')
content = content.replace('xŸS\x8e', '📎')
content = content.replace('xŸS\u2b1e', '📚')
content = content.replace('â\x19\u2b7a', '⏳')
content = content.replace('â\x1c\x1c', '🗑️')
content = content.replace('â\x1a¢', '•')
content = content.replace('â\x1a\u25aa', '—')
content = content.replace('â⬝\x1aâ⬝\x1a', '---')
content = content.replace('x', 'ş')
content = content.replace('S', 'Ü') 
content = content.replace('x', 'ğ')

# More direct UI textual phrases
content = content.replace('Siparix', 'Sipariş')
content = content.replace('İstexe baxlı', 'İsteğe bağlı')
content = content.replace('oluxtu', 'oluştu')
content = content.replace('\u0131z\u0131 ald1k', '\u0131z\u0131 ald\u0131k')
content = content.replace('Numaran1z1', 'Numaranızı')
content = content.replace('ald1k', 'aldık')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Script execution completed")
