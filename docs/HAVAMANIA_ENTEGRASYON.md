# Havamania (Kotlin / Android) → NexusChat Bot Entegrasyonu

Bu doküman, Havamania Android uygulamasının NexusChat meteoroloji botuna nasıl
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

- `session_id`: Uygulama üretir ve cihazda (SharedPreferences) saklar → aynı oturumda sohbet hafızası çalışır.
- Hız limiti: **30 istek/dakika** (widget chat).
- Auth gerekmez (public widget endpoint).
- Botun **`weather_enabled`** ayarı panelden açık olmalı; prompt meteoroloji şablonuyla ayarlı olmalı.

---

## 0) Bağımlılıklar (`app/build.gradle.kts`)

```kotlin
dependencies {
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.1")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
```

`AndroidManifest.xml` içinde internet izni:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

---

## 1) Veri modelleri + Retrofit servisi — `NexusChatApi.kt`

```kotlin
import com.squareup.moshi.JsonClass
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path

@JsonClass(generateAdapter = true)
data class ChatRequest(
    val question: String,
    val session_id: String,
)

@JsonClass(generateAdapter = true)
data class ChatResponse(
    val answer: String = "",
    val session_id: String? = null,
    val message_id: Int? = null,
)

interface NexusChatApi {
    @POST("api/widget/{botId}/chat")
    suspend fun chat(
        @Path("botId") botId: Int,
        @Body body: ChatRequest,
    ): ChatResponse

    companion object {
        private const val BASE_URL = "https://chatbot.altikodtech.com.tr/"

        fun create(): NexusChatApi =
            Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
                .create(NexusChatApi::class.java)
    }
}
```

---

## 2) Oturum kalıcılığı + repository — `WeatherBotRepository.kt`

```kotlin
import android.content.Context
import java.util.UUID

class WeatherBotRepository(
    context: Context,
    private val botId: Int = 10,               // meteoroloji botunun id'si
    private val api: NexusChatApi = NexusChatApi.create(),
) {
    private val prefs = context.getSharedPreferences("nexus_chat", Context.MODE_PRIVATE)
    private val sessionKey = "session_$botId"

    private fun sessionId(): String {
        val existing = prefs.getString(sessionKey, null)
        if (existing != null) return existing
        val sid = UUID.randomUUID().toString()
        prefs.edit().putString(sessionKey, sid).apply()
        return sid
    }

    /** Sohbeti sıfırla (yeni oturum başlat) */
    fun resetSession() = prefs.edit().remove(sessionKey).apply()

    /** Bota soru sor; başarısızsa exception fırlatır (ViewModel yakalar). */
    suspend fun ask(question: String): String {
        val res = api.chat(botId, ChatRequest(question = question, session_id = sessionId()))
        return res.answer
    }
}
```

---

## 3) ViewModel — `WeatherChatViewModel.kt`

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class ChatMessage(val text: String, val fromUser: Boolean)

class WeatherChatViewModel(private val repo: WeatherBotRepository) : ViewModel() {

    private val _messages = MutableStateFlow(
        listOf(ChatMessage("Merhaba! Hangi şehir için hava durumu istersiniz?", false))
    )
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    fun send(text: String) {
        val q = text.trim()
        if (q.isEmpty() || _loading.value) return
        _messages.value = _messages.value + ChatMessage(q, true)
        _loading.value = true
        viewModelScope.launch {
            val answer = try {
                repo.ask(q)
            } catch (e: Exception) {
                "Üzgünüm, şu anda yanıt alınamadı. Lütfen tekrar deneyin."
            }
            _messages.value = _messages.value + ChatMessage(answer, false)
            _loading.value = false
        }
    }
}
```

---

## 4) Jetpack Compose ekranı (opsiyonel) — `WeatherChatScreen.kt`

```kotlin
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun WeatherChatScreen(vm: WeatherChatViewModel) {
    val messages by vm.messages.collectAsStateWithLifecycle()
    val loading by vm.loading.collectAsStateWithLifecycle()
    var input by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth().padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages) { m ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = if (m.fromUser) Arrangement.End else Arrangement.Start
                ) {
                    Surface(
                        color = if (m.fromUser) Color(0xFF2563EB) else Color(0xFF1E293B),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text(
                            m.text,
                            color = Color.White,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            }
        }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        Row(
            Modifier.fillMaxWidth().padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Örn: İzmir hava durumu") }
            )
            Spacer(Modifier.width(8.dp))
            Button(onClick = { vm.send(input); input = "" }) { Text("Gönder") }
        }
    }
}
```

`Activity`/`Fragment` içinde kurulum:
```kotlin
val repo = WeatherBotRepository(applicationContext, botId = 10)
val vm = WeatherChatViewModel(repo) // gerçek projede ViewModelFactory ile
```

---

## Notlar
- `BASE_URL` ve `botId`'yi kendi değerlerinle güncelle.
- Bot markdown döndürebilir (`**kalın**`, `- liste`). Ham metin istemiyorsan bir
  markdown kütüphanesi (ör. `compose-markdown`) ile render edebilirsin.
- İç ağ/HTTP kullanılmıyor; sunucu HTTPS. `usesCleartextTraffic` gerekmez.

## Faz 4 (opsiyonel — native hava kartı)
İleride sohbet yanıtına yapılandırılmış `weather` bloğu eklenirse (sıcaklık, ikon
kodu, rüzgar, UV ayrı alanlar), `ChatResponse`'a bir `weather` alanı ekleyip düz
metin yerine native bir hava kartı (ikon + derece + rüzgar/UV rozetleri)
çizebilirsin. Backend'de küçük bir ek gerektirir.
