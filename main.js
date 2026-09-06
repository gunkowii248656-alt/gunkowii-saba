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

  const AI_POSITION_KEY =
    "gunkowii_ai_position";

  const AI_PANEL_POSITION_KEY =
    "gunkowii_ai_panel_position";

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
  let aiButton = null;
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
    if (!value) {
      return false;
    }

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

      addAIMessage(
        `Hi, I'm GUNKOWII AI.

I can help you with Shopify, Etsy, e-commerce, SEO, CRO, digital marketing, email marketing, and website issues.

If you're dealing with a specific store or shop problem, send me the URL and I'll take a look.`,
        "ai"
      );
    }

    /*
     * A new conversation should also begin
     * without the previous handoff card.
     */
    latestLeadSummary = null;
    latestStoreAnalysis = null;
    latestHandoff = null;

    try {
      localStorage.removeItem(
        AI_HANDOFF_KEY
      );
    } catch (error) {
      console.warn(
        "Unable to clear AI handoff.",
        error
      );
    }
  }


  /* =========================================================
     AI HANDOFF STORAGE
     ========================================================= */

  function saveHandoffData(data) {
    if (!data) {
      return;
    }

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
          new Date(
            parsed.updatedAt
          ).getTime();

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
     FORMAT AI RESPONSE
     =========================================================

     The Worker may return Markdown.

     We deliberately escape raw HTML first so that
     broken HTML such as:

       ahref="..."

     can never appear as executable/broken markup.

     Then we safely convert supported Markdown.
     ========================================================= */

  function formatAIResponse(text) {
    if (!text) {
      return "";
    }

    let source =
      String(text)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

    /*
     * Store Markdown links temporarily before
     * escaping the content.
     */
    const linkTokens = [];

    source = source.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
      (match, label, url) => {
        const token =
          `___GUNKOWII_LINK_${linkTokens.length}___`;

        linkTokens.push({
          label,
          url
        });

        return token;
      }
    );

    /*
     * Escape all raw HTML.
     */
    let output =
      escapeHTML(source);

    /*
     * Restore safe Markdown links.
     */
    linkTokens.forEach(
      (link, index) => {
        const token =
          `___GUNKOWII_LINK_${index}___`;

        output =
          output.replace(
            token,
            `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(link.label)}</a>`
          );
      }
    );

    /*
     * Remove common accidental raw HTML
     * fragments from AI output if any remain
     * visible as text.
     */
    output = output.replace(
      /&lt;\/?(?:p|div|br|strong|b|ul|ol|li|h[1-6])[^&]*&gt;/gi,
      ""
    );

    /*
     * Headings.
     */
    output = output.replace(
      /^###\s+(.+)$/gm,
      "<h4>$1</h4>"
    );

    output = output.replace(
      /^##\s+(.+)$/gm,
      "<h3>$1</h3>"
    );

    output = output.replace(
      /^#\s+(.+)$/gm,
      "<h2>$1</h2>"
    );

    /*
     * Bold.
     */
    output = output.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>"
    );

    /*
     * Italic.
     */
    output = output.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      "<em>$1</em>"
    );

    /*
     * Bare URLs.
     */
    output = output.replace(
      /(^|[\s(])(https?:\/\/[^\s<]+)(?=$|[\s).,!?:])/gi,
      (match, prefix, url) => {
        /*
         * Avoid turning a URL inside an existing
         * anchor into another anchor.
         */
        if (
          match.includes("href=")
        ) {
          return match;
        }

        return (
          `${prefix}` +
          `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(url)}</a>`
        );
      }
    );

    /*
     * Build proper lists line-by-line.
     */
    const lines =
      output.split("\n");

    const rendered = [];

    let currentList = null;

    function closeList() {
      if (!currentList) {
        return;
      }

      rendered.push(
        currentList === "ol"
          ? "</ol>"
          : "</ul>"
      );

      currentList = null;
    }

    lines.forEach((line) => {
      const trimmed =
        line.trim();

      const unordered =
        /^[-*•]\s+(.+)$/.exec(trimmed);

      const ordered =
        /^\d+[.)]\s+(.+)$/.exec(trimmed);

      if (unordered) {
        if (
          currentList !== "ul"
        ) {
          closeList();

          rendered.push(
            "<ul>"
          );

          currentList = "ul";
        }

        rendered.push(
          `<li>${unordered[1]}</li>`
        );

        return;
      }

      if (ordered) {
        if (
          currentList !== "ol"
        ) {
          closeList();

          rendered.push(
            "<ol>"
          );

          currentList = "ol";
        }

        rendered.push(
          `<li>${ordered[1]}</li>`
        );

        return;
      }

      closeList();

      if (!trimmed) {
        rendered.push(
          '<div class="gunkowii-ai-space"></div>'
        );

        return;
      }

      if (
        /^<h[234]>/.test(trimmed)
      ) {
        rendered.push(trimmed);
        return;
      }

      rendered.push(
        `<div class="gunkowii-ai-paragraph">${line}</div>`
      );
    });

    closeList();

    return rendered.join("");
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

    aiMessages.appendChild(
      message
    );

    aiMessages.scrollTop =
      aiMessages.scrollHeight;
  }


  /* =========================================================
     AI TYPING INDICATOR
     ========================================================= */

  function showTypingIndicator() {
    if (!aiMessages) {
      return;
    }

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

    aiMessages.appendChild(
      typing
    );

    aiMessages.scrollTop =
      aiMessages.scrollHeight;
  }


  function removeTypingIndicator() {
    if (!aiMessages) {
      return;
    }

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
    if (
      !data ||
      !data.handoff
    ) {
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

      <div class="gunkowii-ai-handoff-text">
        I can connect you with GUNKOWII SABA so the work can continue from this consultation.
      </div>

      <div class="gunkowii-ai-handoff-text">
        Your AI consultation is attached automatically, so you don't need to explain everything again.
      </div>

      <a
        class="gunkowii-ai-handoff-button"
        href="${handoffURL}"
      >
        Continue with GUNKOWII SABA →
      </a>
    `;

    aiMessages.appendChild(
      notice
    );

    aiMessages.scrollTop =
      aiMessages.scrollHeight;
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
        `I'm having trouble connecting to the AI service right now.

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
     DRAG HELPERS
     ========================================================= */

  function makeDraggable(
    element,
    handle,
    storageKey,
    options = {}
  ) {
    if (!element || !handle) {
      return;
    }

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const mobile =
      window.matchMedia(
        "(max-width: 600px)"
      );

    function getCurrentPosition() {
      const rect =
        element.getBoundingClientRect();

      return {
        left: rect.left,
        top: rect.top
      };
    }

    function savePosition() {
      const position =
        getCurrentPosition();

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            left:
              Math.round(
                position.left
              ),

            top:
              Math.round(
                position.top
              )
          })
        );
      } catch (error) {
        console.warn(
          "Unable to save draggable position.",
          error
        );
      }
    }

    function restorePosition() {
      try {
        const saved =
          localStorage.getItem(
            storageKey
          );

        if (!saved) {
          return;
        }

        const position =
          safeJSONParse(
            saved,
            null
          );

        if (
          !position ||
          !Number.isFinite(
            position.left
          ) ||
          !Number.isFinite(
            position.top
          )
        ) {
          return;
        }

        const rect =
          element.getBoundingClientRect();

        const maxLeft =
          Math.max(
            8,
            window.innerWidth -
              rect.width -
              8
          );

        const maxTop =
          Math.max(
            8,
            window.innerHeight -
              rect.height -
              8
          );

        const left =
          Math.min(
            Math.max(
              8,
              position.left
            ),
            maxLeft
          );

        const top =
          Math.min(
            Math.max(
              8,
              position.top
            ),
            maxTop
          );

        element.style.left =
          `${left}px`;

        element.style.top =
          `${top}px`;

        element.style.right =
          "auto";

        element.style.bottom =
          "auto";
      } catch (error) {
        console.warn(
          "Unable to restore draggable position.",
          error
        );
      }
    }

    function startDrag(event) {
      if (
        event.type === "mousedown" &&
        event.button !== 0
      ) {
        return;
      }

      /*
       * Don't drag when clicking a button,
       * link, input or textarea inside a handle.
       */
      if (
        event.target.closest(
          "button, a, input, textarea"
        )
      ) {
        return;
      }

      const point =
        event.touches
          ? event.touches[0]
          : event;

      const position =
        getCurrentPosition();

      dragging = true;

      startX =
        point.clientX;

      startY =
        point.clientY;

      startLeft =
        position.left;

      startTop =
        position.top;

      element.style.left =
        `${startLeft}px`;

      element.style.top =
        `${startTop}px`;

      element.style.right =
        "auto";

      element.style.bottom =
        "auto";

      element.classList.add(
        "gunkowii-ai-dragging"
      );

      document.body.classList.add(
        "gunkowii-ai-dragging-page"
      );

      if (
        event.cancelable
      ) {
        event.preventDefault();
      }
    }


    function moveDrag(event) {
      if (!dragging) {
        return;
      }

      const point =
        event.touches
          ? event.touches[0]
          : event;

      const elementRect =
        element.getBoundingClientRect();

      const deltaX =
        point.clientX -
        startX;

      const deltaY =
        point.clientY -
        startY;

      const maxLeft =
        Math.max(
          8,
          window.innerWidth -
            elementRect.width -
            8
        );

      const maxTop =
        Math.max(
          8,
          window.innerHeight -
            elementRect.height -
            8
        );

      const nextLeft =
        Math.min(
          Math.max(
            8,
            startLeft + deltaX
          ),
          maxLeft
        );

      const nextTop =
        Math.min(
          Math.max(
            8,
            startTop + deltaY
          ),
          maxTop
        );

      element.style.left =
        `${nextLeft}px`;

      element.style.top =
        `${nextTop}px`;

      if (
        event.cancelable
      ) {
        event.preventDefault();
      }
    }


    function endDrag() {
      if (!dragging) {
        return;
      }

      dragging = false;

      element.classList.remove(
        "gunkowii-ai-dragging"
      );

      document.body.classList.remove(
        "gunkowii-ai-dragging-page"
      );

      savePosition();
    }


    handle.addEventListener(
      "mousedown",
      startDrag
    );

    document.addEventListener(
      "mousemove",
      moveDrag
    );

    document.addEventListener(
      "mouseup",
      endDrag
    );

    handle.addEventListener(
      "touchstart",
      startDrag,
      {
        passive: false
      }
    );

    document.addEventListener(
      "touchmove",
      moveDrag,
      {
        passive: false
      }
    );

    document.addEventListener(
      "touchend",
      endDrag
    );

    window.addEventListener(
      "resize",
      () => {
        if (!mobile.matches) {
          return;
        }

        /*
         * Keep the element inside the viewport
         * after device rotation/resizing.
         */
        if (
          element.style.left
        ) {
          const rect =
            element.getBoundingClientRect();

          const maxLeft =
            Math.max(
              8,
              window.innerWidth -
                rect.width -
                8
            );

          const maxTop =
            Math.max(
              8,
              window.innerHeight -
                rect.height -
                8
            );

          const left =
            Math.min(
              Math.max(
                8,
                rect.left
              ),
              maxLeft
            );

          const top =
            Math.min(
              Math.max(
                8,
                rect.top
              ),
              maxTop
            );

          element.style.left =
            `${left}px`;

          element.style.top =
            `${top}px`;
        }
      }
    );

    setTimeout(
      restorePosition,
      100
    );
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
      /* =====================================================
         GUNKOWII AI LAUNCHER
         ===================================================== */

      .gunkowii-ai-button {
        position: fixed;

        right: 20px;
        bottom: 20px;

        z-index: 9998;

        display: flex;
        align-items: center;
        gap: 9px;

        padding: 6px 13px 6px 6px;

        border:
          1px solid rgba(11,93,70,.18);

        border-radius: 999px;

        background:
          rgba(255,253,248,.97);

        color: #0b5d46;

        font-family: inherit;
        font-size: 13px;
        font-weight: 800;

        cursor: grab;

        box-shadow:
          0 10px 30px rgba(0,0,0,.16);

        backdrop-filter:
          blur(12px);

        -webkit-backdrop-filter:
          blur(12px);

        transition:
          transform .2s ease,
          box-shadow .2s ease;
      }

      .gunkowii-ai-button:hover {
        transform:
          translateY(-2px);

        box-shadow:
          0 14px 35px rgba(0,0,0,.21);
      }

      .gunkowii-ai-button:active {
        cursor: grabbing;
      }

      .gunkowii-ai-launcher-avatar {
        width: 44px;
        height: 44px;

        flex: 0 0 auto;

        border-radius: 50%;

        object-fit: cover;

        border:
          2px solid #c9a227;

        background: #fff;

        box-shadow:
          0 3px 12px rgba(0,0,0,.16);
      }

      .gunkowii-ai-launcher-label {
        white-space: nowrap;
      }

      .gunkowii-ai-launcher-dot {
        width: 7px;
        height: 7px;

        margin-left: 1px;

        border-radius: 50%;

        background: #28a745;

        box-shadow:
          0 0 0 3px
          rgba(40,167,69,.10);
      }


      /* =====================================================
         GUNKOWII AI WINDOW
         ===================================================== */

      .gunkowii-ai-panel {
        position: fixed;

        right: 20px;
        bottom: 78px;

        width:
          min(400px, calc(100vw - 30px));

        height:
          min(620px, calc(100vh - 110px));

        z-index: 9999;

        display: none;
        flex-direction: column;

        overflow: hidden;

        background:
          #fffdf8;

        border:
          1px solid rgba(11,93,70,.18);

        border-radius: 20px;

        box-shadow:
          0 24px 70px rgba(0,0,0,.24);
      }

      .gunkowii-ai-panel.open {
        display: flex;
        animation:
          gunkowiiAIOpen
          .22s ease;
      }

      @keyframes gunkowiiAIOpen {
        from {
          opacity: 0;
          transform:
            translateY(10px)
            scale(.98);
        }

        to {
          opacity: 1;
          transform:
            translateY(0)
            scale(1);
        }
      }

      .gunkowii-ai-panel.gunkowii-ai-dragging {
        user-select: none;
      }


      /* =====================================================
         AI HEADER
         ===================================================== */

      .gunkowii-ai-header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        padding: 12px 13px;

        background:
          linear-gradient(
            135deg,
            #0b5d46,
            #084936
          );

        color: #fff;

        cursor: grab;

        touch-action: none;
      }

      .gunkowii-ai-header:active {
        cursor: grabbing;
      }

      .gunkowii-ai-brand {
        display: flex;
        align-items: center;
        gap: 10px;

        min-width: 0;
      }

      .gunkowii-ai-avatar {
        width: 43px;
        height: 43px;

        flex: 0 0 auto;

        border-radius: 50%;

        object-fit: cover;

        border:
          2px solid rgba(255,255,255,.85);

        background: #fff;
      }

      .gunkowii-ai-title {
        font-size: 14px;
        font-weight: 900;
        letter-spacing: .2px;
      }

      .gunkowii-ai-status {
        margin-top: 2px;

        font-size: 10px;

        line-height: 1.35;

        opacity: .82;
      }

      .gunkowii-ai-header-actions {
        display: flex;
        align-items: center;
        gap: 5px;

        flex: 0 0 auto;
      }

      .gunkowii-ai-new {
        border: none;

        border-radius: 8px;

        padding: 7px 9px;

        background:
          rgba(255,255,255,.12);

        color: #fff;

        font-family: inherit;

        font-size: 11px;
        font-weight: 800;

        cursor: pointer;
      }

      .gunkowii-ai-new:hover {
        background:
          rgba(255,255,255,.20);
      }

      .gunkowii-ai-close {
        width: 32px;
        height: 32px;

        border: none;

        border-radius: 50%;

        background:
          rgba(255,255,255,.12);

        color: #fff;

        font-size: 19px;

        cursor: pointer;
      }

      .gunkowii-ai-close:hover {
        background:
          rgba(255,255,255,.20);
      }


      /* =====================================================
         AI MESSAGES
         ===================================================== */

      .gunkowii-ai-messages {
        flex: 1;

        overflow-y: auto;

        padding: 16px;

        scroll-behavior: smooth;

        overscroll-behavior:
          contain;
      }

      .gunkowii-ai-message {
        max-width: 90%;

        margin-bottom: 12px;

        padding: 11px 13px;

        border-radius: 15px;

        font-size: 13px;

        line-height: 1.58;

        word-break: break-word;
      }

      .gunkowii-ai-message.ai {
        margin-right: auto;

        background:
          #f1eee6;

        color:
          #242424;

        border:
          1px solid rgba(0,0,0,.045);

        border-top-left-radius: 5px;
      }

      .gunkowii-ai-message.user {
        margin-left: auto;

        background:
          #0b5d46;

        color:
          #fff;

        border-top-right-radius: 5px;
      }

      .gunkowii-ai-message a {
        color:
          #0b5d46;

        font-weight:
          800;

        text-decoration:
          underline;
      }

      .gunkowii-ai-message.user a {
        color:
          #fff;
      }

      .gunkowii-ai-message h2,
      .gunkowii-ai-message h3,
      .gunkowii-ai-message h4 {
        margin:
          4px 0 8px;

        line-height:
          1.3;

        color:
          #0b5d46;

        font-weight:
          900;
      }

      .gunkowii-ai-message.user h2,
      .gunkowii-ai-message.user h3,
      .gunkowii-ai-message.user h4 {
        color:
          #fff;
      }

      .gunkowii-ai-message ul,
      .gunkowii-ai-message ol {
        margin:
          7px 0 8px;

        padding-left:
          20px;
      }

      .gunkowii-ai-message li {
        margin:
          3px 0;
      }

      .gunkowii-ai-paragraph {
        margin:
          0 0 6px;
      }

      .gunkowii-ai-paragraph:last-child {
        margin-bottom:
          0;
      }

      .gunkowii-ai-space {
        height:
          7px;
      }


      /* =====================================================
         TYPING
         ===================================================== */

      .gunkowii-ai-typing {
        display: flex;

        align-items: center;

        gap: 4px;

        width: fit-content;

        min-width: 45px;
      }

      .gunkowii-ai-typing span {
        width: 6px;
        height: 6px;

        border-radius: 50%;

        background:
          #777;

        animation:
          gunkowiiTyping
          1.2s infinite;
      }

      .gunkowii-ai-typing span:nth-child(2) {
        animation-delay:
          .15s;
      }

      .gunkowii-ai-typing span:nth-child(3) {
        animation-delay:
          .30s;
      }

      @keyframes gunkowiiTyping {
        0%, 60%, 100% {
          opacity: .35;
          transform:
            translateY(0);
        }

        30% {
          opacity: 1;
          transform:
            translateY(-3px);
        }
      }


      /* =====================================================
         HANDOFF
         ===================================================== */

      .gunkowii-ai-handoff {
        margin:
          14px 0 5px;

        padding:
          14px;

        border-radius:
          14px;

        background:
          linear-gradient(
            135deg,
            #f8f0d3,
            #fff9e8
          );

        border:
          1px solid
          rgba(201,162,39,.38);

        color:
          #222;

        font-size:
          13px;

        line-height:
          1.55;

        box-shadow:
          0 6px 18px
          rgba(201,162,39,.08);
      }

      .gunkowii-ai-handoff-title {
        margin-bottom:
          7px;

        color:
          #0b5d46;

        font-weight:
          900;
      }

      .gunkowii-ai-handoff-text {
        margin-bottom:
          8px;
      }

      .gunkowii-ai-handoff-button {
        display:
          inline-block;

        margin-top:
          4px;

        padding:
          10px 14px;

        border-radius:
          10px;

        background:
          #0b5d46;

        color:
          #fff !important;

        text-decoration:
          none !important;

        font-weight:
          800;

        box-shadow:
          0 5px 15px
          rgba(11,93,70,.18);
      }


      /* =====================================================
         INPUT
         ===================================================== */

      .gunkowii-ai-input-area {
        display:
          flex;

        gap:
          8px;

        padding:
          11px;

        border-top:
          1px solid
          rgba(0,0,0,.08);

        background:
          #fff;
      }

      .gunkowii-ai-input {
        flex:
          1;

        min-width:
          0;

        resize:
          none;

        border:
          1px solid
          #d9d4c9;

        border-radius:
          12px;

        padding:
          10px 12px;

        font-family:
          inherit;

        font-size:
          13px;

        line-height:
          1.45;

        outline:
          none;
      }

      .gunkowii-ai-input:focus {
        border-color:
          #0b5d46;

        box-shadow:
          0 0 0 3px
          rgba(11,93,70,.07);
      }

      .gunkowii-ai-send {
        align-self:
          flex-end;

        border:
          none;

        border-radius:
          12px;

        padding:
          10px 14px;

        background:
          #c9a227;

        color:
          #171717;

        font-weight:
          900;

        cursor:
          pointer;
      }

      .gunkowii-ai-send:hover {
        filter:
          brightness(.96);
      }

      .gunkowii-ai-send:disabled {
        opacity:
          .5;

        cursor:
          not-allowed;
      }


      /* =====================================================
         LIVE ACTIVITY POPUP
         ===================================================== */

      .gunkowii-live-activity {
        position:
          fixed;

        left:
          18px;

        bottom:
          18px;

        z-index:
          9990;

        width:
          min(370px, calc(100vw - 36px));

        min-height:
          64px;

        padding:
          10px 12px;

        display:
          flex;

        align-items:
          center;

        gap:
          10px;

        background:
          rgba(255,253,248,.97);

        border:
          1px solid
          rgba(11,93,70,.14);

        border-radius:
          16px;

        box-shadow:
          0 15px 40px
          rgba(0,0,0,.17);

        backdrop-filter:
          blur(12px);

        -webkit-backdrop-filter:
          blur(12px);

        transform:
          translateX(-24px);

        opacity:
          0;

        transition:
          opacity .35s ease,
          transform .35s ease;

        cursor:
          pointer;
      }

      .gunkowii-live-activity.show {
        opacity:
          1;

        transform:
          translateX(0);
      }

      .gunkowii-live-icon {
        width:
          38px;

        height:
          38px;

        flex:
          0 0 auto;

        display:
          flex;

        align-items:
          center;

        justify-content:
          center;

        border-radius:
          50%;

        background:
          #0b5d46;

        color:
          #fff;

        font-size:
          16px;

        box-shadow:
          0 4px 12px
          rgba(11,93,70,.18);
      }

      .gunkowii-live-content {
        min-width:
          0;

        flex:
          1;
      }

      .gunkowii-live-title {
        color:
          #0b5d46;

        font-size:
          12px;

        font-weight:
          900;

        margin-bottom:
          2px;
      }

      .gunkowii-live-text {
        color:
          #555;

        font-size:
          11px;

        line-height:
          1.4;
      }

      .gunkowii-live-close {
        width:
          26px;

        height:
          26px;

        flex:
          0 0 auto;

        border:
          none;

        border-radius:
          50%;

        background:
          transparent;

        color:
          #888;

        cursor:
          pointer;

        font-size:
          17px;
      }

      .gunkowii-live-close:hover {
        background:
          rgba(0,0,0,.05);
      }


      /* =====================================================
         CONTACT NAVIGATION CTA
         ===================================================== */

      .gunkowii-contact-nav-cta {
        display:
          inline-flex !important;

        align-items:
          center;

        justify-content:
          center;

        padding:
          9px 16px !important;

        border-radius:
          999px !important;

        background:
          #0b5d46 !important;

        color:
          #fff !important;

        font-weight:
          800 !important;

        line-height:
          1 !important;

        box-shadow:
          0 5px 16px
          rgba(11,93,70,.15);

        transition:
          transform .2s ease,
          box-shadow .2s ease,
          opacity .2s ease;
      }

      .gunkowii-contact-nav-cta:hover {
        transform:
          translateY(-1px);

        box-shadow:
          0 8px 20px
          rgba(11,93,70,.22);

        opacity:
          .95;
      }


      /* =====================================================
         DRAGGING
         ===================================================== */

      body.gunkowii-ai-dragging-page {
        user-select:
          none;
      }


      /* =====================================================
         MOBILE
         ===================================================== */

      @media (max-width: 600px) {

        .gunkowii-ai-button {
          right:
            12px;

          bottom:
            12px;

          padding:
            5px 11px 5px 5px;
        }

        .gunkowii-ai-launcher-avatar {
          width:
            42px;

          height:
            42px;
        }

        .gunkowii-ai-launcher-label {
          font-size:
            12px;
        }

        .gunkowii-ai-panel {
          right:
            10px;

          bottom:
            66px;

          width:
            calc(100vw - 20px);

          height:
            calc(100vh - 86px);

          border-radius:
            16px;
        }

        .gunkowii-ai-status {
          max-width:
            180px;
        }

        .gunkowii-ai-new {
          padding:
            6px 7px;

          font-size:
            10px;
        }

        .gunkowii-live-activity {
          left:
            12px;

          bottom:
            12px;

          width:
            calc(100vw - 24px);
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }


  /* =========================================================
     CONTACT MENU CTA
     ========================================================= */

  function restoreContactMenuButton() {
    const links =
      document.querySelectorAll(
        "a"
      );

    links.forEach((link) => {
      const text =
        link.textContent
          .trim()
          .toLowerCase();

      if (
        text === "contact" ||
        text === "contact us"
      ) {
        link.classList.add(
          "gunkowii-contact-nav-cta"
        );
      }
    });
  }


  /* =========================================================
     CREATE AI PANEL
     ========================================================= */

  function createAIPanel() {
    const existingPanel =
      document.getElementById(
        "gunkowii-ai-panel"
      );

    const existingButton =
      document.querySelector(
        ".gunkowii-ai-button"
      );

    if (
      existingPanel &&
      existingButton
    ) {
      aiPanel =
        existingPanel;

      aiButton =
        existingButton;

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


    /* =======================================================
       AI LAUNCHER
       ======================================================= */

    const button =
      document.createElement("button");

    button.className =
      "gunkowii-ai-button";

    button.type =
      "button";

    button.setAttribute(
      "aria-label",
      "Open GUNKOWII AI"
    );

    button.innerHTML = `
      <img
        class="gunkowii-ai-launcher-avatar"
        src="Screenshot_2026-09-04-12-55-24-480_com.openai.chatgpt-edit.jpg"
        alt="GUNKOWII AI"
      >

      <span class="gunkowii-ai-launcher-dot"></span>

      <span class="gunkowii-ai-launcher-label">
        Ask GUNKOWII AI
      </span>
    `;

    document.body.appendChild(
      button
    );

    aiButton =
      button;


    /* =======================================================
       AI PANEL
       ======================================================= */

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

        <div class="gunkowii-ai-header-actions">

          <button
            type="button"
            class="gunkowii-ai-new"
            title="Start a new chat"
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


    /* =======================================================
       OPEN AI
       ======================================================= */

    button.addEventListener(
      "click",
      (event) => {
        /*
         * Don't open when the visitor was
         * simply dragging the launcher.
         */
        if (
          button.dataset.wasDragged ===
          "1"
        ) {
          button.dataset.wasDragged =
            "0";

          return;
        }

        aiPanel.classList.add(
          "open"
        );

        if (
          aiInput &&
          !aiInput.disabled
        ) {
          setTimeout(
            () => aiInput.focus(),
            50
          );
        }
      }
    );


    /* =======================================================
       CLOSE
       ======================================================= */

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


    /* =======================================================
       NEW CHAT
       ======================================================= */

    const newChatButton =
      panel.querySelector(
        ".gunkowii-ai-new"
      );

    newChatButton.addEventListener(
      "click",
      () => {
        if (aiBusy) {
          return;
        }

        const confirmed =
          window.confirm(
            "Start a new GUNKOWII AI chat? Your current conversation will be cleared."
          );

        if (!confirmed) {
          return;
        }

        clearAIConversation();

        if (aiInput) {
          aiInput.value = "";
          aiInput.focus();
        }
      }
    );


    /* =======================================================
       FORM SUBMIT
       ======================================================= */

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


    /* =======================================================
       ENTER TO SEND
       ======================================================= */

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


    /* =======================================================
       INITIAL CONTENT
       ======================================================= */

    if (
      aiConversation.length === 0
    ) {
      addAIMessage(
        `Hi, I'm GUNKOWII AI.

I can help you with Shopify, Etsy, e-commerce, SEO, CRO, digital marketing, email marketing, and website issues.

If you're dealing with a specific store or shop problem, send me the URL and I'll take a look.`,
        "ai"
      );
    } else {
      restoreConversationToPanel();
    }


    /* =======================================================
       MAKE LAUNCHER MOVABLE
       ======================================================= */

    makeDraggable(
      button,
      button,
      AI_POSITION_KEY
    );


    /*
     * Detect whether launcher movement actually happened.
     */
    let launcherStartX = 0;
    let launcherStartY = 0;
    let launcherMoved = false;

    function launcherPointerDown(event) {
      const point =
        event.touches
          ? event.touches[0]
          : event;

      launcherStartX =
        point.clientX;

      launcherStartY =
        point.clientY;

      launcherMoved =
        false;
    }

    function launcherPointerMove(event) {
      const point =
        event.touches
          ? event.touches[0]
          : event;

      if (
        Math.abs(
          point.clientX -
          launcherStartX
        ) > 6 ||
        Math.abs(
          point.clientY -
          launcherStartY
        ) > 6
      ) {
        launcherMoved =
          true;
      }
    }

    function launcherPointerUp() {
      if (launcherMoved) {
        button.dataset.wasDragged =
          "1";
      }
    }

    button.addEventListener(
      "mousedown",
      launcherPointerDown
    );

    button.addEventListener(
      "mousemove",
      launcherPointerMove
    );

    button.addEventListener(
      "mouseup",
      launcherPointerUp
    );

    button.addEventListener(
      "touchstart",
      launcherPointerDown,
      {
        passive: true
      }
    );

    button.addEventListener(
      "touchmove",
      launcherPointerMove,
      {
        passive: true
      }
    );

    button.addEventListener(
      "touchend",
      launcherPointerUp
    );


    /* =======================================================
       MAKE PANEL MOVABLE BY HEADER
       ======================================================= */

    const header =
      panel.querySelector(
        ".gunkowii-ai-header"
      );

    makeDraggable(
      panel,
      header,
      AI_PANEL_POSITION_KEY
    );
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

  const liveActivities = [
    {
      title:
        "Client Feedback",

      text:
        "Professional feedback from recent project work.",

      url:
        "reviews.html",

      icon:
        "✓"
    },

    {
      title:
        "Shopify Work",

      text:
        "Shopify optimization and e-commerce growth work.",

      url:
        "services.html",

      icon:
        "◆"
    },

    {
      title:
        "Etsy Growth",

      text:
        "Etsy listing, visibility and growth opportunities.",

      url:
        "services.html",

      icon:
        "✦"
    },

    {
      title:
        "CRO Insight",

      text:
        "Conversion opportunities can often be found beyond store design.",

      url:
        "audit.html",

      icon:
        "↗"
    },

    {
      title:
        "SEO Focus",

      text:
        "Search visibility is part of a complete e-commerce growth strategy.",

      url:
        "services.html",

      icon:
        "⌕"
    },

    {
      title:
        "Growth Strategy",

      text:
        "A structured approach connects traffic, UX, trust, conversion and retention.",

      url:
        "process.html",

      icon:
        "↗"
    },

    {
      title:
        "Featured Project",

      text:
        "Explore real e-commerce and digital projects.",

      url:
        "portfolio.html",

      icon:
        "★"
    },

    {
      title:
        "Available",

      text:
        "Professional project and collaboration inquiries are welcome.",

      url:
        "contact.html",

      icon:
        "●"
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
      <div class="gunkowii-live-icon">
        ${escapeHTML(item.icon)}
      </div>

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

        hideLiveActivity(
          true
        );
      }
    );


    requestAnimationFrame(() => {
      activity.classList.add(
        "show"
      );
    });


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
    permanently = false
  ) {
    if (!activityElement) {
      return;
    }

    activityElement.classList.remove(
      "show"
    );

    if (permanently) {
      try {
        sessionStorage.setItem(
          "gunkowii_live_activity_closed",
          "1"
        );
      } catch (error) {
        console.warn(
          "Unable to save activity close state.",
          error
        );
      }

      if (activityTimer) {
        clearInterval(
          activityTimer
        );

        activityTimer =
          null;
      }
    }

    const elementToRemove =
      activityElement;

    setTimeout(() => {
      if (
        elementToRemove &&
        elementToRemove.parentNode
      ) {
        elementToRemove.remove();
      }

      if (
        activityElement ===
        elementToRemove
      ) {
        activityElement =
          null;
      }
    }, 400);
  }


  function startLiveActivity() {
    try {
      if (
        sessionStorage.getItem(
          "gunkowii_live_activity_closed"
        ) === "1"
      ) {
        return;
      }
    } catch (error) {
      console.warn(
        "Unable to read activity state.",
        error
      );
    }

    setTimeout(() => {
      createLiveActivity();

      activityTimer =
        setInterval(() => {
          hideLiveActivity(
            false
          );

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

    window.GunkowiiAIHandoff =
      handoff;

    document.body.classList.add(
      "gunkowii-ai-handoff-page"
    );

    window.dispatchEvent(
      new CustomEvent(
        "gunkowiiAIHandoffReady",
        {
          detail:
            handoff
        }
      )
    );
  }


  /* =========================================================
     BUILD WHATSAPP HANDOFF
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

          return (
            `${role}: ${message.content}`
          );
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

      /*
       * Fallback for browsers where
       * navigator.clipboard is unavailable.
       */
      try {
        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value =
          message;

        textarea.style.position =
          "fixed";

        textarea.style.left =
          "-9999px";

        textarea.style.top =
          "0";

        document.body.appendChild(
          textarea
        );

        textarea.focus();

        textarea.select();

        document.execCommand(
          "copy"
        );

        textarea.remove();
      } catch (fallbackError) {
        console.warn(
          "Clipboard fallback failed.",
          fallbackError
        );
      }

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

    createAIPanel();

    restoreContactMenuButton();

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