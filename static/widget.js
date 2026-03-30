/**
 * AI Chatbot Widget — Embeddable chat widget
 * Usage: <script src="https://yoursite.com/static/widget.js" data-bot-id="BOT_ID"></script>
 */
(function () {
  const script = document.currentScript;
  const botId = script.getAttribute("data-bot-id");
  const apiBase = script.getAttribute("data-api-base") || script.src.replace("/static/widget.js", "");

  if (!botId) {
    console.error("AI Chatbot Widget: data-bot-id attribute is required");
    return;
  }

  let sessionId = localStorage.getItem(`chatbot_session_${botId}`) || generateId();
  localStorage.setItem(`chatbot_session_${botId}`, sessionId);

  function generateId() {
    return "s_" + Math.random().toString(36).substring(2, 15);
  }

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    #ai-chatbot-widget-toggle {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 60px; height: 60px; border-radius: 50%;
      background: var(--acw-theme, linear-gradient(135deg, #6366f1, #8b5cf6));
      border: none; cursor: pointer; box-shadow: 0 8px 32px rgba(99,102,241,0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    #ai-chatbot-widget-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 12px 40px rgba(99,102,241,0.6);
    }
    #ai-chatbot-widget-toggle svg { width: 28px; height: 28px; fill: white; }

    #ai-chatbot-widget-container {
      position: fixed; bottom: 96px; right: 24px; z-index: 99999;
      width: 400px; max-width: calc(100vw - 48px); height: 550px; max-height: 70vh;
      background: #1a1a2e; border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      display: none; flex-direction: column;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      overflow: hidden; border: 1px solid rgba(255,255,255,0.08);
    }
    #ai-chatbot-widget-container.open { display: flex; }

    .acw-header {
      padding: 16px 20px; background: var(--acw-theme, linear-gradient(135deg, #6366f1, #8b5cf6));
      display: flex; align-items: center; justify-content: space-between;
    }
    .acw-header-info h3 { margin: 0; color: var(--acw-text, #fff); font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;}
    .acw-header-info h3 img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
    .acw-header-info p { margin: 2px 0 0; color: rgba(255,255,255,0.7); font-size: 12px; }
    .acw-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; padding: 4px; }

    .acw-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .acw-messages::-webkit-scrollbar { width: 4px; }
    .acw-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

    .acw-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
    .acw-msg.bot { background: rgba(255,255,255,0.06); color: #e2e8f0; align-self: flex-start; border-bottom-left-radius: 4px; }
    .acw-msg.user { background: var(--acw-theme, linear-gradient(135deg, #6366f1, #8b5cf6)); color: var(--acw-text, #fff); align-self: flex-end; border-bottom-right-radius: 4px; }
    .acw-msg.typing { opacity: 0.7; }
    .acw-msg.typing .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #a5b4fc; margin: 0 2px; animation: bounce 1.4s infinite ease-in-out; }
    .acw-msg.typing .dot:nth-child(2) { animation-delay: 0.2s; }
    .acw-msg.typing .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }

    .acw-sources { margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); }
    .acw-sources summary { font-size: 11px; color: #818cf8; cursor: pointer; }
    .acw-sources .src-item { font-size: 11px; color: #94a3b8; padding: 2px 0; }

    .acw-input-area {
      padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.06);
      display: flex; gap: 8px; align-items: center;
    }
    .acw-input-area input {
      flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 10px 14px; color: #e2e8f0; font-size: 14px;
      outline: none; transition: border-color 0.2s;
    }
    .acw-input-area input:focus { border-color: #6366f1; }
    .acw-input-area input::placeholder { color: rgba(255,255,255,0.3); }
    .acw-input-area button {
      background: var(--acw-theme, linear-gradient(135deg, #6366f1, #8b5cf6)); border: none;
      border-radius: 10px; padding: 10px 16px; cursor: pointer;
      color: var(--acw-text, #fff); font-size: 14px; font-weight: 600;
      transition: opacity 0.2s;
    }
    .acw-input-area button:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .acw-input-area .acw-attach-btn {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 10px; cursor: pointer; color: #e2e8f0;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s; font-size: 16px;
    }
    .acw-input-area .acw-attach-btn:hover { background: rgba(255,255,255,0.1); }
    
    #acw-preview-container {
      display: none; padding: 8px 16px; background: rgba(0,0,0,0.2); 
      border-top: 1px solid rgba(255,255,255,0.06); align-items: center; justify-content: space-between;
    }
    #acw-preview-container img { max-height: 48px; border-radius: 6px; }
    #acw-preview-container .remove { color: #f87171; cursor: pointer; font-size: 12px; font-weight: bold; background: none; border: none; }
    
    .acw-suggestion {
      display: inline-block; padding: 6px 12px; font-size: 12px; color: var(--acw-theme, #a5b4fc);
      border: 1px solid var(--acw-theme, #8b5cf6); border-radius: 16px; cursor: pointer; margin-right: 6px; margin-top: 6px;
      transition: background 0.2s;
    }
    .acw-suggestion:hover { background: rgba(255,255,255,0.05); }

    @media (max-width: 480px) {
      #ai-chatbot-widget-container {
        bottom: 0; right: 0; width: 100vw; height: 100vh;
        max-width: 100vw; max-height: 100vh; border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Toggle button
  const toggle = document.createElement("button");
  toggle.id = "ai-chatbot-widget-toggle";
  toggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  document.body.appendChild(toggle);

  // Chat container
  const container = document.createElement("div");
  container.id = "ai-chatbot-widget-container";
  container.innerHTML = `
    <div class="acw-header">
      <div class="acw-header-info">
        <h3 id="acw-bot-name">AI Asistan</h3>
        <p id="acw-bot-desc">Size nasıl yardımcı olabilirim?</p>
      </div>
      <button class="acw-close" id="acw-close">&times;</button>
    </div>
    <div class="acw-messages" id="acw-messages">
      <div class="acw-msg bot" id="acw-welcome">Merhaba! Size nasıl yardımcı olabilirim?</div>
      <div id="acw-suggestions-container"></div>
    </div>
    <div id="acw-preview-container"></div>
    <div class="acw-input-area">
      <label for="acw-file-upload" class="acw-attach-btn" id="acw-attach-icon" title="Resim Yükle">📎</label>
      <input type="file" id="acw-file-upload" accept="image/*" style="display: none;" />
      <input type="text" id="acw-input" placeholder="Mesajınızı yazın..." autocomplete="off" />
      <button id="acw-send">Gönder</button>
    </div>
  `;
  document.body.appendChild(container);

  // Load bot config
  fetch(`${apiBase}/api/widget/${botId}/config`)
    .then((r) => r.json())
    .then((data) => {
      let titleHtml = data.name || "AI Asistan";
      if (data.logo_url) {
        titleHtml = `<img src="${data.logo_url}" alt="logo" /> ` + titleHtml;
      }
      document.getElementById("acw-bot-name").innerHTML = titleHtml;
      if (data.description) {
        document.getElementById("acw-bot-desc").textContent = data.description;
      }
      
      // Apply theme
      if (data.theme_color) {
        container.style.setProperty("--acw-theme", data.theme_color);
        toggle.style.setProperty("--acw-theme", data.theme_color);
      }
      if (data.text_color) {
        container.style.setProperty("--acw-text", data.text_color);
      }
      
      // Apply welcome message
      if (data.welcome_message) {
        document.getElementById("acw-welcome").textContent = data.welcome_message;
      }
      
      // Apply example questions
      if (data.example_questions) {
        const suggContainer = document.getElementById("acw-suggestions-container");
        const questions = data.example_questions.split(",").map(q => q.trim()).filter(Boolean);
        questions.forEach(q => {
          const btn = document.createElement("button");
          btn.className = "acw-suggestion";
          btn.textContent = q;
          btn.onclick = () => {
            document.getElementById("acw-input").value = q;
            sendMessage();
            suggContainer.style.display = "none";
          };
          suggContainer.appendChild(btn);
        });
      }
    })
    .catch(() => {});

  // Toggle open/close
  toggle.addEventListener("click", () => {
    container.classList.toggle("open");
    if (container.classList.contains("open")) {
      document.getElementById("acw-input").focus();
    }
  });
  document.getElementById("acw-close").addEventListener("click", () => {
    container.classList.remove("open");
  });

  // Send message
  const input = document.getElementById("acw-input");
  const sendBtn = document.getElementById("acw-send");
  const messages = document.getElementById("acw-messages");
  
  let currentAttachmentUrl = null;
  const fileInput = document.getElementById("acw-file-upload");
  const previewContainer = document.getElementById("acw-preview-container");
  
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById("acw-attach-icon").textContent = "⌛";
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${apiBase}/api/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        currentAttachmentUrl = data.url;
        previewContainer.innerHTML = `<img src="${data.url}" /> <button class="remove" onclick="window.acwRemoveAttachment()">✖ Kaldır</button>`;
        previewContainer.style.display = "flex";
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Dosya yüklenemedi.");
    } finally {
      document.getElementById("acw-attach-icon").textContent = "📎";
      fileInput.value = "";
    }
  });

  window.acwRemoveAttachment = function() {
    currentAttachmentUrl = null;
    previewContainer.style.display = "none";
    previewContainer.innerHTML = "";
  };

  async function sendMessage() {
    const question = input.value.trim();
    if (!question && !currentAttachmentUrl) return;

    // Add user message
    const userMsg = document.createElement("div");
    userMsg.className = "acw-msg user";
    if (question) {
        const textSpan = document.createElement("div");
        textSpan.textContent = question;
        userMsg.appendChild(textSpan);
    }
    
    if (currentAttachmentUrl) {
        const img = document.createElement("img");
        img.src = currentAttachmentUrl;
        img.style.maxWidth = "100%";
        img.style.borderRadius = "8px";
        img.style.marginTop = question ? "8px" : "0";
        userMsg.appendChild(img);
    }
    
    messages.appendChild(userMsg);
    input.value = "";
    
    const sentAttachment = currentAttachmentUrl;
    window.acwRemoveAttachment();
    
    sendBtn.disabled = true;

    // Add typing indicator
    const typing = document.createElement("div");
    typing.className = "acw-msg bot typing";
    typing.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
      const res = await fetch(`${apiBase}/api/widget/${botId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            question: question || "Bu görselde ne görüyorsun?", 
            session_id: sessionId,
            attachment_url: sentAttachment
        }),
      });
      const data = await res.json();

      typing.remove();

      const botMsg = document.createElement("div");
      botMsg.className = "acw-msg bot";
      botMsg.textContent = data.answer;

      if (data.sources && data.sources.length > 0) {
        const sourcesHtml = document.createElement("details");
        sourcesHtml.className = "acw-sources";
        sourcesHtml.innerHTML =
          "<summary>Kaynaklar (" + data.sources.length + ")</summary>" +
          data.sources.map((s) => '<div class="src-item">📄 ' + s.file_name + "</div>").join("");
        botMsg.appendChild(sourcesHtml);
      }

      messages.appendChild(botMsg);

      if (data.session_id) {
        sessionId = data.session_id;
        localStorage.setItem(`chatbot_session_${botId}`, sessionId);
      }
    } catch (e) {
      typing.remove();
      const errMsg = document.createElement("div");
      errMsg.className = "acw-msg bot";
      errMsg.textContent = "Bir hata oluştu. Lütfen tekrar deneyin.";
      messages.appendChild(errMsg);
    }

    sendBtn.disabled = false;
    messages.scrollTop = messages.scrollHeight;
    input.focus();
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
