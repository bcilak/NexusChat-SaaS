#!/usr/bin/env python
import os
import subprocess
import sys

os.chdir(r'C:\Users\Baris\Desktop\Dosyalar\Newbot')

# Silinecek dosyalar
files_to_delete = [
    'PROJE_ANALIZ_RAPORU.md',
    'chatbot_corrupted.db.bak',
    'create_tests.py',
    'setup_tests.bat',
    'test_api.py'
]

print("=" * 60)
print("ADIM 1: Gereksiz Dosyaları Silme")
print("=" * 60)

for f in files_to_delete:
    try:
        if os.path.exists(f):
            os.remove(f)
            print(f'✓ Silindi: {f}')
        else:
            print(f'- Bulunamadı: {f}')
    except Exception as e:
        print(f'✗ Hata ({f}): {e}')

print("\n" + "=" * 60)
print("ADIM 2: Git İşlemleri")
print("=" * 60)

commands = [
    ('git add .', 'Dosyalar stage\'a eklendi'),
    ('git status', 'Git durumu'),
    ('git commit -m "security: Critical security fixes and test infrastructure\n\n- Fix CORS wildcard vulnerability (allow_origins now controlled)\n- Add SECRET_KEY validation (32+ chars required)\n- Reduce token expiry from 7 days to 1 hour\n- Add rate limiting (login: 5/min, register: 3/min)\n- Fix WhatsApp webhook security (production enforcement)\n- Add comprehensive test suite (26 tests: auth, bot, security)\n- Update .gitignore for better security\n- Add README.md with setup instructions\n- Make slowapi optional for easier setup\n\nBREAKING CHANGE: SECRET_KEY now required in .env"', 'Commit atıldı'),
    ('git push', 'Push yapıldı'),
]

for cmd, desc in commands:
    try:
        print(f"\n▶ {desc}...")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ {desc}")
            if result.stdout:
                print(result.stdout[:500])
        else:
            print(f"✗ Hata: {desc}")
            if result.stderr:
                print(result.stderr[:500])
    except Exception as e:
        print(f'✗ Komut hatası: {e}')

print("\n" + "=" * 60)
print("İşlemler Tamamlandı")
print("=" * 60)
