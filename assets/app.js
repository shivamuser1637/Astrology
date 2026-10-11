(function () {
  "use strict";

  const WHATSAPP_URL = "https://wa.me/918319482309";
  const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@alokranjan889";
  const LANGUAGE_KEY = "astro-alok-language";
  const page = window.location.pathname.split("/").pop() || "index.html";
  const pageTitles = {
    "index.html": { en: "Home", hi: "मुखपृष्ठ" },
    "about.html": { en: "About", hi: "परिचय" },
    "services.html": { en: "Services", hi: "सेवाएँ" },
    "booking.html": { en: "Book a consultation", hi: "परामर्श अनुरोध" },
    "login.html": { en: "Sign in", hi: "साइन इन" },
    "signup.html": { en: "Create an account", hi: "खाता बनाएँ" },
    "dashboard.html": { en: "My account", hi: "मेरा खाता" },
    "feedback.html": { en: "Customer feedback", hi: "ग्राहक प्रतिक्रिया" },
    "contact.html": { en: "Contact", hi: "संपर्क" },
    "articles.html": { en: "Articles", hi: "लेख" },
    "privacy.html": { en: "Privacy", hi: "गोपनीयता" },
    "terms.html": { en: "Terms", hi: "शर्तें" }
  };
  let language = localStorage.getItem(LANGUAGE_KEY) || "hi";
  if (language !== "hi" && language !== "en") language = "hi";

  function renderHeader() {
    const host = document.querySelector("[data-site-header]");
    if (!host) return;
    const links = [
      { href: "index.html", title: pageTitles["index.html"] },
      { href: "about.html", title: pageTitles["about.html"] },
      { href: "services.html", title: pageTitles["services.html"] },
      { href: "booking.html", title: pageTitles["booking.html"] },
      { href: "contact.html", title: pageTitles["contact.html"] },
      { href: "feedback.html", title: pageTitles["feedback.html"] },
      { href: "index.html#videos", title: { en: "Videos", hi: "वीडियो" } },
      { href: "articles.html", title: pageTitles["articles.html"] }
    ];
    const navItems = links.map(function (link) {
      const active = page === link.href ? ' aria-current="page"' : "";
      return '<a href="' + link.href + '"' + active + '><span data-en="' + link.title.en + '" data-hi="' + link.title.hi + '">' + link.title.hi + "</span></a>";
    }).join("");
    host.innerHTML = '<a class="skip-link" href="#main-content"><span data-en="Skip to main content" data-hi="मुख्य सामग्री पर जाएँ">मुख्य सामग्री पर जाएँ</span></a><header class="site-header"><div class="wrap header-inner">' +
      '<a class="brand" href="index.html" aria-label="Astro Alok Tripathi — home"><span class="brand-mark" aria-hidden="true"><img class="brand-logo-image" src="assets/astro-alok-tripathi-logo.png" alt=""></span><span class="brand-text"><strong>ASTRO ALOK TRIPATHI</strong><small data-en="VEDIC ASTROLOGY" data-hi="वैदिक ज्योतिष">वैदिक ज्योतिष</small></span></a>' +
      '<button class="mobile-menu-toggle" type="button" aria-expanded="false" aria-controls="main-navigation"><span class="menu-lines" aria-hidden="true"></span><span class="sr-only" data-en="Open navigation" data-hi="नेविगेशन खोलें">नेविगेशन खोलें</span></button>' +
      '<nav class="main-navigation" id="main-navigation" aria-label="Main navigation">' + navItems + '</nav>' +
      '<div class="header-actions"><button class="language-toggle" type="button" data-language-toggle aria-label="Switch language"><span class="language-globe" aria-hidden="true">◎</span><span data-language-short>EN</span></button><a class="header-book" href="signup.html"><span data-en="Sign up" data-hi="खाता बनाएँ">खाता बनाएँ</span><span aria-hidden="true">↗</span></a></div>' +
      "</div></header>";
  }

  function renderFooter() {
    const host = document.querySelector("[data-site-footer]");
    if (!host) return;
    host.innerHTML = '<footer class="site-footer"><div class="wrap footer-main"><div class="footer-brand"><a class="brand brand-footer" href="index.html"><span class="brand-mark" aria-hidden="true"><img class="brand-logo-image" src="assets/astro-alok-tripathi-logo.png" alt=""></span><span class="brand-text"><strong>ASTRO ALOK TRIPATHI</strong><small data-en="VEDIC ASTROLOGY" data-hi="वैदिक ज्योतिष">वैदिक ज्योतिष</small></span></a><p class="footer-tagline" data-en="Ancient Wisdom. Personal Guidance." data-hi="परंपरा का ज्ञान, जीवन को नई दिशा।">परंपरा का ज्ञान, जीवन को नई दिशा।</p><p class="footer-experience" data-en="40 years of experience" data-hi="40 वर्षों का अनुभव">40 वर्षों का अनुभव</p></div>' +
      '<div class="footer-links"><h2 data-en="Explore" data-hi="जानें">जानें</h2><a href="about.html" data-en="About" data-hi="परिचय">परिचय</a><a href="services.html" data-en="Services" data-hi="सेवाएँ">सेवाएँ</a><a href="index.html#videos" data-en="Videos" data-hi="वीडियो">वीडियो</a><a href="articles.html" data-en="Articles" data-hi="लेख">लेख</a><a href="feedback.html" data-en="Customer feedback" data-hi="ग्राहक प्रतिक्रिया">ग्राहक प्रतिक्रिया</a><a href="booking.html" data-en="Request a consultation" data-hi="परामर्श का अनुरोध करें">परामर्श का अनुरोध करें</a><a href="contact.html" data-en="Contact" data-hi="संपर्क">संपर्क</a><a href="dashboard.html" data-en="My account" data-hi="मेरा खाता">मेरा खाता</a><a href="login.html" data-en="Member sign in" data-hi="सदस्य साइन इन">सदस्य साइन इन</a><a href="signup.html" data-en="Create an account" data-hi="खाता बनाएँ">खाता बनाएँ</a></div>' +
      '<div class="footer-links footer-contact"><h2 data-en="Get in touch" data-hi="संपर्क करें">संपर्क करें</h2><a href="https://wa.me/918319482309" target="_blank" rel="noopener noreferrer">WhatsApp · +91 83194 82309</a><a href="' + YOUTUBE_CHANNEL_URL + '" target="_blank" rel="noopener noreferrer" data-en="YouTube channel ↗" data-hi="YouTube चैनल ↗">YouTube चैनल ↗</a><p data-en="Location details will be added by the owner." data-hi="स्थान की जानकारी स्वामी द्वारा जोड़ी जाएगी।">स्थान की जानकारी स्वामी द्वारा जोड़ी जाएगी।</p><a href="https://wa.me/918319482309" target="_blank" rel="noopener noreferrer" data-en="Send a message ↗" data-hi="संदेश भेजें ↗">संदेश भेजें ↗</a></div></div>' +
      '<div class="footer-bottom"><div class="wrap footer-bottom-inner"><span>© <span data-current-year></span> ASTRO ALOK TRIPATHI</span><div><a href="privacy.html" data-en="Privacy policy" data-hi="गोपनीयता नीति">गोपनीयता नीति</a><a href="terms.html" data-en="Terms of use" data-hi="उपयोग की शर्तें">उपयोग की शर्तें</a></div><span data-en="Rooted in tradition · Shared with care" data-hi="परंपरा से जुड़ाव · संवेदनशीलता से संवाद">परंपरा से जुड़ाव · संवेदनशीलता से संवाद</span></div></div></footer>' +
      '<a class="floating-whatsapp" href="https://wa.me/918319482309" target="_blank" rel="noopener noreferrer" aria-label="Contact Astro Alok Tripathi on WhatsApp"><span class="wa-mark" aria-hidden="true">◔</span><span data-en="WhatsApp" data-hi="WhatsApp">WhatsApp</span></a>';
    const year = host.querySelector("[data-current-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  function applyLanguage(nextLanguage) {
    language = nextLanguage;
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
    document.querySelectorAll("[data-en][data-hi]").forEach(function (element) {
      element.innerHTML = element.getAttribute("data-" + language);
    });
    document.querySelectorAll("[data-placeholder-en][data-placeholder-hi]").forEach(function (element) {
      element.setAttribute("placeholder", element.getAttribute("data-placeholder-" + language));
    });
    document.querySelectorAll("[data-title-en][data-title-hi]").forEach(function (element) {
      element.setAttribute("title", element.getAttribute("data-title-" + language));
    });
    document.querySelectorAll("[data-language-short]").forEach(function (element) {
      element.textContent = language === "hi" ? "EN" : "हिन्दी";
    });
    const toggle = document.querySelector("[data-language-toggle]");
    if (toggle) toggle.setAttribute("aria-label", language === "hi" ? "Switch to English" : "हिंदी में बदलें");
    const navigation = document.querySelector(".main-navigation");
    if (navigation) navigation.setAttribute("aria-label", language === "hi" ? "मुख्य नेविगेशन" : "Main navigation");
    const floatingWhatsApp = document.querySelector(".floating-whatsapp");
    if (floatingWhatsApp) floatingWhatsApp.setAttribute("aria-label", language === "hi" ? "WhatsApp पर ज्योतिषी आलोक त्रिपाठी से संपर्क करें" : "Contact Astro Alok Tripathi on WhatsApp");
    localStorage.setItem(LANGUAGE_KEY, language);
  }

  function setupNavigation() {
    const toggle = document.querySelector(".mobile-menu-toggle");
    const navigation = document.querySelector(".main-navigation");
    if (!toggle || !navigation) return;
    toggle.addEventListener("click", function () {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      const label = toggle.querySelector(".sr-only");
      label.textContent = !expanded
        ? (language === "hi" ? "नेविगेशन बंद करें" : "Close navigation")
        : (language === "hi" ? "नेविगेशन खोलें" : "Open navigation");
      navigation.classList.toggle("is-open", !expanded);
    });
    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        navigation.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.querySelector(".sr-only").textContent = language === "hi" ? "नेविगेशन खोलें" : "Open navigation";
      }
    });
  }

  function formError(form, message) {
    const error = document.getElementById(form.id === "booking-form" ? "booking-error" : "contact-error");
    error.textContent = message;
    error.hidden = false;
  }

  function validationMessage(form) {
    const invalid = form.querySelector(":invalid");
    if (!invalid) return "";
    if (invalid.type === "checkbox") {
      return language === "hi"
        ? "आगे बढ़ने के लिए कृपया गोपनीयता सहमति दें।"
        : "Please agree to the privacy notice before continuing.";
    }
    if (invalid.name === "mobile") {
      return language === "hi"
        ? "कृपया वैध मोबाइल नंबर दर्ज करें।"
        : "Please enter a valid mobile number.";
    }
    return language === "hi"
      ? "कृपया सभी आवश्यक फ़ील्ड जाँचें और सही जानकारी भरें।"
      : "Please check that all required fields are complete and valid.";
  }

  function openWhatsApp(message) {
    return WHATSAPP_URL + "?text=" + encodeURIComponent(message);
  }

  async function saveEnquiry(payload) {
    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error("The enquiry could not be saved.");
    }
  }

  async function submitEnquiry(form, payload, message, confirmation) {
    const error = document.getElementById(form.id === "booking-form" ? "booking-error" : "contact-error");
    const button = form.querySelector('[type="submit"]');
    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;
    button.disabled = true;
    try {
      await saveEnquiry(payload);
      const whatsappUrl = openWhatsApp(message);
      if (whatsappWindow) {
        whatsappWindow.location.replace(whatsappUrl);
      }
      formError(form, confirmation);
      error.classList.add("form-success");
      if (!whatsappWindow) {
        const fallback = document.createElement("a");
        fallback.className = "text-link";
        fallback.href = whatsappUrl;
        fallback.target = "_blank";
        fallback.rel = "noopener noreferrer";
        fallback.textContent = language === "hi" ? "WhatsApp संदेश खोलें" : "Open WhatsApp message";
        error.append(" ", fallback);
      }
    } catch {
      if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
      formError(form, language === "hi"
        ? "आपका अनुरोध डेटाबेस में सहेजा नहीं जा सका, इसलिए WhatsApp संदेश नहीं खोला गया। कृपया फिर प्रयास करें या सीधे WhatsApp पर संपर्क करें।"
        : "Your enquiry could not be saved to the database, so WhatsApp was not opened. Please try again or contact us directly on WhatsApp.");
    } finally {
      button.disabled = false;
    }
  }

  function setupBookingForm() {
    const form = document.getElementById("booking-form");
    if (!form) return;
    const dateInput = form.elements.preferredDate;
    const today = new Date();
    dateInput.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const error = document.getElementById("booking-error");
      error.hidden = true;
      error.classList.remove("form-success");
      setMobileValidity(form);
      if (!form.checkValidity()) {
        formError(form, validationMessage(form));
        form.querySelector(":invalid").focus();
        return;
      }
      const data = new FormData(form);
      const hindi = data.get("preferredLanguage") === "Hindi";
      const labels = hindi
        ? { title: "नमस्कार, मैं परामर्श का अनुरोध करना चाहता/चाहती हूँ।", name: "नाम", mobile: "मोबाइल", language: "पसंदीदा भाषा", type: "परामर्श", date: "पसंदीदा तारीख", time: "पसंदीदा समय", message: "संदेश" }
        : { title: "Hello, I would like to request a consultation.", name: "Name", mobile: "Mobile", language: "Preferred language", type: "Consultation", date: "Preferred date", time: "Preferred time", message: "Message" };
      const lines = [
        labels.title,
        labels.name + ": " + data.get("name").trim(),
        labels.mobile + ": " + data.get("mobile").trim(),
        labels.language + ": " + (hindi ? "हिंदी" : "English"),
        labels.type + ": " + data.get("consultationType"),
        labels.date + ": " + data.get("preferredDate"),
        labels.time + ": " + data.get("preferredTime")
      ];
      const optionalMessage = data.get("message").trim();
      if (optionalMessage) lines.push(labels.message + ": " + optionalMessage);
      await submitEnquiry(form, {
        enquiryType: "consultation",
        name: data.get("name").trim(),
        mobile: data.get("mobile").trim(),
        preferredLanguage: data.get("preferredLanguage"),
        consultationType: data.get("consultationType"),
        preferredDate: data.get("preferredDate"),
        preferredTime: data.get("preferredTime"),
        message: optionalMessage,
        privacyConsent: data.get("privacyConsent") === "on"
      }, lines.join("\n"), language === "hi"
        ? "आपका अनुरोध सहेज लिया गया है। WhatsApp में संदेश जाँचकर भेजें; सीधे सहमति होने तक परामर्श का समय पक्का नहीं है।"
        : "Your enquiry has been saved. Review and send the WhatsApp message; your appointment is not confirmed until agreed directly.");
    });
  }

  function setupContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const error = document.getElementById("contact-error");
      error.hidden = true;
      error.classList.remove("form-success");
      setMobileValidity(form);
      if (!form.checkValidity()) {
        formError(form, validationMessage(form));
        form.querySelector(":invalid").focus();
        return;
      }
      const data = new FormData(form);
      const hindi = language === "hi";
      const message = hindi
        ? "नमस्कार, मेरा नाम " + data.get("name").trim() + " है।\nमोबाइल: " + data.get("mobile").trim() + "\nसंदेश: " + data.get("message").trim()
        : "Hello, my name is " + data.get("name").trim() + ".\nMobile: " + data.get("mobile").trim() + "\nMessage: " + data.get("message").trim();
      await submitEnquiry(form, {
        enquiryType: "contact",
        name: data.get("name").trim(),
        mobile: data.get("mobile").trim(),
        preferredLanguage: language === "hi" ? "Hindi" : "English",
        message: data.get("message").trim(),
        privacyConsent: data.get("privacyConsent") === "on"
      }, message, language === "hi"
        ? "आपकी पूछताछ सहेज ली गई है। कृपया WhatsApp में संदेश जाँचकर भेजें।"
        : "Your enquiry has been saved. Please review and send the message in WhatsApp.");
    });
  }

  function setMobileValidity(form) {
    const mobile = form.elements.mobile;
    const normalized = mobile.value.trim().replace(/[\s()-]/g, "");
    const valid = /^\+?[0-9]{7,15}$/.test(normalized);
    mobile.setCustomValidity(valid ? "" : "Enter a valid mobile number.");
  }

  function configureCanonical() {
    const siteUrl = window.SITE_CONFIG && window.SITE_CONFIG.siteUrl;
    if (!siteUrl) return;
    const base = new URL(siteUrl);
    if (base.protocol !== "https:" && base.protocol !== "http:") return;
    const canonical = new URL(page, base.href.endsWith("/") ? base.href : base.href + "/");
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical.href;
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = canonical.href;
  }

  function renderAmbientScene() {
    if (document.querySelector(".ambient-scene")) return;
    const scene = document.createElement("div");
    scene.className = "ambient-scene";
    scene.setAttribute("aria-hidden", "true");
    scene.innerHTML = '<div class="ambient-stars"></div><div class="ambient-grid"></div>' +
      '<span class="ambient-orbit ambient-orbit-one"></span><span class="ambient-orbit ambient-orbit-two"></span>' +
      '<span class="ambient-sphere ambient-sphere-one"></span><span class="ambient-sphere ambient-sphere-two"></span><span class="ambient-sphere ambient-sphere-three"></span>';
    document.body.prepend(scene);
  }

  function setupDepthMotion() {
    const scene = document.querySelector(".ambient-scene");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    if (!scene || reducedMotion.matches || !finePointer.matches) return;

    let framePending = false;
    let pointerX = 0;
    let pointerY = 0;
    document.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse" || framePending) return;
      framePending = true;
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
      window.requestAnimationFrame(function () {
        scene.style.setProperty("--scene-tilt-x", (pointerX * 2.6).toFixed(2) + "deg");
        scene.style.setProperty("--scene-tilt-y", (pointerY * -2.2).toFixed(2) + "deg");
        framePending = false;
      });
    }, { passive: true });

    const depthCards = document.querySelectorAll(
      ".intro-copy, .about-copy, .biography-copy, .faq-heading, .step-card, .service-panel, " +
      ".enquiry-form, .video-copy, .video-frame-card, .portrait-frame, .requirements-grid > *, .booking-aside, .contact-copy"
    );
    depthCards.forEach(function (card) {
      card.classList.add("depth-card");
      card.addEventListener("pointermove", function (event) {
        if (event.pointerType !== "mouse") return;
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        card.style.setProperty("--card-tilt-x", (-y * 4).toFixed(2) + "deg");
        card.style.setProperty("--card-tilt-y", (x * 5).toFixed(2) + "deg");
        const portrait = card.querySelector(".portrait-photo");
        if (portrait) {
          portrait.style.setProperty("--portrait-shift-x", (-x * 16).toFixed(2) + "px");
          portrait.style.setProperty("--portrait-shift-y", (-y * 12).toFixed(2) + "px");
          portrait.style.setProperty("--portrait-tilt-x", (-y * 10).toFixed(2) + "deg");
          portrait.style.setProperty("--portrait-tilt-y", (x * 12).toFixed(2) + "deg");
        }
        card.classList.add("is-tilting");
      }, { passive: true });
      card.addEventListener("pointerleave", function () {
        card.classList.remove("is-tilting");
        card.style.removeProperty("--card-tilt-x");
        card.style.removeProperty("--card-tilt-y");
        const portrait = card.querySelector(".portrait-photo");
        if (portrait) {
          portrait.style.removeProperty("--portrait-shift-x");
          portrait.style.removeProperty("--portrait-shift-y");
          portrait.style.removeProperty("--portrait-tilt-x");
          portrait.style.removeProperty("--portrait-tilt-y");
        }
      });
    });

    const heroPortrait = document.querySelector(".hero-art");
    if (heroPortrait) {
      heroPortrait.addEventListener("pointermove", function (event) {
        if (event.pointerType !== "mouse") return;
        const bounds = heroPortrait.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        heroPortrait.style.setProperty("--hero-portrait-shift-x", (-x * 13).toFixed(2) + "px");
        heroPortrait.style.setProperty("--hero-portrait-shift-y", (-y * 10).toFixed(2) + "px");
        heroPortrait.style.setProperty("--hero-portrait-tilt-x", (-y * 7).toFixed(2) + "deg");
        heroPortrait.style.setProperty("--hero-portrait-tilt-y", (x * 9).toFixed(2) + "deg");
      }, { passive: true });
      heroPortrait.addEventListener("pointerleave", function () {
        heroPortrait.style.removeProperty("--hero-portrait-shift-x");
        heroPortrait.style.removeProperty("--hero-portrait-shift-y");
        heroPortrait.style.removeProperty("--hero-portrait-tilt-x");
        heroPortrait.style.removeProperty("--hero-portrait-tilt-y");
      });
    }
  }

  renderAmbientScene();
  renderHeader();
  renderFooter();
  const main = document.querySelector("main");
  if (main) main.id = "main-content";
  setupNavigation();
  setupDepthMotion();
  setupBookingForm();
  setupContactForm();
  configureCanonical();
  const languageToggle = document.querySelector("[data-language-toggle]");
  if (languageToggle) {
    languageToggle.addEventListener("click", function () {
      applyLanguage(language === "hi" ? "en" : "hi");
    });
  }
  applyLanguage(language);
}());
