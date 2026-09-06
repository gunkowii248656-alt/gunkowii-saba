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


  /* =========================================================
     GLOBAL AI STATE
     ========================================================= */

  let aiConversation = [];
  let latestLeadSummary = null;
  let latestStoreAnalysis = null;
  let latestHandoff = null;

  let aiPanel = null;
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

      /* Expire old handoffs */
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
     =========================================================

     IMPORTANT:
     The AI conversation is NOT placed inside
     the URL anymore.

     Everything is stored in localStorage.
     ========================================================= */

  function buildHandoffURL() {
    return `${CONTACT_URL}?ai_handoff=1`;
  }


  /* =========================================================
     FORMAT AI RESPONSE
     ========================================================= */

  function formatAIResponse(text) {
    if (!text) {
      return "";
    }

    let output =
      escapeHTML(String(text));

    /*
     * Convert markdown links:
     * [Text](https://example.com)
     */
    output = output.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
      (match, label, url) => {
        return `
          <a
            href="${url}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${label}
          </a>
        `;
      }
    );

    /*
     * Convert bare URLs
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
          >
            ${url}
          </a>
        `;
      }
    );

    /*
     * Bold markdown
     */
    output = output.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

    /*
     * Markdown headings
     */
    output = output.replace(
      /^### (.*)$/gm,
      "<h4>$1</h4>"
    );

    output = output.replace(
      /^## (.*)$/gm,
      "<h3>$1</h3>"
    );

    output = output.replace(
      /^# (.*)$/gm,
      "<h2>$1</h2>"
    );

    /*
     * Bullet points
     */
    output = output.replace(
      /^[•*-]\s+(.*)$/gm,
      "<li>$1</li>"
    );

    output = output.replace(
      /(<li>.*<\/li>\s*)+/gs,
      (match) => {
        return `<ul>${match}</ul>`;
      }
    );

    /*
     * Preserve line breaks
     */
    output = output.replace(
      /\n/g,
      "<br>"
    );

    /*
     * Clean excessive breaks around headings/lists
     */
    output = output.replace(
      /<br>\s*(<h[234]>)/g,
      "$1"
    );

    output = output.replace(
      /(<\/h[234]>)\s*<br>/g,
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

    message.innerHTML =
      formatAIResponse(text);

    aiMessages.appendChild(message);

    aiMessages.scrollTop =
      aiMessages.scrollHeight;
  }


  /* =========================================================
     AI TYPING INDICATOR
     ========================================================= */

  function showTypingIndicator() {
    if (!aiMessages) return;

    removeTypingIndicator();

    const typing =
      document.createElement("div");

    typing.className =
      "gunkowii-ai-message ai gunkowii-ai-typing";

    typing.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
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
      <div class="gunkowii-ai-handoff-title">
        Ready to continue with GUNKOWII SABA?
      </div>

      <br>

      I can connect you with
      GUNKOWII SABA so the work can
      continue from this consultation.

      <br><br>

      Your AI consultation is attached
      automatically, so you don't need
      to explain everything again.

      <br><br>

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
     EXTRACT STORE URL FROM USER MESSAGE
     ========================================================= */

  function extractUrls(text) {
    if (!text) return [];

    const matches =
      String(text).match(
        /https?:\/\/[^\s<>"')]+/gi
      );

    if (!matches) {
      return [];
    }

    return matches.filter(
      isValidHttpUrl
    );
  }


  /* =========================================================
     SEND MESSAGE TO GUNKOWII AI
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

      /*
       * Store AI analysis and lead information
       */
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
        `I’m having trouble connecting to the AI service right now.

Please try again in a moment. If you need immediate help, you can continue directly with GUNKOWII SABA through the contact page.`,
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
     AI PANEL STYLES
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
      .gunkowii-ai-button {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 9998;

        border: none;
        border-radius: 999px;

        padding: 13px 18px;

        background: #0b5d46;
        color: #fff;

        font-family: inherit;
        font-size: 14px;
        font-weight: 700;

        cursor: pointer;

        box-shadow:
          0 10px 30px rgba(0,0,0,.18);

        transition:
          transform .2s ease,
          box-shadow .2s ease;
      }

      .gunkowii-ai-button:hover {
        transform: translateY(-2px);

        box-shadow:
          0 14px 35px rgba(0,0,0,.22);
      }

      .gunkowii-ai-panel {
        position: fixed;

        right: 20px;
        bottom: 78px;

        width: min(390px, calc(100vw - 30px));
        height: min(610px, calc(100vh - 110px));

        z-index: 9999;

        display: none;
        flex-direction: column;

        overflow: hidden;

        background: #fffdf8;

        border:
          1px solid rgba(11,93,70,.18);

        border-radius: 20px;

        box-shadow:
          0 20px 60px rgba(0,0,0,.22);
      }

      .gunkowii-ai-panel.open {
        display: flex;
      }

      .gunkowii-ai-header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        padding: 14px 16px;

        background: #0b5d46;
        color: #fff;
      }

      .gunkowii-ai-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .gunkowii-ai-avatar {
        width: 42px;
        height: 42px;

        border-radius: 50%;

        object-fit: cover;

        border:
          2px solid rgba(255,255,255,.8);
      }

      .gunkowii-ai-title {
        font-size: 14px;
        font-weight: 800;
      }

      .gunkowii-ai-status {
        margin-top: 2px;

        font-size: 11px;
        opacity: .82;
      }

      .gunkowii-ai-close {
        width: 34px;
        height: 34px;

        border: none;
        border-radius: 50%;

        background:
          rgba(255,255,255,.12);

        color: #fff;

        font-size: 20px;

        cursor: pointer;
      }

      .gunkowii-ai-messages {
        flex: 1;

        overflow-y: auto;

        padding: 16px;

        scroll-behavior: smooth;
      }

      .gunkowii-ai-message {
        max-width: 88%;

        margin-bottom: 12px;

        padding: 11px 13px;

        border-radius: 14px;

        font-size: 13px;
        line-height: 1.55;

        word-break: break-word;
      }

      .gunkowii-ai-message.ai {
        margin-right: auto;

        background: #f1eee6;
        color: #222;
      }

      .gunkowii-ai-message.user {
        margin-left: auto;

        background: #0b5d46;
        color: #fff;
      }

      .gunkowii-ai-message a {
        color: inherit;
        font-weight: 700;
        text-decoration: underline;
      }

      .gunkowii-ai-message h2,
      .gunkowii-ai-message h3,
      .gunkowii-ai-message h4 {
        margin: 7px 0;
      }

      .gunkowii-ai-message ul {
        margin: 8px 0;
        padding-left: 20px;
      }

      .gunkowii-ai-typing {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .gunkowii-ai-typing span {
        width: 6px;
        height: 6px;

        border-radius: 50%;

        background: #777;

        animation:
          gunkowiiTyping 1.2s infinite;
      }

      .gunkowii-ai-typing span:nth-child(2) {
        animation-delay: .15s;
      }

      .gunkowii-ai-typing span:nth-child(3) {
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

        padding: 10px 13px;

        background: #c9a227;
        color: #171717;

        font-weight: 800;

        cursor: pointer;
      }

      .gunkowii-ai-send:disabled {
        opacity: .5;
        cursor: not-allowed;
      }

      .gunkowii-ai-handoff {
        margin: 14px 0 4px;

        padding: 14px;

        border-radius: 14px;

        background: #f5edcf;

        border:
          1px solid rgba(201,162,39,.35);

        color: #222;

        font-size: 13px;
        line-height: 1.55;
      }

      .gunkowii-ai-handoff-title {
        font-weight: 800;
        color: #0b5d46;
      }

      .gunkowii-ai-handoff-button {
        display: inline-block;

        padding: 10px 14px;

        border-radius: 10px;

        background: #0b5d46;
        color: #fff !important;

        text-decoration: none !important;

        font-weight: 800;
      }

      @media (max-width: 600px) {
        .gunkowii-ai-button {
          right: 14px;
          bottom: 14px;
        }

        .gunkowii-ai-panel {
          right: 10px;
          bottom: 68px;

          width:
            calc(100vw - 20px);

          height:
            calc(100vh - 90px);

          border-radius: 16px;
        }
      }
    `;

    document.head.appendChild(style);
  }


  /* =========================================================
     CREATE AI PANEL
     ========================================================= */

  function createAIPanel() {
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

    const button =
      document.createElement("button");

    button.className =
      "gunkowii-ai-button";

    button.type = "button";

    button.innerHTML =
      "Ask GUNKOWII AI";

    button.setAttribute(
      "aria-label",
      "Open GUNKOWII AI"
    );

    document.body.appendChild(button);


    const panel =
      document.createElement("div");

    panel.id =
      "gunkowii-ai-panel";

    panel.className =
      "gunkowii-ai-panel";

    panel.innerHTML = `
      <div class="gunkowii-ai-header">

        <div class="gunkowii-ai-brand">

          <img
            class="gunkowii-ai-avatar"
            src="Screenshot_2026-09-04-12-55-24-480_com.openai.chatgpt-edit.jpg"
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

        <button
          type="button"
          class="gunkowii-ai-close"
          aria-label="Close GUNKOWII AI"
        >
          ×
        </button>

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

    document.body.appendChild(panel);

    aiPanel = panel;

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


    /* Open */
    button.addEventListener(
      "click",
      () => {
        aiPanel.classList.add(
          "open"
        );

        if (
          aiInput &&
          !aiInput.disabled
        ) {
          aiInput.focus();
        }
      }
    );


    /* Close */
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


    /* Submit */
    const form =
      document.getElementById(
        "gunkowii-ai-form"
      );

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        if (!aiInput) return;

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


    /* Enter = send, Shift+Enter = new line */
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


    /*
     * Initial greeting
     *
     * Only show it if there is no
     * previous visible conversation.
     */
    if (
      aiConversation.length === 0
    ) {
      addAIMessage(
        `Hi, I'm GUNKOWII AI.

I can help you understand Shopify, Etsy, e-commerce, SEO, CRO, digital marketing, email marketing, and website issues.

If you're dealing with a specific store or shop problem, send me the URL and I'll inspect what I can.`,
        "ai"
      );
    } else {
      /*
       * Restore previous conversation
       * visually.
       */
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

        max-width: 330px;

        padding: 12px 14px;

        background: #fffdf8;

        border:
          1px solid rgba(11,93,70,.14);

        border-radius: 14px;

        box-shadow:
          0 12px 35px rgba(0,0,0,.15);

        display: flex;
        align-items: center;
        gap: 10px;

        font-size: 12px;

        transform:
          translateY(20px);

        opacity: 0;

        transition:
          opacity .35s ease,
          transform .35s ease;
      }

      .gunkowii-live-activity.show {
        opacity: 1;
        transform:
          translateY(0);
      }

      .gunkowii-live-dot {
        width: 9px;
        height: 9px;

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
        font-weight: 800;
        color: #0b5d46;
        margin-bottom: 2px;
      }

      .gunkowii-live-text {
        color: #555;
        line-height: 1.4;
      }

      .gunkowii-live-close {
        margin-left: auto;

        border: none;

        background: transparent;

        color: #888;

        cursor: pointer;

        font-size: 16px;
      }

      @media (max-width: 600px) {
        .gunkowii-live-activity {
          left: 12px;
          right: 12px;
          bottom: 12px;
          max-width: none;
        }
      }
    `;

    document.head.appendChild(style);
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
        "A structured approach connects traffic, UX, trust, conversion and retention.",

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
    }, 400);
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
            700
          );
        }, 12000);
    }, 4000);
  }


  /* =========================================================
     CONTACT PAGE HANDOFF SUPPORT
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

    /*
     * Give the contact page access to the
     * consultation through global variables.
     *
     * contact.html can read localStorage
     * directly as well.
     */
    window.GunkowiiAIHandoff =
      handoff;

    document.body.classList.add(
      "gunkowii-ai-handoff-page"
    );

    /*
     * Dispatch an event so contact.html
     * can listen after main.js loads.
     */
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
     COPY AI HANDOFF MESSAGE
     =========================================================

     This creates a ready-to-send WhatsApp
     message without requiring WhatsApp API.

     Because the current WhatsApp link is a
     wa.me/message/... link, we cannot safely
     append a prefilled ?text= parameter.

     Instead, we copy the message to the
     clipboard and open WhatsApp.
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