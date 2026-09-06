/* =========================================================
   GUNKOWII SABA — PORTFOLIO GLOBAL JAVASCRIPT
   FINAL AI / POPUP / CONTACT HANDOFF SYSTEM
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
    },

    MAX_MESSAGES: 100
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
      // Ignore storage errors.
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

  function trimConversation() {
    if (aiConversation.length > CONFIG.MAX_MESSAGES) {
      aiConversation = aiConversation.slice(
        -CONFIG.MAX_MESSAGES
      );
    }
  }

  function saveConversation() {
    trimConversation();
    saveStorage(
      CONFIG.STORAGE.conversation,
      aiConversation
    );
  }

  function clearConversation() {
    aiConversation = [];
    removeStorage(CONFIG.STORAGE.conversation);
  }

  function getFirstBuyerMessage() {
    const firstBuyerMessage =
      aiConversation.find(
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

    result = result.replace(
      /\[([^\]]+)\]\(\s*\[\s*(https?:\/\/[^\]\s]+)\s*\]\(\s*(https?:\/\/[^)\s]+)\s*\)\s*\)/gi,
      "[$1]($3)"
    );

    result = result.replace(
      /\[([^\]]+)\]\(\s*(https?:\/\/[^\s)\]]+)\s*\]\s*\)/gi,
      "[$1]($2)"
    );

    return result;
  }

  function formatAIResponse(rawText) {
    if (!rawText) return "";

    let text = decodeHTMLEntities(
      String(rawText)
    );

    text = text
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        ""
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        ""
      )
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
        Protect markdown links first.
        This prevents the raw URL formatter from
        corrupting the generated anchor.
      */

      const protectedLinks = [];

      output = output.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
        (_, label, url) => {
          const token =
            `___GUNKOWII_LINK_${protectedLinks.length}___`;

          protectedLinks.push(
            `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
          );

          return token;
        }
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
      */

      output = output.replace(
        /(^|[\s>])(https?:\/\/[^\s<]+)/gi,
        (match, prefix, url) => {
          const cleanURL =
            url.replace(/[),.;!?]+$/g, "");

          return `${prefix}<a href="${cleanURL}" target="_blank" rel="noopener noreferrer">${cleanURL}</a>`;
        }
      );

      /*
        Restore protected markdown links.
      */

      protectedLinks.forEach(
        (link, index) => {
          output = output.replace(
            `___GUNKOWII_LINK_${index}___`,
            link
          );
        }
      );

      return output;
    }

    lines.forEach(rawLine => {
      const line = rawLine.trim();

      if (!line) {
        closeList();
        html.push(
          "<div class='ai-space'></div>"
        );
        return;
      }

      if (/^###\s+/.test(line)) {
        closeList();

        html.push(
          `<h4>${formatInline(
            line.replace(/^###\s+/, "")
          )}</h4>`
        );

        return;
      }

      if (/^##\s+/.test(line)) {
        closeList();

        html.push(
          `<h3>${formatInline(
            line.replace(/^##\s+/, "")
          )}</h3>`
        );

        return;
      }

      if (/^#\s+/.test(line)) {
        closeList();

        html.push(
          `<h3>${formatInline(
            line.replace(/^#\s+/, "")
          )}</h3>`
        );

        return;
      }

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

      html.push(
        `<p>${formatInline(line)}</p>`
      );
    });

    closeList();

    return html.join("");
  }

  /* =========================================================
     AI CSS
     ========================================================= */

  function injectAIStyles() {
    if ($("#gunkowii-ai-styles")) return;

    const style =
      document.createElement("style");

    style.id =
      "gunkowii-ai-styles";

    style.textContent = `

      /* =====================================================
         AI LAUNCHER
         ===================================================== */

      #gunkowii-ai-launcher {
        position: fixed;
        z-index: 10001;

        width: 76px;
        min-height: 102px;

        padding: 7px 6px 8px;

        box-sizing: border-box;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        gap: 6px;

        border: 1px solid rgba(212,175,55,.68);
        border-radius: 18px;

        background:
          linear-gradient(
            145deg,
            rgba(7,49,39,.99),
            rgba(3,28,23,.99)
          );

        box-shadow:
          0 14px 34px rgba(0,0,0,.27),
          0 0 0 1px rgba(255,255,255,.04) inset;

        cursor: grab;
        user-select: none;

        touch-action: none;

        transition:
          left .48s cubic-bezier(.22,1.35,.36,1),
          right .48s cubic-bezier(.22,1.35,.36,1),
          top .18s ease,
          box-shadow .2s ease,
          transform .2s ease;
      }

      #gunkowii-ai-launcher.dragging {
        cursor: grabbing;

        transform:
          scale(1.03);

        box-shadow:
          0 20px 44px rgba(0,0,0,.32),
          0 0 0 1px rgba(212,175,55,.4) inset;
      }

      #gunkowii-ai-launcher.gunkowii-ai-snap {
        transition:
          left .5s cubic-bezier(.22,1.35,.36,1),
          right .5s cubic-bezier(.22,1.35,.36,1),
          top .18s ease,
          transform .25s ease;
      }

      #gunkowii-ai-launcher img {
        width: 49px;
        height: 49px;

        object-fit: cover;

        border-radius: 50%;

        border:
          2px solid rgba(212,175,55,.92);

        box-shadow:
          0 5px 15px rgba(0,0,0,.28);

        pointer-events: none;

        display: block;
      }

      #gunkowii-ai-launcher
      .ai-launcher-label {
        width: 100%;

        color: #f7efd9;

        font-size: 9px;
        line-height: 1.15;

        font-weight: 800;

        letter-spacing: .15px;

        text-align: center;

        pointer-events: none;
      }

      #gunkowii-ai-launcher
      .ai-launcher-status {
        position: absolute;

        top: 8px;
        right: 8px;

        width: 8px;
        height: 8px;

        border-radius: 50%;

        background: #5fd28b;

        box-shadow:
          0 0 0 3px rgba(95,210,139,.13);

        pointer-events: none;
      }

      /* =====================================================
         AI PANEL
         ===================================================== */

      #gunkowii-ai-panel {
        position: fixed;

        z-index: 10000;

        right: 18px;
        bottom: 94px;

        width:
          min(470px, calc(100vw - 24px));

        height:
          min(760px, calc(100vh - 86px));

        min-height: 560px;

        display: none;
        flex-direction: column;

        overflow: hidden;

        border:
          1px solid rgba(212,175,55,.52);

        border-radius: 22px;

        background:
          linear-gradient(
            145deg,
            rgba(7,49,39,.995),
            rgba(3,28,23,.995)
          );

        color: #f8f3e7;

        box-shadow:
          0 28px 78px rgba(0,0,0,.42),
          0 0 0 1px rgba(255,255,255,.04) inset;
      }

      #gunkowii-ai-panel.open {
        display: flex;

        animation:
          gunkowiiAIIn .28s ease;
      }

      @keyframes gunkowiiAIIn {
        from {
          opacity: 0;
          transform:
            translateY(12px)
            scale(.98);
        }

        to {
          opacity: 1;
          transform:
            translateY(0)
            scale(1);
        }
      }

      /* =====================================================
         AI HEADER
         ===================================================== */

      .gunkowii-ai-header {
        flex:
          0 0 auto;

        display: flex;
        align-items: center;

        gap: 10px;

        padding:
          12px 12px 11px;

        background:
          linear-gradient(
            180deg,
            rgba(255,255,255,.06),
            rgba(255,255,255,.015)
          );

        border-bottom:
          1px solid rgba(212,175,55,.18);

        cursor: grab;

        user-select: none;

        touch-action: none;
      }

      .gunkowii-ai-header.dragging {
        cursor: grabbing;
      }

      .gunkowii-ai-avatar {
        width: 42px;
        height: 42px;

        flex:
          0 0 42px;

        border-radius: 50%;

        object-fit: cover;

        border:
          1.5px solid rgba(212,175,55,.88);

        pointer-events: none;
      }

      .gunkowii-ai-title-area {
        flex: 1;
        min-width: 0;

        pointer-events: none;
      }

      .gunkowii-ai-title {
        font-size: 15px;

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

        color:
          rgba(255,255,255,.66);
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

        flex:
          0 0 auto;
      }

      .gunkowii-ai-action {
        border:
          1px solid rgba(212,175,55,.25);

        background:
          rgba(255,255,255,.055);

        color: #f8f3e7;

        border-radius: 9px;

        min-width: 34px;
        height: 31px;

        padding:
          0 8px;

        font-size: 11px;

        font-weight: 700;

        cursor: pointer;
      }

      .gunkowii-ai-action:hover {
        background:
          rgba(212,175,55,.14);

        border-color:
          rgba(212,175,55,.5);
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
        flex:
          1 1 auto;

        min-height: 0;

        overflow-y: auto;

        overscroll-behavior: contain;

        padding:
          16px 15px 18px;

        scrollbar-width: thin;

        scrollbar-color:
          rgba(212,175,55,.4)
          transparent;
      }

      .gunkowii-ai-message {
        display: flex;

        margin-bottom: 12px;
      }

      .gunkowii-ai-message.user {
        justify-content: flex-end;
      }

      .gunkowii-ai-message.assistant {
        justify-content: flex-start;
      }

      .gunkowii-ai-bubble {
        max-width: 90%;

        padding:
          11px 13px;

        border-radius: 15px;

        font-size: 13px;

        line-height: 1.58;

        overflow-wrap: anywhere;
      }

      .gunkowii-ai-message.assistant
      .gunkowii-ai-bubble {
        background:
          rgba(255,255,255,.075);

        border:
          1px solid rgba(255,255,255,.075);

        color:
          #f7f1e3;

        border-bottom-left-radius: 5px;
      }

      .gunkowii-ai-message.user
      .gunkowii-ai-bubble {
        background:
          linear-gradient(
            135deg,
            rgba(212,175,55,.96),
            rgba(184,145,30,.96)
          );

        color: #172019;

        border-bottom-right-radius: 5px;

        font-weight: 600;
      }

      .gunkowii-ai-bubble p {
        margin:
          0 0 8px;
      }

      .gunkowii-ai-bubble p:last-child {
        margin-bottom: 0;
      }

      .gunkowii-ai-bubble h3,
      .gunkowii-ai-bubble h4 {
        margin:
          6px 0 8px;

        color:
          #fff6d9;
      }

      .gunkowii-ai-bubble h3 {
        font-size: 14px;
      }

      .gunkowii-ai-bubble h4 {
        font-size: 13px;
      }

      .gunkowii-ai-bubble ul {
        margin:
          6px 0 9px;

        padding-left: 19px;
      }

      .gunkowii-ai-bubble li {
        margin-bottom: 5px;
      }

      .gunkowii-ai-bubble a {
        color:
          #e5c45b;

        font-weight: 700;

        text-decoration: underline;
      }

      .gunkowii-ai-message.user
      .gunkowii-ai-bubble a {
        color:
          #102b20;
      }

      .ai-space {
        height: 4px;
      }

      /* =====================================================
         TYPING
         ===================================================== */

      .gunkowii-ai-typing {
        display: none;

        align-items: center;

        gap: 4px;

        padding:
          9px 12px;

        margin:
          0 15px 9px;

        width: fit-content;

        border-radius: 13px;

        background:
          rgba(255,255,255,.07);
      }

      .gunkowii-ai-typing.show {
        display: flex;
      }

      .gunkowii-ai-typing span {
        width: 5px;
        height: 5px;

        border-radius: 50%;

        background:
          #d4af37;

        animation:
          gunkowiiTyping
          1.1s infinite
          ease-in-out;
      }

      .gunkowii-ai-typing
      span:nth-child(2) {
        animation-delay:
          .15s;
      }

      .gunkowii-ai-typing
      span:nth-child(3) {
        animation-delay:
          .3s;
      }

      @keyframes gunkowiiTyping {
        0%, 60%, 100% {
          transform:
            translateY(0);

          opacity: .45;
        }

        30% {
          transform:
            translateY(-3px);

          opacity: 1;
        }
      }

      /* =====================================================
         AI HANDOFF
         ===================================================== */

      .gunkowii-ai-handoff {
        display: none;

        flex:
          0 0 auto;

        margin:
          0 14px 10px;

        padding:
          11px;

        border-radius: 14px;

        background:
          linear-gradient(
            135deg,
            rgba(212,175,55,.14),
            rgba(255,255,255,.04)
          );

        border:
          1px solid rgba(212,175,55,.3);
      }

      .gunkowii-ai-handoff.show {
        display: block;
      }

      .gunkowii-ai-handoff-title {
        font-size: 12px;

        font-weight: 800;

        color:
          #f6d76d;

        margin-bottom: 4px;
      }

      .gunkowii-ai-handoff-text {
        font-size: 10px;

        line-height: 1.45;

        color:
          rgba(255,255,255,.72);

        margin-bottom: 9px;
      }

      .gunkowii-ai-handoff-button {
        width: 100%;

        border: 0;

        border-radius: 10px;

        padding:
          10px 11px;

        background:
          linear-gradient(
            135deg,
            #d4af37,
            #e1c35c
          );

        color:
          #14241d;

        font-size: 12px;

        font-weight: 900;

        cursor: pointer;

        box-shadow:
          0 5px 16px rgba(0,0,0,.14);
      }

      .gunkowii-ai-handoff-button:hover {
        filter:
          brightness(1.06);
      }

      /* =====================================================
         AI INPUT
         ===================================================== */

      .gunkowii-ai-input-area {
        flex:
          0 0 auto;

        padding:
          11px;

        border-top:
          1px solid rgba(212,175,55,.15);

        background:
          rgba(0,0,0,.1);
      }

      .gunkowii-ai-input-wrap {
        display: flex;

        align-items: flex-end;

        gap: 7px;
      }

      #gunkowii-ai-input {
        flex: 1;

        min-height: 42px;
        max-height: 120px;

        resize: none;

        padding:
          11px 12px;

        border:
          1px solid rgba(255,255,255,.12);

        border-radius: 11px;

        background:
          rgba(255,255,255,.065);

        color: #fff;

        outline: none;

        font-family: inherit;

        font-size: 13px;

        line-height: 1.45;
      }

      #gunkowii-ai-input::placeholder {
        color:
          rgba(255,255,255,.42);
      }

      #gunkowii-ai-input:focus {
        border-color:
          rgba(212,175,55,.55);
      }

      #gunkowii-ai-send {
        flex:
          0 0 auto;

        width: 44px;
        height: 42px;

        border: 0;

        border-radius: 11px;

        background:
          #d4af37;

        color:
          #14241d;

        font-size: 18px;

        font-weight: 900;

        cursor: pointer;
      }

      #gunkowii-ai-send:disabled {
        opacity: .5;

        cursor:
          not-allowed;
      }

      .gunkowii-ai-note {
        margin-top: 6px;

        padding:
          0 2px;

        font-size: 8px;

        line-height: 1.35;

        color:
          rgba(255,255,255,.36);

        text-align: center;
      }

      /* =====================================================
         LIVE ACTIVITY POPUP
         ===================================================== */

      #gunkowii-live-popup {
        position: fixed;

        z-index: 9990;

        left: 18px;
        bottom: 18px;

        width:
          min(470px, calc(100vw - 36px));

        min-height: 124px;

        display: none;

        align-items: center;

        gap: 14px;

        padding:
          12px 13px;

        box-sizing: border-box;

        border-radius: 18px;

        background:
          linear-gradient(
            145deg,
            rgba(7,49,39,.995),
            rgba(3,28,23,.995)
          );

        border:
          1px solid rgba(212,175,55,.5);

        box-shadow:
          0 22px 58px rgba(0,0,0,.38),
          0 0 0 1px rgba(255,255,255,.03) inset;

        color: #fff;

        cursor: pointer;

        animation:
          gunkowiiPopupIn
          .45s ease;
      }

      #gunkowii-live-popup.hide {
        animation:
          gunkowiiPopupOut
          .35s ease
          forwards;
      }

      @keyframes gunkowiiPopupIn {
        from {
          opacity: 0;

          transform:
            translateX(-24px)
            translateY(12px);
        }

        to {
          opacity: 1;

          transform:
            translateX(0)
            translateY(0);
        }
      }

      @keyframes gunkowiiPopupOut {
        from {
          opacity: 1;

          transform:
            translateX(0);
        }

        to {
          opacity: 0;

          transform:
            translateX(-24px);
        }
      }

      .gunkowii-popup-image {
        width: 98px;
        height: 98px;

        flex:
          0 0 98px;

        border-radius: 14px;

        overflow: hidden;

        background:
          linear-gradient(
            135deg,
            rgba(212,175,55,.28),
            rgba(255,255,255,.05)
          );

        border:
          1px solid rgba(212,175,55,.28);

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
        color:
          #d4af37;

        font-size: 28px;

        font-weight: 900;
      }

      .gunkowii-popup-content {
        min-width: 0;

        flex: 1;

        padding-right: 18px;
      }

      .gunkowii-popup-title {
        font-size: 15px;

        line-height: 1.25;

        font-weight: 900;

        color:
          #f6d76d;

        margin-bottom: 6px;
      }

      .gunkowii-popup-text {
        font-size: 12px;

        line-height: 1.5;

        color:
          rgba(255,255,255,.78);
      }

      .gunkowii-popup-close {
        position: absolute;

        top: 8px;
        right: 9px;

        width: 24px;
        height: 24px;

        border: 0;

        border-radius: 50%;

        background:
          rgba(255,255,255,.08);

        color:
          rgba(255,255,255,.78);

        font-size: 16px;

        line-height: 24px;

        cursor: pointer;
      }

      .gunkowii-popup-close:hover {
        background:
          rgba(255,255,255,.16);
      }

      /* =====================================================
         MOBILE
         ===================================================== */

      @media (max-width: 768px) {

        #gunkowii-ai-launcher {
          width: 68px;
          min-height: 92px;

          border-radius: 16px;
        }

        #gunkowii-ai-launcher img {
          width: 44px;
          height: 44px;
        }

        #gunkowii-ai-panel {
          right: 8px;
          bottom: 84px;

          width:
            calc(100vw - 16px);

          height:
            min(720px, calc(100vh - 94px));

          min-height:
            500px;

          border-radius: 18px;
        }

        .gunkowii-ai-bubble {
          max-width: 93%;

          font-size: 12.5px;
        }

        #gunkowii-live-popup {
          left: 10px;
          bottom: 10px;

          width:
            calc(100vw - 20px);

          min-height: 96px;

          padding: 9px 10px;

          gap: 10px;

          border-radius: 16px;
        }

        .gunkowii-popup-image {
          width: 72px;
          height: 72px;

          flex-basis: 72px;

          border-radius: 11px;
        }

        .gunkowii-popup-title {
          font-size: 12px;
        }

        .gunkowii-popup-text {
          font-size: 10px;
        }
      }

      @media (max-width: 430px) {

        #gunkowii-ai-panel {
          bottom: 78px;

          height:
            calc(100vh - 88px);

          min-height:
            480px;
        }

        .gunkowii-ai-header {
          padding:
            10px;
        }

        .gunkowii-ai-avatar {
          width: 38px;
          height: 38px;
          flex-basis: 38px;
        }

        .gunkowii-ai-title {
          font-size: 13px;
        }

        .gunkowii-ai-action {
          min-width: 31px;
          height: 29px;

          padding:
            0 6px;

          font-size: 10px;
        }

        .gunkowii-popup-image {
          width: 64px;
          height: 64px;

          flex-basis: 64px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     AI ELEMENT REFERENCES
     ========================================================= */

  let aiLauncher = null;
  let aiPanel = null;

  /* =========================================================
     LAUNCHER POSITION
     ========================================================= */

  function getLauncherSide() {
    const saved =
      loadStorage(
        CONFIG.STORAGE.launcher,
        null
      );

    if (
      saved &&
      (
        saved.side === "left" ||
        saved.side === "right"
      )
    ) {
      return saved.side;
    }

    return "right";
  }

  function getLauncherTop() {
    const saved =
      loadStorage(
        CONFIG.STORAGE.launcher,
        null
      );

    if (
      saved &&
      Number.isFinite(saved.top)
    ) {
      return saved.top;
    }

    return Math.max(
      100,
      Math.round(
        window.innerHeight * .46
      )
    );
  }

  function applyLauncherPosition(
    side,
    top,
    instant = false
  ) {
    if (!aiLauncher) return;

    const launcherWidth =
      aiLauncher.offsetWidth || 76;

    const launcherHeight =
      aiLauncher.offsetHeight || 102;

    const safeTop =
      clamp(
        Number(top) || 100,
        12,
        Math.max(
          12,
          window.innerHeight -
            launcherHeight -
            12
        )
      );

    aiLauncher.classList.toggle(
      "gunkowii-ai-snap",
      !instant
    );

    aiLauncher.style.top =
      `${safeTop}px`;

    if (side === "left") {
      aiLauncher.style.left =
        "8px";

      aiLauncher.style.right =
        "auto";
    } else {
      aiLauncher.style.right =
        "8px";

      aiLauncher.style.left =
        "auto";
    }

    saveStorage(
      CONFIG.STORAGE.launcher,
      {
        side,
        top: safeTop
      }
    );
  }

  function migrateOldLauncherPosition() {
    const saved =
      loadStorage(
        CONFIG.STORAGE.launcher,
        null
      );

    if (!saved) return;

    if (
      typeof saved.left === "number" &&
      typeof saved.top === "number"
    ) {
      const side =
        saved.left +
          (
            aiLauncher?.offsetWidth ||
            76
          ) / 2 <
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

  /* =========================================================
     AI LAUNCHER
     ========================================================= */

  function setupAILauncher() {
    const existing =
      $("#gunkowii-ai-launcher");

    if (existing) {
      aiLauncher = existing;

      setupLauncherPointerControls();

      return;
    }

    aiLauncher =
      document.createElement("div");

    aiLauncher.id =
      "gunkowii-ai-launcher";

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

    document.body.appendChild(
      aiLauncher
    );

    const saved =
      loadStorage(
        CONFIG.STORAGE.launcher,
        null
      );

    if (
      saved &&
      (
        saved.side === "left" ||
        saved.side === "right"
      )
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
          Math.round(
            window.innerHeight * .46
          )
        ),
        true
      );
    }

    migrateOldLauncherPosition();

    setupLauncherPointerControls();
  }

  function setupLauncherPointerControls() {
    if (!aiLauncher) return;

    if (
      aiLauncher.dataset.pointerReady ===
      "true"
    ) {
      return;
    }

    aiLauncher.dataset.pointerReady =
      "true";

    let startX = 0;
    let startY = 0;

    let startTop = 0;
    let startLeft = 0;

    let dragging = false;

    let activePointerId = null;

    const DRAG_THRESHOLD = 7;

    aiLauncher.addEventListener(
      "pointerdown",
      event => {
        if (
          event.button !== undefined &&
          event.button !== 0
        ) {
          return;
        }

        activePointerId =
          event.pointerId;

        const rect =
          aiLauncher.getBoundingClientRect();

        startX =
          event.clientX;

        startY =
          event.clientY;

        startTop =
          rect.top;

        startLeft =
          rect.left;

        dragging = false;

        try {
          aiLauncher.setPointerCapture(
            event.pointerId
          );
        } catch {
          // Ignore.
        }
      },
      { passive: true }
    );

    aiLauncher.addEventListener(
      "pointermove",
      event => {
        if (
          activePointerId !==
          event.pointerId
        ) {
          return;
        }

        const dx =
          event.clientX -
          startX;

        const dy =
          event.clientY -
          startY;

        if (
          !dragging &&
          Math.hypot(dx, dy) >
            DRAG_THRESHOLD
        ) {
          dragging = true;

          aiLauncher.classList.add(
            "dragging"
          );
        }

        if (!dragging) return;

        const width =
          aiLauncher.offsetWidth ||
          76;

        const height =
          aiLauncher.offsetHeight ||
          102;

        const newLeft =
          clamp(
            startLeft + dx,
            5,
            Math.max(
              5,
              window.innerWidth -
                width -
                5
            )
          );

        const newTop =
          clamp(
            startTop + dy,
            10,
            Math.max(
              10,
              window.innerHeight -
                height -
                10
            )
          );

        aiLauncher.style.left =
          `${newLeft}px`;

        aiLauncher.style.right =
          "auto";

        aiLauncher.style.top =
          `${newTop}px`;
      },
      { passive: true }
    );

    const finishPointer =
      event => {
        if (
          activePointerId !==
          event.pointerId
        ) {
          return;
        }

        activePointerId = null;

        try {
          aiLauncher.releasePointerCapture(
            event.pointerId
          );
        } catch {
          // Ignore.
        }

        aiLauncher.classList.remove(
          "dragging"
        );

        if (!dragging) {
          openAIPanel();
        } else {
          const rect =
            aiLauncher.getBoundingClientRect();

          const side =
            rect.left +
              rect.width / 2 <
            window.innerWidth / 2
              ? "left"
              : "right";

          applyLauncherPosition(
            side,
            rect.top
          );
        }

        dragging = false;
      };

    aiLauncher.addEventListener(
      "pointerup",
      finishPointer,
      { passive: true }
    );

    aiLauncher.addEventListener(
      "pointercancel",
      finishPointer,
      { passive: true }
    );
  }

  /* =========================================================
     AI PANEL
     ========================================================= */

  function setupAIPanel() {
    const existing =
      $("#gunkowii-ai-panel");

    if (existing) {
      aiPanel = existing;

      setupAIPanelControls();
      setupPanelDragging();

      renderStoredConversation();

      return;
    }

    aiPanel =
      document.createElement("section");

    aiPanel.id =
      "gunkowii-ai-panel";

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
          Shopify • Etsy • SEO • CRO • Marketing • Product Pages • Traffic • Sales
        </div>

      </div>
    `;

    document.body.appendChild(
      aiPanel
    );

    restorePanelPosition();

    setupAIPanelControls();

    setupPanelDragging();

    renderStoredConversation();
  }

  /* =========================================================
     PANEL POSITION
     ========================================================= */

  function restorePanelPosition() {
    if (!aiPanel) return;

    const saved =
      loadStorage(
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
          Math.min(
            470,
            window.innerWidth - 24
          );

        const panelHeight =
          aiPanel.offsetHeight ||
          Math.min(
            760,
            window.innerHeight - 86
          );

        const maxLeft =
          Math.max(
            8,
            window.innerWidth -
              panelWidth -
              8
          );

        const maxTop =
          Math.max(
            8,
            window.innerHeight -
              panelHeight -
              8
          );

        aiPanel.style.left =
          `${clamp(
            saved.left,
            8,
            maxLeft
          )}px`;

        aiPanel.style.top =
          `${clamp(
            saved.top,
            8,
            maxTop
          )}px`;

        aiPanel.style.right =
          "auto";

        aiPanel.style.bottom =
          "auto";
      });
    }
  }

  function savePanelPosition() {
    if (!aiPanel) return;

    const rect =
      aiPanel.getBoundingClientRect();

    saveStorage(
      CONFIG.STORAGE.panel,
      {
        left: rect.left,
        top: rect.top
      }
    );
  }

  /* =========================================================
     PANEL DRAGGING
     ========================================================= */

  function setupPanelDragging() {
    if (!aiPanel) return;

    const header =
      $(".gunkowii-ai-header", aiPanel);

    if (!header) return;

    if (
      header.dataset.dragReady ===
      "true"
    ) {
      return;
    }

    header.dataset.dragReady =
      "true";

    let dragging = false;
    let pointerId = null;

    let startX = 0;
    let startY = 0;

    let startLeft = 0;
    let startTop = 0;

    header.addEventListener(
      "pointerdown",
      event => {
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

        pointerId =
          event.pointerId;

        startX =
          event.clientX;

        startY =
          event.clientY;

        startLeft =
          rect.left;

        startTop =
          rect.top;

        header.classList.add(
          "dragging"
        );

        try {
          header.setPointerCapture(
            event.pointerId
          );
        } catch {
          // Ignore.
        }

        event.preventDefault();
      }
    );

    header.addEventListener(
      "pointermove",
      event => {
        if (
          !dragging ||
          event.pointerId !==
            pointerId
        ) {
          return;
        }

        const panelWidth =
          aiPanel.offsetWidth;

        const panelHeight =
          aiPanel.offsetHeight;

        const left =
          clamp(
            startLeft +
              (
                event.clientX -
                startX
              ),
            8,
            Math.max(
              8,
              window.innerWidth -
                panelWidth -
                8
            )
          );

        const top =
          clamp(
            startTop +
              (
                event.clientY -
                startY
              ),
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

        aiPanel.style.right =
          "auto";

        aiPanel.style.bottom =
          "auto";
      }
    );

    const finishDrag =
      event => {
        if (
          !dragging ||
          event.pointerId !==
            pointerId
        ) {
          return;
        }

        dragging = false;

        pointerId = null;

        header.classList.remove(
          "dragging"
        );

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

  /* =========================================================
     AI PANEL CONTROLS
     ========================================================= */

  function setupAIPanelControls() {
    if (!aiPanel) return;

    const input =
      $("#gunkowii-ai-input", aiPanel);

    const sendButton =
      $("#gunkowii-ai-send", aiPanel);

    const newChatButton =
      $("#gunkowii-ai-new-chat", aiPanel);

    const closeButton =
      $("#gunkowii-ai-close", aiPanel);

    if (
      sendButton &&
      sendButton.dataset.ready !==
        "true"
    ) {
      sendButton.dataset.ready =
        "true";

      sendButton.addEventListener(
        "click",
        () => sendAIMessage()
      );
    }

    if (
      input &&
      input.dataset.ready !==
        "true"
    ) {
      input.dataset.ready =
        "true";

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
          input.style.height =
            "auto";

          input.style.height =
            `${Math.min(
              input.scrollHeight,
              120
            )}px`;
        }
      );
    }

    if (
      newChatButton &&
      newChatButton.dataset.ready !==
        "true"
    ) {
      newChatButton.dataset.ready =
        "true";

      [
        "pointerdown",
        "mousedown",
        "touchstart"
      ].forEach(
        eventName => {
          newChatButton.addEventListener(
            eventName,
            event => {
              event.stopPropagation();
            },
            { passive: true }
          );
        }
      );

      newChatButton.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          startNewAIChat();
        }
      );
    }

    if (
      closeButton &&
      closeButton.dataset.ready !==
        "true"
    ) {
      closeButton.dataset.ready =
        "true";

      [
        "pointerdown",
        "mousedown",
        "touchstart"
      ].forEach(
        eventName => {
          closeButton.addEventListener(
            eventName,
            event => {
              event.stopPropagation();
            },
            { passive: true }
          );
        }
      );

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
     AI OPEN / CLOSE
     ========================================================= */

  function openAIPanel() {
    if (!aiPanel) {
      setupAIPanel();
    }

    if (!aiPanel) return;

    aiPanel.classList.add(
      "open"
    );

    /*
      GUARANTEED GREETING:
      If this is a fresh conversation and there are
      no rendered messages, show the greeting immediately.
    */

    const messages =
      $("#gunkowii-ai-messages", aiPanel);

    if (
      aiConversation.length === 0 &&
      messages &&
      messages.children.length === 0
    ) {
      showInitialGreeting();
    }

    requestAnimationFrame(() => {
      const input =
        $("#gunkowii-ai-input", aiPanel);

      if (input) {
        input.focus();
      }

      scrollAIMessagesToBottom();
    });
  }

  function closeAIPanel() {
    if (!aiPanel) return;

    aiPanel.classList.remove(
      "open"
    );
  }

  /* =========================================================
     NEW AI CHAT
     ========================================================= */

  function startNewAIChat() {
    clearConversation();

    removeStorage(
      CONFIG.STORAGE.handoff
    );

    const messages =
      $("#gunkowii-ai-messages", aiPanel);

    const handoff =
      $("#gunkowii-ai-handoff", aiPanel);

    const input =
      $("#gunkowii-ai-input", aiPanel);

    if (messages) {
      messages.innerHTML = "";
    }

    if (handoff) {
      handoff.innerHTML = "";

      handoff.classList.remove(
        "show"
      );
    }

    showInitialGreeting();

    if (input) {
      input.value = "";

      input.style.height =
        "auto";

      requestAnimationFrame(
        () => {
          input.focus();
        }
      );
    }

    scrollAIMessagesToBottom();
  }

  /* =========================================================
     GREETING
     ========================================================= */

  function showInitialGreeting() {
    if (!aiPanel) return;

    const messages =
      $("#gunkowii-ai-messages", aiPanel);

    if (!messages) return;

    if (
      aiConversation.length > 0
    ) {
      renderStoredConversation();

      return;
    }

    const greeting =
      "Hi 👋 I'm GUNKOWII AI. What are you currently trying to improve — more traffic, more sales, or both?";

    renderMessage(
      "assistant",
      greeting
    );
  }

  /* =========================================================
     MESSAGE RENDERING
     ========================================================= */

  function renderMessage(
    role,
    content
  ) {
    const messages =
      $("#gunkowii-ai-messages", aiPanel);

    if (!messages) return;

    const wrapper =
      document.createElement("div");

    wrapper.className =
      `gunkowii-ai-message ${role}`;

    const bubble =
      document.createElement("div");

    bubble.className =
      "gunkowii-ai-bubble";

    if (
      role === "assistant"
    ) {
      bubble.innerHTML =
        formatAIResponse(
          content
        );
    } else {
      bubble.textContent =
        String(content || "");
    }

    wrapper.appendChild(
      bubble
    );

    messages.appendChild(
      wrapper
    );

    scrollAIMessagesToBottom();
  }

  function renderStoredConversation() {
    if (!aiPanel) return;

    const messages =
      $("#gunkowii-ai-messages", aiPanel);

    if (!messages) return;

    messages.innerHTML = "";

    if (
      aiConversation.length === 0
    ) {
      showInitialGreeting();

      return;
    }

    aiConversation.forEach(
      item => {
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
      }
    );

    /*
      If an existing conversation exists,
      show the continuation CTA.
    */

    if (
      aiConversation.some(
        item =>
          item &&
          item.role === "user"
      )
    ) {
      const handoff =
        getHandoff();

      if (handoff) {
        showHandoffNotice(
          handoff
        );
      } else {
        showContinuationCTA();
      }
    }

    scrollAIMessagesToBottom();
  }

  function scrollAIMessagesToBottom() {
    const messages =
      $("#gunkowii-ai-messages", aiPanel);

    if (!messages) return;

    requestAnimationFrame(() => {
      messages.scrollTop =
        messages.scrollHeight;
    });
  }

  function setAITyping(show) {
    const typing =
      $("#gunkowii-ai-typing", aiPanel);

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

    const input =
      $("#gunkowii-ai-input", aiPanel);

    const sendButton =
      $("#gunkowii-ai-send", aiPanel);

    if (!input) return;

    const question =
      input.value.trim();

    if (!question) return;

    aiBusy = true;

    if (sendButton) {
      sendButton.disabled =
        true;
    }

    input.value = "";

    input.style.height =
      "auto";

    aiConversation.push({
      role: "user",
      content: question,
      timestamp:
        new Date().toISOString()
    });

    saveConversation();

    renderMessage(
      "user",
      question
    );

    /*
      Make the single continuation CTA available
      as soon as the buyer has started communicating.
    */

    showContinuationCTA();

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
              message:
                question,

              conversation:
                aiConversation.map(
                  item => ({
                    role:
                      item.role,

                    content:
                      item.content
                  })
                ),

              page:
                getPageName(),

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
        timestamp:
          new Date().toISOString()
      });

      saveConversation();

      setAITyping(false);

      renderMessage(
        "assistant",
        answer
      );

      /*
        Keep the one clear continuation CTA.
      */

      showContinuationCTA();

      /*
        If the Worker provides structured handoff data,
        save it silently.
      */

      if (
        data.handoff ||
        data.readyForHandoff === true ||
        data.consultationReady === true
      ) {
        const handoff =
          createHandoffData(
            data
          );

        saveHandoff(
          handoff
        );

        showHandoffNotice(
          handoff
        );
      }
    } catch (error) {
      console.error(
        "GUNKOWII AI error:",
        error
      );

      setAITyping(false);

      renderMessage(
        "assistant",
        "I couldn't connect to the consultation service right now. Please try again in a moment."
      );

      /*
        Keep the continuation path available
        even if the Worker temporarily fails.
      */

      showContinuationCTA();
    } finally {
      aiBusy = false;

      if (sendButton) {
        sendButton.disabled =
          false;
      }

      requestAnimationFrame(
        () => {
          input.focus();
        }
      );
    }
  }

  /* =========================================================
     HANDOFF DATA
     ========================================================= */

  function normalizeHandoffObject(
    value
  ) {
    if (!value) return null;

    if (
      typeof value === "object"
    ) {
      return value;
    }

    const parsed =
      safeJSONParse(
        value,
        null
      );

    return parsed || value;
  }

  function getSummaryValue(
    summary,
    ...keys
  ) {
    if (
      !summary ||
      typeof summary !== "object"
    ) {
      return "";
    }

    for (const key of keys) {
      if (
        summary[key] !==
          undefined &&
        summary[key] !==
          null &&
        String(
          summary[key]
        ).trim()
      ) {
        return String(
          summary[key]
        ).trim();
      }
    }

    return "";
  }

  function createHandoffData(
    data = {}
  ) {
    const rawSummary =
      normalizeHandoffObject(
        data.leadSummary ||
        data.summary ||
        data.handoff?.leadSummary ||
        data.handoff?.summary
      );

    const summary =
      rawSummary &&
      typeof rawSummary ===
        "object"
        ? rawSummary
        : {};

    const rawStoreAnalysis =
      normalizeHandoffObject(
        data.storeAnalysis ||
        data.handoff?.storeAnalysis
      );

    const storeAnalysis =
      typeof rawStoreAnalysis ===
        "object"
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
      "Continue with GUNKOWII SABA.";

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

      conversation:
        aiConversation.map(
          item => ({
            role:
              item.role,

            content:
              item.content,

            timestamp:
              item.timestamp
          })
        )
    };
  }

  function saveHandoff(
    handoff
  ) {
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
     SINGLE CONTINUATION CTA
     ========================================================= */

  function showContinuationCTA() {
    if (!aiPanel) return;

    const box =
      $("#gunkowii-ai-handoff", aiPanel);

    if (!box) return;

    box.innerHTML = `
      <div class="gunkowii-ai-handoff-title">
        Continue with GUNKOWII
      </div>

      <div class="gunkowii-ai-handoff-text">
        When you're ready, continue to the project form and we'll take the next step from there.
      </div>

      <button
        type="button"
        class="gunkowii-ai-handoff-button"
        id="gunkowii-ai-handoff-button"
      >
        Continue with GUNKOWII →
      </button>
    `;

    box.classList.add(
      "show"
    );

    const button =
      $("#gunkowii-ai-handoff-button", box);

    if (
      button &&
      button.dataset.ready !==
        "true"
    ) {
      button.dataset.ready =
        "true";

      button.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          continueWithGunkowii();
        }
      );
    }

    scrollAIMessagesToBottom();
  }

  function showHandoffNotice(
    handoff
  ) {
    if (!handoff) {
      showContinuationCTA();
      return;
    }

    const box =
      $("#gunkowii-ai-handoff", aiPanel);

    if (!box) return;

    box.innerHTML = `
      <div class="gunkowii-ai-handoff-title">
        Ready to continue
      </div>

      <div class="gunkowii-ai-handoff-text">
        I've got the context from this consultation. Continue with GUNKOWII and we'll take the next step together.
      </div>

      <button
        type="button"
        class="gunkowii-ai-handoff-button"
        id="gunkowii-ai-handoff-button"
      >
        Continue with GUNKOWII →
      </button>
    `;

    box.classList.add(
      "show"
    );

    const button =
      $("#gunkowii-ai-handoff-button", box);

    if (
      button &&
      button.dataset.ready !==
        "true"
    ) {
      button.dataset.ready =
        "true";

      button.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          continueWithGunkowii();
        }
      );
    }

    scrollAIMessagesToBottom();
  }

  function continueWithGunkowii() {
    let handoff =
      getHandoff();

    /*
      If the Worker has not supplied structured
      handoff information yet, create it locally
      from the conversation.
    */

    if (!handoff) {
      handoff =
        createHandoffData({});

      saveHandoff(
        handoff
      );
    }

    /*
      Save the latest conversation again before leaving.
    */

    saveConversation();

    /*
      Make sure the complete current conversation
      is included in the handoff.
    */

    handoff.conversation =
      aiConversation.map(
        item => ({
          role:
            item.role,

          content:
            item.content,

          timestamp:
            item.timestamp
        })
      );

    handoff.firstBuyerMessage =
      getFirstBuyerMessage();

    handoff.sourcePage =
      window.location.href;

    saveHandoff(
      handoff
    );

    window.location.href =
      CONFIG.CONTACT_URL;
  }

  /* =========================================================
     HUMAN-READABLE AI SUMMARY
     ========================================================= */

  function humanLabel(
    value
  ) {
    return String(value || "")
      .replace(
        /([a-z])([A-Z])/g,
        "$1 $2"
      )
      .replace(
        /[_-]+/g,
        " "
      )
      .replace(
        /\b\w/g,
        char =>
          char.toUpperCase()
      );
  }

  function formatStoreAnalysisForEmail(
    analysis
  ) {
    if (!analysis) {
      return "Not available yet.";
    }

    if (
      typeof analysis ===
      "string"
    ) {
      return (
        analysis.trim() ||
        "Not available yet."
      );
    }

    if (
      typeof analysis !==
      "object"
    ) {
      return String(
        analysis
      );
    }

    const lines = [];

    Object.entries(
      analysis
    ).forEach(
      ([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          String(value).trim() ===
            ""
        ) {
          return;
        }

        if (
          typeof value ===
          "object"
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

  function buildHumanReadableHandoffSummary(
    handoff
  ) {
    if (!handoff) return "";

    const lines = [
      "AI CONSULTATION",
      "================",
      `Platform: ${
        handoff.platform ||
        "Not provided"
      }`,
      `Store / Website: ${
        handoff.store ||
        "Not provided"
      }`,
      `Main problem: ${
        handoff.mainProblem ||
        "Not provided"
      }`
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
        "Continue with GUNKOWII SABA."
    );

    return lines.join(
      "\n"
    );
  }

  /* =========================================================
     CONTACT FORM HELPERS
     ========================================================= */

  function findFormField(
    form,
    names
  ) {
    if (!form) return null;

    for (const name of names) {
      const field =
        form.querySelector(
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
      findFormField(
        form,
        names
      );

    return field
      ? String(
          field.value || ""
        ).trim()
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
      findFormField(
        form,
        names
      );

    if (!field) return;

    if (
      overwrite ||
      !String(
        field.value || ""
      ).trim()
    ) {
      field.value =
        cleanValue;

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
        document.createElement(
          "input"
        );

      field.type =
        "hidden";

      field.name =
        name;

      form.appendChild(
        field
      );
    }

    field.value =
      String(value ?? "");

    return field;
  }

  function removeOldAIFields(
    form
  ) {
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
      "AI Recommended Service",
      "AI Consultation Summary",
      "AI Handoff Status",
      "AI Platform",
      "AI Store / Website",
      "AI Recommended Service"
    ];

    oldNames.forEach(
      name => {
        $$(
          `[name="${CSS.escape(name)}"]`,
          form
        ).forEach(
          field => {
            if (
              field.type ===
              "hidden"
            ) {
              field.remove();
            }
          }
        );
      }
    );
  }

  /* =========================================================
     AUTO-FILL CONTACT FORM
     ========================================================= */

  function prepareContactFormFromAI(
    handoff
  ) {
    if (!handoff) return;

    const form =
      getContactForm();

    if (!form) return;

    /*
      AI information only fills empty fields.
    */

    setFieldValue(
      form,
      [
        "name",
        "full_name"
      ],
      handoff.name,
      false
    );

    setFieldValue(
      form,
      ["email"],
      handoff.email,
      false
    );

    setFieldValue(
      form,
      [
        "phone",
        "telephone",
        "phone_number"
      ],
      handoff.phone,
      false
    );

    setFieldValue(
      form,
      [
        "store",
        "website",
        "url"
      ],
      handoff.store,
      false
    );

    setFieldValue(
      form,
      ["service"],
      handoff.recommendedService,
      false
    );

    const messageField =
      findFormField(
        form,
        [
          "message",
          "project",
          "details"
        ]
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

    populateHiddenAIFields(
      form,
      handoff
    );
  }

  function populateHiddenAIFields(
    form,
    handoff
  ) {
    if (!form || !handoff) {
      return;
    }

    removeOldAIFields(
      form
    );

    const summary =
      buildHumanReadableHandoffSummary(
        handoff
      );

    ensureHiddenField(
      form,
      "_subject",
      "GUNKOWII SABA — New AI Consultation Lead"
    );

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
      handoff.platform ||
        "Not provided"
    );

    ensureHiddenField(
      form,
      "AI Store / Website",
      handoff.store ||
        "Not provided"
    );

    ensureHiddenField(
      form,
      "AI Recommended Service",
      handoff.recommendedService ||
        "To be determined"
    );
  }

  /* =========================================================
     CONTACT FORM DETECTION
     ========================================================= */

  function getContactForm() {
    const forms =
      $$("form");

    if (!forms.length) {
      return null;
    }

    const formspreeForm =
      forms.find(
        form =>
          String(
            form.getAttribute(
              "action"
            ) || ""
          ).includes(
            "formspree.io"
          )
      );

    if (formspreeForm) {
      return formspreeForm;
    }

    return (
      forms.find(
        form =>
          findFormField(
            form,
            ["email"]
          )
      ) || null
    );
  }

  /* =========================================================
     CONTACT HANDOFF
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
    if (
      form.dataset.gunkowiiEmailReady ===
      "true"
    ) {
      return;
    }

    const action =
      String(
        form.getAttribute(
          "action"
        ) || ""
      );

    if (
      !action.includes(
        "formspree.io"
      )
    ) {
      return;
    }

    form.dataset.gunkowiiEmailReady =
      "true";

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const submitButton =
          form.querySelector(
            'button[type="submit"], input[type="submit"]'
          );

        if (submitButton) {
          submitButton.disabled =
            true;
        }

        const handoff =
          getHandoff();

        if (handoff) {
          populateHiddenAIFields(
            form,
            handoff
          );
        }

        try {
          const response =
            await fetch(
              action,
              {
                method: "POST",

                body:
                  new FormData(
                    form
                  ),

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

    setTimeout(
      () => {
        resetContactFormForNextCustomer(
          form
        );
      },
      700
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
        document.createElement(
          "div"
        );

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

      form.appendChild(
        status
      );
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
    const fields =
      $$(
        "input:not([type='hidden']), textarea, select",
        form
      );

    fields.forEach(
      field => {
        if (
          field.type ===
            "checkbox" ||
          field.type ===
            "radio"
        ) {
          field.checked =
            false;
        } else {
          field.value =
            "";
        }
      }
    );

    removeOldAIFields(
      form
    );

    [
      "_subject",
      "AI Consultation Summary",
      "AI Handoff Status",
      "AI Platform",
      "AI Store / Website",
      "AI Recommended Service"
    ].forEach(
      name => {
        $$(
          `[name="${CSS.escape(name)}"]`,
          form
        ).forEach(
          field => {
            if (
              field.type ===
              "hidden"
            ) {
              field.remove();
            }
          }
        );
      }
    );

    removeStorage(
      CONFIG.STORAGE.handoff
    );

    const submitButton =
      form.querySelector(
        'button[type="submit"], input[type="submit"]'
      );

    if (submitButton) {
      submitButton.disabled =
        false;
    }
  }

  /* =========================================================
     COLLECT ALL BUYER FORM INFORMATION
     ========================================================= */

  function collectBuyerFields(
    form
  ) {
    const result = {};

    if (!form) {
      return result;
    }

    const fields =
      $$(
        "input, textarea, select",
        form
      );

    fields.forEach(
      field => {
        const name =
          String(
            field.name || ""
          ).trim();

        if (!name) return;

        if (
          field.type ===
            "hidden" ||
          field.type ===
            "submit" ||
          field.type ===
            "button" ||
          field.type ===
            "reset" ||
          field.type ===
            "file"
        ) {
          return;
        }

        if (
          field.type ===
            "checkbox" ||
          field.type ===
            "radio"
        ) {
          if (!field.checked) {
            return;
          }
        }

        let value =
          String(
            field.value || ""
          ).trim();

        if (!value) return;

        /*
          For selects, prefer the visible option label.
        */

        if (
          field.tagName
            .toLowerCase() ===
          "select"
        ) {
          const option =
            field.options[
              field.selectedIndex
            ];

          if (option) {
            value =
              String(
                option.textContent ||
                  option.value ||
                  ""
              ).trim();
          }
        }

        if (
          result[name]
        ) {
          result[name] +=
            `, ${value}`;
        } else {
          result[name] =
            value;
        }
      }
    );

    return result;
  }

  function buildBuyerSummary(
    buyerFields
  ) {
    const lines = [];

    Object.entries(
      buyerFields || {}
    ).forEach(
      ([key, value]) => {
        if (
          value === undefined ||
          value === null ||
          !String(value).trim()
        ) {
          return;
        }

        lines.push(
          `${humanLabel(key)}: ${value}`
        );
      }
    );

    return lines.length
      ? lines.join("\n")
      : "No additional buyer information provided.";
  }

  /* =========================================================
     WHATSAPP HANDOFF
     ========================================================= */

  function setupWhatsAppHandoff(
    form
  ) {
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

    for (
      const field of
      requiredFields
    ) {
      if (
        field.type ===
          "checkbox" ||
        field.type ===
          "radio"
      ) {
        if (!field.checked) {
          valid = false;

          field.focus();

          break;
        }
      } else if (
        !String(
          field.value || ""
        ).trim()
      ) {
        valid = false;

        field.focus();

        break;
      }
    }

    return valid;
  }

  async function handleWhatsAppHandoff(
    form,
    button
  ) {
    if (
      !validateContactForm(
        form
      )
    ) {
      showFormStatus(
        form,
        "Please complete the required fields before continuing."
      );

      return;
    }

    if (button) {
      button.disabled =
        true;
    }

    const handoff =
      getHandoff();

    /*
      Collect every visible buyer field.
    */

    const buyerFields =
      collectBuyerFields(
        form
      );

    const buyer = {
      ...buyerFields,

      name:
        buyerFields.name ||
        buyerFields.full_name ||
        "",

      email:
        buyerFields.email ||
        "",

      store:
        buyerFields.store ||
        buyerFields.website ||
        buyerFields.url ||
        "",

      service:
        buyerFields.service ||
        "",

      project:
        buyerFields.message ||
        buyerFields.project ||
        buyerFields.details ||
        ""
    };

    const message =
      buildWhatsAppMessage(
        buyer,
        buyerFields,
        handoff
      );

    /*
      WAIT for clipboard operation before clearing
      the form. This is important on mobile browsers.
    */

    const copied =
      await copyToClipboard(
        message
      );

    window.open(
      CONFIG.WHATSAPP_URL,
      "_blank",
      "noopener,noreferrer"
    );

    resetContactFormForNextCustomer(
      form
    );

    if (copied) {
      showFormStatus(
        form,
        "Your information is ready in WhatsApp. Paste the prepared message into the chat and send it."
      );
    } else {
      showFormStatus(
        form,
        "WhatsApp is open. If the message was not copied automatically, please return and try again."
      );
    }
  }

  /* =========================================================
     WHATSAPP MESSAGE
     ========================================================= */

  function buildWhatsAppMessage(
    buyer,
    buyerFields,
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
      buildBuyerSummary(
        buyerFields
      )
    );

    if (
      buyer.name ||
      buyer.email ||
      buyer.store ||
      buyer.service ||
      buyer.project
    ) {
      lines.push(
        "",
        "KEY FORM DETAILS",
        "------------------------------",
        `Name: ${
          buyer.name ||
          "Not provided"
        }`,
        `Email: ${
          buyer.email ||
          "Not provided"
        }`,
        `Store / Website: ${
          buyer.store ||
          "Not provided"
        }`,
        `Service: ${
          buyer.service ||
          "Not provided"
        }`,
        "",
        "Project Details:",
        buyer.project ||
          "Not provided"
      );
    }

    if (handoff) {
      lines.push(
        "",
        "==============================",
        "GUNKOWII AI CONSULTATION",
        "=============================="
      );

      lines.push(
        `Platform: ${
          handoff.platform ||
          "Not provided"
        }`,
        `Store / Website identified by AI: ${
          handoff.store ||
          "Not provided"
        }`,
        `Main problem: ${
          handoff.mainProblem ||
          "Not provided"
        }`
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
          "Continue with GUNKOWII SABA."
      );

      /*
        COMPLETE AI CONVERSATION.
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
                item.content ||
                  ""
              ).trim()
            );
          }
        );
      }
    } else if (
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
              item.content ||
                ""
            ).trim()
          );
        }
      );
    }

    lines.push(
      "",
      "==============================",
      "END OF CONSULTATION HANDOFF",
      "=============================="
    );

    return lines.join(
      "\n"
    );
  }

  function formatStoreAnalysisForWhatsApp(
    analysis
  ) {
    if (!analysis) {
      return "Not available yet.";
    }

    if (
      typeof analysis ===
      "string"
    ) {
      return (
        analysis.trim() ||
        "Not available yet."
      );
    }

    if (
      typeof analysis !==
      "object"
    ) {
      return String(
        analysis
      );
    }

    const lines = [];

    Object.entries(
      analysis
    ).forEach(
      ([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          String(value).trim() ===
            ""
        ) {
          return;
        }

        if (
          typeof value ===
          "object"
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
      // Fall through.
    }

    try {
      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        text;

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      textarea.style.pointerEvents =
        "none";

      document.body.appendChild(
        textarea
      );

      textarea.focus();

      textarea.select();

      const successful =
        document.execCommand(
          "copy"
        );

      textarea.remove();

      return successful;
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

  let liveActivityIndex =
    0;

  let livePopupTimer =
    null;

  let livePopupRotateTimer =
    null;

  let livePopupHideTimer =
    null;

  let livePopupCurrentActivity =
    null;

  function setupLiveActivityPopup() {
    const existing =
      $("#gunkowii-live-popup");

    if (existing) {
      livePopup =
        existing;

      setupLivePopupClick();

      return;
    }

    livePopup =
      document.createElement(
        "div"
      );

    livePopup.id =
      "gunkowii-live-popup";

    document.body.appendChild(
      livePopup
    );

    setupLivePopupClick();

    livePopupTimer =
      setTimeout(
        () => {
          showLiveActivity();
        },
        4000
      );

    livePopupRotateTimer =
      setInterval(
        () => {
          if (
            !livePopup
          ) {
            return;
          }

          if (
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

  function setupLivePopupClick() {
    if (!livePopup) return;

    if (
      livePopup.dataset.clickReady ===
      "true"
    ) {
      return;
    }

    livePopup.dataset.clickReady =
      "true";

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

        if (
          livePopupCurrentActivity &&
          livePopupCurrentActivity.link
        ) {
          window.location.href =
            livePopupCurrentActivity.link;
        }
      }
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

    livePopupCurrentActivity =
      activity;

    const imageHTML =
      activity.image
        ? `
          <img
            src="${escapeHTML(
              activity.image
            )}"
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
          ${escapeHTML(
            activity.title
          )}
        </div>

        <div class="gunkowii-popup-text">
          ${escapeHTML(
            activity.text
          )}
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
        event => {
          event.preventDefault();

          event.stopPropagation();

          hideLiveActivity(
            false
          );
        }
      );
    }

    clearTimeout(
      livePopupHideTimer
    );

    livePopupHideTimer =
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
    rotating = false
  ) {
    if (!livePopup) return;

    clearTimeout(
      livePopupHideTimer
    );

    livePopup.classList.add(
      "hide"
    );

    setTimeout(
      () => {
        if (
          livePopup
        ) {
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
     RESIZE
     ========================================================= */

  let resizeTimer =
    null;

  window.addEventListener(
    "resize",
    () => {
      clearTimeout(
        resizeTimer
      );

      resizeTimer =
        setTimeout(
          () => {
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
                  : Math.round(
                      window.innerHeight *
                        .46
                    );

              applyLauncherPosition(
                side,
                top,
                true
              );
            }

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
     CLEANUP
     ========================================================= */

  window.addEventListener(
    "beforeunload",
    () => {
      clearTimeout(
        livePopupTimer
      );

      clearTimeout(
        livePopupHideTimer
      );

      clearInterval(
        livePopupRotateTimer
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
      Contact handoff remains completely silent.
      No AI transcript or summary is displayed to the buyer.
    */

    setupContactHandoff();

    setupLiveActivityPopup();

    /*
      Fresh greeting is intentionally rendered only
      when the AI panel opens.
    */
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

})();