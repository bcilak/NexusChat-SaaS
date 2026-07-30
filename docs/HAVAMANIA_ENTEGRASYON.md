# Havamania (React Native) → NexusChat Bot Entegrasyonu

Bu doküman, Havamania mobil uygulamasının NexusChat meteoroloji botuna nasıl
bağlanacağını anlatır. Havamania **ayrı bir proje** olduğu için buradaki kodu o
repoya kopyalayacaksın; NexusChat tarafında ek bir şey gerekmez.

## Endpoint sözleşmesi

`POST {BASE_URL}/api/widget/{BOT_ID}/chat`

İstek gövdesi (JSON):
```json
{ "question": "Ankara hava durumu nasıl?", "session_id": "cihazda-saklanan-uuid" }
```

Yanıt (JSON):
```json
{
  "answer": "Ankara için bugün açık, 20°C ...",
  "sources": [],
  "session_id": "...",
  "message_id": 123,
  "products": []
}
```

- `session_id`: Uygulama üretir ve cihazda saklar → aynı oturumda sohbet hafızası çalışır.
- Hız limiti: **30 istek/dakika** (widget chat). Kullanıcı başına makul.
- Auth gerekmez (public widget endpoint). CORS mobilde etkisiz.
- `weather_enabled` bot ayarı **açık** olmalı ve prompt meteoroloji şablonuyla ayarlı olmalı.

---

## 1) API istemcisi — `src/api/nexusChat.ts`

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://chatbot.altikodtech.com.tr"; // NexusChat sunucusu
const BOT_ID = 10; // meteoroloji botunun id'si
const SESSION_KEY = `nexus_session_${BOT_ID}`;

// Basit uuid (harici paket gerektirmez)
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getSessionId(): Promise<string> {
  let sid = await AsyncStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = uuid();
    await AsyncStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// Sohbeti sıfırla (yeni oturum)
export async function resetSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export type ChatResult = { answer: string; message_id?: number };

export async function askWeatherBot(question: string): Promise<ChatResult> {
  const session_id = await getSessionId();
  const res = await fetch(`${BASE_URL}/api/widget/${BOT_ID}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, session_id }),
  });
  if (!res.ok) {
    throw new Error(`Sunucu hatası (${res.status})`);
  }
  const data = await res.json();
  return { answer: data.answer ?? "", message_id: data.message_id };
}
```

---

## 2) Basit sohbet ekranı — `src/screens/WeatherChatScreen.tsx`

```tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from "react-native";
import { askWeatherBot } from "../api/nexusChat";

type Msg = { id: string; role: "user" | "bot"; text: string };

export default function WeatherChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "w", role: "bot", text: "Merhaba! Hangi şehir için hava durumu istersiniz?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: Date.now() + "u", role: "user", text }]);
    setLoading(true);
    try {
      const { answer } = await askWeatherBot(text);
      setMessages((m) => [...m, { id: Date.now() + "b", role: "bot", text: answer }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: Date.now() + "e", role: "bot", text: "Üzgünüm, şu anda yanıt alınamadı. Lütfen tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.user : styles.bot]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
      />
      {loading && <ActivityIndicator style={{ marginBottom: 6 }} />}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Örn: İzmir hava durumu"
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Text style={styles.sendText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  bubble: { maxWidth: "85%", padding: 10, borderRadius: 14 },
  user: { alignSelf: "flex-end", backgroundColor: "#2563eb" },
  bot: { alignSelf: "flex-start", backgroundColor: "#1e293b" },
  bubbleText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: "row", padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: "#1e293b" },
  input: { flex: 1, backgroundColor: "#111827", color: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtn: { backgroundColor: "#2563eb", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  sendText: { color: "#fff", fontWeight: "600" },
});
```

---

## Kurulum notları

- Bağımlılık: `@react-native-async-storage/async-storage`
  ```bash
  npm install @react-native-async-storage/async-storage
  ```
  (Expo: `npx expo install @react-native-async-storage/async-storage`)
- `BASE_URL` ve `BOT_ID`'yi kendi değerlerinle güncelle.
- Botun **`weather_enabled`** ayarı panelden açık olmalı; prompt meteoroloji şablonuyla ayarlı olmalı.
- Bot markdown döndürebilir (`**kalın**`, `- liste`). Ham metin göstermek istemezsen
  `react-native-markdown-display` ile render edebilirsin.

## Faz 4 (opsiyonel — native hava kartı)
İleride sohbet yanıtına yapılandırılmış `weather` bloğu eklenirse (sıcaklık, ikon
kodu, rüzgar, UV ayrı alanlar), bu ekranda düz metin yerine native bir hava kartı
(ikon + derece + rüzgar/UV rozetleri) çizebilirsin. Backend değişikliği gerektirir.
