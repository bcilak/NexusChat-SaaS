/**
 * NexusChat AI Widget — Premium Embeddable Chat Widget v2.1
 * Usage: <script src="https://yoursite.com/static/widget.js" data-bot-id="BOT_ID"></script>
 * Optional: data-api-base="https://custom-api-origin.com"
 */
(function () {
  "use strict";

  const script = document.currentScript;
  const botId = script.getAttribute("data-bot-id");
  const apiBase =
    script.getAttribute("data-api-base") ||
    script.src.replace("/static/widget.js", "");

  if (!botId) {
    console.error("NexusChat Widget: data-bot-id attribute is required");
    return;
  }

  /* ── Session ── */
  let sessionId =
    localStorage.getItem("nxc_session_" + botId) || _uid();
  localStorage.setItem("nxc_session_" + botId, sessionId);

  function _uid() {
    return "s_" + Math.random().toString(36).slice(2, 13);
  }

  /* ── Helper: Hex rengi biraz koyulaştır / açıklaştır ── */
  function _adjustColor(hex, amount) {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  /* ── Helper: Hex'den RGB al ── */
  function _hexToRgb(hex) {
    const num = parseInt(hex.replace("#", ""), 16);
    return {
      r: (num >> 16) & 0xff,
      g: (num >> 8) & 0xff,
      b: num & 0xff,
    };
  }

  /* ── Helper: RGB'den rgba string oluştur ── */
  function _rgba(hex, alpha) {
    const { r, g, b } = _hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ── Google Fonts (Inter) ── */
  if (!document.getElementById("nxc-font")) {
    const link = document.createElement("link");
    link.id = "nxc-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }

  /* ── Styles ── */
  const style = document.createElement("style");
  style.id = "nxc-style";
  style.textContent = `
    :root {
      --nxc-accent: #6366f1;
      --nxc-accent-end: #8b5cf6;
      --nxc-accent-rgb: 99,102,241;
      --nxc-text-on-accent: #ffffff;
      --nxc-border-radius: 20px;
    }

    /* ── Toggle Button ── */
    #nxc-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483646;
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--nxc-accent), var(--nxc-accent-end));
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(var(--nxc-accent-rgb),.45), 0 0 0 0 rgba(var(--nxc-accent-rgb),.3);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .3s cubic-bezier(.34,1.56,.64,1),
                  box-shadow .3s ease;
      outline: none;
    }
    #nxc-toggle:hover {
      transform: scale(1.12);
      box-shadow: 0 12px 40px rgba(var(--nxc-accent-rgb),.6), 0 0 0 6px rgba(var(--nxc-accent-rgb),.15);
    }
    #nxc-toggle:active { transform: scale(.96); }
    #nxc-toggle svg { width: 28px; height: 28px; fill: var(--nxc-text-on-accent); transition: transform .35s cubic-bezier(.34,1.56,.64,1); pointer-events: none; }
    #nxc-toggle.open svg.icon-chat { transform: scale(0) rotate(-90deg); }
    #nxc-toggle.open svg.icon-close { transform: scale(1) rotate(0deg); }
    #nxc-toggle svg.icon-close { position: absolute; transform: scale(0) rotate(90deg); }

    /* ── Notification badge ── */
    #nxc-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 18px;
      height: 18px;
      background: #ef4444;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      animation: nxc-badge-pop .4s cubic-bezier(.34,1.56,.64,1) both;
    }
    @keyframes nxc-badge-pop {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }

    /* ── Main Container ── */
    #nxc-container {
      position: fixed;
      bottom: 96px;
      right: 24px;
      z-index: 2147483645;
      width: 400px;
      max-width: calc(100vw - 48px);
      height: 590px;
      max-height: calc(100vh - 120px);
      border-radius: var(--nxc-border-radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.5;

      /* Glassmorphism */
      background: rgba(13, 13, 26, 0.88);
      backdrop-filter: blur(24px) saturate(200%);
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow:
        0 32px 80px rgba(0,0,0,0.6),
        0 0 0 1px rgba(255,255,255,0.04) inset,
        0 1px 0 rgba(255,255,255,0.1) inset;

      /* Animation */
      transform-origin: bottom right;
      transform: scale(.88) translateY(16px);
      opacity: 0;
      pointer-events: none;
      transition:
        transform .38s cubic-bezier(.34,1.56,.64,1),
        opacity .28s ease;
    }
    #nxc-container.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* ── Header ── */
    .nxc-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, var(--nxc-accent) 0%, var(--nxc-accent-end) 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
    }
    .nxc-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -8%;
      width: 180px;
      height: 180px;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      pointer-events: none;
    }
    .nxc-header::after {
      content: '';
      position: absolute;
      bottom: -70%;
      left: 5%;
      width: 120px;
      height: 120px;
      background: rgba(255,255,255,0.06);
      border-radius: 50%;
      pointer-events: none;
    }
    .nxc-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      z-index: 1;
    }
    .nxc-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(8px);
      border: 1.5px solid rgba(255,255,255,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .nxc-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .nxc-avatar svg { width: 20px; height: 20px; fill: var(--nxc-text-on-accent); }
    .nxc-header-text h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--nxc-text-on-accent);
      letter-spacing: -0.2px;
    }
    .nxc-header-text p {
      margin: 2px 0 0;
      font-size: 11px;
      color: rgba(255,255,255,0.75);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .nxc-online-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
      animation: nxc-pulse 2s infinite;
    }
    @keyframes nxc-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .6; transform: scale(0.85); }
    }
    .nxc-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
      z-index: 1;
    }
    .nxc-close-btn {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      color: var(--nxc-text-on-accent);
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .2s, transform .2s;
    }
    .nxc-close-btn:hover { background: rgba(255,255,255,0.28); transform: scale(1.08); }
    .nxc-close-btn svg { width: 14px; height: 14px; fill: none; stroke: var(--nxc-text-on-accent); stroke-width: 2.5; stroke-linecap: round; }

    /* ── Messages ── */
    .nxc-messages {
      flex: 1;
      overflow-y: auto;
      padding: 18px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    .nxc-messages::-webkit-scrollbar { width: 3px; }
    .nxc-messages::-webkit-scrollbar-track { background: transparent; }
    .nxc-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    .nxc-messages::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    /* Message animation */
    .nxc-msg {
      max-width: 88%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.6;
      word-break: break-word;
      animation: nxc-msgIn .32s cubic-bezier(.34,1.56,.64,1) both;
      position: relative;
    }
    @keyframes nxc-msgIn {
      from { opacity: 0; transform: translateY(12px) scale(.96); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
    .nxc-msg.bot {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.09);
      color: #e2e8f0;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .nxc-msg.user {
      background: linear-gradient(135deg, var(--nxc-accent), var(--nxc-accent-end));
      color: var(--nxc-text-on-accent);
      align-self: flex-end;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 18px rgba(var(--nxc-accent-rgb),.35);
    }

    /* Message timestamp */
    .nxc-msg-time {
      font-size: 10px;
      opacity: 0.5;
      margin-top: 4px;
      display: block;
    }
    .nxc-msg.bot .nxc-msg-time { text-align: left; color: #a0aec0; }
    .nxc-msg.user .nxc-msg-time { text-align: right; color: var(--nxc-text-on-accent); }

    /* Typing indicator */
    .nxc-typing {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.09);
      align-self: flex-start;
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      padding: 13px 17px;
      display: flex;
      gap: 5px;
      align-items: center;
      animation: nxc-msgIn .3s ease both;
    }
    .nxc-typing span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--nxc-accent);
      animation: nxc-bounce 1.3s infinite ease-in-out;
    }
    .nxc-typing span:nth-child(2) { animation-delay: .18s; }
    .nxc-typing span:nth-child(3) { animation-delay: .36s; }
    @keyframes nxc-bounce {
      0%, 80%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
      40% { transform: translateY(-8px) scale(1.15); opacity: 1; }
    }

    /* Sources */
    .nxc-sources {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .nxc-sources summary {
      font-size: 10.5px;
      color: #818cf8;
      cursor: pointer;
      user-select: none;
      list-style: none;
    }
    .nxc-sources summary::-webkit-details-marker { display: none; }
    .nxc-sources .nxc-src {
      font-size: 10.5px;
      color: #94a3b8;
      padding: 2px 0;
    }

    /* ── Suggestion Chips ── */
    .nxc-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      padding: 4px 0 8px;
      align-self: flex-start;
      width: 100%;
      animation: nxc-msgIn .45s ease both;
    }
    .nxc-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 13px;
      font-size: 12px;
      font-weight: 500;
      color: var(--nxc-accent);
      background: rgba(var(--nxc-accent-rgb),0.09);
      border: 1px solid rgba(var(--nxc-accent-rgb),0.22);
      border-radius: 999px;
      cursor: pointer;
      transition: background .2s, transform .15s, box-shadow .2s, border-color .2s;
      white-space: nowrap;
    }
    .nxc-chip:hover {
      background: rgba(var(--nxc-accent-rgb),0.2);
      border-color: rgba(var(--nxc-accent-rgb),0.4);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(var(--nxc-accent-rgb),.22);
    }
    .nxc-chip:active { transform: scale(.97) translateY(0); }

    /* ── Image preview ── */
    #nxc-preview {
      display: none;
      padding: 8px 16px;
      background: rgba(0,0,0,0.25);
      border-top: 1px solid rgba(255,255,255,0.06);
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-shrink: 0;
    }
    #nxc-preview img { max-height: 52px; border-radius: 8px; }
    #nxc-preview button {
      background: rgba(239,68,68,.15);
      border: 1px solid rgba(239,68,68,.25);
      color: #f87171;
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s;
    }
    #nxc-preview button:hover { background: rgba(239,68,68,.25); }

    /* ── Input area ── */
    .nxc-input-area {
      padding: 12px 14px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
      background: rgba(255,255,255,0.025);
    }
    .nxc-attach {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.09);
      color: #a0aec0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background .2s, transform .15s, color .2s;
      flex-shrink: 0;
      font-size: 17px;
    }
    .nxc-attach:hover { background: rgba(255,255,255,0.11); transform: scale(1.06); color: var(--nxc-accent); }
    .nxc-input-field {
      flex: 1;
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 9px 14px;
      color: #e2e8f0;
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
      caret-color: var(--nxc-accent);
    }
    .nxc-input-field:focus {
      border-color: rgba(var(--nxc-accent-rgb),0.5);
      box-shadow: 0 0 0 3px rgba(var(--nxc-accent-rgb),0.12);
    }
    .nxc-input-field::placeholder { color: rgba(255,255,255,0.25); }
    .nxc-send {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      background: linear-gradient(135deg, var(--nxc-accent), var(--nxc-accent-end));
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity .2s, transform .15s, box-shadow .2s;
      box-shadow: 0 4px 16px rgba(var(--nxc-accent-rgb),.4);
      flex-shrink: 0;
    }
    .nxc-send:hover { opacity: .9; transform: scale(1.08); box-shadow: 0 6px 22px rgba(var(--nxc-accent-rgb),.55); }
    .nxc-send:active { transform: scale(.95); }
    .nxc-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    .nxc-send svg { width: 17px; height: 17px; fill: var(--nxc-text-on-accent); }

    /* ── Branding footer ── */
    .nxc-branding {
      text-align: center;
      padding: 5px 0 9px;
      font-size: 10px;
      color: rgba(255,255,255,0.18);
      letter-spacing: .3px;
      flex-shrink: 0;
    }
    .nxc-branding a { color: rgba(255,255,255,0.32); text-decoration: none; transition: color .2s; }
    .nxc-branding a:hover { color: rgba(255,255,255,0.6); }

    /* ── Date divider ── */
    .nxc-date-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      color: rgba(255,255,255,0.3);
      font-size: 10.5px;
      font-weight: 500;
      margin: 4px 0;
    }
    .nxc-date-divider::before,
    .nxc-date-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.07);
    }

    /* ── Mobile full-screen ── */
    @media (max-width: 480px) {
      #nxc-container {
        bottom: 0; right: 0;
        width: 100vw; height: 100dvh;
        max-width: 100vw; max-height: 100dvh;
        border-radius: 0;
        transform-origin: bottom center;
      }
    }
  `;
  document.head.appendChild(style);

  /* ── Toggle Button ── */
  const toggle = document.createElement("button");
  toggle.id = "nxc-toggle";
  toggle.setAttribute("aria-label", "Sohbeti aç/kapat");
  toggle.innerHTML = `
    <svg class="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
  `;
  document.body.appendChild(toggle);

  /* ── Main Container ── */
  const container = document.createElement("div");
  container.id = "nxc-container";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-label", "Sohbet Penceresi");
  container.innerHTML = `
    <div class="nxc-header">
      <div class="nxc-header-left">
        <div class="nxc-avatar" id="nxc-avatar">
          <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </div>
        <div class="nxc-header-text">
          <h3 id="nxc-bot-name">AI Asistan</h3>
          <p><span class="nxc-online-dot"></span> Çevrimiçi, anında yanıtlıyor</p>
        </div>
      </div>
      <div class="nxc-header-actions">
        <button class="nxc-close-btn" id="nxc-close" aria-label="Kapat">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <div class="nxc-messages" id="nxc-messages">
      <div class="nxc-date-divider">Bugün</div>
      <div class="nxc-msg bot" id="nxc-welcome">Merhaba! Size nasıl yardımcı olabilirim?</div>
      <div class="nxc-chips" id="nxc-chips"></div>
    </div>

    <div id="nxc-preview"></div>

    <div class="nxc-input-area">
      <label for="nxc-file" class="nxc-attach" title="Resim yükle">📎</label>
      <input type="file" id="nxc-file" accept="image/*" style="display:none"/>
      <input type="text" id="nxc-input" class="nxc-input-field" placeholder="Mesajınızı yazın..." autocomplete="off"/>
      <button id="nxc-send" class="nxc-send" aria-label="Gönder">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="nxc-branding">Powered by <a href="#" target="_blank">NexusChat</a></div>
  `;
  document.body.appendChild(container);

  /* ── Tema renklerini dinamik olarak uygula ── */
  function applyThemeColor(hexColor) {
    const accent = hexColor;
    // Gradient bitiş rengi: birincil renkten biraz farklılaştır
    const accentEnd = _adjustColor(accent, -30); // biraz koyulaştır
    const { r, g, b } = _hexToRgb(accent);

    // CSS değişkenlerini container'a set et
    container.style.setProperty("--nxc-accent", accent);
    container.style.setProperty("--nxc-accent-end", accentEnd);
    container.style.setProperty("--nxc-accent-rgb", `${r},${g},${b}`);

    // Toggle butonunu da güncelle (inline style ile CSS var override)
    toggle.style.background = `linear-gradient(135deg, ${accent}, ${accentEnd})`;
    toggle.style.boxShadow = `0 8px 30px ${_rgba(accent, 0.45)}, 0 0 0 0 ${_rgba(accent, 0.3)}`;

    // Toggle hover eventlerini de güncelle
    toggle.onmouseenter = () => {
      toggle.style.boxShadow = `0 12px 40px ${_rgba(accent, 0.65)}, 0 0 0 6px ${_rgba(accent, 0.18)}`;
    };
    toggle.onmouseleave = () => {
      toggle.style.boxShadow = `0 8px 30px ${_rgba(accent, 0.45)}, 0 0 0 0 ${_rgba(accent, 0.3)}`;
    };
  }

  /* ── Load bot config ── */
  fetch(`${apiBase}/api/widget/${botId}/config`)
    .then((r) => r.json())
    .then((cfg) => {
      /* Name */
      if (cfg.name) document.getElementById("nxc-bot-name").textContent = cfg.name;

      /* Avatar / Logo */
      if (cfg.logo_url) {
        const av = document.getElementById("nxc-avatar");
        av.innerHTML = `<img src="${cfg.logo_url}" alt="logo"/>`;
      }

      /* Theme color — tüm dinamik stilleri güncelle */
      if (cfg.theme_color) {
        applyThemeColor(cfg.theme_color);
      }

      /* Text color */
      if (cfg.text_color) {
        container.style.setProperty("--nxc-text-on-accent", cfg.text_color);
      }

      /* Welcome */
      if (cfg.welcome_message) {
        document.getElementById("nxc-welcome").textContent = cfg.welcome_message;
      }

      /* Suggestion chips */
      if (cfg.example_questions) {
        const chipsEl = document.getElementById("nxc-chips");
        const questions = cfg.example_questions.split(",").map((q) => q.trim()).filter(Boolean);
        if (questions.length) {
          questions.forEach((q) => {
            const btn = document.createElement("button");
            btn.className = "nxc-chip";
            btn.textContent = q;
            btn.addEventListener("click", () => {
              document.getElementById("nxc-input").value = q;
              sendMessage();
              chipsEl.style.display = "none";
            });
            chipsEl.appendChild(btn);
          });
        } else {
          chipsEl.style.display = "none";
        }
      } else {
        document.getElementById("nxc-chips").style.display = "none";
      }
    })
    .catch(() => {
      document.getElementById("nxc-chips").style.display = "none";
    });

  /* ── Toggle open/close ── */
  toggle.addEventListener("click", () => {
    const isOpen = container.classList.toggle("open");
    toggle.classList.toggle("open", isOpen);
    if (isOpen) {
      // Badge'i kaldır
      const badge = toggle.querySelector("#nxc-badge");
      if (badge) badge.remove();
      setTimeout(() => document.getElementById("nxc-input").focus(), 350);
    }
  });
  document.getElementById("nxc-close").addEventListener("click", () => {
    container.classList.remove("open");
    toggle.classList.remove("open");
  });

  /* ── File upload ── */
  let attachmentUrl = null;
  const fileInput = document.getElementById("nxc-file");
  const preview = document.getElementById("nxc-preview");
  const attachBtn = container.querySelector(".nxc-attach");

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    attachBtn.textContent = "⌛";
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${apiBase}/api/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        attachmentUrl = apiBase ? `${apiBase}${data.url}` : data.url;
        preview.style.display = "flex";
        preview.innerHTML = `<img src="${attachmentUrl}" alt="preview"/> <button onclick="window.__nxcClear()">✖ Kaldır</button>`;
      }
    } catch {
      alert("Dosya yüklenemedi.");
    } finally {
      attachBtn.textContent = "📎";
      fileInput.value = "";
    }
  });

  window.__nxcClear = () => {
    attachmentUrl = null;
    preview.style.display = "none";
    preview.innerHTML = "";
  };

  /* ── Zaman formatla ── */
  function _formatTime() {
    const now = new Date();
    return now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  /* ── Send message ── */
  const inputEl = document.getElementById("nxc-input");
  const sendBtn = document.getElementById("nxc-send");
  const msgList = document.getElementById("nxc-messages");

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text && !attachmentUrl) return;

    /* User bubble */
    const userBubble = document.createElement("div");
    userBubble.className = "nxc-msg user";
    if (text) {
      const t = document.createElement("div");
      t.textContent = text;
      userBubble.appendChild(t);
    }
    if (attachmentUrl) {
      const img = document.createElement("img");
      img.src = attachmentUrl;
      img.style.cssText = "max-width:100%;border-radius:9px;margin-top:" + (text ? "8px" : "0");
      userBubble.appendChild(img);
    }
    const timeEl = document.createElement("span");
    timeEl.className = "nxc-msg-time";
    timeEl.textContent = _formatTime();
    userBubble.appendChild(timeEl);

    msgList.appendChild(userBubble);
    inputEl.value = "";
    const sentUrl = attachmentUrl;
    window.__nxcClear();
    sendBtn.disabled = true;

    /* Typing indicator */
    const typing = document.createElement("div");
    typing.className = "nxc-typing nxc-msg";
    typing.innerHTML = "<span></span><span></span><span></span>";
    msgList.appendChild(typing);
    msgList.scrollTop = msgList.scrollHeight;

    try {
      const res = await fetch(`${apiBase}/api/widget/${botId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text || "Bu görseli açıkla.",
          session_id: sessionId,
          attachment_url: sentUrl,
        }),
      });
      const data = await res.json();
      typing.remove();

      /* Bot bubble */
      const botBubble = document.createElement("div");
      botBubble.className = "nxc-msg bot";
      
      let rawText = data.answer || "Yanıt alınamadı.";
      let mdHtml = rawText
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");
      
      botBubble.innerHTML = mdHtml;

      const botTime = document.createElement("span");
      botTime.className = "nxc-msg-time";
      botTime.textContent = _formatTime();
      botBubble.appendChild(botTime);

      if (data.sources && data.sources.length) {
        const det = document.createElement("details");
        det.className = "nxc-sources";
        det.innerHTML =
          `<summary>📄 ${data.sources.length} kaynak göster</summary>` +
          data.sources.map((s) => `<div class="nxc-src">• ${s.file_name}</div>`).join("");
        botBubble.appendChild(det);
      }
      msgList.appendChild(botBubble);

      if (data.session_id) {
        sessionId = data.session_id;
        localStorage.setItem("nxc_session_" + botId, sessionId);
      }

      /* Pencere kapalıysa badge göster */
      if (!container.classList.contains("open")) {
        let badge = toggle.querySelector("#nxc-badge");
        if (!badge) {
          badge = document.createElement("div");
          badge.id = "nxc-badge";
          badge.textContent = "1";
          toggle.appendChild(badge);
        }
      }
    } catch {
      typing.remove();
      const err = document.createElement("div");
      err.className = "nxc-msg bot";
      err.textContent = "Bağlantı hatası. Lütfen tekrar deneyin.";
      msgList.appendChild(err);
    }

    sendBtn.disabled = false;
    msgList.scrollTop = msgList.scrollHeight;
    inputEl.focus();
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
})();
