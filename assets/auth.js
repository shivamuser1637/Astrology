(function () {
  "use strict";

  const language = function () {
    return localStorage.getItem("astro-alok-language") === "en" ? "en" : "hi";
  };

  async function request(url, options) {
    const response = await fetch(url, Object.assign({ credentials: "same-origin" }, options || {}));
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Account services are unavailable. Configure PostgreSQL in .env and start the Node.js server with npm start.");
    }
    if (!response.ok) throw new Error(result.error || "The request could not be completed.");
    return result;
  }

  function setError(element, message) {
    element.textContent = message;
    element.hidden = false;
  }

  function authError(form, message) {
    const isHindi = language() === "hi";
    const translated = {
      "Email or password is incorrect.": "ईमेल या पासवर्ड सही नहीं है।",
      "An account with this email already exists.": "इस ईमेल से खाता पहले से मौजूद है।",
      "Use a password that is at least 12 characters long.": "कम से कम 12 अक्षरों का पासवर्ड इस्तेमाल करें।",
      "Too many attempts. Please wait before trying again.": "बहुत अधिक प्रयास हुए। कृपया कुछ देर बाद फिर प्रयास करें।",
      "Account services are unavailable. Configure PostgreSQL in .env and start the Node.js server with npm start.": "खाता सेवा उपलब्ध नहीं है। .env में PostgreSQL सेट करें और npm start से Node.js सर्वर शुरू करें।"
    };
    setError(form.querySelector(".form-error"), isHindi ? (translated[message] || "अनुरोध पूरा नहीं हो सका। कृपया फिर प्रयास करें।") : message);
  }

  function configureAuthForm(form, endpoint, afterSuccess) {
    if (!form) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const error = form.querySelector(".form-error");
      error.hidden = true;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const data = new FormData(form);
      if (endpoint === "/api/signup" && data.get("password") !== data.get("confirmPassword")) {
        authError(form, language() === "hi" ? "पासवर्ड मेल नहीं खाते।" : "Passwords do not match.");
        return;
      }
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await request(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.get("email"), password: data.get("password") })
        });
        window.location.assign("dashboard.html");
      } catch (requestError) {
        authError(form, requestError.message);
      } finally {
        button.disabled = false;
      }
    });
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  function accountDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(language() === "hi" ? "hi-IN" : "en-IN");
  }

  function renderEnquiries(container, enquiries, admin) {
    container.replaceChildren();
    if (!enquiries.length) {
      container.appendChild(makeElement("p", "account-empty", language() === "hi"
        ? "अभी कोई अनुरोध नहीं है।"
        : "There are no enquiries yet."));
      return;
    }
    enquiries.forEach(function (enquiry) {
      const card = makeElement("article", "account-record");
      const title = enquiry.enquiry_type === "consultation"
        ? (enquiry.consultation_type || (language() === "hi" ? "परामर्श अनुरोध" : "Consultation enquiry"))
        : (language() === "hi" ? "संपर्क अनुरोध" : "Contact enquiry");
      card.appendChild(makeElement("h4", "", title));
      const facts = [
        [(language() === "hi" ? "नाम" : "Name"), enquiry.name],
        [(language() === "hi" ? "मोबाइल" : "Mobile"), enquiry.mobile],
        [(language() === "hi" ? "भाषा" : "Language"), enquiry.preferred_language],
        [(language() === "hi" ? "पसंदीदा समय" : "Preferred time"), enquiry.preferred_date
          ? enquiry.preferred_date + (enquiry.preferred_time ? " · " + String(enquiry.preferred_time).slice(0, 5) : "")
          : "—"],
        [(language() === "hi" ? "प्राप्त" : "Received"), accountDate(enquiry.created_at)]
      ];
      if (admin && enquiry.email) facts.push([(language() === "hi" ? "खाता ईमेल" : "Account email"), enquiry.email]);
      facts.forEach(function (fact) {
        const row = makeElement("p", "account-record-fact");
        row.appendChild(makeElement("strong", "", fact[0] + ": "));
        row.appendChild(document.createTextNode(fact[1] || "—"));
        card.appendChild(row);
      });
      if (enquiry.message) {
        card.appendChild(makeElement("p", "account-record-message", enquiry.message));
      }
      container.appendChild(card);
    });
  }

  function articlePayload(form) {
    const data = new FormData(form);
    return {
      slug: data.get("slug"),
      title_en: data.get("title_en"),
      title_hi: data.get("title_hi"),
      excerpt_en: data.get("excerpt_en"),
      excerpt_hi: data.get("excerpt_hi"),
      content_en: data.get("content_en"),
      content_hi: data.get("content_hi"),
      published: data.get("published") === "true"
    };
  }

  function fillArticleForm(form, article) {
    Object.keys(articlePayload(form)).forEach(function (key) {
      form.elements[key].value = article[key];
    });
    form.elements.articleId.value = article.id;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderAdminArticles(container, articles, form) {
    container.replaceChildren();
    if (!articles.length) {
      container.appendChild(makeElement("p", "account-empty", language() === "hi"
        ? "अभी कोई वेबसाइट लेख नहीं है।"
        : "There are no website articles yet."));
      return;
    }
    articles.forEach(function (article) {
      const card = makeElement("article", "account-record article-record");
      card.appendChild(makeElement("h4", "", language() === "hi" ? article.title_hi : article.title_en));
      card.appendChild(makeElement("p", "account-record-fact", "/" + article.slug + " · "
        + (article.published
          ? (language() === "hi" ? "प्रकाशित" : "Published")
          : (language() === "hi" ? "मसौदा" : "Draft"))));
      const actions = makeElement("div", "account-form-actions");
      const edit = makeElement("button", "button button-outline-navy", language() === "hi" ? "संपादित करें" : "Edit");
      edit.type = "button";
      edit.addEventListener("click", function () { fillArticleForm(form, article); });
      const remove = makeElement("button", "button button-outline-navy", language() === "hi" ? "हटाएँ" : "Delete");
      remove.type = "button";
      remove.addEventListener("click", async function () {
        const confirmed = window.confirm(language() === "hi" ? "क्या यह लेख हटाना चाहते हैं?" : "Delete this article?");
        if (!confirmed) return;
        try {
          await request("/api/admin/articles/" + encodeURIComponent(article.id), { method: "DELETE" });
          await loadAdminArticles(container, form);
        } catch (error) {
          setError(document.getElementById("admin-error"), error.message);
        }
      });
      actions.append(edit, remove);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  async function loadAdminArticles(container, form) {
    const result = await request("/api/admin/articles");
    renderAdminArticles(container, result.articles, form);
  }

  function setupArticleEditor(form) {
    if (!form) return;
    const list = document.getElementById("admin-articles");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const error = document.getElementById("article-error");
      error.hidden = true;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const articleId = form.elements.articleId.value;
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await request(articleId
          ? "/api/admin/articles/" + encodeURIComponent(articleId)
          : "/api/admin/articles", {
          method: articleId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(articlePayload(form))
        });
        form.reset();
        form.elements.articleId.value = "";
        await loadAdminArticles(list, form);
      } catch (requestError) {
        setError(error, requestError.message);
      } finally {
        button.disabled = false;
      }
    });
    document.getElementById("article-reset").addEventListener("click", function () {
      form.reset();
      form.elements.articleId.value = "";
      document.getElementById("article-error").hidden = true;
    });
    loadAdminArticles(list, form).catch(function (error) {
      setError(document.getElementById("admin-error"), error.message);
    });
  }

  function chatLanguage(english, hindi) {
    return language() === "hi" ? hindi : english;
  }

  function drawChatMessages(container, messages, userId, admin) {
    container.replaceChildren();
    messages.forEach(function (message) {
      const ownMessage = String(message.sender_id) === String(userId);
      const bubble = makeElement("article", "chat-message" + (ownMessage ? " chat-message-own" : ""));
      bubble.appendChild(makeElement("strong", "chat-message-sender", ownMessage
        ? chatLanguage("You", "आप")
        : (admin ? chatLanguage("Customer", "ग्राहक") : chatLanguage("Astrologer Alok Ranjan Tripathi", "ज्योतिषी आलोक रंजन त्रिपाठी"))));
      bubble.appendChild(makeElement("p", "chat-message-text", message.message));
      bubble.appendChild(makeElement("time", "chat-message-time", accountDate(message.created_at)));
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  }

  function setupChat(user, admin) {
    const messagesElement = document.getElementById(admin ? "admin-chat-messages" : "customer-chat-messages");
    const statusElement = document.getElementById(admin ? "admin-chat-status" : "customer-chat-status");
    const form = document.getElementById(admin ? "admin-chat-form" : "customer-chat-form");
    const conversationsElement = admin ? document.getElementById("admin-chat-conversations") : null;
    let selectedCustomerId = "";
    let conversations = [];
    let socket = null;
    let reconnectDelay = 1000;
    let reconnectTimer = null;
    let stopped = false;
    let loadingHistory = false;
    const messageMap = new Map();

    function renderMessages() {
      const messages = Array.from(messageMap.values()).sort(function (left, right) {
        const byDate = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        return byDate || String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
      });
      drawChatMessages(messagesElement, messages, user.id, admin);
    }

    async function loadMessages() {
      if (!selectedCustomerId || loadingHistory) return;
      loadingHistory = true;
      try {
        const endpoint = "/api/chat/messages?customerId=" + encodeURIComponent(selectedCustomerId);
        const result = await request(endpoint);
        result.messages.forEach(function (message) { messageMap.set(String(message.id), message); });
        renderMessages();
      } catch (error) {
        statusElement.textContent = error.message;
      } finally {
        loadingHistory = false;
      }
    }

    async function loadConversations() {
      if (!admin) return;
      try {
        const result = await request("/api/chat/conversations");
        conversations = result.conversations;
        conversationsElement.replaceChildren();
        if (!conversations.length) {
          conversationsElement.appendChild(makeElement("p", "account-empty", chatLanguage(
            "No customer chats yet. New chats appear here when a customer sends their first message.",
            "अभी कोई ग्राहक चैट नहीं है। ग्राहक का पहला संदेश आने पर बातचीत यहाँ दिखेगी।"
          )));
          return;
        }
        conversations.forEach(function (conversation) {
          const button = makeElement("button", "chat-conversation" +
            (String(conversation.customer_id) === selectedCustomerId ? " is-active" : ""));
          button.type = "button";
          button.appendChild(makeElement("strong", "", conversation.email));
          button.appendChild(makeElement("span", "", conversation.message));
          button.addEventListener("click", function () {
            selectedCustomerId = String(conversation.customer_id);
            messageMap.clear();
            form.hidden = false;
            statusElement.textContent = chatLanguage("Connected conversation with ", "बातचीत: ") + conversation.email;
            loadConversations();
            loadMessages();
          });
          conversationsElement.appendChild(button);
        });
      } catch (error) {
        setError(document.getElementById("chat-admin-error"), error.message);
      }
    }

    function connect() {
      if (stopped || socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(protocol + "//" + window.location.host + "/ws/chat");
      socket.addEventListener("open", function () {
        reconnectDelay = 1000;
        statusElement.textContent = chatLanguage("Chat connected. Messages are private to this conversation.", "चैट जुड़ गई है। संदेश इस निजी बातचीत तक सीमित हैं।");
        loadMessages();
        if (admin) loadConversations();
      });
      socket.addEventListener("message", function (event) {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          statusElement.textContent = chatLanguage("The chat server sent an unreadable response.", "चैट सर्वर से पढ़ा न जा सकने वाला उत्तर मिला।");
          return;
        }
        if (payload.type === "error") {
          statusElement.textContent = payload.message;
          return;
        }
        if (payload.type !== "message" && payload.type !== "sent") return;
        const message = payload.message;
        if (admin) loadConversations();
        if (String(message.customer_id) !== String(selectedCustomerId)) return;
        messageMap.set(String(message.id), message);
        renderMessages();
        if (String(message.sender_id) === String(user.id)) {
          const input = form.elements.message;
          if (input.value.trim() === message.message) input.value = "";
        }
      });
      socket.addEventListener("close", function () {
        if (stopped) return;
        statusElement.textContent = chatLanguage("Connection lost. Reconnecting…", "कनेक्शन टूट गया। फिर से जुड़ रहे हैं…");
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      });
      socket.addEventListener("error", function () {
        statusElement.textContent = chatLanguage("Chat connection is unavailable. Retrying…", "चैट कनेक्शन उपलब्ध नहीं है। फिर से प्रयास हो रहा है…");
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const input = form.elements.message;
      const message = input.value.trim();
      if (!message) return;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        statusElement.textContent = chatLanguage("Not connected yet. Your message has not been sent.", "अभी कनेक्शन नहीं है। आपका संदेश नहीं भेजा गया।");
        return;
      }
      const payload = { type: "message", message: message };
      if (admin) payload.customerId = selectedCustomerId;
      if (admin && !selectedCustomerId) {
        statusElement.textContent = chatLanguage("Select a customer conversation first.", "पहले ग्राहक की बातचीत चुनें।");
        return;
      }
      socket.send(JSON.stringify(payload));
    });

    if (admin) {
      loadConversations().then(function () {
        if (conversations.length) {
          const latest = conversations[0];
          selectedCustomerId = String(latest.customer_id);
          form.hidden = false;
          statusElement.textContent = chatLanguage("Connected conversation with ", "बातचीत: ") + latest.email;
          loadConversations();
          loadMessages();
        }
      });
      connect();
    } else {
      const consentPanel = document.getElementById("chat-consent-panel");
      const room = document.getElementById("customer-chat-room");
      selectedCustomerId = String(user.id);
      request("/api/chat/consent").then(function (result) {
        if (result.accepted) {
          consentPanel.hidden = true;
          room.hidden = false;
          connect();
        }
      }).catch(function (error) {
        setError(document.getElementById("chat-consent-error"), error.message);
      });
      document.getElementById("chat-consent-submit").addEventListener("click", async function () {
        const checkbox = document.getElementById("chat-consent");
        const error = document.getElementById("chat-consent-error");
        error.hidden = true;
        if (!checkbox.checked) {
          setError(error, chatLanguage("Please accept the chat privacy notice to continue.", "आगे बढ़ने के लिए कृपया चैट गोपनीयता सूचना स्वीकार करें।"));
          return;
        }
        try {
          await request("/api/chat/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consent: true })
          });
          consentPanel.hidden = true;
          room.hidden = false;
          connect();
        } catch (requestError) {
          setError(error, requestError.message);
        }
      });
    }

    window.addEventListener("beforeunload", function () {
      stopped = true;
      window.clearTimeout(reconnectTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    }, { once: true });
  }

  function feedbackCard(feedback) {
    const card = makeElement("article", "feedback-card");
    const rating = makeElement("p", "feedback-stars", "★".repeat(feedback.rating) + "☆".repeat(5 - feedback.rating));
    rating.setAttribute("aria-label", chatLanguage(feedback.rating + " out of 5 stars", feedback.rating + " में से 5 सितारे"));
    card.appendChild(rating);
    card.appendChild(makeElement("blockquote", "feedback-quote", feedback.message));
    const date = accountDate(feedback.created_at);
    card.appendChild(makeElement("p", "feedback-author", chatLanguage("Customer · ", "ग्राहक · ") + date));
    return card;
  }

  async function loadPublicFeedback() {
    const list = document.getElementById("public-feedback-list");
    if (!list) return;
    const status = document.getElementById("public-feedback-status");
    const summary = document.getElementById("feedback-rating-summary");
    try {
      const result = await request("/api/feedback");
      list.replaceChildren();
      const visibleReviews = document.getElementById("feedback-form") ? result.feedback : result.feedback.slice(0, 3);
      visibleReviews.forEach(function (feedback) { list.appendChild(feedbackCard(feedback)); });
      if (!result.feedback.length) {
        status.textContent = chatLanguage("No customer feedback has been shared yet.", "अभी तक कोई ग्राहक प्रतिक्रिया साझा नहीं की गई है।");
        if (summary) summary.textContent = "";
        return;
      }
      status.textContent = "";
      const average = result.feedback.reduce(function (sum, feedback) { return sum + feedback.rating; }, 0) / result.feedback.length;
      if (summary) summary.textContent = chatLanguage(
        average.toFixed(1) + " / 5 average from " + result.feedback.length + " public feedback item" + (result.feedback.length === 1 ? "" : "s"),
        result.feedback.length + " सार्वजनिक प्रतिक्रिया · औसत " + average.toFixed(1) + " / 5"
      );
    } catch {
      status.textContent = chatLanguage("Feedback is unavailable right now.", "अभी प्रतिक्रियाएँ लोड नहीं हो सकीं।");
    }
  }

  async function setupFeedbackPage() {
    if (!document.getElementById("feedback-form")) return;
    await loadPublicFeedback();
    const loginPrompt = document.getElementById("feedback-login-prompt");
    const form = document.getElementById("feedback-form");
    let user;
    try {
      const result = await request("/api/me");
      user = result.user;
    } catch {
      loginPrompt.hidden = false;
      return;
    }
    if (!user || user.role !== "customer") {
      loginPrompt.hidden = false;
      if (user && user.role === "admin") {
        loginPrompt.textContent = chatLanguage("Administrator accounts cannot submit customer feedback.", "व्यवस्थापक खाते ग्राहक प्रतिक्रिया नहीं भेज सकते।");
      }
      return;
    }
    loginPrompt.hidden = true;
    form.hidden = false;
    try {
      const saved = await request("/api/feedback/mine");
      if (saved.feedback) {
        form.elements.rating.value = String(saved.feedback.rating);
        form.elements.message.value = saved.feedback.message;
        form.elements.publicConsent.checked = true;
        form.querySelector('[type="submit"]').querySelector("span").textContent =
          chatLanguage("Update my feedback", "मेरी प्रतिक्रिया बदलें");
      }
    } catch (error) {
      setError(document.getElementById("feedback-form-error"), error.message);
    }
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const error = document.getElementById("feedback-form-error");
      error.hidden = true;
      error.classList.remove("form-success");
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const data = new FormData(form);
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await request("/api/feedback/mine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: Number(data.get("rating")),
            message: data.get("message"),
            publicConsent: data.get("publicConsent") === "on"
          })
        });
        setError(error, chatLanguage("Your feedback is now public. You can edit it here.", "आपकी प्रतिक्रिया अब सार्वजनिक है। आप इसे यहाँ बदल सकते हैं।"));
        error.classList.add("form-success");
        await loadPublicFeedback();
      } catch (requestError) {
        setError(error, requestError.message);
      } finally {
        button.disabled = false;
      }
    });
  }

  async function loadAdminFeedback() {
    const container = document.getElementById("admin-feedback-list");
    if (!container) return;
    const result = await request("/api/admin/feedback");
    container.replaceChildren();
    if (!result.feedback.length) {
      container.appendChild(makeElement("p", "account-empty", chatLanguage("No feedback has been submitted yet.", "अभी कोई प्रतिक्रिया नहीं आई है।")));
      return;
    }
    result.feedback.forEach(function (feedback) {
      const card = feedbackCard(feedback);
      card.appendChild(makeElement("p", "account-record-fact", feedback.email));
      if (!feedback.is_public) card.appendChild(makeElement("p", "account-record-fact", chatLanguage("Hidden from public view", "सार्वजनिक रूप से छिपी हुई")));
      const remove = makeElement("button", "button button-outline-navy", chatLanguage("Remove", "हटाएँ"));
      remove.type = "button";
      remove.addEventListener("click", async function () {
        if (!window.confirm(chatLanguage("Permanently delete this feedback?", "क्या यह प्रतिक्रिया हमेशा के लिए हटानी है?"))) return;
        try {
          await request("/api/admin/feedback/" + encodeURIComponent(feedback.id), { method: "DELETE" });
          await loadAdminFeedback();
        } catch (error) {
          setError(document.getElementById("chat-admin-error"), error.message);
        }
      });
      card.appendChild(remove);
      container.appendChild(card);
    });
  }

  async function setupDashboard() {
    const identity = document.getElementById("account-identity");
    if (!identity) return;
    let result;
    try {
      result = await request("/api/me");
    } catch {
      window.location.replace("login.html");
      return;
    }
    if (!result.user) {
      window.location.replace("login.html");
      return;
    }
    identity.textContent = (language() === "hi" ? "साइन इन: " : "Signed in as ") + result.user.email;
    const admin = result.user.role === "admin";
    document.getElementById(admin ? "admin-dashboard" : "customer-dashboard").hidden = false;
    document.getElementById(admin ? "admin-chat" : "customer-chat").hidden = false;
    try {
      const enquiries = await request("/api/enquiries");
      renderEnquiries(
        document.getElementById(admin ? "admin-enquiries" : "customer-enquiries"),
        enquiries.enquiries,
        admin
      );
    } catch (error) {
      setError(document.getElementById("admin-error") || document.getElementById("customer-enquiries"), error.message);
    }
    setupChat(result.user, admin);
    if (admin) {
      setupArticleEditor(document.getElementById("article-form"));
      document.getElementById("admin-feedback").hidden = false;
      loadAdminFeedback().catch(function (error) {
        setError(document.getElementById("chat-admin-error"), error.message);
      });
    }
    document.getElementById("logout-button").addEventListener("click", async function () {
      try {
        await request("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        window.location.replace("login.html");
      } catch (error) {
        const message = document.getElementById("admin-error") || document.getElementById("customer-enquiries");
        setError(message, error.message);
      }
    });
  }

  async function renderPublicArticles() {
    const container = document.getElementById("site-articles");
    if (!container) return;
    const status = document.getElementById("site-articles-status");
    try {
      const result = await request("/api/articles");
      const render = function () {
        container.replaceChildren();
        result.articles.forEach(function (article) {
          const card = makeElement("article", "archive-card site-article-card");
          const body = makeElement("div", "archive-card-body");
          const title = makeElement("h2", "", language() === "hi" ? article.title_hi : article.title_en);
          body.appendChild(title);
          body.appendChild(makeElement("p", "archive-excerpt", language() === "hi" ? article.excerpt_hi : article.excerpt_en));
          const details = document.createElement("details");
          details.className = "archive-article";
          const summary = makeElement("summary", "", language() === "hi" ? "पूरा लेख पढ़ें" : "Read the full article");
          details.appendChild(summary);
          details.appendChild(makeElement("div", "archive-article-content site-article-content",
            language() === "hi" ? article.content_hi : article.content_en));
          body.appendChild(details);
          card.appendChild(body);
          container.appendChild(card);
        });
        status.textContent = result.articles.length
          ? ""
          : (language() === "hi" ? "नए वेबसाइट लेख जल्द यहाँ दिखाई देंगे।" : "New website articles will appear here.");
      };
      render();
      const toggle = document.querySelector("[data-language-toggle]");
      if (toggle) toggle.addEventListener("click", render);
    } catch {
      status.textContent = language() === "hi"
        ? "वेबसाइट के नए लेख अभी लोड नहीं हो सके। कृपया बाद में फिर प्रयास करें।"
        : "Website articles could not be loaded right now. Please try again later.";
    }
  }

  configureAuthForm(document.getElementById("login-form"), "/api/login");
  configureAuthForm(document.getElementById("signup-form"), "/api/signup");
  if (document.getElementById("feedback-form")) {
    setupFeedbackPage().catch(function (error) {
      const status = document.getElementById("feedback-form-error");
      if (status) setError(status, error.message);
    });
  } else {
    loadPublicFeedback();
  }
  setupDashboard().catch(function (error) {
    const status = document.getElementById("admin-error") || document.getElementById("customer-enquiries");
    if (status) setError(status, error.message);
  });
  renderPublicArticles();
}());
