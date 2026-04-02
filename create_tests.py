import os
import sys

# Klasör oluştur
test_dir = r'C:\Users\Baris\Desktop\Dosyalar\Newbot\tests'
os.makedirs(test_dir, exist_ok=True)
print(f"✓ Klasör oluşturuldu: {test_dir}")

# Dosyaları oluştur
files = {
    '__init__.py': '"""Test package for AI Chatbot Platform."""\n',
    'conftest.py': '',
    'test_auth.py': '',
    'test_bot.py': '',
    'test_security.py': ''
}

for filename, content in files.items():
    filepath = os.path.join(test_dir, filename)
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✓ Oluşturuldu: {filename}")

print("\n✓ Tüm dosyalar başarıyla oluşturuldu!")
