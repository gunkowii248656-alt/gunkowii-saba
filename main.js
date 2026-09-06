/* =========================================================
   GUNKOWII SABA — MAIN JAVASCRIPT
   Portfolio + GUNKOWII AI + Live Activity + AI Handoff
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURATION
     ========================================================= */

  const AI_WORKER_URL =
    "https://gunkowii-ai.gunkowii248656.workers.dev/";

  const WHATSAPP_URL =
    "https://wa.me/message/V26H2754ROXUB1";

  const CONTACT_URL =
    "contact.html";

  const AI_MEMORY_KEY =
    "gunkowii_ai_conversation";

  const AI_HANDOFF_KEY =
    "gunkowii_ai_handoff";

  const AI_HANDOFF_MAX_AGE =
    24 * 60 * 60 * 1000;

  const AI_AVATAR =
    "Screenshot_2026-09-04-12-55-24-480_com.openai.chatgpt-edit.jpg";


  /* =========================================================
     GLOBAL AI STATE
     ========================================================= */

  let aiConversation = [];
  let latestLeadSummary = null;
  let latestStoreAnalysis = null;
  let latestHandoff = null;

  let aiPanel = null;
  let aiLauncher = null;
  let aiMessages = null;
  let aiInput = null;
  let aiSendButton = null;

  let aiBusy = false;


  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function escapeHTML(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function safeJSONParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }


  function normalize(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }


  function getPageName() {
    const path = window.location.pathname;

    if (!path || path === "/") {
      return "index.html";
    }

    return path.split("/").pop() || "index.html";
  }


  function isValidHttpUrl(value) {
    if (!value) return false;

    try {
      const url = new URL(value);

      return (
        url.protocol === "http:" ||
        url.protocol === "https:"
      );
    } catch (error) {
      return false;
    }
  }


  /* =========================================================
     AI CONVERSATION MEMORY
     ========================================================= */

  function loadAIConversation() {
    try {
      const saved =
        localStorage.getItem(AI_MEMORY_KEY);

      if (!saved) {
        aiConversation = [];
        return;
      }

      const parsed =
        safeJSONParse(saved, []);

      if (Array.isArray(parsed)) {
        aiConversation = parsed;
      } else {
        aiConversation = [];
      }
    } catch (error) {
      console.warn(
        "Unable to load GUNKOWII AI conversation.",
        error
      );

      aiConversation = [];
    }
  }


  function saveAIConversation() {
    try {
      localStorage.setItem(
        AI_MEMORY_KEY,
        JSON.stringify(aiConversation)
      );
    } catch (error) {
      console.warn(
        "Unable to save GUNKOWII AI conversation.",
        error
      );
    }
  }


  function clearAIConversation() {
    aiConversation = [];

    try {
      localStorage.removeItem(AI_MEMORY_KEY);
    } catch (error) {
      console.warn(
        "Unable to clear GUNKOWII AI conversation.",
        error
      );
    }

    if (aiMessages) {
      aiMessages.innerHTML = "";

      showInitialGreeting();
    }
  }


  /* =========================================================
     AI HANDOFF STORAGE
     ========================================================= */

  function saveHandoffData(data) {
    if (!data) return;

    latestLeadSummary =
      data.leadSummary ||
      latestLeadSummary;

    latestStoreAnalysis =
      data.storeAnalysis ||
      latestStoreAnalysis;

    latestHandoff =
      data.handoff ||
      latestHandoff;

    try {
      const handoffData = {
        leadSummary:
          normalize(latestLeadSummary),

        storeAnalysis:
          normalize(latestStoreAnalysis),

        handoff:
          latestHandoff,

        conversation:
          Array.isArray(data.conversation)
            ? data.conversation
            : aiConversation,

        updatedAt:
          new Date().toISOString()
      };

      localStorage.setItem(
        AI_HANDOFF_KEY,
        JSON.stringify(handoffData)
      );
    } catch (error) {
      console.warn(
        "Unable to save GUNKOWII AI handoff.",
        error
      );
    }
  }


  function loadHandoffData() {
    try {
      const saved =
        localStorage.getItem(AI_HANDOFF_KEY);

      if (!saved) {
        return null;
      }

      const parsed =
        safeJSONParse(saved, null);

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        return null;
      }

      if (parsed.updatedAt) {
        const updated =
          new Date(parsed.updatedAt).getTime();

        if (
          Number.isFinite(updated) &&
          Date.now() - updated >
            AI_HANDOFF_MAX_AGE
        ) {
          localStorage.removeItem(
            AI_HANDOFF_KEY
          );

          return null;
        }
      }

      latestLeadSummary =
        parsed.leadSummary || null;

      latestStoreAnalysis =
        parsed.storeAnalysis || null;

      latestHandoff =
        parsed.handoff || null;

      return parsed;
    } catch (error) {
      console.warn(
        "Unable to load GUNKOWII AI handoff.",
        error
      );

      return null;
    }
  }


  function clearHandoffData() {
    latestLeadSummary = null;
    latestStoreAnalysis = null;
    latestHandoff = null;

    try {
      localStorage.removeItem(
        AI_HANDOFF_KEY
      );
    } catch (error) {
      console.warn(
        "Unable to clear GUNKOWII AI handoff.",
        error
      );
    }
  }


  /* =========================================================
     HANDOFF URL
     ========================================================= */

  function buildHandoffURL() {
    return `${CONTACT_URL}?ai_handoff=1`;
  }


  /* =========================================================
     AI RESPONSE FORMATTER
     ========================================================= */

  function formatAIResponse(text) {
    if (!text) {
      return "";
    }

    let output =
      escapeHTML(String(text));

    /*
     * Markdown links
     */
    output = output.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
      (match, label, url) => {
        return `
          <a
            href="${url}"
            target="_blank"
            rel="noopener noreferrer"
          >${label}</a>
        `;
      }
    );

    /*
     * Bold
     */
    output = output.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

    /*
     * Headings
     */
    output = output.replace(
      /^### (.*)$/gm,
      '<div class="gunkowii-ai-heading small">$1</div>'
    );

    output = output.replace(
      /^## (.*)$/gm,
      '<div class="gunkowii-ai-heading">$1</div>'
    );

    output = output.replace(
      /^# (.*)$/gm,
      '<div class="gunkowii-ai-heading large">$1</div>'
    );

    /*
     * Numbered lists
     */
    output = output.replace(
      /^\s*(\d+)\.\s+(.*)$/gm,
      '<div class="gunkowii-ai-list-item"><span>$1.</span><div>$2</div></div>'
    );

    /*
     * Bullets
     */
    output = output.replace(
      /^\s*[-•*]\s+(.*)$/gm,
      '<div class="gunkowii-ai-bullet"><span>•</span><div>$1</div></div>'
    );

    /*
     * Bare URLs
     */
    output = output.replace(
      /(^|[\s>])(https?:\/\/[^\s<]+)/gi,
      (match, prefix, url) => {
        if (
          output.includes(
            `href="${url}"`
          )
        ) {
          return match;
        }

        return `
          ${prefix}
          <a
            href="${url}"
            target="_blank"
            rel="noopener noreferrer"
          >${url}</a>
        `;
      }
    );

    /*
     * Line breaks
     */
    output = output.replace(
      /\n/g,
      "<br>"
    );

    /*
     * Remove excessive breaks
     */
    output = output.replace(
      /(<br>\s*){2,}/g,
      "<br>"
    );

    output = output.replace(
      /(<div class="gunkowii-ai-heading[^>]*>.*?<\/div>)<br>/g,
      "$1"
    );

    return output;
  }


  /* =========================================================
     ADD AI MESSAGE
     ========================================================= */

  function addAIMessage(
    text,
    type = "ai"
  ) {
    if (!aiMessages) {
      return;
    }

    const message =
      document.createElement("div");

    message.className =
      `gunkowii-ai-message ${type}`;

    if (type === "ai") {
      message.innerHTML = `
        <div class="gunkowii-ai-message-avatar">
          <img
            src="${AI_AVATAR}"
            alt="GUNKOWII AI"
          >
        </div>

        <div class="gunkowii-ai-message-body">
          ${formatAIResponse(text)}
        </div>
      `;
    } else {
      message.innerHTML = `
        <div class="gunkowii-ai-message-body">
          ${formatAIResponse(text)}
        </div>
      `;
    }

    aiMessages.appendChild(message);

    aiMessages.scrollTop =
      aiMessages.scrollHeight;
  }


  /* =========================================================
     INITIAL GREETING
     ========================================================= */

  function showInitialGreeting() {
    addAIMessage(
      `Hi, I'm GUNKOWII AI 👋

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

If you're dealing with a specific store or shop problem, you can also send me the URL.`,
      "ai"
    );
  }


  /* =========================================================
     TYPING INDICATOR
     ========================================================= */

  function showTypingIndicator() {
    if (!aiMessages) return;

    removeTypingIndicator();

    const typing =
      document.createElement("div");

    typing.className =
      "gunkowii-ai-message ai gunkowii-ai-typing";

    typing.innerHTML = `
      <div class="gunkowii-ai-message-avatar">
        <img
          src="${AI_AVATAR}"
          alt="GUNKOWII AI"
        >
      </div>

      <div class="gunkowii-ai-message-body">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    aiMessages.appendChild(typing);

    aiMessages.scrollTop =
      aiMessages.scrollHeight;
  }


  function removeTypingIndicator() {
    if (!aiMessages) return;

    const typing =
      aiMessages.querySelector(
        ".gunkowii-ai-typing"
      );

    if (typing) {
      typing.remove();
    }
  }


  /* =========================================================
     AI HANDOFF NOTICE
     ========================================================= */

  function showHandoffNotice(data) {
    if (!data || !data.handoff) {
      return;
    }

    saveHandoffData(data);

    if (!aiMessages) {
      return;
    }

    const existing =
      aiMessages.querySelector(
        ".gunkowii-ai-handoff"
      );

    if (existing) {
      return;
    }

    const handoffURL =
      buildHandoffURL();

    const notice =
      document.createElement("div");

    notice.className =
      "gunkowii-ai-handoff";

    notice.innerHTML = `
      <div class="gunkowii-ai-handoff-icon">
        ✓
      </div>

      <div class="gunkowii-ai-handoff-title">
        Consultation ready
      </div>

      <div class="gunkowii-ai-handoff-text">
        I've organized the important details from this conversation so you can continue with GUNKOWII SABA without having to explain everything again.
      </div>

      <a
        class="gunkowii-ai-handoff-button"
        href="${handoffURL}"
      >
        Continue with GUNKOWII SABA →
      </a>
    `;

    aiMessages.appendChild(notice);

    aiMessages.scrollTop =
      aiMessages.scrollHeight;
  }


  /* =========================================================
     SEND AI MESSAGE
     ========================================================= */

  async function sendAIMessage(
    userMessage
  ) {
    if (
      !userMessage ||
      aiBusy
    ) {
      return;
    }

    const cleanMessage =
      String(userMessage).trim();

    if (!cleanMessage) {
      return;
    }

    aiBusy = true;

    if (aiSendButton) {
      aiSendButton.disabled = true;
    }

    if (aiInput) {
      aiInput.disabled = true;
    }

    addAIMessage(
      cleanMessage,
      "user"
    );

    aiConversation.push({
      role: "user",
      content: cleanMessage
    });

    saveAIConversation();

    showTypingIndicator();

    try {
      const response =
        await fetch(
          AI_WORKER_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message:
                cleanMessage,

              history:
                aiConversation
            })
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      let data;

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        data =
          await response.json();
      } else {
        const text =
          await response.text();

        data = {
          answer: text
        };
      }

      removeTypingIndicator();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          data?.answer ||
          `AI request failed (${response.status})`
        );
      }

      const answer =
        data?.answer ||
        "I couldn't generate a response right now. Please try again.";

      addAIMessage(
        answer,
        "ai"
      );

      aiConversation.push({
        role: "assistant",
        content: answer
      });

      saveAIConversation();

      if (data.leadSummary) {
        latestLeadSummary =
          data.leadSummary;
      }

      if (data.storeAnalysis) {
        latestStoreAnalysis =
          data.storeAnalysis;
      }

      if (data.handoff) {
        latestHandoff =
          data.handoff;

        showHandoffNotice({
          answer,

          leadSummary:
            data.leadSummary,

          storeAnalysis:
            data.storeAnalysis,

          handoff:
            data.handoff,

          conversation:
            aiConversation
        });
      }
    } catch (error) {
      removeTypingIndicator();

      console.error(
        "GUNKOWII AI error:",
        error
      );

      addAIMessage(
        `I'm having trouble connecting right now.

Please try again in a moment. If you need immediate assistance, you can continue directly with GUNKOWII SABA.`,
        "ai"
      );
    } finally {
      aiBusy = false;

      if (aiSendButton) {
        aiSendButton.disabled = false;
      }

      if (aiInput) {
        aiInput.disabled = false;
        aiInput.focus();
      }
    }
  }


  /* =========================================================
     DRAG SYSTEM
     ========================================================= */

  function makeDraggable(element, handle) {
    if (!element || !handle) {
      return;
    }

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    function pointerDown(event) {
      if (
        event.target.closest(
          "button, a, input, textarea"
        )
      ) {
        return;
      }

      dragging = true;

      const rect =
        element.getBoundingClientRect();

      startX =
        event.clientX;

      startY =
        event.clientY;

      startLeft =
        rect.left;

      startTop =
        rect.top;

      element.style.left =
        `${rect.left}px`;

      element.style.top =
        `${rect.top}px`;

      element.style.right =
        "auto";

      element.style.bottom =
        "auto";

      handle.setPointerCapture?.(
        event.pointerId
      );

      element.classList.add(
        "gunkowii-ai-dragging"
      );

      event.preventDefault();
    }


    function pointerMove(event) {
      if (!dragging) {
        return;
      }

      const dx =
        event.clientX - startX;

      const dy =
        event.clientY - startY;

      let left =
        startLeft + dx;

      let top =
        startTop + dy;

      const rect =
        element.getBoundingClientRect();

      const maxLeft =
        window.innerWidth -
        rect.width;

      const maxTop =
        window.innerHeight -
        rect.height;

      left =
        Math.max(
          5,
          Math.min(
            left,
            maxLeft - 5
          )
        );

      top =
        Math.max(
          5,
          Math.min(
            top,
            maxTop - 5
          )
        );

      element.style.left =
        `${left}px`;

      element.style.top =
        `${top}px`;
    }


    function pointerUp(event) {
      if (!dragging) {
        return;
      }

      dragging = false;

      handle.releasePointerCapture?.(
        event.pointerId
      );

      element.classList.remove(
        "gunkowii-ai-dragging"
      );
    }


    handle.addEventListener(
      "pointerdown",
      pointerDown
    );

    handle.addEventListener(
      "pointermove",
      pointerMove
    );

    handle.addEventListener(
      "pointerup",
      pointerUp
    );

    handle.addEventListener(
      "pointercancel",
      pointerUp
    );
  }


  /* =========================================================
     AI STYLES
     ========================================================= */

  function injectAIStyles() {
    if (
      document.getElementById(
        "gunkowii-ai-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "gunkowii-ai-styles";

    style.textContent = `

      /* =========================================
         FLOATING AI LAUNCHER
         ========================================= */

      .gunkowii-ai-launcher {
        position: fixed;

        right: 20px;
        bottom: 20px;

        z-index: 9998;

        display: flex;
        align-items: center;
        gap: 9px;

        cursor: grab;

        user-select: none;
        touch-action: none;
      }

      .gunkowii-ai-launcher.dragging {
        cursor: grabbing;
      }

      .gunkowii-ai-launcher-avatar {
        width: 58px;
        height: 58px;

        border-radius: 50%;

        object-fit: cover;

        border:
          3px solid #c9a227;

        background: #fff;

        box-shadow:
          0 8px 25px rgba(0,0,0,.20);

        transition:
          transform .2s ease,
          box-shadow .2s ease;
      }

      .gunkowii-ai-launcher:hover
      .gunkowii-ai-launcher-avatar {
        transform: scale(1.05);

        box-shadow:
          0 12px 32px rgba(0,0,0,.24);
      }

      .gunkowii-ai-launcher-label {
        padding: 10px 14px;

        border-radius: 999px;

        background: #0b5d46;
        color: #fff;

        font-size: 13px;
        font-weight: 800;

        white-space: nowrap;

        box-shadow:
          0 8px 25px rgba(0,0,0,.16);
      }


      /* =========================================
         AI PANEL
         ========================================= */

      .gunkowii-ai-panel {
        position: fixed;

        right: 20px;
        bottom: 92px;

        width:
          min(410px, calc(100vw - 30px));

        height:
          min(640px, calc(100vh - 120px));

        z-index: 9999;

        display: none;
        flex-direction: column;

        overflow: hidden;

        background: #fffdf8;

        border:
          1px solid rgba(11,93,70,.18);

        border-radius: 22px;

        box-shadow:
          0 25px 70px rgba(0,0,0,.25);
      }

      .gunkowii-ai-panel.open {
        display: flex;
      }

      .gunkowii-ai-panel.gunkowii-ai-dragging {
        transition: none;
      }


      /* =========================================
         HEADER
         ========================================= */

      .gunkowii-ai-header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        padding: 13px 15px;

        background: #0b5d46;
        color: #fff;

        cursor: grab;

        user-select: none;
        touch-action: none;
      }

      .gunkowii-ai-header:active {
        cursor: grabbing;
      }

      .gunkowii-ai-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .gunkowii-ai-avatar {
        width: 43px;
        height: 43px;

        border-radius: 50%;

        object-fit: cover;

        border:
          2px solid rgba(255,255,255,.9);
      }

      .gunkowii-ai-title {
        font-size: 14px;
        font-weight: 900;
      }

      .gunkowii-ai-status {
        margin-top: 2px;

        font-size: 10px;

        opacity: .82;
      }

      .gunkowii-ai-header-actions {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .gunkowii-ai-new-chat,
      .gunkowii-ai-close {
        border: none;

        border-radius: 9px;

        background:
          rgba(255,255,255,.12);

        color: #fff;

        cursor: pointer;
      }

      .gunkowii-ai-new-chat {
        padding: 7px 9px;

        font-size: 10px;
        font-weight: 800;
      }

      .gunkowii-ai-close {
        width: 33px;
        height: 33px;

        font-size: 19px;
      }

      .gunkowii-ai-new-chat:hover,
      .gunkowii-ai-close:hover {
        background:
          rgba(255,255,255,.22);
      }


      /* =========================================
         MESSAGES
         ========================================= */

      .gunkowii-ai-messages {
        flex: 1;

        overflow-y: auto;

        padding: 17px;

        scroll-behavior: smooth;
      }

      .gunkowii-ai-message {
        display: flex;

        max-width: 94%;

        margin-bottom: 14px;
      }

      .gunkowii-ai-message.ai {
        margin-right: auto;

        gap: 8px;
      }

      .gunkowii-ai-message.user {
        margin-left: auto;
      }

      .gunkowii-ai-message-body {
        padding: 12px 14px;

        border-radius: 15px;

        font-size: 13px;

        line-height: 1.6;

        word-break: break-word;
      }

      .gunkowii-ai-message.ai
      .gunkowii-ai-message-body {
        background: #f1eee6;
        color: #242424;

        border-top-left-radius: 5px;
      }

      .gunkowii-ai-message.user
      .gunkowii-ai-message-body {
        background: #0b5d46;
        color: #fff;

        border-top-right-radius: 5px;
      }

      .gunkowii-ai-message-avatar {
        flex: 0 0 auto;
      }

      .gunkowii-ai-message-avatar img {
        width: 30px;
        height: 30px;

        border-radius: 50%;

        object-fit: cover;

        border:
          1px solid rgba(11,93,70,.2);
      }

      .gunkowii-ai-message-body a {
        color: inherit;

        font-weight: 800;

        text-decoration: underline;
      }

      .gunkowii-ai-heading {
        margin: 8px 0 6px;

        color: #0b5d46;

        font-size: 14px;
        font-weight: 900;
      }

      .gunkowii-ai-heading.large {
        font-size: 16px;
      }

      .gunkowii-ai-heading.small {
        font-size: 13px;
      }

      .gunkowii-ai-bullet {
        display: flex;

        gap: 7px;

        margin: 5px 0;
      }

      .gunkowii-ai-bullet span {
        color: #c9a227;

        font-weight: 900;
      }

      .gunkowii-ai-list-item {
        display: flex;

        gap: 7px;

        margin: 5px 0;
      }

      .gunkowii-ai-list-item > span {
        color: #0b5d46;

        font-weight: 900;
      }


      /* =========================================
         TYPING
         ========================================= */

      .gunkowii-ai-typing
      .gunkowii-ai-message-body {
        display: flex;
        align-items: center;
        gap: 4px;

        padding: 14px 16px;
      }

      .gunkowii-ai-typing
      .gunkowii-ai-message-body span {
        width: 6px;
        height: 6px;

        border-radius: 50%;

        background: #777;

        animation:
          gunkowiiTyping 1.2s infinite;
      }

      .gunkowii-ai-typing
      .gunkowii-ai-message-body
      span:nth-child(2) {
        animation-delay: .15s;
      }

      .gunkowii-ai-typing
      .gunkowii-ai-message-body
      span:nth-child(3) {
        animation-delay: .3s;
      }

      @keyframes gunkowiiTyping {
        0%, 60%, 100% {
          opacity: .35;
          transform: translateY(0);
        }

        30% {
          opacity: 1;
          transform: translateY(-3px);
        }
      }


      /* =========================================
         INPUT
         ========================================= */

      .gunkowii-ai-input-area {
        display: flex;
        gap: 8px;

        padding: 12px;

        border-top:
          1px solid rgba(0,0,0,.08);

        background: #fff;
      }

      .gunkowii-ai-input {
        flex: 1;

        min-width: 0;

        resize: none;

        border:
          1px solid #d9d4c9;

        border-radius: 12px;

        padding: 10px 12px;

        font-family: inherit;
        font-size: 13px;

        outline: none;
      }

      .gunkowii-ai-input:focus {
        border-color: #0b5d46;
      }

      .gunkowii-ai-send {
        align-self: flex-end;

        border: none;

        border-radius: 12px;

        padding: 10px 14px;

        background: #c9a227;
        color: #171717;

        font-weight: 900;

        cursor: pointer;
      }

      .gunkowii-ai-send:disabled {
        opacity: .5;

        cursor: not-allowed;
      }


      /* =========================================
         HANDOFF
         ========================================= */

      .gunkowii-ai-handoff {
        margin: 15px 0 5px;

        padding: 16px;

        border-radius: 15px;

        background:
          linear-gradient(
            135deg,
            #f7f0d8,
            #fffaf0
          );

        border:
          1px solid rgba(201,162,39,.35);

        color: #222;

        font-size: 12px;

        line-height: 1.55;
      }

      .gunkowii-ai-handoff-icon {
        display: inline-flex;

        width: 28px;
        height: 28px;

        align-items: center;
        justify-content: center;

        margin-bottom: 7px;

        border-radius: 50%;

        background: #0b5d46;
        color: #fff;

        font-weight: 900;
      }

      .gunkowii-ai-handoff-title {
        margin-bottom: 5px;

        color: #0b5d46;

        font-size: 14px;
        font-weight: 900;
      }

      .gunkowii-ai-handoff-text {
        margin-bottom: 12px;
      }

      .gunkowii-ai-handoff-button {
        display: inline-block;

        padding: 10px 14px;

        border-radius: 10px;

        background: #0b5d46;
        color: #fff !important;

        text-decoration: none !important;

        font-weight: 900;
      }


      /* =========================================
         MOBILE
         ========================================= */

      @media (max-width: 600px) {

        .gunkowii-ai-launcher {
          right: 14px;
          bottom: 14px;
        }

        .gunkowii-ai-launcher-avatar {
          width: 54px;
          height: 54px;
        }

        .gunkowii-ai-launcher-label {
          padding: 9px 12px;

          font-size: 12px;
        }

        .gunkowii-ai-panel {
          right: 10px;
          bottom: 80px;

          width:
            calc(100vw - 20px);

          height:
            calc(100vh - 100px);

          border-radius: 17px;
        }

      }

    `;

    document.head.appendChild(style);
  }


  /* =========================================================
     CREATE AI PANEL
     ========================================================= */

  function createAIPanel() {

    /*
     * Existing panel
     */
    if (
      document.getElementById(
        "gunkowii-ai-panel"
      )
    ) {

      aiPanel =
        document.getElementById(
          "gunkowii-ai-panel"
        );

      aiMessages =
        document.getElementById(
          "gunkowii-ai-messages"
        );

      aiInput =
        document.getElementById(
          "gunkowii-ai-input"
        );

      aiSendButton =
        document.getElementById(
          "gunkowii-ai-send"
        );

      return;
    }


    /* =========================================
       FLOATING LAUNCHER
       ========================================= */

    const launcher =
      document.createElement("div");

    launcher.className =
      "gunkowii-ai-launcher";

    launcher.setAttribute(
      "role",
      "button"
    );

    launcher.setAttribute(
      "tabindex",
      "0"
    );

    launcher.innerHTML = `
      <span class="gunkowii-ai-launcher-label">
        Ask GUNKOWII AI
      </span>

      <img
        class="gunkowii-ai-launcher-avatar"
        src="${AI_AVATAR}"
        alt="Ask GUNKOWII AI"
      >
    `;

    document.body.appendChild(
      launcher
    );

    aiLauncher =
      launcher;


    /* =========================================
       AI PANEL
       ========================================= */

    const panel =
      document.createElement("div");

    panel.id =
      "gunkowii-ai-panel";

    panel.className =
      "gunkowii-ai-panel";

    panel.innerHTML = `
      <div
        class="gunkowii-ai-header"
        id="gunkowii-ai-drag-handle"
      >

        <div class="gunkowii-ai-brand">

          <img
            class="gunkowii-ai-avatar"
            src="${AI_AVATAR}"
            alt="GUNKOWII AI"
          >

          <div>
            <div class="gunkowii-ai-title">
              GUNKOWII AI
            </div>

            <div class="gunkowii-ai-status">
              E-commerce • Shopify • Etsy • SEO • CRO
            </div>
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
        id="gunkowii-ai-messages"
        class="gunkowii-ai-messages"
      ></div>

      <form
        id="gunkowii-ai-form"
        class="gunkowii-ai-input-area"
      >

        <textarea
          id="gunkowii-ai-input"
          class="gunkowii-ai-input"
          rows="2"
          placeholder="Tell me what you need help with..."
          aria-label="Message GUNKOWII AI"
        ></textarea>

        <button
          id="gunkowii-ai-send"
          class="gunkowii-ai-send"
          type="submit"
        >
          Send
        </button>

      </form>
    `;

    document.body.appendChild(
      panel
    );

    aiPanel =
      panel;

    aiMessages =
      document.getElementById(
        "gunkowii-ai-messages"
      );

    aiInput =
      document.getElementById(
        "gunkowii-ai-input"
      );

    aiSendButton =
      document.getElementById(
        "gunkowii-ai-send"
      );


    /* =========================================
       OPEN AI
       ========================================= */

    function openAI() {
      aiPanel.classList.add(
        "open"
      );

      if (
        aiInput &&
        !aiInput.disabled
      ) {
        setTimeout(() => {
          aiInput.focus();
        }, 100);
      }
    }


    launcher.addEventListener(
      "click",
      openAI
    );

    launcher.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          openAI();
        }
      }
    );


    /* =========================================
       CLOSE
       ========================================= */

    const closeButton =
      panel.querySelector(
        ".gunkowii-ai-close"
      );

    closeButton.addEventListener(
      "click",
      () => {
        aiPanel.classList.remove(
          "open"
        );
      }
    );


    /* =========================================
       NEW CHAT
       ========================================= */

    const newChatButton =
      document.getElementById(
        "gunkowii-ai-new-chat"
      );

    newChatButton.addEventListener(
      "click",
      () => {

        if (aiBusy) {
          return;
        }

        clearAIConversation();

        clearHandoffData();

        aiInput.value = "";

        aiInput.focus();
      }
    );


    /* =========================================
       SUBMIT
       ========================================= */

    const form =
      document.getElementById(
        "gunkowii-ai-form"
      );

    form.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        if (!aiInput) {
          return;
        }

        const message =
          aiInput.value.trim();

        if (!message) {
          return;
        }

        aiInput.value = "";

        await sendAIMessage(
          message
        );
      }
    );


    /* =========================================
       ENTER SEND
       ========================================= */

    aiInput.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {

          event.preventDefault();

          form.requestSubmit();
        }
      }
    );


    /* =========================================
       DRAG AI LAUNCHER
       ========================================= */

    makeDraggable(
      launcher,
      launcher
    );


    /* =========================================
       DRAG AI WINDOW
       ========================================= */

    makeDraggable(
      panel,
      document.getElementById(
        "gunkowii-ai-drag-handle"
      )
    );


    /* =========================================
       INITIAL CONTENT
       ========================================= */

    if (
      aiConversation.length === 0
    ) {
      showInitialGreeting();
    } else {
      restoreConversationToPanel();
    }
  }


  /* =========================================================
     RESTORE CONVERSATION
     ========================================================= */

  function restoreConversationToPanel() {

    if (!aiMessages) {
      return;
    }

    aiMessages.innerHTML = "";

    for (
      const message of aiConversation
    ) {

      if (
        !message ||
        !message.content
      ) {
        continue;
      }

      const type =
        message.role === "user"
          ? "user"
          : "ai";

      addAIMessage(
        message.content,
        type
      );
    }

    const handoff =
      loadHandoffData();

    if (
      handoff &&
      handoff.handoff
    ) {

      showHandoffNotice(
        handoff
      );
    }
  }


  /* =========================================================
     LIVE ACTIVITY POPUP
     ========================================================= */

  function injectActivityStyles() {

    if (
      document.getElementById(
        "gunkowii-activity-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "gunkowii-activity-styles";

    style.textContent = `

      .gunkowii-live-activity {

        position: fixed;

        left: 18px;
        bottom: 18px;

        z-index: 9990;

        width: min(350px, calc(100vw - 36px));

        min-height: 72px;

        padding: 13px 15px;

        background:
          linear-gradient(
            135deg,
            #fffdf8,
            #f8f3e7
          );

        border:
          1px solid rgba(11,93,70,.15);

        border-left:
          4px solid #c9a227;

        border-radius: 16px;

        box-shadow:
          0 16px 40px rgba(0,0,0,.17);

        display: flex;

        align-items: center;

        gap: 11px;

        font-size: 12px;

        transform:
          translateX(-120%);

        opacity: 0;

        transition:
          opacity .4s ease,
          transform .5s cubic-bezier(.2,.8,.2,1);

        cursor: pointer;
      }

      .gunkowii-live-activity.show {

        opacity: 1;

        transform:
          translateX(0);
      }

      .gunkowii-live-dot {

        width: 10px;
        height: 10px;

        flex: 0 0 auto;

        border-radius: 50%;

        background: #0b5d46;

        box-shadow:
          0 0 0 5px
          rgba(11,93,70,.10);
      }

      .gunkowii-live-content {

        min-width: 0;
      }

      .gunkowii-live-title {

        font-weight: 900;

        color: #0b5d46;

        margin-bottom: 3px;
      }

      .gunkowii-live-text {

        color: #555;

        line-height: 1.45;
      }

      .gunkowii-live-close {

        margin-left: auto;

        width: 28px;
        height: 28px;

        flex: 0 0 auto;

        border: none;

        border-radius: 50%;

        background: rgba(0,0,0,.04);

        color: #777;

        cursor: pointer;

        font-size: 16px;
      }

      @media (max-width: 600px) {

        .gunkowii-live-activity {

          left: 12px;
          bottom: 12px;

          width:
            calc(100vw - 24px);

        }

      }

    `;

    document.head.appendChild(
      style
    );
  }


  const liveActivities = [

    {
      title:
        "Client Feedback",

      text:
        "Professional feedback from recent project work.",

      url:
        "reviews.html"
    },

    {
      title:
        "Shopify Work",

      text:
        "Shopify optimization and e-commerce growth work.",

      url:
        "services.html"
    },

    {
      title:
        "Etsy Growth",

      text:
        "Etsy listing, visibility and growth opportunities.",

      url:
        "services.html"
    },

    {
      title:
        "CRO Insight",

      text:
        "Conversion opportunities can often be found beyond store design.",

      url:
        "audit.html"
    },

    {
      title:
        "SEO Focus",

      text:
        "Search visibility is part of a complete e-commerce growth strategy.",

      url:
        "services.html"
    },

    {
      title:
        "Growth Strategy",

      text:
        "Traffic, UX, trust, conversion and retention work together.",

      url:
        "process.html"
    },

    {
      title:
        "Featured Project",

      text:
        "Explore real e-commerce and digital projects.",

      url:
        "portfolio.html"
    },

    {
      title:
        "Available",

      text:
        "Professional project and collaboration inquiries are welcome.",

      url:
        "contact.html"
    }

  ];


  let activityIndex = 0;
  let activityElement = null;
  let activityTimer = null;


  function createLiveActivity() {

    if (
      document.querySelector(
        ".gunkowii-live-activity"
      )
    ) {
      return;
    }

    const item =
      liveActivities[
        activityIndex
      ];

    const activity =
      document.createElement("div");

    activity.className =
      "gunkowii-live-activity";

    activity.innerHTML = `

      <span class="gunkowii-live-dot"></span>

      <div class="gunkowii-live-content">

        <div class="gunkowii-live-title">
          ${escapeHTML(item.title)}
        </div>

        <div class="gunkowii-live-text">
          ${escapeHTML(item.text)}
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

    document.body.appendChild(
      activity
    );

    activityElement =
      activity;


    activity.addEventListener(
      "click",
      (event) => {

        if (
          event.target.closest(
            ".gunkowii-live-close"
          )
        ) {
          return;
        }

        window.location.href =
          item.url;
      }
    );


    const close =
      activity.querySelector(
        ".gunkowii-live-close"
      );

    close.addEventListener(
      "click",
      (event) => {

        event.stopPropagation();

        hideLiveActivity();

        sessionStorage.setItem(
          "gunkowii_live_activity_closed",
          "1"
        );
      }
    );


    requestAnimationFrame(() => {

      activity.classList.add(
        "show"
      );

    });


    setTimeout(
      hideLiveActivity,
      7000
    );
  }


  function hideLiveActivity() {

    if (!activityElement) {
      return;
    }

    activityElement.classList.remove(
      "show"
    );

    setTimeout(() => {

      if (
        activityElement
      ) {

        activityElement.remove();

        activityElement = null;
      }

    }, 500);
  }


  function startLiveActivity() {

    if (
      sessionStorage.getItem(
        "gunkowii_live_activity_closed"
      ) === "1"
    ) {
      return;
    }

    setTimeout(() => {

      createLiveActivity();

      activityTimer =
        setInterval(() => {

          hideLiveActivity();

          activityIndex =
            (activityIndex + 1) %
            liveActivities.length;

          setTimeout(
            createLiveActivity,
            800
          );

        }, 12000);

    }, 4000);
  }


  /* =========================================================
     CONTACT PAGE HANDOFF
     ========================================================= */

  function prepareContactPage() {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const isHandoff =
      params.get(
        "ai_handoff"
      ) === "1";

    if (!isHandoff) {
      return;
    }

    const handoff =
      loadHandoffData();

    if (!handoff) {
      return;
    }

    window.GunkowiiAIHandoff =
      handoff;

    document.body.classList.add(
      "gunkowii-ai-handoff-page"
    );

    window.dispatchEvent(
      new CustomEvent(
        "gunkowiiAIHandoffReady",
        {
          detail: handoff
        }
      )
    );
  }


  /* =========================================================
     WHATSAPP HANDOFF
     ========================================================= */

  function buildWhatsAppHandoffMessage() {

    const handoff =
      loadHandoffData();

    if (!handoff) {
      return "";
    }

    const leadSummary =
      normalize(
        handoff.leadSummary
      );

    const storeAnalysis =
      normalize(
        handoff.storeAnalysis
      );

    const conversation =
      Array.isArray(
        handoff.conversation
      )
        ? handoff.conversation
        : [];

    const recentConversation =
      conversation
        .slice(-10)
        .map((message) => {

          const role =
            message.role === "user"
              ? "Buyer"
              : "GUNKOWII AI";

          return `${role}: ${message.content}`;

        })
        .join("\n\n");

    return `
Hello GUNKOWII SABA,

I continued through GUNKOWII AI and would like to continue the discussion with you.

AI Lead Summary:
${leadSummary || "Not available"}

Store Analysis:
${storeAnalysis || "Not available"}

Recent AI Conversation:
${recentConversation || "Not available"}

Please continue from here.
`.trim();
  }


  async function copyWhatsAppHandoff() {

    const message =
      buildWhatsAppHandoffMessage();

    if (!message) {

      window.open(
        WHATSAPP_URL,
        "_blank"
      );

      return;
    }

    try {

      await navigator.clipboard.writeText(
        message
      );

      window.open(
        WHATSAPP_URL,
        "_blank"
      );

    } catch (error) {

      console.warn(
        "Clipboard access failed.",
        error
      );

      window.open(
        WHATSAPP_URL,
        "_blank"
      );
    }
  }


  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.GunkowiiAI = {

    sendMessage:
      sendAIMessage,

    clearConversation:
      clearAIConversation,

    getConversation:
      () => aiConversation,

    getHandoff:
      loadHandoffData,

    clearHandoff:
      clearHandoffData,

    buildWhatsAppMessage:
      buildWhatsAppHandoffMessage,

    copyWhatsAppHandoff,

    contactURL:
      buildHandoffURL,

    whatsappURL:
      WHATSAPP_URL

  };


  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function init() {

    loadAIConversation();

    loadHandoffData();

    injectAIStyles();

    injectActivityStyles();

    createAIPanel();

    prepareContactPage();

    startLiveActivity();
  }


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