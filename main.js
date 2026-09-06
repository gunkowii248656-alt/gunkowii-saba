document.addEventListener("DOMContentLoaded", function () {

  /* =========================================
     GUNKOWII SABA — LIVE ACTIVITY POPUP
     ========================================= */

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


  /* =========================================
     POPUP STYLES
     ========================================= */

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

      transform:
        translateY(25px)
        scale(.96);

      transition:
        opacity .4s ease,
        transform .4s ease,
        visibility .4s ease;
    }


    .gunkowii-live-popup.show {
      opacity: 1;
      visibility: visible;

      transform:
        translateY(0)
        scale(1);
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

      box-shadow:
        0 0 0 4px rgba(201,162,39,.15);

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
        box-shadow:
          0 0 0 0 rgba(201,162,39,.45);
      }

      70% {
        box-shadow:
          0 0 0 7px rgba(201,162,39,0);
      }

      100% {
        box-shadow:
          0 0 0 0 rgba(201,162,39,0);
      }

    }


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

    }

  `;

  document.head.appendChild(popupStyles);


  /* =========================================
     CREATE POPUP
     ========================================= */

  const popup = document.createElement("div");

  popup.className = "gunkowii-live-popup";

  popup.innerHTML = `

    <button
      class="gunkowii-live-close"
      aria-label="Close notification"
    >
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
          class="gunkowii-live-link"
        >
          View Reviews →
        </a>

      </div>

    </div>

  `;


  document.body.appendChild(popup);


  /* =========================================
     POPUP ELEMENTS
     ========================================= */

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


  /* =========================================
     POPUP STATE
     ========================================= */

  let currentActivity = 0;

  let popupTimer = null;

  let rotationTimer = null;

  let manuallyClosed = false;


  /* =========================================
     LOAD ACTIVITY
     ========================================= */

  function loadActivity(index) {

    const activity = liveActivities[index];

    icon.textContent = activity.icon;

    label.textContent = activity.label;

    message.textContent = activity.text;

    link.textContent =
      activity.linkText + " →";

    link.href = activity.link;

  }


  /* =========================================
     SHOW POPUP
     ========================================= */

  function showPopup() {

    if (manuallyClosed) {
      return;
    }

    popup.classList.add("show");

    clearTimeout(popupTimer);

    popupTimer = setTimeout(function () {

      popup.classList.remove("show");

    }, 7000);

  }


  /* =========================================
     HIDE POPUP
     ========================================= */

  function hidePopup() {

    popup.classList.remove("show");

  }


  /* =========================================
     NEXT ACTIVITY
     ========================================= */

  function nextActivity() {

    hidePopup();

    setTimeout(function () {

      currentActivity++;

      if (
        currentActivity >= liveActivities.length
      ) {
        currentActivity = 0;
      }

      loadActivity(currentActivity);

      showPopup();

    }, 500);

  }


  /* =========================================
     CLOSE BUTTON
     ========================================= */

  closeButton.addEventListener(
    "click",
    function () {

      manuallyClosed = true;

      hidePopup();

      clearTimeout(popupTimer);

      clearInterval(rotationTimer);

    }
  );


  /* =========================================
     START POPUP
     ========================================= */

  loadActivity(currentActivity);


  setTimeout(function () {

    showPopup();


    rotationTimer = setInterval(
      function () {

        nextActivity();

      },
      12000
    );

  }, 4000);

});