/* =========================================================
   GUNKOWII SABA PORTFOLIO — MAIN.JS
   AI CONSULTANT + LIVE ACTIVITY + HANDOFF SYSTEM
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
    "https://gunkowii-saba.pages.dev/contact.html";

  const AUDIT_URL =
    "https://gunkowii-saba.pages.dev/audit.html";

  const AI_AVATAR =
    "Screenshot_2026-09-04-12-55-24-480_com.openai.chatgpt-edit.jpg";

  const AI_CONVERSATION_KEY =
    "gunkowii_ai_conversation";

  const AI_HANDOFF_KEY =
    "gunkowii_ai_handoff";

  const AI_PANEL_POSITION_KEY =
    "gunkowii_ai_panel_position";

  const AI_LAUNCHER_POSITION_KEY =
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