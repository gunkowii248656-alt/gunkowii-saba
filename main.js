/* =========================================================
   GUNKOWII SABA — PORTFOLIO GLOBAL JAVASCRIPT
   Final AI / Popup / Contact Handoff System
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURATION
     ========================================================= */

  const CONFIG = {
    AI_WORKER_URL:
      "https://gunkowii-ai.gunkowii248656.workers.dev/",

    WHATSAPP_URL:
      "https://wa.me/message/V26H2754ROXUB1",

    CONTACT_URL:
      "https://gunkowii-saba.pages.dev/contact.html",

    AUDIT_URL:
      "https://gunkowii-saba.pages.dev/audit.html",

    AI_AVATAR:
      "Screenshot_2026-09-04-12-55-24-480_com.openai.chatgpt-edit.jpg",

    STORAGE: {
      conversation: "gunkowii_ai_conversation",
      handoff: "gunkowii_ai_handoff",
      launcher: "gunkowii_ai_launcher_position",
      panel: "gunkowii_ai_panel_position"
    }
  };

  /* =========================================================
     UTILITY FUNCTIONS
     ========================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  function safeJSONParse(value, fallback = null) {
    if (!value) return fallback;

    if (typeof value === "object") {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function decodeHTMLEntities(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function getPageName() {
    const path = window.location.pathname
      .split("/")
      .pop()
      .replace(".html", "");

    if (!path || path === "index") {
      return "Home";
    }

    return path
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function saveStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }

  function loadStorage(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  /* =========================================================
     AI CONVERSATION STORAGE
     ========================================================= */

  let aiConversation = loadStorage(
    CONFIG.STORAGE.conversation,
    []
  );

  if (!Array.isArray(aiConversation)) {
    aiConversation = [];
  }

  // Prevent unlimited localStorage growth.
  // Keeps enough history for a meaningful consultation.
  function trimConversation() {
    const MAX_MESSAGES = 40;

    if (aiConversation.length > MAX_MESSAGES) {
      aiConversation = aiConversation.slice(-MAX_MESSAGES);
    }
  }

  function saveConversation() {
    trimConversation();
    saveStorage(CONFIG.STORAGE.conversation, aiConversation);
  }

  function clearConversation() {
    aiConversation = [];
    removeStorage(CONFIG.STORAGE.conversation);
  }

  function getFirstBuyerMessage() {
    const firstBuyerMessage = aiConversation.find(
      item =>
        item &&
        item.role === "user" &&
        String(item.content || "").trim()
    );

    return firstBuyerMessage
      ? String(firstBuyerMessage.content).trim()
      : "";
  }

  /* =========================================================
     AI RESPONSE FORMATTER
     ========================================================= */

  function repairMalformedMarkdownLinks(text) {
    let result = String(text || "");

    /*
      Repairs patterns such as:

      [Free Audit]([https://example.com](https://example.com))

      into:

      [Free Audit](https://example.com)
    */

    result = result.replace(
      /\[([^\]]+)\]\(\s*\[\s*(https?:\/\/[^\]\s]+)\s*\]\(\s*(https?:\/\/[^)\s]+)\s*\)\s*\)/gi,
      "[$1]($3)"
    );

    // Another common malformed pattern.
    result = result.replace(
      /\[([^\]]+)\]\(\s*(https?:\/\/[^\s)]+)\s*\]\s*\)/gi,
      "[$1]($2)"
    );

    return result;
  }

  function formatAIResponse(rawText) {
    if (!rawText) return "";

    let text = decodeHTMLEntities(String(rawText));

    // Remove dangerous/irrelevant HTML.
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "");

    text = repairMalformedMarkdownLinks(text);

    const lines = text.split(/\r?\n/);
    const html = [];

    let inList = false;

    function closeList() {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
    }

    function formatInline(value) {
      let output = escapeHTML(value);

      /*
        Markdown links.
      */
      output = output.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );

      /*
        Bold.
      */
      output = output.replace(
        /\*\*([^*]+)\*\*/g,
        "<strong>$1</strong>"
      );

      /*
        Italic.
      */
      output = output.replace(
        /(^|[\s])\*([^*]+)\*(?=$|[\s])/g,
        "$1<em>$2</em>"
      );

      /*
        Raw URLs.
        Avoid replacing URLs already inside href attributes.
      */
      output = output.replace(
        /(^|[\s>])(https?:\/\/[^\s<]+)/gi,
        (match, prefix, url) => {
          const cleanURL = url.replace(/[),.;!?]+$/g, "");

          return `${prefix}<a href="${cleanURL}" target="_blank" rel="noopener noreferrer">${cleanURL}</a>`;
        }
      );

      return output;
    }

    lines.forEach(rawLine => {
      const line = rawLine.trim();

      if (!line) {
        closeList();
        html.push("<div class='ai-space'></div>");
        return;
      }

      /*
        Headings.
      */
      if (/^###\s+/.test(line)) {
        closeList();
        html.push(
          `<h4>${formatInline(line.replace(/^###\s+/, ""))}</h4>`
        );
        return;
      }

      if (/^##\s+/.test(line)) {
        closeList();
        html.push(
          `<h3>${formatInline(line.replace(/^##\s+/, ""))}</h3>`
        );
        return;
      }

      if (/^#\s+/.test(line)) {
        closeList();
        html.push(
          `<h3>${formatInline(line.replace(/^#\s+/, ""))}</h3>`
        );
        return;
      }

      /*
        Bullets.
      */
      if (/^[-*•]\s+/.test(line)) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }

        html.push(
          `<li>${formatInline(
            line.replace(/^[-*•]\s+/, "")
          )}</li>`
        );

        return;
      }

      /*
        Numbered list.
      */
      if (/^\d+\.\s+/.test(line)) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }

        html.push(
          `<li>${formatInline(
            line.replace(/^\d+\.\s+/, "")
          )}</li>`
        );

        return;
      }

      closeList();

      html.push(`<p>${formatInline(line)}</p>`);
    });

    closeList();

    return html.join("");
  }

  /* =========================================================
     AI CSS
     ========================================================= */

  function injectAIStyles() {
    if ($("#gunkowii-ai-styles")) return;

    const style = document.createElement("style");
    style.id = "gunkowii-ai-styles";

    style.textContent = `
      /* =====================================================
         AI LAUNCHER
         ===================================================== */

      #gunkowii-ai-launcher {
        position: fixed;
        z-index: 10001;
        width: 74px;
        min-height: 98px;
        padding: 7px 6px 8px;
        box-sizing: border-box;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;

        border: 1px solid rgba(212,175,55,.65);
        border-radius: 18px;

        background:
          linear-gradient(
            145deg,
            rgba(7,49,39,.98),
            rgba(3,28,23,.98)
          );

        box-shadow:
          0 12px 30px rgba(0,0,0,.25),
          0 0 0 1px rgba(255,255,255,.04) inset;

        cursor: grab;
        user-select: none;
        touch-action: none;

        transition:
          left .45s cubic-bezier(.22,1.3,.36,1),
          right .45s cubic-bezier(.22,1.3,.36,1),
          top .18s ease,
          box-shadow .2s ease,
          transform .2s ease;
      }

      #gunkowii-ai-launcher.dragging {
        cursor: grabbing;
        transform: scale(1.03);
        box-shadow:
          0 18px 40px rgba(0,0,0,.3),
          0 0 0 1px rgba(212,175,55,.35) inset;
      }

      #gunkowii-ai-launcher.gunkowii-ai-snap {
        transition:
          left .48s cubic-bezier(.22,1.35,.36,1),
          right .48s cubic-bezier(.22,1.35,.36,1),
          top .18s ease,
          transform .25s ease;
      }

      #gunkowii-ai-launcher img {
        width: 48px;
        height: 48px;
        object-fit: cover;
        border-radius: 50%;

        border: 2px solid rgba(212,175,55,.9);

        box-shadow:
          0 4px 14px rgba(0,0,0,.25);

        pointer-events: none;
        display: block;
      }

      #gunkowii-ai-launcher .ai-launcher-label {
        width: 100%;
        color: #f7efd9;
        font-size: 9px;
        line-height: 1.15;
        font-weight: 700;
        letter-spacing: .2px;
        text-align: center;
        pointer-events: none;
      }

      #gunkowii-ai-launcher .ai-launcher-status {
        position: absolute;
        top: 8px;
        right: 8px;

        width: 8px;
        height: 8px;
        border-radius: 50%;

        background: #5fd28b;
        box-shadow: 0 0 0 3px rgba(95,210,139,.13);
        pointer-events: none;
      }

      /* =====================================================
         AI PANEL
         ===================================================== */

      #gunkowii-ai-panel {
        position: fixed;
        z-index: 10000;

        right: 18px;
        bottom: 96px;

        width: min(390px, calc(100vw - 24px));
        height: min(610px, calc(100vh - 130px));

        display: none;
        flex-direction: column;

        overflow: hidden;

        border: 1px solid rgba(212,175,55,.5);
        border-radius: 22px;

        background:
          linear-gradient(
            145deg,
            rgba(7,49,39,.99),
            rgba(3,28,23,.99)
          );

        color: #f8f3e7;

        box-shadow:
          0 25px 70px rgba(0,0,0,.38),
          0 0 0 1px rgba(255,255,255,.04) inset;
      }

      #gunkowii-ai-panel.open {
        display: flex;
        animation: gunkowiiAIIn .28s ease;
      }

      @keyframes gunkowiiAIIn {
        from {
          opacity: 0;
          transform: translateY(12px) scale(.98);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* =====================================================
         AI HEADER
         ===================================================== */

      .gunkowii-ai-header {
        flex: 0 0 auto;

        display: flex;
        align-items: center;
        gap: 10px;

        padding: 12px 12px 11px;

        background:
          linear-gradient(
            180deg,
            rgba(255,255,255,.055),
            rgba(255,255,255,.015)
          );

        border-bottom: 1px solid rgba(212,175,55,.18);

        cursor: grab;
        user-select: none;
        touch-action: none;
      }

      .gunkowii-ai-header.dragging {
        cursor: grabbing;
      }

      .gunkowii-ai-avatar {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;

        border-radius: 50%;
        object-fit: cover;

        border: 1.5px solid rgba(212,175,55,.85);
        pointer-events: none;
      }

      .gunkowii-ai-title-area {
        flex: 1;
        min-width: 0;
        pointer-events: none;
      }

      .gunkowii-ai-title {
        font-size: 14px;
        line-height: 1.2;
        font-weight: 800;
        color: #fff8e8;
      }

      .gunkowii-ai-status {
        display: flex;
        align-items: center;
        gap: 5px;

        margin-top: 3px;

        font-size: 9px;
        color: rgba(255,255,255,.66);
      }

      .gunkowii-ai-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #5fd28b;
      }

      .gunkowii-ai-actions {
        display: flex;
        align-items: center;
        gap: 5px;
        flex: 0 0 auto;
      }

      .gunkowii-ai-action {
        border: 1px solid rgba(212,175,55,.25);

        background: rgba(255,255,255,.055);
        color: #f8f3e7;

        border-radius: 9px;

        min-width: 34px;
        height: 31px;

        padding: 0 8px;

        font-size: 11px;
        font-weight: 700;

        cursor: pointer;
      }

      .gunkowii-ai-action:hover {
        background: rgba(212,175,55,.14);
        border-color: rgba(212,175,55,.5);
      }

      .gunkowii-ai-action.close {
        font-size: 18px;
        line-height: 1;
        padding: 0;
      }

      /* =====================================================
         AI MESSAGES
         ===================================================== */

      .gunkowii-ai-messages {
        flex: 1 1 auto;

        overflow-y: auto;
        overscroll-behavior: contain;

        padding: 15px 13px 12px;

        scrollbar-width: thin;
        scrollbar-color: rgba(212,175,55,.4) transparent;
      }

      .gunkowii-ai-message {
        display: flex;
        margin-bottom: 11px;
      }

      .gunkowii-ai-message.user {
        justify-content: flex-end;
      }

      .gunkowii-ai-message.assistant {
        justify-content: flex-start;
      }

      .gunkowii-ai-bubble {
        max-width: 88%;

        padding: 10px 12px;

        border-radius: 14px;

        font-size: 12px;
        line-height: 1.55;

        overflow-wrap: anywhere;
      }

      .gunkowii-ai-message.assistant
      .gunkowii-ai-bubble {
        background: rgba(255,255,255,.075);
        border: 1px solid rgba(255,255,255,.075);
        color: #f7f1e3;

        border-bottom-left-radius: 5px;
      }

      .gunkowii-ai-message.user
      .gunkowii-ai-bubble {
        background:
          linear-gradient(
            135deg,
            rgba(212,175,55,.92),
            rgba(184,145,30,.92)
          );

        color: #172019;
        border-bottom-right-radius: 5px;
        font-weight: 600;
      }

      .gunkowii-ai-bubble p {
        margin: 0 0 7px;
      }

      .gunkowii-ai-bubble p:last-child {
        margin-bottom: 0;
      }

      .gunkowii-ai-bubble h3,
      .gunkowii-ai-bubble h4 {
        margin: 5px 0 7px;
        color: #fff6d9;
      }

      .gunkowii-ai-bubble h3 {
        font-size: 13px;
      }

      .gunkowii-ai-bubble h4 {
        font-size: 12px;
      }

      .gunkowii-ai-bubble ul {
        margin: 5px 0 8px;
        padding-left: 18px;
      }

      .gunkowii-ai-bubble li {
        margin-bottom: 4px;
      }

      .gunkowii-ai-bubble a {
        color: #e5c45b;
        font-weight: 700;
        text-decoration: underline;
      }

      .gunkowii-ai-message.user
      .gunkowii-ai-bubble a {
        color: #102b20;
      }

      .ai-space {
        height: 3px;
      }

      /* =====================================================
         TYPING
         ===================================================== */

      .gunkowii-ai-typing {
        display: none;
        align-items: center;
        gap: 4px;

        padding: 9px 12px;
        margin-bottom: 9px;

        width: fit-content;

        border-radius: 13px;
        background: rgba(255,255,255,.07);
      }

      .gunkowii-ai-typing.show {
        display: flex;
      }

      .gunkowii-ai-typing span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #d4af37;

        animation: gunkowiiTyping 1.1s infinite ease-in-out;
      }

      .gunkowii-ai-typing span:nth-child(2) {
        animation-delay: .15s;
      }

      .gunkowii-ai-typing span:nth-child(3) {
        animation-delay: .3s;
      }

      @keyframes gunkowiiTyping {
        0%, 60%, 100% {
          transform: translateY(0);
          opacity: .45;
        }

        30% {
          transform: translateY(-3px);
          opacity: 1;
        }
      }

      /* =====================================================
         AI HANDOFF
         ===================================================== */

      .gunkowii-ai-handoff {
        display: none;

        margin: 0 13px 10px;
        padding: 11px;

        border-radius: 14px;

        background:
          linear-gradient(
            135deg,
            rgba(212,175,55,.13),
            rgba(255,255,255,.04)
          );

        border: 1px solid rgba(212,175,55,.3);
      }

      .gunkowii-ai-handoff.show {
        display: block;
      }

      .gunkowii-ai-handoff-title {
        font-size: 12px;
        font-weight: 800;
        color: #f6d76d;
        margin-bottom: 4px;
      }

      .gunkowii-ai-handoff-text {
        font-size: 10px;
        line-height: 1.45;
        color: rgba(255,255,255,.72);
        margin-bottom: 9px;
      }

      .gunkowii-ai-handoff-button {
        width: 100%;
        border: 0;
        border-radius: 10px;

        padding: 9px 10px;

        background: #d4af37;
        color: #14241d;

        font-size: 11px;
        font-weight: 800;

        cursor: pointer;
      }

      /* =====================================================
         AI INPUT
         ===================================================== */

      .gunkowii-ai-input-area {
        flex: 0 0 auto;

        padding: 10px;

        border-top: 1px solid rgba(212,175,55,.15);

        background: rgba(0,0,0,.08);
      }

      .gunkowii-ai-input-wrap {
        display: flex;
        align-items: flex-end;
        gap: 7px;
      }

      #gunkowii-ai-input {
        flex: 1;

        min-height: 40px;
        max-height: 105px;

        resize: none;

        padding: 10px 11px;

        border: 1px solid rgba(255,255,255,.12);
        border-radius: 11px;

        background: rgba(255,255,255,.065);
        color: #fff;

        outline: none;

        font-family: inherit;
        font-size: 12px;
        line-height: 1.4;
      }

      #gunkowii-ai-input::placeholder {
        color: rgba(255,255,255,.42);
      }

      #gunkowii-ai-input:focus {
        border-color: rgba(212,175,55,.55);
      }

      #gunkowii-ai-send {
        flex: 0 0 auto;

        width: 42px;
        height: 40px;

        border: 0;
        border-radius: 11px;

        background: #d4af37;
        color: #14241d;

        font-size: 17px;
        font-weight: 900;

        cursor: pointer;
      }

      #gunkowii-ai-send:disabled {
        opacity: .5;
        cursor: not-allowed;
      }

      .gunkowii-ai-note {
        margin-top: 6px;
        padding: 0 2px;

        font-size: 8px;
        line-height: 1.35;

        color: rgba(255,255,255,.36);
        text-align: center;
      }

      /* =====================================================
         LIVE ACTIVITY POPUP
         ===================================================== */

      #gunkowii-live-popup {
        position: fixed;
        z-index: 9990;

        left: 14px;
        bottom: 15px;

        width: min(350px, calc(100vw - 28px));
        min-height: 88px;

        display: none;
        align-items: center;
        gap: 11px;

        padding: 9px;

        box-sizing: border-box;

        border-radius: 16px;

        background:
          linear-gradient(
            145deg,
            rgba(7,49,39,.98),
            rgba(3,28,23,.98)
          );

        border: 1px solid rgba(212,175,55,.42);

        box-shadow:
          0 18px 45px rgba(0,0,0,.3);

        color: #fff;

        animation: gunkowiiPopupIn .45s ease;
      }

      #gunkowii-live-popup.hide {
        animation: gunkowiiPopupOut .35s ease forwards;
      }

      @keyframes gunkowiiPopupIn {
        from {
          opacity: 0;
          transform: translateX(-18px) translateY(8px);
        }

        to {
          opacity: 1;
          transform: translateX(0) translateY(0);
        }
      }

      @keyframes gunkowiiPopupOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }

        to {
          opacity: 0;
          transform: translateX(-18px);
        }
      }

      .gunkowii-popup-image {
        width: 72px;
        height: 68px;

        flex: 0 0 72px;

        border-radius: 11px;
        overflow: hidden;

        background:
          linear-gradient(
            135deg,
            rgba(212,175,55,.28),
            rgba(255,255,255,.05)
          );

        border: 1px solid rgba(212,175,55,.25);

        display: flex;
        align-items: center;
        justify-content: center;
      }

      .gunkowii-popup-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .gunkowii-popup-placeholder {
        color: #d4af37;
        font-size: 21px;
        font-weight: 900;
      }

      .gunkowii-popup-content {
        min-width: 0;
        flex: 1;
      }

      .gunkowii-popup-title {
        font-size: 12px;
        font-weight: 800;
        color: #f6d76d;
        margin-bottom: 4px;
      }

      .gunkowii-popup-text {
        font-size: 10px;
        line-height: 1.4;
        color: rgba(255,255,255,.75);
      }

      .gunkowii-popup-close {
        position: absolute;

        top: 7px;
        right: 8px;

        width: 20px;
        height: 20px;

        border: 0;
        border-radius: 50%;

        background: rgba(255,255,255,.07);
        color: rgba(255,255,255,.7);

        font-size: 14px;
        line-height: 20px;

        cursor: pointer;
      }

      @media (max-width: 768px) {
        #gunkowii-ai-launcher {
          width: 68px;
          min-height: 91px;
          border-radius: 16px;
        }

        #gunkowii-ai-launcher img {
          width: 44px;
          height: 44px;
        }

        #gunkowii-ai-panel {
          right: 10px;
          bottom: 88px;

          width: calc(100vw - 20px);
          height: min(590px, calc(100vh - 110px));

          border-radius: 18px;
        }

        #gunkowii-live-popup {
          bottom: 12px;
          left: 10px;
          width: calc(100vw - 20px);
        }

        .gunkowii-popup-image {
          width: 65px;
          height: 61px;
          flex-basis: 65px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     AI LAUNCHER
     ========================================================= */

  let aiLauncher = null;
  let aiPanel = null;

  function getLauncherSide() {
    const saved = loadStorage(
      CONFIG.STORAGE.launcher,
      null
    );

    if (
      saved &&
      (saved.side === "left" || saved.side === "right")
    ) {
      return saved.side;
    }

    return "right";
  }

  function getLauncherTop() {
    const saved = loadStorage(
      CONFIG.STORAGE.launcher,
      null
    );

    if (saved && Number.isFinite(saved.top)) {
      return saved.top;
    }

    return Math.max(
      100,
      Math.round(window.innerHeight * 0.48)
    );
  }

  function applyLauncherPosition(side, top, instant = false) {
    if (!aiLauncher) return;

    const launcherWidth =
      aiLauncher.offsetWidth || 74;

    const launcherHeight =
      aiLauncher.offsetHeight || 98;

    const safeTop = clamp(
      top,
      12,
      Math.max(
        12,
        window.innerHeight - launcherHeight - 12
      )
    );

    aiLauncher.classList.toggle(
      "gunkowii-ai-snap",
      !instant
    );

    aiLauncher.style.top = `${safeTop}px`;

    if (side === "left") {
      aiLauncher.style.left = "8px";
      aiLauncher.style.right = "auto";
    } else {
      aiLauncher.style.right = "8px";
      aiLauncher.style.left = "auto";
    }

    saveStorage(CONFIG.STORAGE.launcher, {
      side,
      top: safeTop
    });
  }

  function migrateOldLauncherPosition() {
    const saved = loadStorage(
      CONFIG.STORAGE.launcher,
      null
    );

    if (!saved) return;

    /*
      Older versions stored left/top.
      Convert that position into side/top.
    */
    if (
      typeof saved.left === "number" &&
      typeof saved.top === "number"
    ) {
      const side =
        saved.left +
          (aiLauncher?.offsetWidth || 74) / 2 <
        window.innerWidth / 2
          ? "left"
          : "right";

      applyLauncherPosition(
        side,
        saved.top,
        true
      );
    }
  }

  function setupAILauncher() {
    if ($("#gunkowii-ai-launcher")) {
      aiLauncher = $("#gunkowii-ai-launcher");
      return;
    }

    aiLauncher = document.createElement("div");
    aiLauncher.id = "gunkowii-ai-launcher";
    aiLauncher.setAttribute(
      "aria-label",
      "Ask GUNKOWII AI"
    );

    aiLauncher.innerHTML = `
      <span class="ai-launcher-status"></span>

      <img
        src="${CONFIG.AI_AVATAR}"
        alt="GUNKOWII AI"
        draggable="false"
      >

      <div class="ai-launcher-label">
        Ask GUNKOWII AI
      </div>
    `;

    document.body.appendChild(aiLauncher);

    /*
      Always keep launcher attached to a side.
    */
    const saved = loadStorage(
      CONFIG.STORAGE.launcher,
      null
    );

    if (
      saved &&
      (saved.side === "left" ||
        saved.side === "right")
    ) {
      applyLauncherPosition(
        saved.side,
        Number(saved.top) || 100,
        true
      );
    } else {
      applyLauncherPosition(
        "right",
        Math.max(
          100,
          Math.round(window.innerHeight * 0.46)
        ),
        true
      );
    }

    migrateOldLauncherPosition();

    setupLauncherPointerControls();
  }

  function setupLauncherPointerControls() {
    if (!aiLauncher) return;

    let startX = 0;
    let startY = 0;
    let startTop = 0;

    let dragging = false;
    let activePointerId = null;

    const DRAG_THRESHOLD = 6;

    aiLauncher.addEventListener(
      "pointerdown",
      event => {
        if (
          event.button !== undefined &&
          event.button !== 0
        ) {
          return;
        }

        activePointerId = event.pointerId;

        startX = event.clientX;
        startY = event.clientY;
        startTop =
          aiLauncher.getBoundingClientRect().top;

        dragging = false;

        aiLauncher.setPointerCapture?.(
          event.pointerId
        );
      },
      { passive: true }
    );

    aiLauncher.addEventListener(
      "pointermove",
      event => {
        if (
          activePointerId !== event.pointerId
        ) {
          return;
        }

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        if (
          !dragging &&
          Math.sqrt(dx * dx + dy * dy) >
            DRAG_THRESHOLD
        ) {
          dragging = true;
          aiLauncher.classList.add("dragging");
        }

        if (!dragging) return;

        const height =
          aiLauncher.offsetHeight || 98;

        const newTop = clamp(
          startTop + dy,
          10,
          window.innerHeight - height - 10
        );

        /*
          While dragging, allow temporary free horizontal
          movement. On release it snaps back to the side.
        */
        aiLauncher.style.right = "auto";

        const currentLeft =
          aiLauncher.getBoundingClientRect().left;

        const newLeft = clamp(
          currentLeft + dx,
          5,
          window.innerWidth -
            aiLauncher.offsetWidth -
            5
        );

        aiLauncher.style.left =
          `${newLeft}px`;

        aiLauncher.style.top =
          `${newTop}px`;

        startX = event.clientX;
        startY = event.clientY;
        startTop = newTop;
      },
      { passive: true }
    );

    aiLauncher.addEventListener(
      "pointerup",
      event => {
        if (
          activePointerId !== event.pointerId
        ) {
          return;
        }

        activePointerId = null;

        aiLauncher.releasePointerCapture?.(
          event.pointerId
        );

        aiLauncher.classList.remove(
          "dragging"
        );

        if (!dragging) {
          /*
            TAP = OPEN.
            This is deliberately handled through pointerup
            instead of relying only on click, which fixes
            mobile tap problems caused by drag handlers.
          */
          openAIPanel();
        } else {
          const rect =
            aiLauncher.getBoundingClientRect();

          const side =
            rect.left + rect.width / 2 <
            window.innerWidth / 2
              ? "left"
              : "right";

          applyLauncherPosition(
            side,
            rect.top
          );
        }

        dragging = false;
      },
      { passive: true }
    );

    aiLauncher.addEventListener(
      "pointercancel",
      event => {
        if (
          activePointerId !== event.pointerId
        ) {
          return;
        }

        activePointerId = null;

        aiLauncher.classList.remove(
          "dragging"
        );

        const rect =
          aiLauncher.getBoundingClientRect();

        const side =
          rect.left + rect.width / 2 <
          window.innerWidth / 2
            ? "left"
            : "right";

        applyLauncherPosition(
          side,
          rect.top
        );

        dragging = false;
      },
      { passive: true }
    );
  }

  /* =========================================================
     AI PANEL
     ========================================================= */

  function setupAIPanel() {
    if ($("#gunkowii-ai-panel")) {
      aiPanel = $("#gunkowii-ai-panel");
      return;
    }

    aiPanel = document.createElement("section");
    aiPanel.id = "gunkowii-ai-panel";
    aiPanel.setAttribute(
      "aria-label",
      "GUNKOWII AI Consultant"
    );

    aiPanel.innerHTML = `
      <div class="gunkowii-ai-header">

        <img
          class="gunkowii-ai-avatar"
          src="${CONFIG.AI_AVATAR}"
          alt="GUNKOWII AI"
          draggable="false"
        >

        <div class="gunkowii-ai-title-area">
          <div class="gunkowii-ai-title">
            GUNKOWII AI
          </div>

          <div class="gunkowii-ai-status">
            <span class="gunkowii-ai-status-dot"></span>
            E-commerce consultant
          </div>
        </div>

        <div class="gunkowii-ai-actions">

          <button
            type="button"
            class="gunkowii-ai-action"
            id="gunkowii-ai-new-chat"
          >
            New Chat
          </button>

          <button
            type="button"
            class="gunkowii-ai-action close"
            id="gunkowii-ai-close"
            aria-label="Close GUNKOWII AI"
          >
            ×
          </button>

        </div>
      </div>

      <div
        class="gunkowii-ai-messages"
        id="gunkowii-ai-messages"
      ></div>

      <div
        class="gunkowii-ai-typing"
        id="gunkowii-ai-typing"
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div
        class="gunkowii-ai-handoff"
        id="gunkowii-ai-handoff"
      ></div>

      <div class="gunkowii-ai-input-area">

        <div class="gunkowii-ai-input-wrap">

          <textarea
            id="gunkowii-ai-input"
            rows="1"
            placeholder="Tell me what is happening with your store..."
            aria-label="Ask GUNKOWII AI"
          ></textarea>

          <button
            type="button"
            id="gunkowii-ai-send"
            aria-label="Send message"
          >
            ↑
          </button>

        </div>

        <div class="gunkowii-ai-note">
          Ask about Shopify, Etsy, SEO, CRO, marketing,
          product pages, traffic, sales or your customer journey.
        </div>

      </div>
    `;

    document.body.appendChild(aiPanel);

    restorePanelPosition();
    renderStoredConversation();

    setupAIPanelControls();
    setupPanelDragging();
  }

  function restorePanelPosition() {
    if (!aiPanel) return;

    const saved = loadStorage(
      CONFIG.STORAGE.panel,
      null
    );

    if (
      saved &&
      Number.isFinite(saved.left) &&
      Number.isFinite(saved.top)
    ) {
      requestAnimationFrame(() => {
        const panelWidth =
          aiPanel.offsetWidth ||
          Math.min(390, window.innerWidth - 24);

        const panelHeight =
          aiPanel.offsetHeight ||
          Math.min(610, window.innerHeight - 130);

        const maxLeft =
          Math.max(10, window.innerWidth - panelWidth - 10);

        const maxTop =
          Math.max(10, window.innerHeight - panelHeight - 10);

        aiPanel.style.left =
          `${clamp(saved.left, 10, maxLeft)}px`;

        aiPanel.style.top =
          `${clamp(saved.top, 10, maxTop)}px`;

        aiPanel.style.right = "auto";
        aiPanel.style.bottom = "auto";
      });
    }
  }

  function savePanelPosition() {
    if (!aiPanel) return;

    const rect =
      aiPanel.getBoundingClientRect();

    saveStorage(CONFIG.STORAGE.panel, {
      left: rect.left,
      top: rect.top
    });
  }

  function setupPanelDragging() {
    const header = $(
      ".gunkowii-ai-header",
      aiPanel
    );

    if (!header) return;

    let dragging = false;
    let pointerId = null;

    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener(
      "pointerdown",
      event => {
        /*
          Buttons must remain clickable and must not start
          panel dragging.
        */
        if (
          event.target.closest(
            "button, input, textarea, a"
          )
        ) {
          return;
        }

        if (
          event.button !== undefined &&
          event.button !== 0
        ) {
          return;
        }

        const rect =
          aiPanel.getBoundingClientRect();

        dragging = true;
        pointerId = event.pointerId;

        startX = event.clientX;
        startY = event.clientY;

        startLeft = rect.left;
        startTop = rect.top;

        header.classList.add("dragging");

        header.setPointerCapture?.(
          event.pointerId
        );

        event.preventDefault();
      }
    );

    header.addEventListener(
      "pointermove",
      event => {
        if (
          !dragging ||
          event.pointerId !== pointerId
        ) {
          return;
        }

        const panelWidth =
          aiPanel.offsetWidth;

        const panelHeight =
          aiPanel.offsetHeight;

        const left = clamp(
          startLeft +
            (event.clientX - startX),
          8,
          Math.max(
            8,
            window.innerWidth -
              panelWidth -
              8
          )
        );

        const top = clamp(
          startTop +
            (event.clientY - startY),
          8,
          Math.max(
            8,
            window.innerHeight -
              panelHeight -
              8
          )
        );

        aiPanel.style.left =
          `${left}px`;

        aiPanel.style.top =
          `${top}px`;

        aiPanel.style.right = "auto";
        aiPanel.style.bottom = "auto";
      }
    );

    const finishDrag = event => {
      if (
        !dragging ||
        event.pointerId !== pointerId
      ) {
        return;
      }

      dragging = false;
      pointerId = null;

      header.classList.remove("dragging");

      try {
        header.releasePointerCapture(
          event.pointerId
        );
      } catch {
        // Ignore.
      }

      savePanelPosition();
    };

    header.addEventListener(
      "pointerup",
      finishDrag
    );

    header.addEventListener(
      "pointercancel",
      finishDrag
    );
  }

  function setupAIPanelControls() {
    const input = $(
      "#gunkowii-ai-input",
      aiPanel
    );

    const sendButton = $(
      "#gunkowii-ai-send",
      aiPanel
    );

    const newChatButton = $(
      "#gunkowii-ai-new-chat",
      aiPanel
    );

    const closeButton = $(
      "#gunkowii-ai-close",
      aiPanel
    );

    if (sendButton) {
      sendButton.addEventListener(
        "click",
        () => sendAIMessage()
      );
    }

    if (input) {
      input.addEventListener(
        "keydown",
        event => {
          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();
            sendAIMessage();
          }
        }
      );

      input.addEventListener(
        "input",
        () => {
          input.style.height = "auto";

          input.style.height =
            `${Math.min(
              input.scrollHeight,
              105
            )}px`;
        }
      );
    }

    if (newChatButton) {
      /*
        Stop header drag from receiving this interaction.
      */
      [
        "pointerdown",
        "mousedown",
        "touchstart"
      ].forEach(eventName => {
        newChatButton.addEventListener(
          eventName,
          event => {
            event.stopPropagation();
          },
          { passive: true }
        );
      });

      newChatButton.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();
          startNewAIChat();
        }
      );
    }

    if (closeButton) {
      [
        "pointerdown",
        "mousedown",
        "touchstart"
      ].forEach(eventName => {
        closeButton.addEventListener(
          eventName,
          event => {
            event.stopPropagation();
          },
          { passive: true }
        );
      });

      closeButton.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();
          closeAIPanel();
        }
      );
    }
  }

  /* =========================================================
     AI PANEL OPEN / CLOSE
     ========================================================= */

  function openAIPanel() {
    if (!aiPanel) setupAIPanel();

    aiPanel.classList.add("open");

    requestAnimationFrame(() => {
      const input = $(
        "#gunkowii-ai-input",
        aiPanel
      );

      if (input) {
        input.focus();
      }

      scrollAIMessagesToBottom();
    });
  }

  function closeAIPanel() {
    if (!aiPanel) return;

    aiPanel.classList.remove("open");
  }

  function startNewAIChat() {
    clearConversation();
    removeStorage(CONFIG.STORAGE.handoff);

    const messages = $(
      "#gunkowii-ai-messages",
      aiPanel
    );

    const handoff = $(
      "#gunkowii-ai-handoff",
      aiPanel
    );

    const input = $(
      "#gunkowii-ai-input",
      aiPanel
    );

    if (messages) {
      messages.innerHTML = "";
    }

    if (handoff) {
      handoff.innerHTML = "";
      handoff.classList.remove("show");
    }

    showInitialGreeting();

    if (input) {
      input.value = "";
      input.style.height = "auto";

      requestAnimationFrame(() => {
        input.focus();
      });
    }

    scrollAIMessagesToBottom();
  }

  /* =========================================================
     AI GREETING
     ========================================================= */

  function showInitialGreeting() {
    if (!aiPanel) return;

    const messages = $(
      "#gunkowii-ai-messages",
      aiPanel
    );

    if (!messages) return;

    if (aiConversation.length > 0) {
      renderStoredConversation();
      return;
    }

    const greeting =
      "Hi, I'm GUNKOWII AI. I can help you understand what may be limiting your store's growth and guide you toward the right next step. Tell me what you're currently struggling with.";

    renderMessage(
      "assistant",
      greeting
    );
  }

  /* =========================================================
     AI MESSAGE RENDERING
     ========================================================= */

  function renderMessage(
    role,
    content
  ) {
    const messages = $(
      "#gunkowii-ai-messages",
      aiPanel
    );

    if (!messages) return;

    const wrapper =
      document.createElement("div");

    wrapper.className =
      `gunkowii-ai-message ${role}`;

    const bubble =
      document.createElement("div");

    bubble.className =
      "gunkowii-ai-bubble";

    if (role === "assistant") {
      bubble.innerHTML =
        formatAIResponse(content);
    } else {
      bubble.textContent =
        String(content || "");
    }

    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);

    scrollAIMessagesToBottom();
  }

  function renderStoredConversation() {
    if (!aiPanel) return;

    const messages = $(
      "#gunkowii-ai-messages",
      aiPanel
    );

    if (!messages) return;

    messages.innerHTML = "";

    if (!aiConversation.length) {
      showInitialGreeting();
      return;
    }

    aiConversation.forEach(item => {
      if (
        !item ||
        !item.role ||
        !item.content
      ) {
        return;
      }

      renderMessage(
        item.role,
        item.content
      );
    });

    scrollAIMessagesToBottom();
  }

  function scrollAIMessagesToBottom() {
    const messages = $(
      "#gunkowii-ai-messages",
      aiPanel
    );

    if (!messages) return;

    requestAnimationFrame(() => {
      messages.scrollTop =
        messages.scrollHeight;
    });
  }

  function setAITyping(show) {
    const typing = $(
      "#gunkowii-ai-typing",
      aiPanel
    );

    if (!typing) return;

    typing.classList.toggle(
      "show",
      Boolean(show)
    );

    scrollAIMessagesToBottom();
  }

  /* =========================================================
     AI REQUEST
     ========================================================= */

  let aiBusy = false;

  async function sendAIMessage() {
    if (aiBusy) return;

    const input = $(
      "#gunkowii-ai-input",
      aiPanel
    );

    const sendButton = $(
      "#gunkowii-ai-send",
      aiPanel
    );

    if (!input) return;

    const question =
      input.value.trim();

    if (!question) return;

    aiBusy = true;

    if (sendButton) {
      sendButton.disabled = true;
    }

    input.value = "";
    input.style.height = "auto";

    /*
      Store buyer message first.
    */
    aiConversation.push({
      role: "user",
      content: question,
      timestamp: new Date().toISOString()
    });

    saveConversation();

    renderMessage(
      "user",
      question
    );

    setAITyping(true);

    try {
      const response =
        await fetch(
          CONFIG.AI_WORKER_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message: question,

              conversation:
                aiConversation.map(item => ({
                  role: item.role,
                  content: item.content
                })),

              page: getPageName(),

              source:
                window.location.href
            })
          }
        );

      if (!response.ok) {
        throw new Error(
          `AI request failed: ${response.status}`
        );
      }

      const data =
        await response.json();

      const answer =
        String(
          data.answer ||
          data.message ||
          data.response ||
          ""
        ).trim();

      if (!answer) {
        throw new Error(
          "The AI returned an empty response."
        );
      }

      aiConversation.push({
        role: "assistant",
        content: answer,
        timestamp: new Date().toISOString()
      });

      saveConversation();

      setAITyping(false);

      renderMessage(
        "assistant",
        answer
      );

      /*
        Only create a handoff when the Worker explicitly
        indicates that consultation is ready.
      */
      if (
        data.readyForHandoff === true ||
        data.consultationReady === true ||
        data.handoff
      ) {
        const handoff =
          createHandoffData(data);

        saveHandoff(handoff);
        showHandoffNotice(handoff);
      }
    } catch (error) {
      console.error(
        "GUNKOWII AI error:",
        error
      );

      setAITyping(false);

      const errorMessage =
        "I couldn't connect to the consultation service right now. Please try again in a moment, or continue through the contact page.";

      renderMessage(
        "assistant",
        errorMessage
      );
    } finally {
      aiBusy = false;

      if (sendButton) {
        sendButton.disabled = false;
      }

      requestAnimationFrame(() => {
        input.focus();
      });
    }
  }

  /* =========================================================
     HANDOFF DATA
     ========================================================= */

  function normalizeHandoffObject(value) {
    if (!value) return null;

    if (typeof value === "object") {
      return value;
    }

    const parsed =
      safeJSONParse(value, null);

    return parsed || value;
  }

  function getSummaryValue(
    summary,
    ...keys
  ) {
    if (!summary || typeof summary !== "object") {
      return "";
    }

    for (const key of keys) {
      if (
        summary[key] !== undefined &&
        summary[key] !== null &&
        String(summary[key]).trim()
      ) {
        return String(summary[key]).trim();
      }
    }

    return "";
  }

  function createHandoffData(data = {}) {
    const rawSummary =
      normalizeHandoffObject(
        data.leadSummary ||
        data.summary ||
        data.handoff?.leadSummary ||
        data.handoff?.summary
      );

    const summary =
      rawSummary &&
      typeof rawSummary === "object"
        ? rawSummary
        : {};

    const rawStoreAnalysis =
      normalizeHandoffObject(
        data.storeAnalysis ||
        data.handoff?.storeAnalysis
      );

    const storeAnalysis =
      typeof rawStoreAnalysis === "object"
        ? rawStoreAnalysis
        : rawStoreAnalysis || "";

    const firstBuyerMessage =
      getFirstBuyerMessage();

    const mainProblem =
      data.mainProblem ||
      data.problem ||
      data.issue ||
      data.handoff?.mainProblem ||
      getSummaryValue(
        summary,
        "mainProblem",
        "problem",
        "issue",
        "main_issue"
      ) ||
      firstBuyerMessage ||
      "Not provided";

    const platform =
      data.platform ||
      data.handoff?.platform ||
      getSummaryValue(
        summary,
        "platform"
      ) ||
      "Not provided";

    const store =
      data.store ||
      data.storeUrl ||
      data.website ||
      data.handoff?.store ||
      data.handoff?.storeUrl ||
      getSummaryValue(
        summary,
        "store",
        "storeUrl",
        "website",
        "url"
      ) ||
      "Not provided";

    const recommendedService =
      data.recommendedService ||
      data.service ||
      data.handoff?.recommendedService ||
      getSummaryValue(
        summary,
        "recommendedService",
        "service",
        "recommended_service"
      ) ||
      "To be determined";

    const recommendedNextStep =
      data.recommendedNextStep ||
      data.nextStep ||
      data.handoff?.recommendedNextStep ||
      getSummaryValue(
        summary,
        "recommendedNextStep",
        "nextStep",
        "recommended_next_step"
      ) ||
      "Continue the consultation with GUNKOWII SABA.";

    const goal =
      data.goal ||
      data.handoff?.goal ||
      getSummaryValue(
        summary,
        "goal",
        "businessGoal"
      );

    const traffic =
      data.traffic ||
      getSummaryValue(
        summary,
        "traffic",
        "trafficLevel"
      );

    const sales =
      data.sales ||
      getSummaryValue(
        summary,
        "sales",
        "salesLevel"
      );

    return {
      createdAt:
        new Date().toISOString(),

      page:
        getPageName(),

      sourcePage:
        window.location.href,

      platform,

      store,

      mainProblem,

      goal,

      traffic,

      sales,

      recommendedService,

      recommendedNextStep,

      storeAnalysis,

      leadSummary:
        summary,

      /*
        IMPORTANT:
        The full AI conversation is intentionally retained
        here so the WhatsApp handoff can carry it.
      */
      conversation:
        aiConversation.map(item => ({
          role: item.role,
          content: item.content,
          timestamp: item.timestamp
        }))
    };
  }

  function saveHandoff(handoff) {
    saveStorage(
      CONFIG.STORAGE.handoff,
      handoff
    );
  }

  function getHandoff() {
    return loadStorage(
      CONFIG.STORAGE.handoff,
      null
    );
  }

  /* =========================================================
     HUMAN-READABLE AI SUMMARY
     ========================================================= */

  function humanLabel(value) {
    return String(value || "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, char =>
        char.toUpperCase()
      );
  }

  function formatStoreAnalysisForEmail(
    analysis
  ) {
    if (!analysis) {
      return "Not available yet.";
    }

    if (typeof analysis === "string") {
      return analysis.trim() ||
        "Not available yet.";
    }

    if (typeof analysis !== "object") {
      return String(analysis);
    }

    const lines = [];

    Object.entries(analysis)
      .forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        ) {
          return;
        }

        if (
          typeof value === "object"
        ) {
          value =
            JSON.stringify(
              value,
              null,
              2
            );
        }

        lines.push(
          `${humanLabel(key)}: ${value}`
        );
      });

    return lines.length
      ? lines.join("\n")
      : "Not available yet.";
  }

  function buildHumanReadableHandoffSummary(
    handoff
  ) {
    if (!handoff) {
      return "";
    }

    const lines = [
      "AI CONSULTATION",
      "================",
      `Platform: ${handoff.platform || "Not provided"}`,
      `Store / Website: ${handoff.store || "Not provided"}`,
      `Main problem: ${handoff.mainProblem || "Not provided"}`
    ];

    if (handoff.goal) {
      lines.push(
        `Business goal: ${handoff.goal}`
      );
    }

    if (handoff.traffic) {
      lines.push(
        `Traffic situation: ${handoff.traffic}`
      );
    }

    if (handoff.sales) {
      lines.push(
        `Sales situation: ${handoff.sales}`
      );
    }

    lines.push(
      "",
      "STORE ANALYSIS",
      "==============",
      formatStoreAnalysisForEmail(
        handoff.storeAnalysis
      ),
      "",
      "RECOMMENDED SERVICE",
      "===================",
      handoff.recommendedService ||
        "To be determined.",
      "",
      "RECOMMENDED NEXT STEP",
      "=====================",
      handoff.recommendedNextStep ||
        "Continue the consultation with GUNKOWII SABA."
    );

    return lines.join("\n");
  }

  /* =========================================================
     AI HANDOFF NOTICE
     ========================================================= */

  function showHandoffNotice(
    handoff
  ) {
    const box = $(
      "#gunkowii-ai-handoff",
      aiPanel
    );

    if (!box) return;

    box.innerHTML = `
      <div class="gunkowii-ai-handoff-title">
        Ready to continue
      </div>

      <div class="gunkowii-ai-handoff-text">
        Continue with GUNKOWII SABA to discuss the next step.
      </div>

      <button
        type="button"
        class="gunkowii-ai-handoff-button"
        id="gunkowii-ai-handoff-button"
      >
        Continue with GUNKOWII SABA →
      </button>
    `;

    box.classList.add("show");

    const button = $(
      "#gunkowii-ai-handoff-button",
      box
    );

    if (button) {
      button.addEventListener(
        "click",
        () => {
          prepareContactFormFromAI(
            handoff
          );

          window.location.href =
            CONFIG.CONTACT_URL;
        }
      );
    }

    scrollAIMessagesToBottom();
  }

  /* =========================================================
     CONTACT FORM HELPERS
     ========================================================= */

  function findFormField(
    form,
    names
  ) {
    for (const name of names) {
      const field = form.querySelector(
        `[name="${CSS.escape(name)}"]`
      );

      if (field) {
        return field;
      }
    }

    return null;
  }

  function getFieldValue(
    form,
    names
  ) {
    const field =
      findFormField(form, names);

    return field
      ? String(field.value || "").trim()
      : "";
  }

  function setFieldValue(
    form,
    names,
    value,
    overwrite = false
  ) {
    if (
      value === undefined ||
      value === null
    ) {
      return;
    }

    const cleanValue =
      String(value).trim();

    if (!cleanValue) return;

    const field =
      findFormField(form, names);

    if (!field) return;

    if (
      overwrite ||
      !String(field.value || "").trim()
    ) {
      field.value = cleanValue;

      field.dispatchEvent(
        new Event(
          "input",
          {
            bubbles: true
          }
        )
      );

      field.dispatchEvent(
        new Event(
          "change",
          {
            bubbles: true
          }
        )
      );
    }
  }

  function ensureHiddenField(
    form,
    name,
    value
  ) {
    let field =
      form.querySelector(
        `[name="${CSS.escape(name)}"]`
      );

    if (!field) {
      field =
        document.createElement("input");

      field.type = "hidden";
      field.name = name;

      form.appendChild(field);
    }

    field.value =
      String(value ?? "");

    return field;
  }

  function removeOldAIFields(form) {
    const oldNames = [
      "ai_handoff",
      "ai_lead_summary",
      "ai_store_analysis",
      "ai_recommended_service",
      "ai_conversation",
      "ai_handoff_time",
      "AI Conversation",
      "AI Lead Summary",
      "AI Store Analysis",
      "AI Recommended Service"
    ];

    oldNames.forEach(name => {
      $$(
        `[name="${CSS.escape(name)}"]`,
        form
      ).forEach(field => {
        /*
          Never remove visible fields.
        */
        if (
          field.type === "hidden"
        ) {
          field.remove();
        }
      });
    });
  }

  /* =========================================================
     AUTO-FILL CONTACT FORM
     ========================================================= */

  function prepareContactFormFromAI(
    handoff
  ) {
    if (!handoff) return;

    const form =
      document.querySelector(
        "form"
      );

    if (!form) return;

    /*
      IMPORTANT:
      AI details only fill empty fields.
      Existing buyer input is respected.
    */

    setFieldValue(
      form,
      ["store", "website", "url"],
      handoff.store,
      false
    );

    setFieldValue(
      form,
      ["service"],
      handoff.recommendedService,
      false
    );

    /*
      If the visible project/message field is empty,
      provide a useful starting point.

      If the buyer already wrote something, it stays untouched.
    */
    const messageField =
      findFormField(
        form,
        ["message", "project", "details"]
      );

    if (
      messageField &&
      !String(
        messageField.value || ""
      ).trim()
    ) {
      const projectStarter = [
        handoff.mainProblem
          ? `Main issue: ${handoff.mainProblem}`
          : "",

        handoff.goal
          ? `Goal: ${handoff.goal}`
          : "",

        handoff.platform
          ? `Platform: ${handoff.platform}`
          : ""
      ]
        .filter(Boolean)
        .join("\n");

      if (projectStarter) {
        messageField.value =
          projectStarter;

        messageField.dispatchEvent(
          new Event(
            "input",
            {
              bubbles: true
            }
          )
        );
      }
    }

    /*
      IMPORTANT:
      No AI transcript is placed into a visible form field.
      The transcript is silently stored for WhatsApp.
    */
    populateHiddenAIFields(
      form,
      handoff
    );
  }

  function populateHiddenAIFields(
    form,
    handoff
  ) {
    if (!form || !handoff) return;

    removeOldAIFields(form);

    const summary =
      buildHumanReadableHandoffSummary(
        handoff
      );

    /*
      Clean subject for Gmail/Formspree.
    */
    ensureHiddenField(
      form,
      "_subject",
      `GUNKOWII SABA — New AI Consultation Lead`
    );

    /*
      Human-readable information for Gmail.
    */
    ensureHiddenField(
      form,
      "AI Consultation Summary",
      summary
    );

    ensureHiddenField(
      form,
      "AI Handoff Status",
      "GUNKOWII AI consultation completed. Key details are ready for follow-up."
    );

    ensureHiddenField(
      form,
      "AI Platform",
      handoff.platform || "Not provided"
    );

    ensureHiddenField(
      form,
      "AI Store / Website",
      handoff.store || "Not provided"
    );

    ensureHiddenField(
      form,
      "AI Recommended Service",
      handoff.recommendedService ||
        "To be determined"
    );

    /*
      Do NOT create an AI Conversation hidden field.
      This prevents the Gmail notification from becoming
      an unreadable transcript/JSON dump.
    */
  }

  /* =========================================================
     DETECT CONTACT FORM
     ========================================================= */

  function getContactForm() {
    const forms =
      $$("form");

    if (!forms.length) {
      return null;
    }

    /*
      Prefer Formspree form.
    */
    const formspreeForm =
      forms.find(form =>
        String(
          form.getAttribute("action") || ""
        ).includes("formspree.io")
      );

    if (formspreeForm) {
      return formspreeForm;
    }

    /*
      Otherwise use a form containing the
      expected contact fields.
    */
    return forms.find(form =>
      findFormField(
        form,
        ["email"]
      )
    ) || null;
  }

  /* =========================================================
     CONTACT FORM HANDOFF
     ========================================================= */

  function setupContactHandoff() {
    const form =
      getContactForm();

    if (!form) return;

    const handoff =
      getHandoff();

    if (handoff) {
      prepareContactFormFromAI(
        handoff
      );
    }

    /*
      If the contact page is opened after an AI handoff,
      automatically use the AI data.

      The form remains editable.
    */
    setupEmailSubmission(
      form
    );

    setupWhatsAppHandoff(
      form
    );
  }

  /* =========================================================
     EMAIL SUBMISSION
     ========================================================= */

  function setupEmailSubmission(
    form
  ) {
    /*
      Prevent duplicate event attachment.
    */
    if (
      form.dataset.gunkowiiEmailReady ===
      "true"
    ) {
      return;
    }

    form.dataset.gunkowiiEmailReady =
      "true";

    /*
      Only intercept actual Formspree forms.
      This avoids breaking unrelated forms.
    */
    const action =
      String(
        form.getAttribute("action") || ""
      );

    if (
      !action.includes(
        "formspree.io"
      )
    ) {
      return;
    }

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const submitButton =
          form.querySelector(
            'button[type="submit"], input[type="submit"]'
          );

        if (submitButton) {
          submitButton.disabled = true;
        }

        const formData =
          new FormData(form);

        /*
          Make sure latest handoff data is present.
        */
        const handoff =
          getHandoff();

        if (handoff) {
          populateHiddenAIFields(
            form,
            handoff
          );

          /*
            Recreate FormData because hidden fields
            may have been added after the first snapshot.
          */
          const updatedFormData =
            new FormData(form);

          try {
            const response =
              await fetch(
                action,
                {
                  method: "POST",
                  body:
                    updatedFormData,
                  headers: {
                    Accept:
                      "application/json"
                  }
                }
              );

            if (!response.ok) {
              throw new Error(
                "Form submission failed."
              );
            }

            handleSuccessfulContactSubmission(
              form
            );
          } catch (error) {
            console.error(
              "Formspree submission error:",
              error
            );

            if (submitButton) {
              submitButton.disabled =
                false;
            }

            showFormStatus(
              form,
              "Your message could not be sent. Please check your connection and try again."
            );
          }

          return;
        }

        /*
          Normal form submission when there is
          no AI handoff.
        */
        try {
          const response =
            await fetch(
              action,
              {
                method: "POST",
                body: formData,
                headers: {
                  Accept:
                    "application/json"
                }
              }
            );

          if (!response.ok) {
            throw new Error(
              "Form submission failed."
            );
          }

          handleSuccessfulContactSubmission(
            form
          );
        } catch (error) {
          console.error(
            "Formspree submission error:",
            error
          );

          if (submitButton) {
            submitButton.disabled =
              false;
          }

          showFormStatus(
            form,
            "Your message could not be sent. Please check your connection and try again."
          );
        }
      }
    );
  }

  function handleSuccessfulContactSubmission(
    form
  ) {
    showFormStatus(
      form,
      "Your message has been sent successfully."
    );

    /*
      Prepare the form for the next customer.
    */
    resetContactFormForNextCustomer(
      form
    );
  }

  function showFormStatus(
    form,
    message
  ) {
    let status =
      form.querySelector(
        ".gunkowii-form-status"
      );

    if (!status) {
      status =
        document.createElement("div");

      status.className =
        "gunkowii-form-status";

      status.style.cssText = `
        margin-top:12px;
        padding:10px 12px;
        border-radius:10px;
        background:rgba(7,49,39,.08);
        border:1px solid rgba(7,49,39,.16);
        color:inherit;
        font-size:12px;
        line-height:1.4;
      `;

      form.appendChild(status);
    }

    status.textContent =
      message;
  }

  /* =========================================================
     RESET CONTACT FORM
     ========================================================= */

  function resetContactFormForNextCustomer(
    form
  ) {
    /*
      Clear all customer-entered fields.
    */
    const fields =
      $$(
        "input:not([type='hidden']), textarea, select",
        form
      );

    fields.forEach(field => {
      if (
        field.type === "checkbox" ||
        field.type === "radio"
      ) {
        field.checked = false;
      } else {
        field.value = "";
      }
    });

    /*
      Remove all AI hidden data.
    */
    removeOldAIFields(form);

    [
      "_subject",
      "AI Consultation Summary",
      "AI Handoff Status",
      "AI Platform",
      "AI Store / Website",
      "AI Recommended Service"
    ].forEach(name => {
      $$(
        `[name="${CSS.escape(name)}"]`,
        form
      ).forEach(field => {
        if (
          field.type === "hidden"
        ) {
          field.remove();
        }
      });
    });

    /*
      The AI handoff is consumed by the form.
      Remove it so the next customer starts clean.
    */
    removeStorage(
      CONFIG.STORAGE.handoff
    );

    /*
      Re-enable submit button.
    */
    const submitButton =
      form.querySelector(
        'button[type="submit"], input[type="submit"]'
      );

    if (submitButton) {
      submitButton.disabled = false;
    }
  }

  /* =========================================================
     WHATSAPP HANDOFF
     ========================================================= */

  function setupWhatsAppHandoff(
    form
  ) {
    /*
      Find the existing WhatsApp button.
      Supports several IDs/classes so the contact
      page does not need unnecessary redesign.
    */
    const button =
      form.querySelector(
        "#whatsapp-button, #continue-whatsapp, .whatsapp-button, [data-whatsapp]"
      );

    if (!button) return;

    if (
      button.dataset.gunkowiiWhatsAppReady ===
      "true"
    ) {
      return;
    }

    button.dataset.gunkowiiWhatsAppReady =
      "true";

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();

        handleWhatsAppHandoff(
          form,
          button
        );
      }
    );
  }

  function validateContactForm(
    form
  ) {
    const requiredFields =
      $$(
        "input[required], textarea[required], select[required]",
        form
      );

    let valid = true;

    requiredFields.forEach(field => {
      if (
        !String(
          field.value || ""
        ).trim()
      ) {
        valid = false;
        field.focus();
      }
    });

    return valid;
  }

  function handleWhatsAppHandoff(
    form,
    button
  ) {
    if (
      !validateContactForm(form)
    ) {
      showFormStatus(
        form,
        "Please complete the required fields before continuing."
      );

      return;
    }

    if (button) {
      button.disabled = true;
    }

    /*
      Get latest AI handoff.
    */
    const handoff =
      getHandoff();

    /*
      Collect EVERY visible buyer field.
    */
    const buyer = {
      name:
        getFieldValue(
          form,
          ["name", "full_name"]
        ),

      email:
        getFieldValue(
          form,
          ["email"]
        ),

      store:
        getFieldValue(
          form,
          ["store", "website", "url"]
        ),

      service:
        getFieldValue(
          form,
          ["service"]
        ),

      project:
        getFieldValue(
          form,
          ["message", "project", "details"]
        )
    };

    /*
      Build the WhatsApp message.
      The AI transcript is included SILENTLY.
      The buyer does not need to be told about this.
    */
    const message =
      buildWhatsAppMessage(
        buyer,
        handoff
      );

    /*
      Copy the complete message.
    */
    copyToClipboard(message);

    /*
      Open WhatsApp.
    */
    window.open(
      CONFIG.WHATSAPP_URL,
      "_blank",
      "noopener,noreferrer"
    );

    /*
      IMPORTANT:
      Clear the contact form immediately after
      preparing the WhatsApp handoff.

      This makes the page ready for a new customer.
    */
    resetContactFormForNextCustomer(
      form
    );

    /*
      Give a small local confirmation.
      This does not expose AI transcript behavior.
    */
    showFormStatus(
      form,
      "Your information is ready in WhatsApp. Paste the prepared message into the chat and send it."
    );
  }

  /* =========================================================
     WHATSAPP MESSAGE BUILDER
     ========================================================= */

  function buildWhatsAppMessage(
    buyer,
    handoff
  ) {
    const lines = [];

    lines.push(
      "Hello GUNKOWII SABA,"
    );

    lines.push(
      "",
      "I would like to discuss a project with you."
    );

    lines.push(
      "",
      "==============================",
      "BUYER INFORMATION",
      "=============================="
    );

    lines.push(
      `Name: ${buyer.name || "Not provided"}`,
      `Email: ${buyer.email || "Not provided"}`,
      `Store / Website: ${buyer.store || "Not provided"}`,
      `Service: ${buyer.service || "Not provided"}`
    );

    lines.push(
      "",
      "PROJECT DETAILS",
      "==============================",
      buyer.project ||
        "Not provided"
    );

    if (handoff) {
      lines.push(
        "",
        "==============================",
        "GUNKOWII AI CONSULTATION",
        "=============================="
      );

      lines.push(
        `Platform: ${handoff.platform || "Not provided"}`,
        `Store / Website identified by AI: ${handoff.store || "Not provided"}`,
        `Main problem: ${handoff.mainProblem || "Not provided"}`
      );

      if (handoff.goal) {
        lines.push(
          `Business goal: ${handoff.goal}`
        );
      }

      if (handoff.traffic) {
        lines.push(
          `Traffic situation: ${handoff.traffic}`
        );
      }

      if (handoff.sales) {
        lines.push(
          `Sales situation: ${handoff.sales}`
        );
      }

      lines.push(
        "",
        "STORE ANALYSIS",
        "------------------------------",
        formatStoreAnalysisForWhatsApp(
          handoff.storeAnalysis
        )
      );

      lines.push(
        "",
        "RECOMMENDED SERVICE",
        "------------------------------",
        handoff.recommendedService ||
          "To be determined"
      );

      lines.push(
        "",
        "RECOMMENDED NEXT STEP",
        "------------------------------",
        handoff.recommendedNextStep ||
          "Continue the consultation with GUNKOWII SABA."
      );

      /*
        COMPLETE AI CONVERSATION.
        This is intentionally included.
      */
      lines.push(
        "",
        "==============================",
        "COMPLETE AI CONVERSATION",
        "=============================="
      );

      const conversation =
        Array.isArray(
          handoff.conversation
        )
          ? handoff.conversation
          : aiConversation;

      if (
        conversation.length
      ) {
        conversation.forEach(
          item => {
            const speaker =
              item.role === "user"
                ? "BUYER"
                : "GUNKOWII AI";

            lines.push(
              "",
              `${speaker}:`,
              String(
                item.content || ""
              ).trim()
            );
          }
        );
      } else {
        lines.push(
          "No AI conversation transcript was captured."
        );
      }
    } else {
      /*
        Even without a formal handoff,
        preserve the current AI conversation if available.
      */
      if (
        aiConversation.length
      ) {
        lines.push(
          "",
          "==============================",
          "AI CONVERSATION",
          "=============================="
        );

        aiConversation.forEach(
          item => {
            const speaker =
              item.role === "user"
                ? "BUYER"
                : "GUNKOWII AI";

            lines.push(
              "",
              `${speaker}:`,
              String(
                item.content || ""
              ).trim()
            );
          }
        );
      }
    }

    lines.push(
      "",
      "==============================",
      "END OF CONSULTATION HANDOFF",
      "=============================="
    );

    return lines.join("\n");
  }

  function formatStoreAnalysisForWhatsApp(
    analysis
  ) {
    if (!analysis) {
      return "Not available yet.";
    }

    if (
      typeof analysis === "string"
    ) {
      return analysis.trim() ||
        "Not available yet.";
    }

    if (
      typeof analysis !== "object"
    ) {
      return String(analysis);
    }

    const lines = [];

    Object.entries(
      analysis
    ).forEach(
      ([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        ) {
          return;
        }

        if (
          typeof value === "object"
        ) {
          value =
            JSON.stringify(
              value,
              null,
              2
            );
        }

        lines.push(
          `${humanLabel(key)}: ${value}`
        );
      }
    );

    return lines.length
      ? lines.join("\n")
      : "Not available yet.";
  }

  /* =========================================================
     CLIPBOARD
     ========================================================= */

  async function copyToClipboard(
    text
  ) {
    try {
      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(
          text
        );

        return true;
      }
    } catch {
      // Fall through to legacy method.
    }

    try {
      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value = text;

      textarea.style.position =
        "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents =
        "none";

      document.body.appendChild(
        textarea
      );

      textarea.focus();
      textarea.select();

      document.execCommand(
        "copy"
      );

      textarea.remove();

      return true;
    } catch {
      return false;
    }
  }

  /* =========================================================
     LIVE ACTIVITY POPUP
     ========================================================= */

  const liveActivities = [
    {
      title:
        "Client Feedback",
      text:
        "Real e-commerce project feedback and experience.",
      link:
        "reviews.html",
      image:
        null
    },

    {
      title:
        "Shopify Work",
      text:
        "Shopify optimization and e-commerce growth.",
      link:
        "services.html",
      image:
        "assets/projects/teeology/teeology-home.jpg"
    },

    {
      title:
        "Etsy Growth",
      text:
        "Etsy store optimization, visibility and conversion.",
      link:
        "services.html",
      image:
        "assets/projects/beeyouti/beeyouti-home.jpg"
    },

    {
      title:
        "CRO Insight",
      text:
        "Finding conversion barriers that can cost a store sales.",
      link:
        "audit.html",
      image:
        "assets/projects/iron-therapy/iron-therapy-home.jpg"
    },

    {
      title:
        "SEO Focus",
      text:
        "Improving search visibility and product discovery.",
      link:
        "services.html",
      image:
        "assets/projects/look-for-it-here/look-for-it-here-home.jpg"
    },

    {
      title:
        "Growth Strategy",
      text:
        "A complete approach from traffic to conversion and retention.",
      link:
        "process.html",
      image:
        null
    },

    {
      title:
        "Featured Project",
      text:
        "Explore the MANBAUL ANWAR digital management system.",
      link:
        "portfolio.html",
      image:
        "assets/projects/manbaul-anwar/manbaul-anwar-dashboard.jpg"
    },

    {
      title:
        "Available",
      text:
        "Open to professional e-commerce and digital projects.",
      link:
        "contact.html",
      image:
        null
    }
  ];

  let livePopup = null;
  let liveActivityIndex = 0;
  let livePopupTimer = null;
  let livePopupRotateTimer = null;

  function setupLiveActivityPopup() {
    if (
      $("#gunkowii-live-popup")
    ) {
      livePopup =
        $("#gunkowii-live-popup");
      return;
    }

    livePopup =
      document.createElement("div");

    livePopup.id =
      "gunkowii-live-popup";

    document.body.appendChild(
      livePopup
    );

    /*
      Initial delay.
    */
    livePopupTimer =
      setTimeout(
        () => {
          showLiveActivity();
        },
        4000
      );

    /*
      Rotate activity every 12 seconds.
    */
    livePopupRotateTimer =
      setInterval(
        () => {
          if (
            livePopup &&
            livePopup.style.display !==
              "none"
          ) {
            hideLiveActivity(
              true
            );
          }

          setTimeout(
            () => {
              showLiveActivity();
            },
            450
          );
        },
        12000
      );
  }

  function showLiveActivity() {
    if (!livePopup) return;

    const activity =
      liveActivities[
        liveActivityIndex %
          liveActivities.length
      ];

    liveActivityIndex++;

    const imageHTML =
      activity.image
        ? `
          <img
            src="${activity.image}"
            alt=""
            loading="lazy"
          >
        `
        : `
          <div class="gunkowii-popup-placeholder">
            G
          </div>
        `;

    livePopup.classList.remove(
      "hide"
    );

    livePopup.style.display =
      "flex";

    livePopup.innerHTML = `
      <div class="gunkowii-popup-image">
        ${imageHTML}
      </div>

      <div class="gunkowii-popup-content">
        <div class="gunkowii-popup-title">
          ${escapeHTML(activity.title)}
        </div>

        <div class="gunkowii-popup-text">
          ${escapeHTML(activity.text)}
        </div>
      </div>

      <button
        type="button"
        class="gunkowii-popup-close"
        aria-label="Close"
      >
        ×
      </button>
    `;

    const close =
      $(".gunkowii-popup-close", livePopup);

    if (close) {
      close.addEventListener(
        "click",
        () => {
          hideLiveActivity(
            false
          );
        }
      );
    }

    livePopup.addEventListener(
      "click",
      event => {
        if (
          event.target.closest(
            ".gunkowii-popup-close"
          )
        ) {
          return;
        }

        window.location.href =
          activity.link;
      }
    );

    /*
      Hide after 7 seconds.
    */
    setTimeout(
      () => {
        hideLiveActivity(
          false
        );
      },
      7000
    );
  }

  function hideLiveActivity(
    rotating
  ) {
    if (!livePopup) return;

    livePopup.classList.add(
      "hide"
    );

    setTimeout(
      () => {
        if (livePopup) {
          livePopup.style.display =
            "none";
          livePopup.classList.remove(
            "hide"
          );
        }
      },
      350
    );
  }

  /* =========================================================
     WINDOW RESIZE
     ========================================================= */

  let resizeTimer = null;

  window.addEventListener(
    "resize",
    () => {
      clearTimeout(
        resizeTimer
      );

      resizeTimer =
        setTimeout(
          () => {
            /*
              Keep launcher attached to its side.
            */
            if (aiLauncher) {
              const saved =
                loadStorage(
                  CONFIG.STORAGE.launcher,
                  null
                );

              const side =
                saved?.side === "left" ||
                saved?.side === "right"
                  ? saved.side
                  : "right";

              const top =
                Number.isFinite(
                  saved?.top
                )
                  ? saved.top
                  : 120;

              applyLauncherPosition(
                side,
                top,
                true
              );
            }

            /*
              Keep AI panel inside viewport.
            */
            if (
              aiPanel &&
              aiPanel.classList.contains(
                "open"
              )
            ) {
              const rect =
                aiPanel.getBoundingClientRect();

              const width =
                aiPanel.offsetWidth;

              const height =
                aiPanel.offsetHeight;

              const left =
                clamp(
                  rect.left,
                  8,
                  Math.max(
                    8,
                    window.innerWidth -
                      width -
                      8
                  )
                );

              const top =
                clamp(
                  rect.top,
                  8,
                  Math.max(
                    8,
                    window.innerHeight -
                      height -
                      8
                  )
                );

              aiPanel.style.left =
                `${left}px`;

              aiPanel.style.top =
                `${top}px`;

              aiPanel.style.right =
                "auto";

              aiPanel.style.bottom =
                "auto";

              savePanelPosition();
            }
          },
          150
        );
    }
  );

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function initializeGunkowiiSystem() {
    injectAIStyles();

    setupAILauncher();

    setupAIPanel();

    /*
      If this is the contact page, silently restore
      any AI consultation information.
    */
    setupContactHandoff();

    /*
      Live activity popup.
    */
    setupLiveActivityPopup();

    /*
      If conversation exists, do not overwrite it.
      Otherwise show greeting when AI is opened.
    */
    if (
      aiConversation.length === 0
    ) {
      /*
        Greeting is rendered when panel opens.
      */
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeGunkowiiSystem
    );
  } else {
    initializeGunkowiiSystem();
  }
})();  const AI_LAUNCHER_POSITION_KEY =
    "gunkowii_ai_launcher_position";

  /* =========================================================
     STATE
     ========================================================= */

  let aiConversation = [];
  let aiBusy = false;
  let aiPanel = null;
  let aiMessages = null;
  let aiInput = null;
  let aiLauncher = null;
  let aiTyping = null;
  let aiHandoffNotice = null;

  let launcherMoved = false;
  let panelMoved = false;

  /* =========================================================
     HELPERS
     ========================================================= */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeJSONParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function normalize(value) {
    return String(value ?? "").trim();
  }

  function isValidHttpUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function getPageName() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("services")) return "Services";
    if (path.includes("portfolio")) return "Portfolio";
    if (path.includes("reviews")) return "Reviews";
    if (path.includes("pricing")) return "Pricing";
    if (path.includes("process")) return "Process";
    if (path.includes("audit")) return "Free Audit";
    if (path.includes("contact")) return "Contact";
    if (path.includes("about")) return "About";

    return "Home";
  }

  /* =========================================================
     AI CONVERSATION STORAGE
     ========================================================= */

  function loadAIConversation() {
    try {
      const saved = localStorage.getItem(AI_CONVERSATION_KEY);

      if (!saved) {
        aiConversation = [];
        return;
      }

      const parsed = safeJSONParse(saved, []);

      if (Array.isArray(parsed)) {
        aiConversation = parsed;
      } else {
        aiConversation = [];
      }
    } catch {
      aiConversation = [];
    }
  }

  function saveAIConversation() {
    try {
      localStorage.setItem(
        AI_CONVERSATION_KEY,
        JSON.stringify(aiConversation)
      );
    } catch {}
  }

  function clearAIConversation() {
    aiConversation = [];

    try {
      localStorage.removeItem(AI_CONVERSATION_KEY);
    } catch {}

    if (aiMessages) {
      aiMessages.innerHTML = "";
      aiMessages.scrollTop = 0;
    }

    showInitialGreeting();
  }

  /* =========================================================
     AI HANDOFF STORAGE
     ========================================================= */

  function saveHandoffData(data) {
    try {
      localStorage.setItem(
        AI_HANDOFF_KEY,
        JSON.stringify(data)
      );
    } catch {}
  }

  function loadHandoffData() {
    try {
      const saved = localStorage.getItem(AI_HANDOFF_KEY);

      if (!saved) return null;

      return safeJSONParse(saved, null);
    } catch {
      return null;
    }
  }

  function clearHandoffData() {
    try {
      localStorage.removeItem(AI_HANDOFF_KEY);
    } catch {}
  }

  /* =========================================================
     BUILD HANDOFF URL
     ========================================================= */

  function buildHandoffURL() {
    return `${CONTACT_URL}?ai_handoff=1`;
  }

  /* =========================================================
     AI RESPONSE FORMATTER
     ========================================================= */

  function formatAIResponse(rawText) {
    let text = normalize(rawText);

    if (!text) return "";

    /*
      Remove accidental HTML that the AI may return.
      This prevents raw href="..." markup from appearing.
    */
    text = text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<div[^>]*>/gi, "")
      .replace(/<\/div>/gi, "")
      .replace(/<[^>]+>/g, "");

    /*
      Decode common HTML entities.
    */
    const entityBox = document.createElement("textarea");
    entityBox.innerHTML = text;
    text = entityBox.value;

    const lines = text.split(/\r?\n/);

    const output = [];

    for (let line of lines) {
      line = line.trim();

      if (!line) {
        output.push("<div class=\"gunkowii-ai-spacer\"></div>");
        continue;
      }

      /*
        Markdown links:
        [Free Audit](https://example.com)
      */

      let safeLine = escapeHTML(line);

      safeLine = safeLine.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
        (match, label, url) => {
          const cleanURL = url.replace(/&amp;/g, "&");

          if (!isValidHttpUrl(cleanURL)) {
            return escapeHTML(label);
          }

          return `
            <a
              class="gunkowii-ai-link"
              href="${escapeHTML(cleanURL)}"
              target="_blank"
              rel="noopener noreferrer"
            >${escapeHTML(label)}</a>
          `;
        }
      );

      /*
        Raw URLs.
      */

      safeLine = safeLine.replace(
        /(^|\s)(https?:\/\/[^\s<]+)/gi,
        (match, prefix, url) => {
          const cleanURL = url.replace(/[),.!?]+$/g, "");

          if (!isValidHttpUrl(cleanURL)) {
            return match;
          }

          return `${prefix}<a
            class="gunkowii-ai-link"
            href="${escapeHTML(cleanURL)}"
            target="_blank"
            rel="noopener noreferrer"
          >${escapeHTML(cleanURL)}</a>`;
        }
      );

      /*
        Bold markdown.
      */

      safeLine = safeLine.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      );

      /*
        Headings.
      */

      if (/^#{1,3}\s+/.test(line)) {
        const heading = line.replace(/^#{1,3}\s+/, "");

        output.push(`
          <div class="gunkowii-ai-heading">
            ${escapeHTML(heading)}
          </div>
        `);

        continue;
      }

      /*
        Bullet points.
      */

      if (/^[•\-*]\s+/.test(line)) {
        const bullet = line.replace(/^[•\-*]\s+/, "");

        let formattedBullet = escapeHTML(bullet);

        formattedBullet = formattedBullet.replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>"
        );

        output.push(`
          <div class="gunkowii-ai-bullet">
            <span>•</span>
            <div>${formattedBullet}</div>
          </div>
        `);

        continue;
      }

      output.push(`
        <div class="gunkowii-ai-paragraph">
          ${safeLine}
        </div>
      `);
    }

    return output.join("");
  }

  /* =========================================================
     AI MESSAGE UI
     ========================================================= */

  function addAIMessage(role, text) {
    if (!aiMessages) return;

    const wrapper = document.createElement("div");

    wrapper.className =
      role === "user"
        ? "gunkowii-ai-message gunkowii-ai-user"
        : "gunkowii-ai-message gunkowii-ai-assistant";

    if (role === "assistant") {
      wrapper.innerHTML = `
        <div class="gunkowii-ai-message-avatar">
          <img
            src="${escapeHTML(AI_AVATAR)}"
            alt="GUNKOWII AI"
          >
        </div>

        <div class="gunkowii-ai-message-body">
          <div class="gunkowii-ai-message-name">
            GUNKOWII AI
          </div>

          <div class="gunkowii-ai-message-text">
            ${formatAIResponse(text)}
          </div>
        </div>
      `;
    } else {
      wrapper.innerHTML = `
        <div class="gunkowii-ai-user-label">
          You
        </div>

        <div class="gunkowii-ai-message-text">
          ${formatAIResponse(text)}
        </div>
      `;
    }

    aiMessages.appendChild(wrapper);

    requestAnimationFrame(() => {
      aiMessages.scrollTop = aiMessages.scrollHeight;
    });
  }

  /* =========================================================
     INITIAL AI GREETING
     ========================================================= */

  function showInitialGreeting() {
    if (!aiMessages) return;

    const greeting = `
Hi, I'm GUNKOWII AI 👋

I'm here to help you understand and improve your e-commerce business.

I can help with:

• Shopify
• Etsy
• SEO
• CRO
• Product pages
• Store optimization
• Digital marketing
• Email marketing
• Website issues

Tell me what you're working on, and I'll guide you step by step.

If you're dealing with a specific store or shop problem, you can also send me the URL.
`;

    addAIMessage("assistant", greeting);
  }

  /* =========================================================
     TYPING INDICATOR
     ========================================================= */

  function showTyping() {
    if (!aiMessages) return;

    hideTyping();

    aiTyping = document.createElement("div");

    aiTyping.className =
      "gunkowii-ai-message gunkowii-ai-assistant gunkowii-ai-typing-wrapper";

    aiTyping.innerHTML = `
      <div class="gunkowii-ai-message-avatar">
        <img
          src="${escapeHTML(AI_AVATAR)}"
          alt="GUNKOWII AI"
        >
      </div>

      <div class="gunkowii-ai-message-body">
        <div class="gunkowii-ai-message-name">
          GUNKOWII AI
        </div>

        <div class="gunkowii-ai-typing">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    aiMessages.appendChild(aiTyping);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  function hideTyping() {
    if (aiTyping) {
      aiTyping.remove();
      aiTyping = null;
    }
  }

  /* =========================================================
     CONSULTATION HANDOFF
     ========================================================= */

  function showHandoffNotice(data = {}) {
    if (!aiMessages) return;

    if (aiHandoffNotice) {
      aiHandoffNotice.remove();
    }

    aiHandoffNotice = document.createElement("div");

    aiHandoffNotice.className =
      "gunkowii-ai-handoff";

    aiHandoffNotice.innerHTML = `
      <div class="gunkowii-ai-handoff-icon">
        ✓
      </div>

      <div class="gunkowii-ai-handoff-content">
        <strong>Ready to continue with GUNKOWII SABA</strong>

        <p>
          I've organized the key details from this conversation so you
          won't need to explain everything again.
        </p>

        <a
          class="gunkowii-ai-handoff-button"
          href="${escapeHTML(buildHandoffURL())}"
        >
          Continue with GUNKOWII SABA →
        </a>
      </div>
    `;

    aiMessages.appendChild(aiHandoffNotice);

    requestAnimationFrame(() => {
      aiMessages.scrollTop = aiMessages.scrollHeight;
    });
  }

  /* =========================================================
     SAVE AI HANDOFF
     ========================================================= */

  function createHandoffData(data) {
    const conversationText = aiConversation
      .map(item => {
        const speaker =
          item.role === "user"
            ? "Visitor"
            : "GUNKOWII AI";

        return `${speaker}: ${item.content}`;
      })
      .join("\n\n");

    return {
      timestamp: new Date().toISOString(),
      page: getPageName(),

      leadSummary:
        data?.leadSummary ||
        data?.summary ||
        "",

      storeAnalysis:
        data?.storeAnalysis ||
        "",

      recommendedService:
        data?.recommendedService ||
        data?.service ||
        "",

      conversation:
        conversationText,

      aiAnswer:
        data?.answer ||
        ""
    };
  }

  /* =========================================================
     SEND AI MESSAGE
     ========================================================= */

  async function sendAIMessage() {
    if (!aiInput || aiBusy) return;

    const question = normalize(aiInput.value);

    if (!question) return;

    aiBusy = true;

    aiInput.value = "";
    aiInput.disabled = true;

    addAIMessage("user", question);

    aiConversation.push({
      role: "user",
      content: question
    });

    saveAIConversation();

    showTyping();

    try {
      const response = await fetch(AI_WORKER_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message: question,
          conversation: aiConversation,
          page: getPageName()
        })
      });

      if (!response.ok) {
        throw new Error(
          `AI request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      hideTyping();

      const answer =
        normalize(data.answer) ||
        "I’m ready to help. Tell me a little more about the store or problem you're dealing with.";

      addAIMessage("assistant", answer);

      aiConversation.push({
        role: "assistant",
        content: answer
      });

      saveAIConversation();

      /*
        Only create the consultation handoff when the Worker
        indicates that enough information has been gathered.
      */

      const handoff =
        data.handoff === true ||
        data.readyForHandoff === true ||
        data.consultationReady === true;

      if (handoff) {
        const handoffData = createHandoffData(data);

        saveHandoffData(handoffData);

        showHandoffNotice(handoffData);
      }

    } catch (error) {
      console.error("GUNKOWII AI error:", error);

      hideTyping();

      const fallback = `
I’m having trouble connecting to the consultation service right now.

You can still continue directly with GUNKOWII SABA through WhatsApp, or send your store URL and project details through the contact page.

<a href="${AUDIT_URL}" target="_blank" rel="noopener noreferrer" class="gunkowii-ai-link">Free Audit →</a>
`;

      addAIMessage("assistant", fallback);

    } finally {
      aiBusy = false;

      if (aiInput) {
        aiInput.disabled = false;
        aiInput.focus();
      }
    }
  }

  /* =========================================================
     DRAGGABLE ELEMENT
     ========================================================= */

  function makeDraggable(element, handle, storageKey = null) {
    if (!element || !handle) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    function restorePosition() {
      if (!storageKey) return;

      try {
        const saved = safeJSONParse(
          localStorage.getItem(storageKey),
          null
        );

        if (
          saved &&
          Number.isFinite(saved.left) &&
          Number.isFinite(saved.top)
        ) {
          element.style.left = `${saved.left}px`;
          element.style.top = `${saved.top}px`;
          element.style.right = "auto";
          element.style.bottom = "auto";
        }
      } catch {}
    }

    function clampPosition(left, top) {
      const rect = element.getBoundingClientRect();

      const maxLeft = Math.max(
        8,
        window.innerWidth - rect.width - 8
      );

      const maxTop = Math.max(
        8,
        window.innerHeight - rect.height - 8
      );

      return {
        left: Math.min(Math.max(8, left), maxLeft),
        top: Math.min(Math.max(8, top), maxTop)
      };
    }

    function pointerDown(event) {
      if (event.target.closest("button, a, input, textarea, select")) {
        return;
      }

      dragging = true;

      const rect = element.getBoundingClientRect();

      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";

      element.classList.add("gunkowii-ai-dragging");

      try {
        handle.setPointerCapture(event.pointerId);
      } catch {}

      event.preventDefault();
    }

    function pointerMove(event) {
      if (!dragging) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      const position = clampPosition(
        startLeft + deltaX,
        startTop + deltaY
      );

      element.style.left = `${position.left}px`;
      element.style.top = `${position.top}px`;
    }

    function pointerUp(event) {
      if (!dragging) return;

      dragging = false;

      element.classList.remove("gunkowii-ai-dragging");

      try {
        handle.releasePointerCapture(event.pointerId);
      } catch {}

      if (storageKey) {
        try {
          const rect = element.getBoundingClientRect();

          localStorage.setItem(
            storageKey,
            JSON.stringify({
              left: rect.left,
              top: rect.top
            })
          );
        } catch {}
      }
    }

    handle.addEventListener("pointerdown", pointerDown);
    handle.addEventListener("pointermove", pointerMove);
    handle.addEventListener("pointerup", pointerUp);
    handle.addEventListener("pointercancel", pointerUp);

    restorePosition();
  }

  /* =========================================================
     AI CSS
     ========================================================= */

  function injectAICSS() {
    if (document.getElementById("gunkowii-ai-styles")) return;

    const style = document.createElement("style");

    style.id = "gunkowii-ai-styles";

    style.textContent = `
      /* =====================================================
         AI LAUNCHER
         ===================================================== */

      .gunkowii-ai-launcher {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 9998;

        width: 76px;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;

        cursor: grab;
        user-select: none;
        touch-action: none;
      }

      .gunkowii-ai-launcher:active {
        cursor: grabbing;
      }

      .gunkowii-ai-launcher-avatar {
        width: 54px;
        height: 54px;

        object-fit: cover;

        border-radius: 50%;

        border: 2px solid #c9a227;

        background: #f7f1df;

        box-shadow:
          0 7px 24px rgba(0,0,0,.20),
          0 0 0 4px rgba(255,255,255,.85);

        pointer-events: none;
      }

      .gunkowii-ai-launcher-label {
        display: block;

        max-width: 76px;

        padding: 5px 7px;

        border-radius: 999px;

        background: #0b5d46;
        color: #fff;

        font-size: 9px;
        line-height: 1.15;
        font-weight: 800;

        text-align: center;
        white-space: nowrap;

        box-shadow:
          0 5px 16px rgba(11,93,70,.25);

        pointer-events: none;
      }

      /* =====================================================
         AI PANEL
         ===================================================== */

      .gunkowii-ai-panel {
        position: fixed;

        right: 20px;
        bottom: 92px;

        width: min(410px, calc(100vw - 28px));
        height: min(650px, calc(100vh - 120px));

        z-index: 9999;

        display: flex;
        flex-direction: column;

        overflow: hidden;

        background: #fffdf7;

        border:
          1px solid rgba(11,93,70,.16);

        border-radius: 22px;

        box-shadow:
          0 22px 60px rgba(0,0,0,.22);

        opacity: 0;
        visibility: hidden;

        transform:
          translateY(14px)
          scale(.98);

        transition:
          opacity .2s ease,
          transform .2s ease,
          visibility .2s ease;
      }

      .gunkowii-ai-panel.gunkowii-ai-open {
        opacity: 1;
        visibility: visible;

        transform:
          translateY(0)
          scale(1);
      }

      .gunkowii-ai-header {
        flex: 0 0 auto;

        display: flex;
        align-items: center;

        gap: 10px;

        padding: 13px 14px;

        background:
          linear-gradient(
            135deg,
            #0b5d46,
            #094b39
          );

        color: #fff;

        cursor: grab;
        touch-action: none;

        user-select: none;
      }

      .gunkowii-ai-header:active {
        cursor: grabbing;
      }

      .gunkowii-ai-header-avatar {
        width: 43px;
        height: 43px;

        flex: 0 0 43px;

        border-radius: 50%;

        object-fit: cover;

        border: 2px solid #d5b348;

        background: #fff;
      }

      .gunkowii-ai-header-info {
        min-width: 0;
        flex: 1;
      }

      .gunkowii-ai-header-title {
        font-size: 15px;
        font-weight: 900;

        line-height: 1.15;
      }

      .gunkowii-ai-header-subtitle {
        margin-top: 3px;

        font-size: 10px;
        line-height: 1.3;

        color: rgba(255,255,255,.82);
      }

      .gunkowii-ai-header-actions {
        display: flex;
        align-items: center;

        gap: 5px;

        flex: 0 0 auto;
      }

      .gunkowii-ai-new-chat,
      .gunkowii-ai-close {
        border: 0;

        color: #fff;

        cursor: pointer;

        touch-action: manipulation;
      }

      .gunkowii-ai-new-chat {
        padding: 7px 9px;

        border-radius: 8px;

        background:
          rgba(255,255,255,.12);

        font-size: 10px;
        font-weight: 800;
      }

      .gunkowii-ai-new-chat:hover {
        background:
          rgba(255,255,255,.2);
      }

      .gunkowii-ai-close {
        width: 30px;
        height: 30px;

        display: grid;
        place-items: center;

        background: transparent;

        font-size: 22px;
        line-height: 1;
      }

      .gunkowii-ai-close:hover {
        background:
          rgba(255,255,255,.12);

        border-radius: 50%;
      }

      /* =====================================================
         AI MESSAGES
         ===================================================== */

      .gunkowii-ai-messages {
        flex: 1;

        overflow-y: auto;

        padding: 17px 14px 15px;

        scroll-behavior: smooth;
      }

      .gunkowii-ai-message {
        margin-bottom: 14px;
      }

      .gunkowii-ai-assistant {
        display: flex;
        align-items: flex-start;

        gap: 8px;
      }

      .gunkowii-ai-message-avatar {
        width: 31px;
        height: 31px;

        flex: 0 0 31px;

        overflow: hidden;

        border-radius: 50%;

        background: #f4ecd5;

        border: 1px solid #d8c27b;
      }

      .gunkowii-ai-message-avatar img {
        width: 100%;
        height: 100%;

        object-fit: cover;
      }

      .gunkowii-ai-message-body {
        max-width: calc(100% - 39px);
      }

      .gunkowii-ai-message-name {
        margin-bottom: 4px;

        color: #0b5d46;

        font-size: 10px;
        font-weight: 900;
        letter-spacing: .3px;
      }

      .gunkowii-ai-message-text {
        padding: 11px 12px;

        border-radius:
          5px 15px 15px 15px;

        background: #f3f0e7;

        color: #202820;

        font-size: 12px;
        line-height: 1.58;

        overflow-wrap: anywhere;
      }

      .gunkowii-ai-user {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .gunkowii-ai-user .gunkowii-ai-message-text {
        max-width: 84%;

        background: #0b5d46;
        color: #fff;

        border-radius:
          15px 5px 15px 15px;
      }

      .gunkowii-ai-user-label {
        margin-bottom: 3px;

        font-size: 9px;
        font-weight: 800;

        color: #777;
      }

      .gunkowii-ai-paragraph {
        margin-bottom: 7px;
      }

      .gunkowii-ai-paragraph:last-child {
        margin-bottom: 0;
      }

      .gunkowii-ai-spacer {
        height: 5px;
      }

      .gunkowii-ai-heading {
        margin:
          3px 0 8px;

        color: #0b5d46;

        font-size: 13px;
        font-weight: 900;
      }

      .gunkowii-ai-bullet {
        display: flex;
        align-items: flex-start;

        gap: 7px;

        margin-bottom: 5px;
      }

      .gunkowii-ai-bullet > span {
        color: #c9a227;
        font-weight: 900;
      }

      .gunkowii-ai-link {
        display: inline-block;

        margin-top: 4px;

        color: #0b5d46;

        font-weight: 900;
        text-decoration: underline;
      }

      .gunkowii-ai-user .gunkowii-ai-link {
        color: #fff;
      }

      /* =====================================================
         TYPING
         ===================================================== */

      .gunkowii-ai-typing {
        display: flex;
        align-items: center;

        gap: 4px;

        padding: 11px 13px;

        background: #f3f0e7;

        border-radius:
          5px 15px 15px 15px;
      }

      .gunkowii-ai-typing span {
        width: 6px;
        height: 6px;

        border-radius: 50%;

        background: #0b5d46;

        animation:
          gunkowiiAItyping 1.2s infinite ease-in-out;
      }

      .gunkowii-ai-typing span:nth-child(2) {
        animation-delay: .15s;
      }

      .gunkowii-ai-typing span:nth-child(3) {
        animation-delay: .3s;
      }

      @keyframes gunkowiiAItyping {
        0%, 60%, 100% {
          transform: translateY(0);
          opacity: .45;
        }

        30% {
          transform: translateY(-4px);
          opacity: 1;
        }
      }

      /* =====================================================
         HANDOFF
         ===================================================== */

      .gunkowii-ai-handoff {
        display: flex;
        align-items: flex-start;

        gap: 10px;

        margin:
          12px 2px 4px;

        padding: 13px;

        background:
          linear-gradient(
            135deg,
            #f8f2df,
            #fffdf7
          );

        border:
          1px solid rgba(201,162,39,.35);

        border-radius: 15px;
      }

      .gunkowii-ai-handoff-icon {
        width: 27px;
        height: 27px;

        flex: 0 0 27px;

        display: grid;
        place-items: center;

        border-radius: 50%;

        background: #0b5d46;
        color: #fff;

        font-size: 12px;
        font-weight: 900;
      }

      .gunkowii-ai-handoff-content {
        min-width: 0;
      }

      .gunkowii-ai-handoff-content strong {
        display: block;

        margin-bottom: 4px;

        color: #0b5d46;

        font-size: 11px;
      }

      .gunkowii-ai-handoff-content p {
        margin:
          0 0 9px;

        color: #555;

        font-size: 10px;
        line-height: 1.45;
      }

      .gunkowii-ai-handoff-button {
        display: inline-block;

        padding: 8px 11px;

        border-radius: 9px;

        background: #0b5d46;
        color: #fff;

        font-size: 10px;
        font-weight: 900;

        text-decoration: none;
      }

      .gunkowii-ai-handoff-button:hover {
        background: #084b39;
      }

      /* =====================================================
         AI INPUT
         ===================================================== */

      .gunkowii-ai-input-area {
        flex: 0 0 auto;

        padding: 10px;

        background: #fff;

        border-top:
          1px solid rgba(11,93,70,.10);
      }

      .gunkowii-ai-input-wrap {
        display: flex;
        align-items: flex-end;

        gap: 7px;

        padding: 6px;

        background: #f4f1e9;

        border-radius: 13px;
      }

      .gunkowii-ai-input {
        flex: 1;

        min-height: 38px;
        max-height: 105px;

        resize: none;

        padding:
          8px 9px;

        border: 0;
        outline: none;

        background: transparent;

        color: #202820;

        font-family: inherit;
        font-size: 12px;
        line-height: 1.4;
      }

      .gunkowii-ai-input::placeholder {
        color: #888;
      }

      .gunkowii-ai-send {
        width: 38px;
        height: 38px;

        flex: 0 0 38px;

        border: 0;

        border-radius: 10px;

        background: #0b5d46;
        color: #fff;

        cursor: pointer;

        font-size: 16px;
        font-weight: 900;
      }

      .gunkowii-ai-send:hover {
        background: #084b39;
      }

      .gunkowii-ai-send:disabled {
        opacity: .5;
        cursor: not-allowed;
      }

      /* =====================================================
         DRAGGING
         ===================================================== */

      .gunkowii-ai-dragging {
        transition: none !important;
      }

      /* =====================================================
         LIVE ACTIVITY POPUP
         ===================================================== */

      .gunkowii-live-activity {
        position: fixed;

        left: 18px;
        bottom: 18px;

        z-index: 9990;

        width: min(
          400px,
          calc(100vw - 36px)
        );

        min-height: 98px;

        padding: 12px 14px;

        display: flex;
        align-items: center;

        gap: 12px;

        background:
          linear-gradient(
            135deg,
            #fffdf7,
            #f5f0df
          );

        border:
          1px solid rgba(11,93,70,.16);

        border-left:
          4px solid #c9a227;

        border-radius: 17px;

        box-shadow:
          0 15px 38px rgba(0,0,0,.16);

        opacity: 0;

        transform:
          translateX(-120%);

        transition:
          transform .45s ease,
          opacity .35s ease;

        cursor: pointer;
      }

      .gunkowii-live-activity.gunkowii-live-show {
        opacity: 1;

        transform:
          translateX(0);
      }

      .gunkowii-live-media {
        position: relative;

        width: 68px;
        height: 68px;

        flex: 0 0 68px;

        overflow: hidden;

        border-radius: 13px;

        background:
          linear-gradient(
            135deg,
            #0b5d46,
            #c9a227
          );

        border:
          1px solid rgba(201,162,39,.4);
      }

      .gunkowii-live-media img {
        width: 100%;
        height: 100%;

        display: block;

        object-fit: cover;
      }

      .gunkowii-live-placeholder {
        width: 100%;
        height: 100%;

        display: flex;
        align-items: center;
        justify-content: center;

        color: #fff;

        font-size: 17px;
        font-weight: 900;
        letter-spacing: .5px;
      }

      .gunkowii-live-content {
        min-width: 0;
        flex: 1;
      }

      .gunkowii-live-title {
        margin-bottom: 4px;

        color: #0b5d46;

        font-size: 12px;
        font-weight: 900;
      }

      .gunkowii-live-text {
        color: #4d514c;

        font-size: 11px;
        line-height: 1.45;
      }

      .gunkowii-live-close {
        width: 26px;
        height: 26px;

        flex: 0 0 26px;

        display: grid;
        place-items: center;

        border: 0;

        border-radius: 50%;

        background:
          rgba(11,93,70,.07);

        color: #555;

        cursor: pointer;

        font-size: 17px;
        line-height: 1;
      }

      .gunkowii-live-close:hover {
        background:
          rgba(11,93,70,.13);
      }

      @media (max-width: 600px) {

        .gunkowii-ai-launcher {
          right: 12px;
          bottom: 12px;
        }

        .gunkowii-ai-panel {
          right: 10px;
          bottom: 88px;

          width:
            calc(100vw - 20px);

          height:
            min(650px, calc(100vh - 105px));

          border-radius: 18px;
        }

        .gunkowii-ai-header {
          padding: 11px;
        }

        .gunkowii-ai-header-avatar {
          width: 39px;
          height: 39px;
          flex-basis: 39px;
        }

        .gunkowii-ai-header-title {
          font-size: 13px;
        }

        .gunkowii-ai-header-subtitle {
          font-size: 9px;
        }

        .gunkowii-ai-new-chat {
          padding: 6px 7px;
          font-size: 9px;
        }

        .gunkowii-live-activity {
          left: 10px;
          bottom: 10px;

          width:
            calc(100vw - 20px);

          min-height: 94px;

          padding: 11px;
        }

        .gunkowii-live-media {
          width: 60px;
          height: 60px;
          flex-basis: 60px;
        }

        .gunkowii-live-title {
          font-size: 11px;
        }

        .gunkowii-live-text {
          font-size: 10px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     CREATE AI PANEL
     ========================================================= */

  function createAIPanel() {
    if (document.querySelector(".gunkowii-ai-panel")) {
      aiPanel = document.querySelector(".gunkowii-ai-panel");
      aiMessages =
        aiPanel.querySelector(".gunkowii-ai-messages");
      aiInput =
        aiPanel.querySelector(".gunkowii-ai-input");

      return;
    }

    aiLauncher = document.createElement("div");

    aiLauncher.className =
      "gunkowii-ai-launcher";

    aiLauncher.setAttribute(
      "aria-label",
      "Ask GUNKOWII AI"
    );

    aiLauncher.innerHTML = `
      <img
        class="gunkowii-ai-launcher-avatar"
        src="${escapeHTML(AI_AVATAR)}"
        alt="GUNKOWII AI"
      >

      <span class="gunkowii-ai-launcher-label">
        Ask GUNKOWII AI
      </span>
    `;

    document.body.appendChild(aiLauncher);

    aiPanel = document.createElement("section");

    aiPanel.className =
      "gunkowii-ai-panel";

    aiPanel.setAttribute(
      "aria-label",
      "GUNKOWII AI consultation"
    );

    aiPanel.innerHTML = `
      <div
        class="gunkowii-ai-header"
        id="gunkowii-ai-drag-handle"
      >

        <img
          class="gunkowii-ai-header-avatar"
          src="${escapeHTML(AI_AVATAR)}"
          alt="GUNKOWII AI"
        >

        <div class="gunkowii-ai-header-info">

          <div class="gunkowii-ai-header-title">
            GUNKOWII AI
          </div>

          <div class="gunkowii-ai-header-subtitle">
            E-commerce • Shopify • Etsy • SEO • CRO
          </div>

        </div>

        <div class="gunkowii-ai-header-actions">

          <button
            type="button"
            class="gunkowii-ai-new-chat"
            id="gunkowii-ai-new-chat"
          >
            New Chat
          </button>

          <button
            type="button"
            class="gunkowii-ai-close"
            aria-label="Close GUNKOWII AI"
          >
            ×
          </button>

        </div>

      </div>

      <div
        class="gunkowii-ai-messages"
        aria-live="polite"
      ></div>

      <div class="gunkowii-ai-input-area">

        <div class="gunkowii-ai-input-wrap">

          <textarea
            class="gunkowii-ai-input"
            rows="1"
            placeholder="Tell me what you're dealing with..."
            aria-label="Message GUNKOWII AI"
          ></textarea>

          <button
            type="button"
            class="gunkowii-ai-send"
            aria-label="Send message"
          >
            ↑
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(aiPanel);

    aiMessages =
      aiPanel.querySelector(".gunkowii-ai-messages");

    aiInput =
      aiPanel.querySelector(".gunkowii-ai-input");

    const sendButton =
      aiPanel.querySelector(".gunkowii-ai-send");

    const closeButton =
      aiPanel.querySelector(".gunkowii-ai-close");

    const newChatButton =
      aiPanel.querySelector(".gunkowii-ai-new-chat");

    const header =
      aiPanel.querySelector(".gunkowii-ai-header");

    /* =======================================================
       OPEN / CLOSE
       ======================================================= */

    function openAI() {
      aiPanel.classList.add("gunkowii-ai-open");

      setTimeout(() => {
        if (aiInput) aiInput.focus();
      }, 220);
    }

    function closeAI() {
      aiPanel.classList.remove("gunkowii-ai-open");
    }

    /*
      Launcher click.
      Only open when the launcher wasn't being dragged.
    */

    let launcherDragging = false;
    let launcherStartX = 0;
    let launcherStartY = 0;

    aiLauncher.addEventListener(
      "pointerdown",
      event => {
        launcherDragging = false;

        launcherStartX = event.clientX;
        launcherStartY = event.clientY;
      }
    );

    aiLauncher.addEventListener(
      "pointermove",
      event => {
        const distance = Math.sqrt(
          Math.pow(event.clientX - launcherStartX, 2) +
          Math.pow(event.clientY - launcherStartY, 2)
        );

        if (distance > 6) {
          launcherDragging = true;
        }
      }
    );

    aiLauncher.addEventListener(
      "click",
      event => {
        if (launcherDragging) {
          event.preventDefault();
          event.stopPropagation();

          launcherDragging = false;

          return;
        }

        openAI();
      }
    );

    /* =======================================================
       CLOSE
       ======================================================= */

    closeButton.addEventListener(
      "pointerdown",
      event => {
        event.stopPropagation();
      }
    );

    closeButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        closeAI();
      }
    );

    /* =======================================================
       NEW CHAT
       ======================================================= */

    /*
      New Chat belongs to the draggable header.
      It moves with the header, but clicking it must NOT
      initiate a drag.
    */

    newChatButton.addEventListener(
      "pointerdown",
      event => {
        event.stopPropagation();
      }
    );

    newChatButton.addEventListener(
      "mousedown",
      event => {
        event.stopPropagation();
      }
    );

    newChatButton.addEventListener(
      "touchstart",
      event => {
        event.stopPropagation();
      },
      { passive: true }
    );

    newChatButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        if (aiBusy) return;

        clearAIConversation();
        clearHandoffData();

        if (aiInput) {
          aiInput.value = "";
          aiInput.disabled = false;
          aiInput.focus();
        }

        if (aiMessages) {
          aiMessages.scrollTop = 0;
        }
      }
    );

    /* =======================================================
       SEND
       ======================================================= */

    sendButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        sendAIMessage();
      }
    );

    aiInput.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          sendAIMessage();
        }
      }
    );

    /*
      Automatically grow textarea.
    */

    aiInput.addEventListener(
      "input",
      () => {
        aiInput.style.height = "auto";

        aiInput.style.height =
          Math.min(
            aiInput.scrollHeight,
            105
          ) + "px";
      }
    );

    /* =======================================================
       DRAG PANEL
       ======================================================= */

    makeDraggable(
      aiPanel,
      header,
      AI_PANEL_POSITION_KEY
    );

    /* =======================================================
       DRAG LAUNCHER
       ======================================================= */

    makeDraggable(
      aiLauncher,
      aiLauncher,
      AI_LAUNCHER_POSITION_KEY
    );

    /* =======================================================
       RESTORE CONVERSATION
       ======================================================= */

    loadAIConversation();

    if (aiConversation.length > 0) {
      aiConversation.forEach(item => {
        if (
          item &&
          (item.role === "user" ||
            item.role === "assistant")
        ) {
          addAIMessage(
            item.role,
            item.content
          );
        }
      });
    } else {
      showInitialGreeting();
    }
  }

  /* =========================================================
     LIVE ACTIVITY DATA
     ========================================================= */

  const liveActivities = [
    {
      title: "Client Feedback",
      text: "Real client and team feedback from recent digital work.",
      url: "reviews.html",
      image:
        "Screenshot_2026-09-04-12-50-03-770_com.openai.chatgpt-edit.jpg",
      initials: "GS"
    },

    {
      title: "Shopify Work",
      text: "Shopify optimization, product presentation and e-commerce growth.",
      url: "services.html",
      image:
        "assets/projects/teeology/teeology-home.jpg",
      initials: "SH"
    },

    {
      title: "Etsy Growth",
      text: "Etsy listing optimization, visibility and growth opportunities.",
      url: "services.html",
      image:
        "gunkowii-saba-logo.png",
      initials: "ET"
    },

    {
      title: "CRO Insight",
      text: "Finding friction between visitors, product pages and purchases.",
      url: "audit.html",
      image:
        "assets/projects/beeyouti/beeyouti-product.jpg",
      initials: "CR"
    },

    {
      title: "SEO Focus",
      text: "Improving search visibility across products, collections and content.",
      url: "services.html",
      image:
        "assets/projects/look-for-it-here/look-for-it-here-products.jpg",
      initials: "SE"
    },

    {
      title: "Growth Strategy",
      text: "Connecting traffic, trust, conversion and customer retention.",
      url: "process.html",
      image:
        "assets/projects/iron-therapy/iron-therapy-home.jpg",
      initials: "GR"
    },

    {
      title: "Featured Project",
      text: "MANBAUL ANWAR Arabic School Management System.",
      url: "portfolio.html",
      image:
        "assets/projects/manbaul-anwar/manbaul-anwar-dashboard.jpg",
      initials: "MA"
    },

    {
      title: "Available",
      text: "Open to professional e-commerce, digital and technology projects.",
      url: "contact.html",
      image:
        "gunkowii-saba-logo.png",
      initials: "GS"
    }
  ];

  /* =========================================================
     LIVE ACTIVITY POPUP
     ========================================================= */

  function createLiveActivity() {
    if (
      document.querySelector(
        ".gunkowii-live-activity"
      )
    ) {
      return;
    }

    const popup =
      document.createElement("div");

    popup.className =
      "gunkowii-live-activity";

    popup.setAttribute(
      "role",
      "button"
    );

    popup.setAttribute(
      "tabindex",
      "0"
    );

    popup.innerHTML = `
      <div class="gunkowii-live-media">

        <img
          class="gunkowii-live-image"
          alt=""
        >

        <div
          class="gunkowii-live-placeholder"
          style="display:none;"
        >
          GS
        </div>

      </div>

      <div class="gunkowii-live-content">

        <div class="gunkowii-live-title">
          Activity
        </div>

        <div class="gunkowii-live-text">
          Discover the latest work.
        </div>

      </div>

      <button
        type="button"
        class="gunkowii-live-close"
        aria-label="Close"
      >
        ×
      </button>
    `;

    document.body.appendChild(popup);

    const image =
      popup.querySelector(
        ".gunkowii-live-image"
      );

    const placeholder =
      popup.querySelector(
        ".gunkowii-live-placeholder"
      );

    const title =
      popup.querySelector(
        ".gunkowii-live-title"
      );

    const text =
      popup.querySelector(
        ".gunkowii-live-text"
      );

    const close =
      popup.querySelector(
        ".gunkowii-live-close"
      );

    let currentActivity = null;

    function setActivity(activity) {
      currentActivity = activity;

      title.textContent =
        activity.title;

      text.textContent =
        activity.text;

      placeholder.textContent =
        activity.initials || "GS";

      image.style.display = "block";
      placeholder.style.display = "none";

      if (activity.image) {
        image.src = activity.image;
      } else {
        image.removeAttribute("src");
        image.style.display = "none";
        placeholder.style.display = "flex";
      }

      image.onerror = () => {
        image.style.display = "none";
        placeholder.style.display = "flex";
      };
    }

    function hidePopup() {
      popup.classList.remove(
        "gunkowii-live-show"
      );
    }

    function showPopup() {
      popup.classList.add(
        "gunkowii-live-show"
      );
    }

    function openActivity() {
      if (!currentActivity) return;

      const target =
        currentActivity.url;

      if (!target) return;

      window.location.href = target;
    }

    close.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        hidePopup();
      }
    );

    popup.addEventListener(
      "click",
      event => {
        if (
          event.target.closest(
            ".gunkowii-live-close"
          )
        ) {
          return;
        }

        openActivity();
      }
    );

    popup.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          openActivity();
        }
      }
    );

    let index = 0;
    let permanentlyClosed = false;

    function displayNext() {
      if (permanentlyClosed) return;

      setActivity(
        liveActivities[index]
      );

      index =
        (index + 1) %
        liveActivities.length;

      showPopup();

      setTimeout(() => {
        if (!permanentlyClosed) {
          hidePopup();
        }
      }, 7000);
    }

    close.addEventListener(
      "click",
      () => {
        permanentlyClosed = true;
      }
    );

    /*
      First appearance.
    */

    setTimeout(
      displayNext,
      4000
    );

    /*
      Continue rotating.
    */

    setInterval(
      displayNext,
      12000
    );
  }

  /* =========================================================
     CONTACT PAGE HANDOFF
     ========================================================= */

  function setupContactHandoff() {
    const form =
      document.querySelector(
        "form"
      );

    if (!form) return;

    const params =
      new URLSearchParams(
        window.location.search
      );

    const isHandoff =
      params.get(
        "ai_handoff"
      ) === "1";

    if (!isHandoff) return;

    const data =
      loadHandoffData();

    if (!data) return;

    /*
      AI information stays hidden.
      It is only attached to the form submission.
    */

    const hiddenFields = {
      ai_handoff: "1",

      ai_lead_summary:
        data.leadSummary || "",

      ai_store_analysis:
        data.storeAnalysis || "",

      ai_recommended_service:
        data.recommendedService || "",

      ai_conversation:
        data.conversation || "",

      ai_handoff_time:
        data.timestamp || ""
    };

    Object.entries(hiddenFields)
      .forEach(([name, value]) => {
        let field =
          form.querySelector(
            `[name="${name}"]`
          );

        if (!field) {
          field =
            document.createElement(
              "input"
            );

          field.type = "hidden";
          field.name = name;

          form.appendChild(field);
        }

        field.value = value;
      });
  }

  /* =========================================================
     CONTACT WHATSAPP HANDOFF
     ========================================================= */

  function setupWhatsAppHandoff() {
    const form =
      document.querySelector(
        "form"
      );

    if (!form) return;

    const whatsappButton =
      Array.from(
        form.querySelectorAll(
          "button, a"
        )
      ).find(button =>
        normalize(
          button.textContent
        )
          .toLowerCase()
          .includes(
            "continue to whatsapp"
          )
      );

    if (!whatsappButton) return;

    whatsappButton.addEventListener(
      "click",
      async event => {
        event.preventDefault();

        if (
          typeof form.reportValidity ===
          "function" &&
          !form.reportValidity()
        ) {
          return;
        }

        const name =
          form.querySelector(
            '[name="name"]'
          )?.value || "";

        const email =
          form.querySelector(
            '[name="email"]'
          )?.value || "";

        const store =
          form.querySelector(
            '[name="store"]'
          )?.value || "";

        const service =
          form.querySelector(
            '[name="service"]'
          )?.value || "";

        const project =
          form.querySelector(
            '[name="message"]'
          )?.value ||
          form.querySelector(
            "textarea"
          )?.value ||
          "";

        const handoff =
          loadHandoffData();

        let message = `
Hello GUNKOWII SABA,

I would like to discuss a project.

Name: ${name}
Email: ${email}
Store / Website: ${store || "Not provided"}
Service: ${service}
Project details:
${project}
`.trim();

        if (handoff) {
          message += `

AI consultation summary:
${handoff.leadSummary || "Not available"}

AI store analysis:
${handoff.storeAnalysis || "Not available"}

Recommended service:
${handoff.recommendedService || "Not specified"}

AI conversation:
${handoff.conversation || "Not available"}
`;
        }

        try {
          await navigator.clipboard.writeText(
            message
          );

          alert(
            "Your consultation message has been prepared and copied. WhatsApp will open next — please paste and send the message."
          );
        } catch {
          alert(
            "Your consultation message is ready. WhatsApp will open next. Please paste your message there."
          );
        }

        window.open(
          WHATSAPP_URL,
          "_blank",
          "noopener,noreferrer"
        );
      }
    );
  }

  /* =========================================================
     INIT
     ========================================================= */

  function init() {
    injectAICSS();

    createAIPanel();

    createLiveActivity();

    setupContactHandoff();

    setupWhatsAppHandoff();
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.GunkowiiAI = {
    open: () => {
      const panel =
        document.querySelector(
          ".gunkowii-ai-panel"
        );

      if (panel) {
        panel.classList.add(
          "gunkowii-ai-open"
        );

        setTimeout(() => {
          const input =
            panel.querySelector(
              ".gunkowii-ai-input"
            );

          if (input) input.focus();
        }, 200);
      }
    },

    close: () => {
      const panel =
        document.querySelector(
          ".gunkowii-ai-panel"
        );

      if (panel) {
        panel.classList.remove(
          "gunkowii-ai-open"
        );
      }
    },

    newChat: () => {
      clearAIConversation();
      clearHandoffData();

      if (aiInput) {
        aiInput.value = "";
        aiInput.disabled = false;
        aiInput.focus();
      }

      if (aiMessages) {
        aiMessages.scrollTop = 0;
      }
    }
  };

  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
