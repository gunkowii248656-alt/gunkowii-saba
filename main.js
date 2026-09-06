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
     CREATE POPUP
     ========================================= */

  const popup = document.createElement("div");

  popup.className = "gunkowii-live-popup";

  popup.innerHTML = `
    <button class="gunkowii-live-close" aria-label="Close notification">
      ×
    </button>

    <div class="gunkowii-live-top">
      <span class="gunkowii-live-status"></span>
      <span class="gunkowii-live-title">LIVE ACTIVITY</span>
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

        <a href="reviews.html" class="gunkowii-live-link">
          View Reviews →
        </a>

      </div>

    </div>
  `;

  document.body.appendChild(popup);


  /* =========================================
     POPUP ELEMENTS
     ========================================= */

  const icon = popup.querySelector(".gunkowii-live-icon");
  const label = popup.querySelector(".gunkowii-live-label");
  const message = popup.querySelector(".gunkowii-live-message");
  const link = popup.querySelector(".gunkowii-live-link");
  const closeButton = popup.querySelector(".gunkowii-live-close");


  /* =========================================
     POPUP STATE
     ========================================= */

  let currentActivity = 0;
  let popupTimer;
  let rotationTimer;
  let manuallyClosed = false;


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
     LOAD ACTIVITY
     ========================================= */

  function loadActivity(index) {

    const activity = liveActivities[index];

    icon.textContent = activity.icon;
    label.textContent = activity.label;
    message.textContent = activity.text;
    link.textContent = activity.linkText + " →";
    link.href = activity.link;
  }


  /* =========================================
     ROTATE ACTIVITY
     ========================================= */

  function nextActivity() {

    hidePopup();

    setTimeout(function () {

      currentActivity++;

      if (currentActivity >= liveActivities.length) {
        currentActivity = 0;
      }

      loadActivity(currentActivity);
      showPopup();

    }, 500);
  }


  /* =========================================
     CLOSE BUTTON
     ========================================= */

  closeButton.addEventListener("click", function () {

    manuallyClosed = true;

    hidePopup();

    clearTimeout(popupTimer);
    clearInterval(rotationTimer);

  });


  /* =========================================
     START
     ========================================= */

  loadActivity(currentActivity);


  /*
     First popup appears after 4 seconds.
  */

  setTimeout(function () {

    showPopup();

    /*
       Rotate every 12 seconds.
    */

    rotationTimer = setInterval(function () {
      nextActivity();
    }, 12000);

  }, 4000);

});