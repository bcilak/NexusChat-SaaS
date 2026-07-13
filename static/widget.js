/**
 * ChatGenius AI Widget — Premium Embeddable Chat Widget v3.0
 * Usage: <script src="https://yoursite.com/static/widget.js" data-bot-id="BOT_ID"></script>
 * Optional: data-api-base="https://custom-api-origin.com"
 *
 * v3.0: light/dark theme, home screen, privacy notice, left/right position,
 *       auto-open, proactive bubble, conversation reset, message feedback,
 *       branding toggle, sound notification.
 */
(function () {
  "use strict";

  const script = document.currentScript;
  const botId = script.getAttribute("data-bot-id");
  const apiBase =
    script.getAttribute("data-api-base") ||
    script.src.replace("/static/widget.js", "");

  if (!botId) {
    console.error("ChatGenius Widget: data-bot-id attribute is required");
    return;
  }

  /* --- Session --- */
  let sessionId =
    localStorage.getItem("nxc_session_" + botId) || _uid();
  localStorage.setItem("nxc_session_" + botId, sessionId);

  function _uid() {
    return "s_" + Math.random().toString(36).slice(2, 13);
  }

  /* --- Config state (defaults; overridden by /config) --- */
  const state = {
    themeMode: "dark",
    showHome: false,
    privacyUrl: null,
    position: "right",
    autoOpenDelay: 0,
    proactiveMessage: null,
    brandingVisible: true,
    soundEnabled: false,
    heroHeader: false,
    hasInteracted: sessionStorage.getItem("nxc_interacted_" + botId) === "1",
  };

  /* --- Helper: Hex rengi biraz koyulaştır / açıklaştır --- */
  function _adjustColor(hex, amount) {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  /* --- Helper: Hex'den RGB al --- */
  function _hexToRgb(hex) {
    const num = parseInt(hex.replace("#", ""), 16);
    return {
      r: (num >> 16) & 0xff,
      g: (num >> 8) & 0xff,
      b: num & 0xff,
    };
  }

  /* --- Helper: RGB'den rgba string oluştur --- */
  function _rgba(hex, alpha) {
    const { r, g, b } = _hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* --- Ses bildirimi (Web Audio, dosya gerektirmez) --- */
  function _playDing() {
    if (!state.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch { /* Autoplay policy vb. — sessizce geç */ }
  }

  /* --- Google Fonts (Inter) --- */
  if (!document.getElementById("nxc-font")) {
    const link = document.createElement("link");
    link.id = "nxc-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }

  /* --- Styles --- */
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

    /* --- Theme tokens (dark default) --- */
    #nxc-container {
      --nxc-bg: rgba(13, 13, 26, 0.88);
      --nxc-panel-border: rgba(255,255,255,0.08);
      --nxc-text: #e2e8f0;
      --nxc-text-muted: #94a3b8;
      --nxc-text-faint: rgba(255,255,255,0.25);
      --nxc-bubble-bg: rgba(255,255,255,0.06);
      --nxc-bubble-border: rgba(255,255,255,0.09);
      --nxc-input-bg: rgba(255,255,255,0.055);
      --nxc-input-border: rgba(255,255,255,0.08);
      --nxc-divider: rgba(255,255,255,0.07);
      --nxc-divider-text: rgba(255,255,255,0.3);
      --nxc-scrollbar: rgba(255,255,255,0.1);
      --nxc-branding: rgba(255,255,255,0.18);
      --nxc-branding-link: rgba(255,255,255,0.32);
      --nxc-form-bg: rgba(0,0,0,0.2);
      --nxc-form-input-bg: rgba(0,0,0,0.3);
      --nxc-form-text: #ffffff;
      --nxc-preview-bg: rgba(0,0,0,0.25);
    }
    #nxc-container.nxc-light {
      --nxc-bg: rgba(255, 255, 255, 0.97);
      --nxc-panel-border: rgba(15,23,42,0.08);
      --nxc-text: #1e293b;
      --nxc-text-muted: #64748b;
      --nxc-text-faint: rgba(15,23,42,0.35);
      --nxc-bubble-bg: #f1f3f9;
      --nxc-bubble-border: rgba(15,23,42,0.06);
      --nxc-input-bg: #f1f3f9;
      --nxc-input-border: rgba(15,23,42,0.1);
      --nxc-divider: rgba(15,23,42,0.08);
      --nxc-divider-text: rgba(15,23,42,0.35);
      --nxc-scrollbar: rgba(15,23,42,0.15);
      --nxc-branding: rgba(15,23,42,0.3);
      --nxc-branding-link: rgba(15,23,42,0.45);
      --nxc-form-bg: rgba(15,23,42,0.04);
      --nxc-form-input-bg: #ffffff;
      --nxc-form-text: #1e293b;
      --nxc-preview-bg: rgba(15,23,42,0.05);
    }

    /* --- Toggle Button --- */
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
    #nxc-toggle.nxc-left { right: auto; left: 24px; }
    #nxc-toggle:hover {
      transform: scale(1.12);
      box-shadow: 0 12px 40px rgba(var(--nxc-accent-rgb),.6), 0 0 0 6px rgba(var(--nxc-accent-rgb),.15);
    }
    #nxc-toggle:active { transform: scale(.96); }
    #nxc-toggle svg { width: 28px; height: 28px; fill: var(--nxc-text-on-accent); transition: transform .35s cubic-bezier(.34,1.56,.64,1); pointer-events: none; }
    #nxc-toggle.open svg.icon-chat { transform: scale(0) rotate(-90deg); }
    #nxc-toggle.open svg.icon-close { transform: scale(1) rotate(0deg); }
    #nxc-toggle svg.icon-close { position: absolute; transform: scale(0) rotate(90deg); }

    /* --- Proaktif balon --- */
    #nxc-proactive {
      position: fixed;
      bottom: 36px;
      right: 98px;
      z-index: 2147483646;
      max-width: 240px;
      background: #ffffff;
      color: #1e293b;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      padding: 12px 16px;
      padding-right: 30px;
      border-radius: 14px;
      border-bottom-right-radius: 4px;
      box-shadow: 0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);
      cursor: pointer;
      animation: nxc-proactive-in .45s cubic-bezier(.34,1.56,.64,1) both;
    }
    #nxc-proactive.nxc-left { right: auto; left: 98px; border-bottom-right-radius: 14px; border-bottom-left-radius: 4px; }
    @keyframes nxc-proactive-in {
      from { opacity: 0; transform: translateY(10px) scale(.92); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    #nxc-proactive-close {
      position: absolute;
      top: 6px;
      right: 8px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      padding: 2px;
      line-height: 1;
    }
    #nxc-proactive-close:hover { color: #475569; }

    /* --- Notification badge --- */
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

    /* --- Main Container --- */
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
      background: var(--nxc-bg);
      backdrop-filter: blur(24px) saturate(200%);
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      border: 1px solid var(--nxc-panel-border);
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
    #nxc-container.nxc-light {
      box-shadow:
        0 32px 80px rgba(15,23,42,0.18),
        0 8px 24px rgba(15,23,42,0.08);
    }
    #nxc-container.nxc-left {
      right: auto;
      left: 24px;
      transform-origin: bottom left;
    }
    #nxc-container.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* --- Header --- */
    .nxc-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, var(--nxc-accent) 0%, var(--nxc-accent-end) 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
      transition: padding .45s cubic-bezier(.4,0,.2,1);
    }
    /* --- Hero header (genişletilmiş marka alanı; sohbet başlayınca küçülür) --- */
    #nxc-container.nxc-hero .nxc-header {
      padding: 30px 22px 26px;
    }
    #nxc-container.nxc-hero .nxc-avatar {
      width: 64px;
      height: 64px;
      border-radius: 18px;
    }
    #nxc-container.nxc-hero .nxc-avatar svg { width: 30px; height: 30px; }
    #nxc-container.nxc-hero .nxc-header-text h3 {
      font-size: 21px;
      white-space: normal;
    }
    #nxc-container.nxc-hero .nxc-header-text p {
      font-size: 13px;
      margin-top: 4px;
      white-space: normal;
      -webkit-line-clamp: 2;
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
      min-width: 0;
    }
    .nxc-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      transition: width .45s cubic-bezier(.4,0,.2,1), height .45s cubic-bezier(.4,0,.2,1), border-radius .45s cubic-bezier(.4,0,.2,1);
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
    .nxc-header-text { min-width: 0; }
    .nxc-header-text h3 {
      margin: 0;
      transition: font-size .45s cubic-bezier(.4,0,.2,1);
      font-size: 15px;
      font-weight: 700;
      color: var(--nxc-text-on-accent);
      letter-spacing: -0.2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nxc-header-text p {
      margin: 2px 0 0;
      transition: font-size .45s cubic-bezier(.4,0,.2,1);
      font-size: 11px;
      color: rgba(255,255,255,0.75);
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nxc-online-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
      animation: nxc-pulse 2s infinite;
      flex-shrink: 0;
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
      flex-shrink: 0;
    }
    .nxc-header-btn {
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
    .nxc-header-btn:hover { background: rgba(255,255,255,0.28); transform: scale(1.08); }
    .nxc-header-btn svg { width: 14px; height: 14px; fill: none; stroke: var(--nxc-text-on-accent); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }

    /* --- Home Screen --- */
    .nxc-home {
      flex: 1;
      overflow-y: auto;
      padding: 36px 24px 20px;
      display: none;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }
    .nxc-home.active { display: flex; }
    /* Karşılama ekranı açıkken yazma alanı ve gizlilik notu gizli */
    #nxc-container.nxc-home-active .nxc-input-area,
    #nxc-container.nxc-home-active .nxc-privacy,
    #nxc-container.nxc-home-active #nxc-preview { display: none !important; }
    .nxc-home-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--nxc-accent), var(--nxc-accent-end));
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(var(--nxc-accent-rgb),.35);
      margin-bottom: 14px;
      flex-shrink: 0;
    }
    .nxc-home-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .nxc-home-avatar svg { width: 32px; height: 32px; fill: var(--nxc-text-on-accent); }
    .nxc-home-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--nxc-text);
      letter-spacing: -0.3px;
      margin: 0;
      max-width: 300px;
    }
    .nxc-home-subtitle {
      font-size: 13px;
      color: var(--nxc-text-muted);
      margin: 0 0 18px;
      max-width: 280px;
      line-height: 1.55;
    }
    .nxc-home-chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      width: 100%;
    }
    .nxc-home-chips .nxc-chip {
      font-size: 13px;
      padding: 9px 16px;
    }
    .nxc-home-start {
      margin-top: 18px;
      padding: 11px 26px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--nxc-accent), var(--nxc-accent-end));
      color: var(--nxc-text-on-accent);
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(var(--nxc-accent-rgb),.35);
      transition: transform .18s, box-shadow .2s;
    }
    .nxc-home-start:hover { transform: translateY(-1px); box-shadow: 0 8px 26px rgba(var(--nxc-accent-rgb),.5); }
    .nxc-home-start:active { transform: scale(.97); }

    /* --- Messages --- */
    .nxc-messages {
      flex: 1;
      overflow-y: auto;
      padding: 18px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    .nxc-messages.nxc-hidden { display: none; }
    .nxc-messages::-webkit-scrollbar { width: 3px; }
    .nxc-messages::-webkit-scrollbar-track { background: transparent; }
    .nxc-messages::-webkit-scrollbar-thumb { background: var(--nxc-scrollbar); border-radius: 10px; }

    /* Message animation */
    .nxc-msg {
      flex-shrink: 0;
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
      background: var(--nxc-bubble-bg);
      border: 1px solid var(--nxc-bubble-border);
      color: var(--nxc-text);
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
    .nxc-msg.bot .nxc-msg-time { text-align: left; color: var(--nxc-text-muted); }
    .nxc-msg.user .nxc-msg-time { text-align: right; color: var(--nxc-text-on-accent); }

    /* --- Feedback (thumbs) --- */
    .nxc-feedback {
      display: flex;
      gap: 4px;
      margin-top: 6px;
    }
    .nxc-fb-btn {
      background: none;
      border: 1px solid var(--nxc-bubble-border);
      border-radius: 7px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      padding: 4px 7px;
      opacity: .55;
      transition: opacity .2s, background .2s, transform .15s;
    }
    .nxc-fb-btn:hover { opacity: 1; transform: scale(1.1); }
    .nxc-fb-btn.selected {
      opacity: 1;
      background: rgba(var(--nxc-accent-rgb),.15);
      border-color: rgba(var(--nxc-accent-rgb),.4);
    }
    .nxc-fb-btn:disabled { cursor: default; }
    .nxc-fb-btn:disabled:not(.selected) { opacity: .25; transform: none; }

    /* Typing indicator */
    .nxc-typing {
      background: var(--nxc-bubble-bg);
      border: 1px solid var(--nxc-bubble-border);
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
      border-top: 1px solid var(--nxc-divider);
    }
    .nxc-sources summary {
      font-size: 10.5px;
      color: var(--nxc-accent);
      cursor: pointer;
      user-select: none;
      list-style: none;
    }
    .nxc-sources summary::-webkit-details-marker { display: none; }
    .nxc-sources .nxc-src {
      font-size: 10.5px;
      color: var(--nxc-text-muted);
      padding: 2px 0;
    }

    /* --- Suggestion Chips --- */
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
      font-family: inherit;
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

    /* --- Ürün kartları --- */
    .nxc-products {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 4px 2px 8px;
      align-self: stretch;
      max-width: 100%;
      flex-shrink: 0; /* flex kolon içinde ezilmesin — kartlar tam boy görünsün */
      animation: nxc-msgIn .4s ease both;
      scrollbar-width: thin;
    }
    .nxc-products::-webkit-scrollbar { height: 4px; }
    .nxc-products::-webkit-scrollbar-thumb { background: var(--nxc-scrollbar); border-radius: 10px; }
    .nxc-pcard {
      min-width: 150px;
      max-width: 150px;
      background: var(--nxc-bubble-bg);
      border: 1px solid var(--nxc-bubble-border);
      border-radius: 13px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .nxc-pcard-img {
      width: 100%;
      height: 104px;
      object-fit: cover;
      background: var(--nxc-preview-bg);
      display: block;
    }
    .nxc-pcard-body {
      padding: 9px 10px 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      flex: 1;
    }
    .nxc-pcard-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--nxc-text);
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 31px;
    }
    .nxc-pcard-price { font-size: 12.5px; font-weight: 700; color: var(--nxc-accent); }
    .nxc-pcard-price .nxc-old {
      font-size: 10.5px;
      font-weight: 500;
      color: var(--nxc-text-muted);
      text-decoration: line-through;
      margin-right: 5px;
    }
    .nxc-pcard-stock { font-size: 10px; color: var(--nxc-text-muted); }
    .nxc-pcard-stock.nxc-out { color: #f87171; }
    .nxc-pcard-btn {
      margin-top: auto;
      text-align: center;
      display: block;
      padding: 6px 4px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--nxc-accent), var(--nxc-accent-end));
      color: var(--nxc-text-on-accent);
      font-size: 11px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity .2s, transform .15s;
    }
    .nxc-pcard-btn:hover { opacity: .88; transform: translateY(-1px); }

    /* --- Image preview --- */
    #nxc-preview {
      display: none;
      padding: 8px 16px;
      background: var(--nxc-preview-bg);
      border-top: 1px solid var(--nxc-divider);
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

    /* --- Privacy notice --- */
    .nxc-privacy {
      display: none;
      padding: 7px 16px;
      font-size: 10px;
      letter-spacing: .3px;
      text-align: center;
      color: var(--nxc-text-muted);
      background: var(--nxc-preview-bg);
      border-top: 1px solid var(--nxc-divider);
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
    }
    .nxc-privacy a {
      color: var(--nxc-text);
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* --- Input area --- */
    .nxc-input-area {
      padding: 12px 14px;
      border-top: 1px solid var(--nxc-divider);
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
      background: var(--nxc-bubble-bg);
    }
    .nxc-attach {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      background: var(--nxc-input-bg);
      border: 1px solid var(--nxc-input-border);
      color: var(--nxc-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background .2s, transform .15s, color .2s;
      flex-shrink: 0;
      font-size: 17px;
    }
    .nxc-attach:hover { transform: scale(1.06); color: var(--nxc-accent); }
    .nxc-input-field {
      flex: 1;
      background: var(--nxc-input-bg);
      border: 1px solid var(--nxc-input-border);
      border-radius: 12px;
      padding: 9px 14px;
      color: var(--nxc-text);
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
      caret-color: var(--nxc-accent);
      min-width: 0;
    }
    .nxc-input-field:focus {
      border-color: rgba(var(--nxc-accent-rgb),0.5);
      box-shadow: 0 0 0 3px rgba(var(--nxc-accent-rgb),0.12);
    }
    .nxc-input-field::placeholder { color: var(--nxc-text-faint); }
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

    /* --- Branding footer --- */
    .nxc-branding {
      text-align: center;
      padding: 5px 0 9px;
      font-size: 10px;
      color: var(--nxc-branding);
      letter-spacing: .3px;
      flex-shrink: 0;
    }
    .nxc-branding a { color: var(--nxc-branding-link); text-decoration: none; transition: color .2s; }
    .nxc-branding a:hover { color: var(--nxc-text-muted); }
    .nxc-branding.nxc-hidden { display: none; }

    /* --- Date divider --- */
    .nxc-date-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--nxc-divider-text);
      font-size: 10.5px;
      font-weight: 500;
      margin: 4px 0;
    }
    .nxc-date-divider::before,
    .nxc-date-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--nxc-divider);
    }

    /* --- Ticket form (bot bubble içinde) --- */
    .nxc-ticket-form {
      border: 1px solid var(--nxc-bubble-border);
      background: var(--nxc-form-bg);
      padding: 12px;
      border-radius: 12px;
      font-family: inherit;
    }
    .nxc-ticket-form h4 { margin: 0 0 4px 0; color: var(--nxc-accent); font-size: 14px; }
    .nxc-ticket-form p { margin: 0 0 10px 0; color: var(--nxc-text-muted); font-size: 12px; }
    .nxc-ticket-form input,
    .nxc-ticket-form textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 8px;
      margin-bottom: 8px;
      border-radius: 6px;
      border: 1px solid var(--nxc-input-border);
      background: var(--nxc-form-input-bg);
      color: var(--nxc-form-text);
      font-size: 13px;
      font-family: inherit;
    }
    .nxc-ticket-form button {
      width: 100%;
      padding: 8px;
      border-radius: 6px;
      border: none;
      background: var(--nxc-accent);
      color: var(--nxc-text-on-accent);
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: .2s;
    }

    @media (prefers-reduced-motion: reduce) {
      #nxc-toggle, #nxc-container, .nxc-msg, .nxc-chips, #nxc-proactive { animation: none !important; transition: none !important; }
    }

    /* --- Mobile full-screen --- */
    @media (max-width: 480px) {
      #nxc-container {
        bottom: 0; right: 0; left: auto;
        width: 100vw; height: 100dvh;
        max-width: 100vw; max-height: 100dvh;
        border-radius: 0;
        transform-origin: bottom center;
      }
      #nxc-container.nxc-left { left: 0; right: auto; }
      /* Chat açıkken toggle butonunu gizle — input'un üzerine gelmesin */
      #nxc-toggle.open {
        display: none !important;
      }
      /* iOS safe-area (home indicator) için input alanına boşluk */
      .nxc-input-area {
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      }
      .nxc-branding {
        padding-bottom: calc(9px + env(safe-area-inset-bottom, 0px));
      }
      #nxc-proactive { max-width: calc(100vw - 120px); }
    }
  `;
  document.head.appendChild(style);

  /* --- Toggle Button --- */
  const toggle = document.createElement("button");
  toggle.id = "nxc-toggle";
  toggle.setAttribute("aria-label", "Sohbeti aç/kapat");
  toggle.innerHTML = `
    <svg class="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
  `;
  document.body.appendChild(toggle);

  /* --- Main Container --- */
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
          <p id="nxc-bot-status"><span class="nxc-online-dot"></span> <span id="nxc-subtitle-text">Çevrimiçi, anında yanıtlıyor</span></p>
        </div>
      </div>
      <div class="nxc-header-actions">
        <button class="nxc-header-btn" id="nxc-reset" aria-label="Yeni sohbet" title="Yeni sohbet başlat">
          <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
        </button>
        <button class="nxc-header-btn" id="nxc-close" aria-label="Kapat">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <div class="nxc-home" id="nxc-home">
      <div class="nxc-home-avatar" id="nxc-home-avatar">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </div>
      <h2 class="nxc-home-title" id="nxc-home-title">Merhaba! 👋</h2>
      <p class="nxc-home-subtitle" id="nxc-home-subtitle"></p>
      <div class="nxc-home-chips" id="nxc-home-chips"></div>
      <button class="nxc-home-start" id="nxc-home-start">Sohbete başla</button>
    </div>

    <div class="nxc-messages" id="nxc-messages">
      <div class="nxc-date-divider">Bugün</div>
      <div class="nxc-msg bot" id="nxc-welcome">Merhaba! Size nasıl yardımcı olabilirim?</div>
      <div class="nxc-chips" id="nxc-chips"></div>
    </div>

    <div id="nxc-preview"></div>

    <div class="nxc-privacy" id="nxc-privacy"></div>

    <div class="nxc-input-area">
      <label for="nxc-file" class="nxc-attach" title="Resim yükle">📎</label>
      <input type="file" id="nxc-file" accept="image/*" style="display:none"/>
      <input type="text" id="nxc-input" class="nxc-input-field" placeholder="Mesajınızı yazın..." autocomplete="off"/>
      <button id="nxc-send" class="nxc-send" aria-label="Gönder">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="nxc-branding" id="nxc-branding">Powered by <a href="#" target="_blank">ChatGenius</a></div>
  `;
  document.body.appendChild(container);

  const homeEl = document.getElementById("nxc-home");
  const msgList = document.getElementById("nxc-messages");
  const inputEl = document.getElementById("nxc-input");
  const sendBtn = document.getElementById("nxc-send");

  /* --- Hero header: sohbet başlayınca kompakt boyuta küçül --- */
  function collapseHero() {
    container.classList.remove("nxc-hero");
  }
  function expandHero() {
    if (state.heroHeader && !state.hasInteracted) {
      container.classList.add("nxc-hero");
    }
  }

  /* --- Home screen görünürlüğü --- */
  function showHomeScreen() {
    homeEl.classList.add("active");
    msgList.classList.add("nxc-hidden");
    container.classList.add("nxc-home-active");
  }
  function showChatScreen() {
    homeEl.classList.remove("active");
    msgList.classList.remove("nxc-hidden");
    container.classList.remove("nxc-home-active");
    setTimeout(() => inputEl.focus(), 100);
  }
  document.getElementById("nxc-home-start").addEventListener("click", showChatScreen);

  /* --- Tema renklerini dinamik olarak uygula --- */
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

  /* --- Chip oluştur (emoji destekli) --- */
  function buildChip(text, onClick) {
    const btn = document.createElement("button");
    btn.className = "nxc-chip";
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    return btn;
  }

  /* --- Widget'ı aç --- */
  function openWidget() {
    container.classList.add("open");
    toggle.classList.add("open");
    _removeProactive();
    const badge = toggle.querySelector("#nxc-badge");
    if (badge) badge.remove();
    if (state.showHome && !state.hasInteracted) {
      showHomeScreen();
    } else {
      setTimeout(() => inputEl.focus(), 350);
    }
  }
  function closeWidget() {
    container.classList.remove("open");
    toggle.classList.remove("open");
  }

  /* --- Proaktif balon --- */
  let proactiveEl = null;
  function _removeProactive() {
    if (proactiveEl) {
      proactiveEl.remove();
      proactiveEl = null;
    }
  }
  function showProactive(text) {
    if (proactiveEl || container.classList.contains("open")) return;
    if (sessionStorage.getItem("nxc_proactive_dismissed_" + botId)) return;
    proactiveEl = document.createElement("div");
    proactiveEl.id = "nxc-proactive";
    if (state.position === "left") proactiveEl.classList.add("nxc-left");
    const txt = document.createElement("span");
    txt.textContent = text;
    const closeBtn = document.createElement("button");
    closeBtn.id = "nxc-proactive-close";
    closeBtn.setAttribute("aria-label", "Kapat");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sessionStorage.setItem("nxc_proactive_dismissed_" + botId, "1");
      _removeProactive();
    });
    proactiveEl.appendChild(txt);
    proactiveEl.appendChild(closeBtn);
    proactiveEl.addEventListener("click", openWidget);
    document.body.appendChild(proactiveEl);
  }

  /* --- Load bot config --- */
  fetch(`${apiBase}/api/widget/${botId}/config`)
    .then((r) => {
      if (r.status === 404) return { active: false }; // Bot silinmiş — widget'ı kaldır
      return r.json();
    })
    .then((cfg) => {
      /* Bot pasifse veya silinmişse widget'ı tamamen kaldır — sitede hiçbir iz kalmasın */
      if (cfg.active === false) {
        toggle.remove();
        container.remove();
        _removeProactive();
        return;
      }

      /* Name */
      if (cfg.name) {
        document.getElementById("nxc-bot-name").textContent = cfg.name;
        document.getElementById("nxc-home-title").textContent = cfg.name;
      }

      /* Subtitle — header'da ve home screen'de */
      if (cfg.subtitle) {
        document.getElementById("nxc-subtitle-text").textContent = cfg.subtitle;
        document.getElementById("nxc-home-subtitle").textContent = cfg.subtitle;
      }

      /* Avatar / Logo */
      if (cfg.logo_url) {
        document.getElementById("nxc-avatar").innerHTML = `<img src="${cfg.logo_url}" alt="logo"/>`;
        document.getElementById("nxc-home-avatar").innerHTML = `<img src="${cfg.logo_url}" alt="logo"/>`;
      }

      /* Theme color — tüm dinamik stilleri güncelle */
      if (cfg.theme_color) {
        applyThemeColor(cfg.theme_color);
      }

      /* Text color */
      if (cfg.text_color) {
        container.style.setProperty("--nxc-text-on-accent", cfg.text_color);
      }

      /* Light / dark theme */
      state.themeMode = cfg.theme_mode || "dark";
      if (state.themeMode === "light") {
        container.classList.add("nxc-light");
      }

      /* Position */
      state.position = cfg.widget_position || "right";
      if (state.position === "left") {
        toggle.classList.add("nxc-left");
        container.classList.add("nxc-left");
      }

      /* Branding */
      state.brandingVisible = cfg.branding_visible !== false;
      if (!state.brandingVisible) {
        document.getElementById("nxc-branding").classList.add("nxc-hidden");
      }

      /* Sound */
      state.soundEnabled = !!cfg.sound_enabled;

      /* Hero header — sohbet henüz başlamadıysa genişletilmiş açılır */
      state.heroHeader = !!cfg.hero_header;
      expandHero();

      /* Privacy notice */
      if (cfg.privacy_url) {
        state.privacyUrl = cfg.privacy_url;
        const privacyEl = document.getElementById("nxc-privacy");
        privacyEl.style.display = "flex";
        privacyEl.innerHTML = `<span>Sohbet ederek <a href="${cfg.privacy_url}" target="_blank" rel="noopener">gizlilik politikasını</a> kabul ediyorsunuz.</span>`;
      }

      /* Welcome */
      const welcomeText = cfg.welcome_message;
      if (welcomeText) {
        document.getElementById("nxc-welcome").textContent = welcomeText;
        if (!cfg.subtitle) {
          document.getElementById("nxc-home-subtitle").textContent = welcomeText;
        }
      }

      /* Home screen */
      state.showHome = !!cfg.show_home_screen;

      /* Suggestion chips — hem sohbette hem home screen'de */
      const chipsEl = document.getElementById("nxc-chips");
      const homeChipsEl = document.getElementById("nxc-home-chips");
      const questions = (cfg.example_questions || "")
        .split(",").map((q) => q.trim()).filter(Boolean);
      if (questions.length) {
        questions.forEach((q) => {
          const ask = () => {
            showChatScreen();
            inputEl.value = q.replace(/^\p{Extended_Pictographic}+\s*/u, ""); // Emoji öneki soruya girmesin
            sendMessage();
            chipsEl.style.display = "none";
          };
          chipsEl.appendChild(buildChip(q, ask));
          homeChipsEl.appendChild(buildChip(q, ask));
        });
      } else {
        chipsEl.style.display = "none";
      }

      /* Auto-open */
      state.autoOpenDelay = cfg.auto_open_delay || 0;
      if (state.autoOpenDelay > 0 && !sessionStorage.getItem("nxc_autoopened_" + botId)) {
        setTimeout(() => {
          if (!container.classList.contains("open")) {
            sessionStorage.setItem("nxc_autoopened_" + botId, "1");
            openWidget();
          }
        }, state.autoOpenDelay * 1000);
      }

      /* Proaktif balon — auto-open'dan bağımsız, 1sn sonra göster */
      state.proactiveMessage = cfg.proactive_message;
      if (state.proactiveMessage) {
        setTimeout(() => showProactive(state.proactiveMessage), 1500);
      }
    })
    .catch(() => {
      document.getElementById("nxc-chips").style.display = "none";
    });

  /* --- Toggle open/close --- */
  toggle.addEventListener("click", () => {
    if (container.classList.contains("open")) {
      closeWidget();
    } else {
      openWidget();
    }
  });
  document.getElementById("nxc-close").addEventListener("click", closeWidget);

  /* --- Konuşmayı sıfırla --- */
  document.getElementById("nxc-reset").addEventListener("click", () => {
    sessionId = _uid();
    localStorage.setItem("nxc_session_" + botId, sessionId);
    sessionStorage.removeItem("nxc_interacted_" + botId);
    state.hasInteracted = false;
    expandHero();
    // Mesaj listesini welcome durumuna döndür
    const welcome = document.getElementById("nxc-welcome");
    const chips = document.getElementById("nxc-chips");
    const divider = msgList.querySelector(".nxc-date-divider");
    msgList.innerHTML = "";
    msgList.appendChild(divider);
    msgList.appendChild(welcome);
    if (chips) {
      chips.style.display = "";
      msgList.appendChild(chips);
    }
    if (state.showHome) {
      showHomeScreen();
    } else {
      inputEl.focus();
    }
  });

  /* --- File upload --- */
  let attachmentUrl = null;
  const fileInput = document.getElementById("nxc-file");
  const preview = document.getElementById("nxc-preview");
  const attachBtn = container.querySelector(".nxc-attach");

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    attachBtn.textContent = "⏳";
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${apiBase}/api/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        attachmentUrl = apiBase ? `${apiBase}${data.url}` : data.url;
        preview.style.display = "flex";
        preview.innerHTML = `<img src="${attachmentUrl}" alt="preview"/> <button onclick="window.__nxcClear()">✅ Kaldır</button>`;
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

  /* --- Zaman formatla --- */
  function _formatTime() {
    const now = new Date();
    return now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  /* --- Feedback butonları (👍👎) --- */
  function attachFeedback(botBubble, messageId) {
    if (!messageId) return;
    const wrap = document.createElement("div");
    wrap.className = "nxc-feedback";
    const up = document.createElement("button");
    up.className = "nxc-fb-btn";
    up.textContent = "👍";
    up.setAttribute("aria-label", "Faydalı");
    const down = document.createElement("button");
    down.className = "nxc-fb-btn";
    down.textContent = "👎";
    down.setAttribute("aria-label", "Faydalı değil");

    async function send(liked, btn) {
      up.disabled = down.disabled = true;
      btn.classList.add("selected");
      try {
        await fetch(`${apiBase}/api/widget/${botId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message_id: messageId, session_id: sessionId, liked }),
        });
      } catch { /* Geri bildirim kaydedilemedi — kullanıcıyı rahatsız etme */ }
    }
    up.addEventListener("click", () => send(true, up));
    down.addEventListener("click", () => send(false, down));
    wrap.appendChild(up);
    wrap.appendChild(down);
    botBubble.appendChild(wrap);
  }

  /* --- Ürün kartları oluştur --- */
  function buildProductCards(products) {
    const wrap = document.createElement("div");
    wrap.className = "nxc-products";
    products.forEach((p) => {
      const card = document.createElement("div");
      card.className = "nxc-pcard";

      if (p.image_url) {
        const img = document.createElement("img");
        img.className = "nxc-pcard-img";
        img.src = p.image_url;
        img.alt = p.title || "";
        img.loading = "lazy";
        img.onerror = () => img.remove();
        card.appendChild(img);
      }

      const body = document.createElement("div");
      body.className = "nxc-pcard-body";

      const title = document.createElement("div");
      title.className = "nxc-pcard-title";
      title.textContent = p.title || "";
      body.appendChild(title);

      const cur = p.currency === "TRY" ? "TL" : (p.currency || "TL");
      const fmt = (n) => Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      if (p.price || p.sale_price) {
        const price = document.createElement("div");
        price.className = "nxc-pcard-price";
        if (p.sale_price && p.price && p.sale_price < p.price) {
          const old = document.createElement("span");
          old.className = "nxc-old";
          old.textContent = fmt(p.price) + " " + cur;
          price.appendChild(old);
          price.appendChild(document.createTextNode(fmt(p.sale_price) + " " + cur));
        } else {
          price.textContent = fmt(p.sale_price || p.price) + " " + cur;
        }
        body.appendChild(price);
      }

      if (p.stock) {
        const stock = document.createElement("div");
        const isOut = String(p.stock).trim() === "0" || /out/i.test(p.stock);
        stock.className = "nxc-pcard-stock" + (isOut ? " nxc-out" : "");
        stock.textContent = isOut ? "Stokta yok" : "Stokta var";
        body.appendChild(stock);
      }

      if (p.product_url) {
        const btn = document.createElement("a");
        btn.className = "nxc-pcard-btn";
        btn.href = p.product_url;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.textContent = "Ürüne Git";
        body.appendChild(btn);
      }

      card.appendChild(body);
      wrap.appendChild(card);
    });
    return wrap;
  }

  /* --- Send message --- */
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text && !attachmentUrl) return;

    showChatScreen();
    collapseHero();
    if (!state.hasInteracted) {
      state.hasInteracted = true;
      sessionStorage.setItem("nxc_interacted_" + botId, "1");
    }

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
        .replace(/!\[([^\]]*)\]\((.*?)\)/g, "<img src='$2' alt='$1' style='max-width:100%; border-radius:8px; margin-top:8px;'/>")
        .replace(/\[([^\]]+)\]\((.*?)\)/g, "<a href='$2' target='_blank' style='color:var(--nxc-accent); font-weight:600; text-decoration:none;'>$1</a>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");

      if (rawText.toUpperCase().replace(/\s+/g,'').includes("[TICKET_FORM_RENDER]")) {
        botBubble.innerHTML = `<div class="nxc-ticket-form">
            <h4>🛠️ Hasar / Eksik Bildirimi</h4>
            <p>Yetkiliye iletmek üzere bilgileri doldurun:</p>
            <input type="text" id="t-order" placeholder="Sipariş No (İsteğe bağlı)" />
            <input type="text" id="t-product" placeholder="Hangi Ürün?" />
            <textarea id="t-summary" placeholder="Sorunu kısaca açıklayın (kırık, vb.)" rows="2"></textarea>
            <button id="t-submit">Talebi Gönder</button></div>`;
        setTimeout(() => {
          const btn = botBubble.querySelector("#t-submit");
          if (btn) {
            btn.addEventListener("click", async () => {
              btn.disabled = true;
              btn.innerText = "İletiliyor...";
              const order = botBubble.querySelector("#t-order").value;
              const product = botBubble.querySelector("#t-product").value;
              const summary = botBubble.querySelector("#t-summary").value;

              if (!product || !summary) {
                btn.innerText = "Lütfen ürün adı ve sorunu yazın!";
                btn.style.background = "#ef4444";
                setTimeout(() => {
                  btn.disabled = false;
                  btn.innerText = "Talebi Gönder";
                  btn.style.background = "";
                }, 2000);
                return;
              }

              try {
                await fetch(`${apiBase}/api/widget/${botId}/ticket`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    session_id: sessionId,
                    order_number: order,
                    product_name: product,
                    damage_summary: summary
                  })
                });
                botBubble.innerHTML = `<div style="padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; color: #34d399; text-align: center; font-size: 13px;">✅ Talebiniz destek ekibimize iletildi. Numaranızı ve sorununuzu aldık.</div>`;
              } catch(e) {
                btn.innerText = "Hata oluştu!";
              }
            });
          }
        }, 150);
      } else {
        botBubble.innerHTML = mdHtml;
      }

      const botTime = document.createElement("span");
      botTime.className = "nxc-msg-time";
      botTime.textContent = _formatTime();
      botBubble.appendChild(botTime);

      if (data.sources && data.sources.length) {
        const det = document.createElement("details");
        det.className = "nxc-sources";
        det.innerHTML =
          `<summary>📚 ${data.sources.length} kaynak göster</summary>` +
          data.sources.map((s) => `<div class="nxc-src">• ${s.file_name}</div>`).join("");
        botBubble.appendChild(det);
      }

      /* 👍👎 geri bildirim */
      attachFeedback(botBubble, data.message_id);

      msgList.appendChild(botBubble);

      /* Ürün kartları — cevabın hemen altında yatay kaydırmalı */
      if (data.products && data.products.length) {
        msgList.appendChild(buildProductCards(data.products));
      }

      _playDing();

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

  /* --- Hero küçülme tetikleyicileri: yazmaya başlama veya mesaj listesinde scroll --- */
  inputEl.addEventListener("input", collapseHero);
  msgList.addEventListener("scroll", () => {
    if (msgList.scrollTop > 10) collapseHero();
  });
})();
