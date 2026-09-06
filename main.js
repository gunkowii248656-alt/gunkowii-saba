document.addEventListener("DOMContentLoaded", function () {

  /* =====================================================
     GUNKOWII SABA — LIVE ACTIVITY POPUP
     ===================================================== */

  const liveActivities = [
    {
      icon: "⭐",
      label: "Client Feedback",
      text: "Professional communication and practical Shopify optimization.",
      link: "reviews.html",
      linkText: "View Reviews"
    },

    {
      icon: "🛒",
      label: "Shopify Work",
      text: "Helping e-commerce stores improve structure, UX and conversion opportunities.",
      link: "services.html",
      linkText: "Explore Shopify"
    },

    {
      icon: "🎨",
      label: "Etsy Growth",
      text: "Improving product presentation, visibility and customer experience on Etsy.",
      link: "services.html",
      linkText: "Explore Etsy"
    },

    {
      icon: "📈",
      label: "CRO Insight",
      text: "More traffic is not always the answer. Improving the customer journey can make existing traffic more valuable.",
      link: "audit.html",
      linkText: "Get a Free Audit"
    },

    {
      icon: "🔎",
      label: "SEO Focus",
      text: "Strong e-commerce SEO connects search visibility with better product and collection experiences.",
      link: "services.html",
      linkText: "Explore SEO"
    },

    {
      icon: "🚀",
      label: "Growth Strategy",
      text: "Traffic → UX → Trust → Product → Conversion → Retention.",
      link: "process.html",
      linkText: "See the Process"
    },

    {
      icon: "💻",
      label: "Featured Project",
      text: "MANBAUL ANWAR Arabic School Management System combines technology with real organizational needs.",
      link: "portfolio.html",
      linkText: "View Portfolio"
    },

    {
      icon: "🤝",
      label: "Available",
      text: "GUNKOWII SABA is open to professional e-commerce, marketing and digital projects.",
      link: "contact.html",
      linkText: "Start a Project"
    }
  ];


  /* =====================================================
     GUNKOWII AI — PROFILE IMAGE
     ===================================================== */

  const aiProfileImage =
    "Screenshot_2026-09-04-12-55-24-480_com.openai.chatgpt-edit.jpg";


  /* =====================================================
     GUNKOWII AI — CLOUDFLARE WORKER
     ===================================================== */

  const AI_WORKER_URL =
    "https://gunkowii-ai.gunkowii248656.workers.dev/";


  /* =====================================================
     GUNKOWII AI — CONVERSATION MEMORY
     ===================================================== */

  const AI_MEMORY_KEY =
    "gunkowii_ai_conversation";

  let aiConversation = [];

  function loadAIConversation() {

    try {

      const saved =
        localStorage.getItem(
          AI_MEMORY_KEY
        );

      if (!saved) {
        return [];
      }

      const parsed =
        JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(function (item) {

        return (
          item &&
          typeof item.role === "string" &&
          typeof item.content === "string"
        );

      });

    } catch (error) {

      console.warn(
        "Unable to load GUNKOWII AI conversation.",
        error
      );

      return [];

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

      localStorage.removeItem(
        AI_MEMORY_KEY
      );

    } catch (error) {

      console.warn(
        "Unable to clear GUNKOWII AI conversation.",
        error
      );

    }

  }


  aiConversation =
    loadAIConversation();


  /* =====================================================
     LIVE POPUP + AI STYLES
     ===================================================== */

  const popupStyles = document.createElement("style");

  popupStyles.textContent = `

    .gunkowii-live-popup {
      position: fixed;
      left: 24px;
      bottom: 24px;
      width: 350px;
      max-width: calc(100vw - 32px);
      background: #fffdf8;
      color: #24342e;
      border: 1px solid #c9a227;
      border-radius: 16px;
      padding: 18px;
      z-index: 99999;
      box-shadow: 0 18px 45px rgba(0,0,0,.20);
      opacity: 0;
      visibility: hidden;
      transform: translateY(25px) scale(.96);
      transition:
        opacity .4s ease,
        transform .4s ease,
        visibility .4s ease;
    }

    .gunkowii-live-popup.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    .gunkowii-live-top {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 13px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.8px;
      color: #063d2e;
    }

    .gunkowii-live-status {
      width: 8px;
      height: 8px;
      background: #c9a227;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(201,162,39,.15);
      animation: gunkowiiLivePulse 1.6s infinite;
    }

    .gunkowii-live-content {
      display: flex;
      align-items: flex-start;
      gap: 13px;
    }

    .gunkowii-live-icon {
      width: 43px;
      height: 43px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #063d2e;
      color: #e3c65a;
      border-radius: 12px;
      font-size: 19px;
    }

    .gunkowii-live-text {
      flex: 1;
    }

    .gunkowii-live-label {
      color: #063d2e;
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .gunkowii-live-message {
      color: #6b7771;
      font-size: 13px;
      line-height: 1.55;
      margin: 0 0 8px;
    }

    .gunkowii-live-link {
      display: inline-block;
      color: #927116;
      font-size: 12px;
      font-weight: 800;
      border-bottom: 1px solid #c9a227;
      transition: .3s ease;
    }

    .gunkowii-live-link:hover {
      color: #063d2e;
    }

    .gunkowii-live-close {
      position: absolute;
      top: 8px;
      right: 10px;
      width: 25px;
      height: 25px;
      border: none;
      background: transparent;
      color: #6d7771;
      font-size: 21px;
      line-height: 1;
      cursor: pointer;
      transition: .3s ease;
    }

    .gunkowii-live-close:hover {
      color: #063d2e;
    }

    @keyframes gunkowiiLivePulse {
      0% {
        box-shadow: 0 0 0 0 rgba(201,162,39,.45);
      }

      70% {
        box-shadow: 0 0 0 7px rgba(201,162,39,0);
      }

      100% {
        box-shadow: 0 0 0 0 rgba(201,162,39,0);
      }
    }


    /* =====================================================
       GUNKOWII AI BUTTON
       ===================================================== */

    .gunkowii-ai-button {
      position: fixed;
      right: 24px;
      bottom: 24px;
      width: 62px;
      height: 62px;
      padding: 0;
      border: 2px solid #d4af37;
      border-radius: 50%;
      background: #063d2e;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      overflow: visible;
      z-index: 100000;
      box-shadow:
        0 12px 35px rgba(0,0,0,.22);
      transition:
        transform .3s ease,
        box-shadow .3s ease;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .gunkowii-ai-button:active {
      cursor: grabbing;
    }

    .gunkowii-ai-button.dragging {
      cursor: grabbing;
      transition: none;
      transform: scale(1.03);
    }

    .gunkowii-ai-button:hover {
      transform: translateY(-4px) scale(1.04);
      box-shadow:
        0 18px 40px rgba(0,0,0,.28);
    }

    .gunkowii-ai-button.dragging:hover {
      transform: scale(1.03);
    }

    .gunkowii-ai-button img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      border-radius: 50%;
      pointer-events: none;
    }

    .gunkowii-ai-button::after {
      content: "";
      position: absolute;
      width: 10px;
      height: 10px;
      right: 1px;
      top: 1px;
      background: #d4af37;
      border: 2px solid #fffdf8;
      border-radius: 50%;
      box-shadow:
        0 0 0 4px rgba(212,175,55,.15);
      animation: gunkowiiAiPulse 1.8s infinite;
      pointer-events: none;
    }

    @keyframes gunkowiiAiPulse {

      0% {
        box-shadow:
          0 0 0 0 rgba(212,175,55,.45);
      }

      70% {
        box-shadow:
          0 0 0 7px rgba(212,175,55,0);
      }

      100% {
        box-shadow:
          0 0 0 0 rgba(212,175,55,0);
      }

    }


    /* =====================================================
       GUNKOWII AI CHAT WINDOW
       ===================================================== */

    .gunkowii-ai-chat {
      position: fixed;
      right: 24px;
      bottom: 98px;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 560px;
      max-height: calc(100vh - 125px);
      background: #fffdf8;
      border:
        1px solid rgba(212,175,55,.65);
      border-radius: 18px;
      overflow: hidden;
      z-index: 100001;
      box-shadow:
        0 25px 65px rgba(0,0,0,.25);
      opacity: 0;
      visibility: hidden;
      transform:
        translateY(20px)
        scale(.97);
      transition:
        opacity .3s ease,
        visibility .3s ease,
        transform .3s ease;
      display: flex;
      flex-direction: column;
    }

    .gunkowii-ai-chat.open {
      opacity: 1;
      visibility: visible;
      transform:
        translateY(0)
        scale(1);
    }

    .gunkowii-ai-chat.dragging {
      transition: none;
    }


    /* =====================================================
       AI HEADER
       ===================================================== */

    .gunkowii-ai-header {
      background: #063d2e;
      color: #fff;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom:
        1px solid rgba(212,175,55,.4);
      cursor: grab;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .gunkowii-ai-header:active {
      cursor: grabbing;
    }

    .gunkowii-ai-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: none;
    }

    .gunkowii-ai-avatar {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #d4af37;
      overflow: hidden;
      border: 2px solid #e3c65a;
      box-shadow:
        0 3px 12px rgba(0,0,0,.22);
    }

    .gunkowii-ai-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .gunkowii-ai-title {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 2px;
    }

    .gunkowii-ai-status {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #dce5e0;
      font-size: 11px;
    }

    .gunkowii-ai-status-dot {
      width: 6px;
      height: 6px;
      background: #d4af37;
      border-radius: 50%;
    }

    .gunkowii-ai-close {
      width: 30px;
      height: 30px;
      border: none;
      background: transparent;
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      border-radius: 6px;
      transition: .2s ease;
      position: relative;
      z-index: 2;
      touch-action: manipulation;
    }

    .gunkowii-ai-close:hover {
      background: rgba(255,255,255,.1);
    }


    /* =====================================================
       NEW CHAT BUTTON
       ===================================================== */

    .gunkowii-ai-new-chat {
      border: 1px solid rgba(212,175,55,.55);
      background: transparent;
      color: #e3c65a;
      padding: 6px 9px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
      transition: .2s ease;
      margin-left: 5px;
    }

    .gunkowii-ai-new-chat:hover {
      background: #d4af37;
      color: #063d2e;
    }


    /* =====================================================
       AI MESSAGES
       ===================================================== */

    .gunkowii-ai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 18px;
      background: #f7f2e8;
    }

    .gunkowii-ai-message {
      max-width: 88%;
      padding: 12px 14px;
      margin-bottom: 12px;
      border-radius: 13px;
      font-size: 13px;
      line-height: 1.55;
    }

    .gunkowii-ai-message.bot {
      background: #fff;
      color: #35463f;
      border:
        1px solid #e4dac8;
      border-top-left-radius: 4px;
    }

    .gunkowii-ai-message.user {
      margin-left: auto;
      background: #063d2e;
      color: #fff;
      border-top-right-radius: 4px;
      white-space: pre-wrap;
    }

    .gunkowii-ai-message a {
      color: #927116;
      font-weight: 800;
      text-decoration: underline;
      word-break: break-word;
    }


    /* =====================================================
       AI TYPING
       ===================================================== */

    .gunkowii-ai-typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .gunkowii-ai-typing span {
      width: 6px;
      height: 6px;
      background: #927116;
      border-radius: 50%;
      animation: gunkowiiTyping 1.2s infinite;
    }

    .gunkowii-ai-typing span:nth-child(2) {
      animation-delay: .15s;
    }

    .gunkowii-ai-typing span:nth-child(3) {
      animation-delay: .30s;
    }

    @keyframes gunkowiiTyping {

      0%, 60%, 100% {
        opacity: .3;
        transform: translateY(0);
      }

      30% {
        opacity: 1;
        transform: translateY(-3px);
      }

    }


    /* =====================================================
       QUICK QUESTIONS
       ===================================================== */

    .gunkowii-ai-quick {
      padding: 10px 14px;
      display: flex;
      gap: 7px;
      overflow-x: auto;
      background: #fffdf8;
      border-top:
        1px solid #e7dece;
    }

    .gunkowii-ai-quick button {
      flex-shrink: 0;
      border:
        1px solid #c9a227;
      background: #fff;
      color: #063d2e;
      padding: 8px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: .2s ease;
    }

    .gunkowii-ai-quick button:hover {
      background: #063d2e;
      color: #fff;
    }


    /* =====================================================
       AI INPUT
       ===================================================== */

    .gunkowii-ai-input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: #fff;
      border-top:
        1px solid #e7dece;
    }

    .gunkowii-ai-input {
      flex: 1;
      min-width: 0;
      border:
        1px solid #d8cdbb;
      border-radius: 10px;
      padding: 11px 12px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #24342e;
      background: #fffdf8;
      outline: none;
    }

    .gunkowii-ai-input:focus {
      border-color: #c9a227;
      box-shadow:
        0 0 0 3px rgba(201,162,39,.10);
    }

    .gunkowii-ai-send {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border: none;
      border-radius: 10px;
      background: #063d2e;
      color: #e3c65a;
      font-size: 17px;
      font-weight: bold;
      cursor: pointer;
      transition: .2s ease;
    }

    .gunkowii-ai-send:hover {
      background: #0b503e;
    }

    .gunkowii-ai-send:disabled {
      opacity: .55;
      cursor: wait;
    }

    .gunkowii-ai-note {
      text-align: center;
      background: #fff;
      color: #8a928d;
      font-size: 9px;
      padding:
        0 12px 10px;
    }


    /* =====================================================
       MOBILE
       ===================================================== */

    @media (max-width: 600px) {

      .gunkowii-live-popup {
        left: 16px;
        right: 16px;
        bottom: 16px;
        width: auto;
        max-width: none;
        padding: 16px;
      }

      .gunkowii-live-icon {
        width: 39px;
        height: 39px;
        font-size: 17px;
      }

      .gunkowii-live-message {
        font-size: 12.5px;
      }

      .gunkowii-ai-button {
        right: 18px;
        bottom: 18px;
        width: 56px;
        height: 56px;
      }

      .gunkowii-ai-chat {
        right: 16px;
        left: 16px;
        bottom: 86px;
        width: auto;
        height: 530px;
        max-height:
          calc(100vh - 105px);
        border-radius: 16px;
      }

    }

  `;

  document.head.appendChild(popupStyles);


  /* =====================================================
     CREATE LIVE ACTIVITY POPUP
     ===================================================== */

  const popup =
    document.createElement("div");

  popup.className =
    "gunkowii-live-popup";

  popup.innerHTML = `

    <button
      class="gunkowii-live-close"
      aria-label="Close notification">
      ×
    </button>

    <div class="gunkowii-live-top">
      <span class="gunkowii-live-status"></span>
      <span>LIVE ACTIVITY</span>
    </div>

    <div class="gunkowii-live-content">

      <div class="gunkowii-live-icon">
        ⭐
      </div>

      <div class="gunkowii-live-text">

        <div class="gunkowii-live-label">
          Client Feedback
        </div>

        <p class="gunkowii-live-message">
          Professional communication and practical Shopify optimization.
        </p>

        <a
          href="reviews.html"
          class="gunkowii-live-link">
          View Reviews →
        </a>

      </div>

    </div>

  `;

  document.body.appendChild(popup);


  const icon =
    popup.querySelector(".gunkowii-live-icon");

  const label =
    popup.querySelector(".gunkowii-live-label");

  const message =
    popup.querySelector(".gunkowii-live-message");

  const link =
    popup.querySelector(".gunkowii-live-link");

  const closeButton =
    popup.querySelector(".gunkowii-live-close");


  let currentActivity = 0;
  let popupTimer = null;
  let rotationTimer = null;
  let manuallyClosed = false;


  function loadActivity(index) {

    const activity =
      liveActivities[index];

    icon.textContent =
      activity.icon;

    label.textContent =
      activity.label;

    message.textContent =
      activity.text;

    link.textContent =
      activity.linkText + " →";

    link.href =
      activity.link;
  }


  function showPopup() {

    if (manuallyClosed) {
      return;
    }

    popup.classList.add("show");

    clearTimeout(popupTimer);

    popupTimer =
      setTimeout(function () {

        popup.classList.remove("show");

      }, 7000);
  }


  function hidePopup() {

    popup.classList.remove("show");

  }


  function nextActivity() {

    hidePopup();

    setTimeout(function () {

      currentActivity++;

      if (
        currentActivity >=
        liveActivities.length
      ) {
        currentActivity = 0;
      }

      loadActivity(currentActivity);

      showPopup();

    }, 500);

  }


  closeButton.addEventListener(
    "click",
    function () {

      manuallyClosed = true;

      hidePopup();

      clearTimeout(popupTimer);

      clearInterval(rotationTimer);

    }
  );


  loadActivity(currentActivity);


  setTimeout(function () {

    showPopup();

    rotationTimer =
      setInterval(
        function () {

          nextActivity();

        },
        12000
      );

  }, 4000);


  /* =====================================================
     CREATE AI BUTTON
     ===================================================== */

  const aiButton =
    document.createElement("button");

  aiButton.className =
    "gunkowii-ai-button";

  aiButton.setAttribute(
    "aria-label",
    "Open GUNKOWII AI"
  );

  aiButton.innerHTML = `
    <img
      src="${aiProfileImage}"
      alt="GUNKOWII SABA"
    >
  `;

  document.body.appendChild(aiButton);


  /* =====================================================
     CREATE AI CHAT
     ===================================================== */

  const aiChat =
    document.createElement("div");

  aiChat.className =
    "gunkowii-ai-chat";

  aiChat.innerHTML = `

    <div class="gunkowii-ai-header">

      <div class="gunkowii-ai-brand">

        <div class="gunkowii-ai-avatar">
          <img
            src="${aiProfileImage}"
            alt="GUNKOWII SABA"
          >
        </div>

        <div>

          <div class="gunkowii-ai-title">
            GUNKOWII AI
          </div>

          <div class="gunkowii-ai-status">

            <span class="gunkowii-ai-status-dot"></span>

            E-commerce Growth Assistant

          </div>

        </div>

      </div>


      <div style="
        display:flex;
        align-items:center;
        gap:4px;
      ">

        <button
          class="gunkowii-ai-new-chat"
          type="button"
          title="Start a new conversation">
          New Chat
        </button>

        <button
          class="gunkowii-ai-close"
          aria-label="Close GUNKOWII AI"
          type="button">
          ×
        </button>

      </div>

    </div>


    <div class="gunkowii-ai-messages">
    </div>


    <div class="gunkowii-ai-quick">

      <button data-question="How can you help with Shopify?">
        Shopify
      </button>

      <button data-question="How can you help with Etsy?">
        Etsy
      </button>

      <button data-question="What is CRO?">
        CRO
      </button>

      <button data-question="Which service is right for me?">
        Services
      </button>

      <button data-question="How can I get an audit?">
        Free Audit
      </button>

    </div>


    <div class="gunkowii-ai-input-area">

      <input
        type="text"
        class="gunkowii-ai-input"
        placeholder="Ask GUNKOWII AI..."
        autocomplete="off">

      <button
        class="gunkowii-ai-send"
        aria-label="Send message"
        type="button">
        ➤
      </button>

    </div>


    <div class="gunkowii-ai-note">
      GUNKOWII AI • E-commerce & Digital Growth
    </div>

  `;

  document.body.appendChild(aiChat);


  /* =====================================================
     AI ELEMENTS
     ===================================================== */

  const aiClose =
    aiChat.querySelector(
      ".gunkowii-ai-close"
    );

  const aiNewChat =
    aiChat.querySelector(
      ".gunkowii-ai-new-chat"
    );

  const aiMessages =
    aiChat.querySelector(
      ".gunkowii-ai-messages"
    );

  const aiInput =
    aiChat.querySelector(
      ".gunkowii-ai-input"
    );

  const aiSend =
    aiChat.querySelector(
      ".gunkowii-ai-send"
    );

  const quickButtons =
    aiChat.querySelectorAll(
      ".gunkowii-ai-quick button"
    );


  /* =====================================================
     INITIAL AI MESSAGE
     ===================================================== */

  const welcomeMessage = `
    👋 Welcome to GUNKOWII AI.

    <br><br>

    I’m the digital assistant for
    <strong>GUNKOWII SABA</strong>.

    <br><br>

    You can ask about Shopify, Etsy,
    SEO, CRO, digital marketing,
    e-commerce growth, or the services
    available here.

    <br><br>

    What would you like to explore?
  `;


  const returningMessage = `
    👋 Welcome back.

    <br><br>

    I remember our previous conversation,
    so you don't need to repeat everything.

    <br><br>

    We can continue from where we stopped,
    or you can choose <strong>New Chat</strong>
    above to start fresh.

    <br><br>

    What would you like to continue with?
  `;


  function renderSavedConversation() {

    aiMessages.innerHTML = "";

    if (aiConversation.length === 0) {

      const welcome =
        document.createElement("div");

      welcome.className =
        "gunkowii-ai-message bot";

      welcome.innerHTML =
        welcomeMessage;

      aiMessages.appendChild(
        welcome
      );

      return;

    }


    const returning =
      document.createElement("div");

    returning.className =
      "gunkowii-ai-message bot";

    returning.innerHTML =
      returningMessage;

    aiMessages.appendChild(
      returning
    );


    aiConversation.forEach(
      function (item) {

        addMessage(
          item.content,
          item.role === "user"
            ? "user"
            : "bot",
          false
        );

      }
    );

  }


  /* =====================================================
     ADD MESSAGE
     ===================================================== */

  function addMessage(
    text,
    type,
    saveToMemory = true
  ) {

    const message =
      document.createElement("div");

    message.className =
      "gunkowii-ai-message " +
      type;

    if (type === "bot") {

      message.innerHTML =
        formatAIResponse(text);

    } else {

      message.textContent =
        text;

    }

    aiMessages.appendChild(
      message
    );

    aiMessages.scrollTop =
      aiMessages.scrollHeight;


    if (saveToMemory) {

      aiConversation.push({
        role:
          type === "user"
            ? "user"
            : "assistant",

        content:
          String(text)
      });

      saveAIConversation();

    }

  }


  renderSavedConversation();


  /* =====================================================
     NEW CHAT
     ===================================================== */

  aiNewChat.addEventListener(
    "click",
    function () {

      const confirmed =
        window.confirm(
          "Start a new conversation? Your current GUNKOWII AI conversation will be cleared from this browser."
        );

      if (!confirmed) {
        return;
      }

      clearAIConversation();

      renderSavedConversation();

      aiInput.value = "";

      aiInput.focus();

    }
  );


  /* =====================================================
     DRAGGABLE GUNKOWII AI BUTTON
     ===================================================== */

  const AI_POSITION_KEY =
    "gunkowii_ai_button_position";


  function keepInsideScreen(
    x,
    y,
    element
  ) {

    const rect =
      element.getBoundingClientRect();

    const margin = 8;

    const maxX =
      window.innerWidth -
      rect.width -
      margin;

    const maxY =
      window.innerHeight -
      rect.height -
      margin;

    return {
      x: Math.max(
        margin,
        Math.min(x, maxX)
      ),

      y: Math.max(
        margin,
        Math.min(y, maxY)
      )
    };

  }


  function saveAIPosition(
    x,
    y
  ) {

    try {

      localStorage.setItem(
        AI_POSITION_KEY,
        JSON.stringify({
          x: x,
          y: y
        })
      );

    } catch (error) {

      console.warn(
        "Unable to save GUNKOWII AI position.",
        error
      );

    }

  }


  function loadAIPosition() {

    try {

      const saved =
        localStorage.getItem(
          AI_POSITION_KEY
        );

      if (!saved) {
        return;
      }

      const position =
        JSON.parse(saved);

      if (
        typeof position.x !== "number" ||
        typeof position.y !== "number"
      ) {
        return;
      }

      const safe =
        keepInsideScreen(
          position.x,
          position.y,
          aiButton
        );

      aiButton.style.left =
        safe.x + "px";

      aiButton.style.top =
        safe.y + "px";

      aiButton.style.right =
        "auto";

      aiButton.style.bottom =
        "auto";

    } catch (error) {

      console.warn(
        "Unable to load GUNKOWII AI position.",
        error
      );

    }

  }


  let aiButtonDragging = false;
  let aiButtonMoved = false;
  let aiButtonStartX = 0;
  let aiButtonStartY = 0;
  let aiButtonOriginX = 0;
  let aiButtonOriginY = 0;


  function startAIButtonDrag(
    event
  ) {

    if (
      event.type === "mousedown" &&
      event.button !== 0
    ) {
      return;
    }

    const rect =
      aiButton.getBoundingClientRect();

    aiButtonDragging = true;
    aiButtonMoved = false;

    aiButtonStartX =
      event.clientX;

    aiButtonStartY =
      event.clientY;

    aiButtonOriginX =
      rect.left;

    aiButtonOriginY =
      rect.top;

    aiButton.classList.add(
      "dragging"
    );

    if (
      event.pointerId !== undefined
    ) {

      try {

        aiButton.setPointerCapture(
          event.pointerId
        );

      } catch (error) {}

    }

    event.preventDefault();

  }


  function moveAIButton(
    event
  ) {

    if (!aiButtonDragging) {
      return;
    }

    const deltaX =
      event.clientX -
      aiButtonStartX;

    const deltaY =
      event.clientY -
      aiButtonStartY;

    if (
      Math.abs(deltaX) > 4 ||
      Math.abs(deltaY) > 4
    ) {
      aiButtonMoved = true;
    }

    const position =
      keepInsideScreen(
        aiButtonOriginX + deltaX,
        aiButtonOriginY + deltaY,
        aiButton
      );

    aiButton.style.left =
      position.x + "px";

    aiButton.style.top =
      position.y + "px";

    aiButton.style.right =
      "auto";

    aiButton.style.bottom =
      "auto";

  }


  function endAIButtonDrag() {

    if (!aiButtonDragging) {
      return;
    }

    aiButtonDragging = false;

    aiButton.classList.remove(
      "dragging"
    );

    const rect =
      aiButton.getBoundingClientRect();

    saveAIPosition(
      rect.left,
      rect.top
    );

  }


  aiButton.addEventListener(
    "pointerdown",
    startAIButtonDrag
  );

  aiButton.addEventListener(
    "pointermove",
    moveAIButton
  );

  aiButton.addEventListener(
    "pointerup",
    endAIButtonDrag
  );

  aiButton.addEventListener(
    "pointercancel",
    endAIButtonDrag
  );


  /* =====================================================
     PREVENT CLICK AFTER DRAG
     ===================================================== */

  aiButton.addEventListener(
    "click",
    function (event) {

      if (aiButtonMoved) {

        event.preventDefault();
        event.stopPropagation();

        aiButtonMoved = false;

        return;
      }

      if (
        aiChat.classList.contains("open")
      ) {
        closeAI();
      } else {
        openAI();
      }

    }
  );


  /* =====================================================
     RESTORE SAVED AI BUTTON POSITION
     ===================================================== */

  setTimeout(
    loadAIPosition,
    50
  );


  /* =====================================================
     KEEP AI BUTTON ON SCREEN AFTER RESIZE
     ===================================================== */

  window.addEventListener(
    "resize",
    function () {

      const rect =
        aiButton.getBoundingClientRect();

      const safe =
        keepInsideScreen(
          rect.left,
          rect.top,
          aiButton
        );

      aiButton.style.left =
        safe.x + "px";

      aiButton.style.top =
        safe.y + "px";

      aiButton.style.right =
        "auto";

      aiButton.style.bottom =
        "auto";

      saveAIPosition(
        safe.x,
        safe.y
      );

    }
  );


  /* =====================================================
     DRAGGABLE AI CHAT WINDOW
     ===================================================== */

  const aiHeader =
    aiChat.querySelector(
      ".gunkowii-ai-header"
    );


  let aiChatDragging = false;
  let aiChatMoved = false;
  let aiChatStartX = 0;
  let aiChatStartY = 0;
  let aiChatOriginX = 0;
  let aiChatOriginY = 0;


  function startAIChatDrag(
    event
  ) {

    if (
      event.target.closest(
        ".gunkowii-ai-close"
      ) ||
      event.target.closest(
        ".gunkowii-ai-new-chat"
      )
    ) {
      return;
    }

    const rect =
      aiChat.getBoundingClientRect();

    aiChatDragging = true;
    aiChatMoved = false;

    aiChatStartX =
      event.clientX;

    aiChatStartY =
      event.clientY;

    aiChatOriginX =
      rect.left;

    aiChatOriginY =
      rect.top;

    aiChat.classList.add(
      "dragging"
    );

    if (
      event.pointerId !== undefined
    ) {

      try {

        aiHeader.setPointerCapture(
          event.pointerId
        );

      } catch (error) {}

    }

    event.preventDefault();

  }


  function moveAIChat(
    event
  ) {

    if (!aiChatDragging) {
      return;
    }

    const deltaX =
      event.clientX -
      aiChatStartX;

    const deltaY =
      event.clientY -
      aiChatStartY;

    if (
      Math.abs(deltaX) > 4 ||
      Math.abs(deltaY) > 4
    ) {
      aiChatMoved = true;
    }

    const rect =
      aiChat.getBoundingClientRect();

    const margin = 8;

    const maxX =
      window.innerWidth -
      rect.width -
      margin;

    const maxY =
      window.innerHeight -
      rect.height -
      margin;

    const newX =
      Math.max(
        margin,
        Math.min(
          aiChatOriginX + deltaX,
          maxX
        )
      );

    const newY =
      Math.max(
        margin,
        Math.min(
          aiChatOriginY + deltaY,
          maxY
        )
      );

    aiChat.style.left =
      newX + "px";

    aiChat.style.top =
      newY + "px";

    aiChat.style.right =
      "auto";

    aiChat.style.bottom =
      "auto";

  }


  function endAIChatDrag() {

    if (!aiChatDragging) {
      return;
    }

    aiChatDragging = false;

    aiChat.classList.remove(
      "dragging"
    );

  }


  aiHeader.addEventListener(
    "pointerdown",
    startAIChatDrag
  );

  aiHeader.addEventListener(
    "pointermove",
    moveAIChat
  );

  aiHeader.addEventListener(
    "pointerup",
    endAIChatDrag
  );

  aiHeader.addEventListener(
    "pointercancel",
    endAIChatDrag
  );


  /* =====================================================
     OPEN / CLOSE AI
     ===================================================== */

  function openAI() {

    aiChat.classList.add("open");

    setTimeout(function () {

      aiInput.focus();

    }, 250);

  }


  function closeAI() {

    aiChat.classList.remove("open");

  }


  aiClose.addEventListener(
    "click",
    function () {

      closeAI();

    }
  );


  /* =====================================================
     FORMAT AI RESPONSE
     ===================================================== */

  function formatAIResponse(text) {

    if (!text) {

      return `
        I'm sorry, I couldn't generate a response right now.
      `;

    }

    let safeText =
      String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");


    safeText =
      safeText.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );


    safeText =
      safeText.replace(
        /(^|[\s>])(https?:\/\/[^\s<]+)/g,
        function (
          match,
          prefix,
          url
        ) {

          let cleanUrl =
            url.replace(
              /[),.!?]+$/,
              ""
            );

          let trailing =
            url.substring(
              cleanUrl.length
            );

          return (
            prefix +
            '<a href="' +
            cleanUrl +
            '" target="_blank" rel="noopener noreferrer">' +
            cleanUrl +
            "</a>" +
            trailing
          );

        }
      );


    safeText =
      safeText.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
      );


    safeText =
      safeText.replace(
        /\n/g,
        "<br>"
      );


    return safeText;

  }


  /* =====================================================
     TYPING INDICATOR
     ===================================================== */

  function addTypingIndicator() {

    const typing =
      document.createElement("div");

    typing.className =
      "gunkowii-ai-message bot";

    typing.id =
      "gunkowii-ai-typing";

    typing.innerHTML = `
      <span class="gunkowii-ai-typing">
        <span></span>
        <span></span>
        <span></span>
      </span>
    `;

    aiMessages.appendChild(
      typing
    );

    aiMessages.scrollTop =
      aiMessages.scrollHeight;

  }


  function removeTypingIndicator() {

    const typing =
      document.getElementById(
        "gunkowii-ai-typing"
      );

    if (typing) {

      typing.remove();

    }

  }


  /* =====================================================
     REAL AI RESPONSE
     ===================================================== */

  async function getAIResponse(
    question
  ) {

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
                question,

              history:
                aiConversation

            })

          }
        );


      let data = {};

      try {

        data =
          await response.json();

      } catch (jsonError) {

        data = {};

      }


      if (!response.ok) {

        console.error(
          "GUNKOWII AI Worker error:",
          data
        );

        throw new Error(
          data.error ||
          "AI service unavailable."
        );

      }


      if (!data.answer) {

        throw new Error(
          "No AI response was returned."
        );

      }


      return {
        answer:
          data.answer,

        storeAnalysis:
          data.storeAnalysis || null,

        leadSummary:
          data.leadSummary || null,

        handoff:
          data.handoff || null

      };

    } catch (error) {

      console.error(
        "GUNKOWII AI error:",
        error
      );

      return {

        answer: `
          I'm having trouble connecting to GUNKOWII AI right now.
          <br><br>
          Please try again in a moment, or use the
          <a href="contact.html">
          contact page
          </a>
          to reach GUNKOWII SABA directly.
        `,

        storeAnalysis:
          null,

        leadSummary:
          null,

        handoff:
          null

      };

    }

  }


  /* =====================================================
     STORE / LEAD HANDOFF NOTICE
     ===================================================== */

  function showHandoffNotice(
    data
  ) {

    if (
      !data ||
      !data.handoff
    ) {
      return;
    }

    const notice =
      document.createElement("div");

    notice.className =
      "gunkowii-ai-message bot";

    notice.innerHTML = `

      <strong>Ready to continue with GUNKOWII SABA?</strong>

      <br><br>

      I can connect you with GUNKOWII SABA
      so the work can continue from this conversation.

      <br><br>

      <a
        href="contact.html"
        target="_blank"
        rel="noopener noreferrer">
        Connect with GUNKOWII SABA →
      </a>

    `;

    aiMessages.appendChild(
      notice
    );

    aiMessages.scrollTop =
      aiMessages.scrollHeight;

  }


  /* =====================================================
     SEND MESSAGE
     ===================================================== */

  async function sendAIMessage(
    question
  ) {

    const cleanQuestion =
      question.trim();

    if (!cleanQuestion) {
      return;
    }


    addMessage(
      cleanQuestion,
      "user"
    );


    aiInput.value =
      "";


    aiSend.disabled =
      true;

    aiInput.disabled =
      true;


    addTypingIndicator();


    const result =
      await getAIResponse(
        cleanQuestion
      );


    removeTypingIndicator();


    /*
       Save the AI response to memory.
    */

    aiConversation.push({

      role:
        "assistant",

      content:
        result.answer

    });

    saveAIConversation();


    addMessage(
      result.answer,
      "bot",
      false
    );


    /*
       Show GUNKOWII handoff when
       the Worker determines it is useful.
    */

    showHandoffNotice(
      result
    );


    aiSend.disabled =
      false;

    aiInput.disabled =
      false;


    aiInput.focus();

  }


  /* =====================================================
     SEND BUTTON
     ===================================================== */

  aiSend.addEventListener(
    "click",
    function () {

      sendAIMessage(
        aiInput.value
      );

    }
  );


  /* =====================================================
     ENTER TO SEND
     ===================================================== */

  aiInput.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        sendAIMessage(
          aiInput.value
        );

      }

    }
  );


  /* =====================================================
     QUICK QUESTIONS
     ===================================================== */

  quickButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          const question =
            button.getAttribute(
              "data-question"
            );

          sendAIMessage(
            question
          );

        }
      );

    }
  );

});